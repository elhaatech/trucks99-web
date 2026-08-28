"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import Checkbox from "@mui/material/Checkbox";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CloseIcon from "@mui/icons-material/Close";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import ArrowBackIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIcon from "@mui/icons-material/ArrowForwardIos";
import { useRouter } from "next/navigation";

import { getCurrentUser, getUserAll, type User } from "@/model/api";
import {
  getSpecifications,
  getSpecificationValues,
  type Specification,
  type SpecificationValue,
} from "@/model/api";
import { routes } from "@/lib/routes";
import { isAdminLikeRole } from "@/lib/permissions";
import { getBuySellImageUrl } from "@/lib/buysellUtils";
import {
  BackButton,
  FormFooter,
  FormTextField,
  FormSelectField,
  type SelectOption,
  CategorySubcategorySelector,
  FormGrid,
  FormGridFull,
} from "@/components/common";
import { PageContainer, PageHeader, PageSection, type BreadcrumbItem } from "@/components/ui";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { useForm } from "@/hooks/useForm";
import { useNotification } from "@/hooks/useNotification";
import {
  BuySellProduct,
  createBuySellProduct,
  getBuySellRowId,
  updateBuySellProduct,
} from "@/model/services/buysellapi";
import { EMPTY_FORM, FormState } from "../interface/buysell_interface";
import { uploadFile } from "@/model/services/uploadapi";
import LocationSelector, { EMPTY_LOCATION_VALUE, LocationValue } from "@/components/common/Locationselector";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BuySellFormProps {
  product?: BuySellProduct;
  mode?: "create" | "edit";
  onSuccess?: () => void;
  /** When true, blocks create/edit until the user is authenticated. */
  requireAuth?: boolean;
  loginHref?: string;
  cancelHref?: string;
  backLabel?: string;
}

const FORM_ID = "buy-sell-form";

// Status union — must match FormState["status"] exactly
type BuySellStatus = FormState["status"];

// Draft vs pending — listings go live as pending (awaiting admin approval).
const STATUS_OPTIONS: {
  value: BuySellStatus;
  label: string;
  color: "warning" | "default" | "success";
}[] = [
  { value: "pending", label: "Publish", color: "success" },
  { value: "draft", label: "Draft", color: "default" },
];

const STEPS = [
  "Category & Brand",
  "Vehicle Details",
  "Location",
  "Photos & Status",
];

const MIN_PHOTOS = 4;
const MAX_PHOTOS = 10;

const PHOTO_SLOT_LABELS = ["Front", "Back", "Left Side", "Right Side"] as const;

/** Gracefully hide a broken image so the placeholder box stays clean. */
function handleBuySellImageError(event: {
  currentTarget?: HTMLImageElement;
}): void {
  const img = event.currentTarget;
  if (!img || img.dataset.fallbackApplied === "1") return;
  img.dataset.fallbackApplied = "1";
  img.style.visibility = "hidden";
}

type ImageEntry =
  | { kind: "existing"; url: string }
  | { kind: "new"; file: File; preview: string };

/** A single failed required-field check for one step. */
type FieldError = { field: string; message: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise any string coming from the API into a valid BuySellStatus. */
function toStatus(raw: string | undefined | null): BuySellStatus {
  const lower = (raw ?? "").toLowerCase().trim();
  if (lower === "draft") return "draft";
  if (lower === "pending" || lower === "active") return "pending";
  if (lower === "inactive") return "inactive";
  if (lower === "rejected") return "rejected";
  return "pending";
}

/** A specification counts as "Brand" if its name is brand/make — not "Make Year". */
function normalizeSpecName(name?: string): string {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isBrandSpec(spec: Specification): boolean {
  const n = normalizeSpecName(spec.specification_name);
  return n === "brand" || n === "make";
}

function isFuelSpec(spec: Specification): boolean {
  return /\bfuel\b/.test(normalizeSpecName(spec.specification_name));
}

function isOwnerSpec(spec: Specification): boolean {
  return /\bowners?\b/.test(normalizeSpecName(spec.specification_name));
}

function isInsuranceSpec(spec: Specification): boolean {
  return /\binsurance\b/.test(normalizeSpecName(spec.specification_name));
}

function isKmDrivenSpec(spec: Specification): boolean {
  const n = normalizeSpecName(spec.specification_name);
  return /\bkms?\b/.test(n) || /kilomet/.test(n);
}

/** "Make Year" / "Manufacture Year" — never "Brand"/"Make" (handled above). */
function isMakeYearSpec(spec: Specification): boolean {
  return /\byear\b/.test(normalizeSpecName(spec.specification_name));
}

/**
 * Vehicle Details specs the user must fill before leaving the step:
 * Insurance, No. of Owners, Fuel Type, KM Driven and Make Year.
 */
function isRequiredVehicleSpec(spec: Specification): boolean {
  return (
    isInsuranceSpec(spec) ||
    isOwnerSpec(spec) ||
    isFuelSpec(spec) ||
    isKmDrivenSpec(spec) ||
    isMakeYearSpec(spec)
  );
}

const CURRENT_YEAR = new Date().getFullYear();
const MAKE_YEAR_START = 1990;

/** Year dropdown options, newest first, plus any saved value outside the range. */
function makeYearOptions(selected?: string): { value: string; label: string }[] {
  const years: { value: string; label: string }[] = [];
  for (let y = CURRENT_YEAR; y >= MAKE_YEAR_START; y--) {
    years.push({ value: String(y), label: String(y) });
  }
  if (selected) {
    const n = Number(selected);
    if (Number.isFinite(n) && !years.some((o) => o.value === selected)) {
      years.push({ value: selected, label: selected });
    }
  }
  return years;
}

const FUEL_FALLBACK_OPTIONS = [
  "DIESEL",
  "PETROL",
  "CNG",
  "ELECTRIC",
  "HYBRID",
  "LPG",
  "NOT APPLICABLE",
];
const OWNER_FALLBACK_OPTIONS = ["1", "2", "3", "4", "5+"];
const FUEL_TYPE_SPEC_ID = "6a32447946ebddbeb905e6f2";
const OWNERS_SPEC_ID = "6a32457a46ebddbeb905e8b9";

function specId(item: { _id?: unknown; id?: unknown } | null | undefined): string {
  if (!item) return "";
  const oid = item._id != null ? String(item._id) : "";
  if (/^[a-fA-F0-9]{24}$/.test(oid)) return oid;
  return String(item.id || oid || "");
}

function valueId(sv: { _id?: unknown; id?: unknown } | null | undefined): string {
  return specId(sv);
}

function isActiveSpec(spec: Specification): boolean {
  return !spec.status || /^active$/i.test(String(spec.status));
}

function optionsForSpec(
  spec: Specification,
  values: SpecificationValue[],
): { value: string; label: string }[] {
  const fromCatalog = (values || [])
    .filter((sv) => String(sv.specification_value_name || "").trim())
    .map((sv) => ({
      value: valueId(sv) || String(sv.specification_value_name),
      label: String(sv.specification_value_name),
    }));
  if (fromCatalog.length > 0) return fromCatalog;
  if (isFuelSpec(spec)) {
    return FUEL_FALLBACK_OPTIONS.map((v) => ({ value: v, label: v }));
  }
  if (isOwnerSpec(spec)) {
    return OWNER_FALLBACK_OPTIONS.map((v) => ({ value: v, label: v }));
  }
  return [];
}

function getUserRowId(u: User | null | undefined): string {
  if (!u) return "";
  return String(u._id || u.id || "");
}

function userOptionLabel(u: User): string {
  const name = u.name?.trim() || "User";
  const mobile = String(u.mobile || "").trim();
  return mobile ? `${name} (${mobile})` : name;
}

function extractProductUserId(product: BuySellProduct | undefined): string {
  if (!product?.userid) return "";
  const raw = product.userid as unknown;
  if (typeof raw === "object" && raw) {
    const obj = raw as { _id?: unknown; id?: unknown };
    return String(obj._id || obj.id || "");
  }
  return String(raw);
}

function ensureCoreVehicleSpecs(specs: Specification[]): Specification[] {
  const list = [...specs];
  if (!list.some(isFuelSpec)) {
    list.push({
      _id: FUEL_TYPE_SPEC_ID,
      specification_name: "Fuel Type",
      type: "selectable",
      is_required: "Yes",
      status: "Active",
      subcategory_id: "*",
    } as Specification);
  }
  if (!list.some(isOwnerSpec)) {
    list.push({
      _id: OWNERS_SPEC_ID,
      specification_name: "No. of Owners",
      type: "selectable",
      is_required: "Yes",
      status: "Active",
      subcategory_id: "*",
    } as Specification);
  }
  return list;
}

// ─── Step header ──────────────────────────────────────────────────────────────

function StepIntro({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" fontWeight={700} color="text.primary">
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

// ─── Single specification field (label = spec name, no manual picker) ────────

function SpecField({
  spec,
  value,
  onChange,
  values,
  loading,
  disabled,
  required,
  error,
}: {
  spec: Specification;
  value: string;
  onChange: (val: string) => void;
  values: SpecificationValue[];
  loading: boolean;
  disabled?: boolean;
  required?: boolean;
  /** Inline "X is required" message shown under the field. */
  error?: string;
}) {
  // Make Year is stored as a number spec but is shown as a year dropdown,
  // matching the other Vehicle Details selects.
  if (isMakeYearSpec(spec)) {
    return (
      <FormSelectField
        label={spec.specification_name}
        value={value}
        onChange={onChange}
        options={makeYearOptions(value)}
        disabled={disabled}
        required={required}
      />
    );
  }

  const isSelectable = spec.type === "selectable";

  if (isSelectable) {
    const options = optionsForSpec(spec, values);
    return (
      <Box sx={{ position: "relative" }}>
        <FormSelectField
          label={
            loading
              ? `${spec.specification_name} (loading...)`
              : spec.specification_name
          }
          value={value}
          onChange={(v) => onChange(typeof v === "string" ? v : ((v as any)?.value ?? ""))}
          options={options}
          disabled={disabled || loading}
          required={required}
        />
        {loading && (
          <CircularProgress
            size={16}
            sx={{
              position: "absolute",
              right: 32,
              top: "50%",
              mt: "-8px",
              pointerEvents: "none",
            }}
          />
        )}
        {error && (
          <Typography
            variant="caption"
            color="error"
            sx={{ display: "block", mt: 0.5, ml: 1.75 }}
          >
            {error}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <FormTextField
      label={spec.specification_name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      error={!!error}
      helperText={error || undefined}
      digitsOnly={spec.type === "number"}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BuySellForm({
  product,
  mode,
  onSuccess,
  requireAuth = false,
  loginHref = "/",
  cancelHref,
  backLabel,
}: BuySellFormProps) {
  const effectiveMode: "create" | "edit" =
    mode ?? (product ? "edit" : "create");
  const isEdit = effectiveMode === "edit";

  const { notify } = useNotification();
  const router = useRouter();
  const { values, setFieldValue } = useForm<FormState>(EMPTY_FORM);

  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [authReady, setAuthReady] = useState(false);
  const isAdmin = isAdminLikeRole(currentUser?.role ?? null);

  const cancelTarget = cancelHref ?? routes.buysell.list();
  const backButtonLabel = backLabel ?? "Back to list";
  const [isDraft, setIsDraft] = useState(false);

  // ── Image state ───────────────────────────────────────────────────────────
  const [imageEntries, setImageEntries] = useState<ImageEntry[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  // Tracks which required slot (0-3) a freshly picked file should fill.
  // null = append as an additional photo ("Add more").
  const pendingSlotRef = useRef<number | null>(null);

  // ── Reference data ────────────────────────────────────────────────────────
  const [specifications, setSpecifications] = useState<Specification[]>([]);
  const [specValueMap, setSpecValueMap] = useState<
    Record<string, SpecificationValue[]>
  >({});
  const [specValueLoadingMap, setSpecValueLoadingMap] = useState<
    Record<string, boolean>
  >({});
  const specsInitializedRef = useRef(false);

  // ── Location (country / state / city) ─────────────────────────────────────
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION_VALUE);

  // Keep the form's country_id / state_id / city_id in sync with the
  // LocationSelector's resolved value, so submission payload stays correct.
  useEffect(() => {
    setFieldValue("country_id", location.countryId);
    setFieldValue("state_id", location.stateId);
    setFieldValue("city_id", location.cityId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.countryId, location.stateId, location.cityId]);

  // ── Cleanup object URLs on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      imageEntries.forEach((e) => {
        if (e.kind === "new") URL.revokeObjectURL(e.preview);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Lazy-load spec values ─────────────────────────────────────────────────
  const ensureSpecValuesLoaded = useCallback(
    async (id: string) => {
      if (!id) return;
      const spec = specifications.find((s) => specId(s) === id);
      if (!spec || spec.type !== "selectable") return;
      if (specValueMap[id] !== undefined || specValueLoadingMap[id])
        return;
      setSpecValueLoadingMap((prev) => ({ ...prev, [id]: true }));
      try {
        const fetched = await getSpecificationValues({
          specification_id: id,
        });
        setSpecValueMap((prev) => ({ ...prev, [id]: fetched ?? [] }));
      } catch {
        setSpecValueMap((prev) => ({ ...prev, [id]: [] }));
      } finally {
        setSpecValueLoadingMap((prev) => ({ ...prev, [id]: false }));
      }
    },
    [specifications, specValueMap, specValueLoadingMap],
  );

  // ── Bootstrap data on mount ───────────────────────────────────────────────
  useEffect(() => {
    getCurrentUser()
      .then(async (u) => {
        const user = u as User;
        setCurrentUser(user);
        if (isAdminLikeRole(user?.role ?? null)) {
          try {
            setUsers((await getUserAll()) ?? []);
          } catch {
            setUsers([]);
          }
        }
      })
      .catch(() => setCurrentUser(null))
      .finally(() => setAuthReady(true));

    const loadSpecs = async () => {
      try {
        let specs = await getSpecifications({ status: "Active" });
        if (!Array.isArray(specs) || specs.length === 0) {
          const all = await getSpecifications({});
          specs = (Array.isArray(all) ? all : []).filter(isActiveSpec);
        }
        const list = ensureCoreVehicleSpecs(Array.isArray(specs) ? specs : []);
        setSpecifications(list);
        list.forEach((spec) => {
          if (spec.type === "selectable") {
            const id = specId(spec);
            getSpecificationValues({ specification_id: id })
              .then((fetched) =>
                setSpecValueMap((prev) => ({
                  ...prev,
                  [id]: fetched ?? [],
                })),
              )
              .catch(() =>
                setSpecValueMap((prev) => ({ ...prev, [id]: [] })),
              );
          }
        });
      } catch (e) {
        setSpecifications(ensureCoreVehicleSpecs([]));
        setError(
          e instanceof Error
            ? e.message
            : "Failed to load vehicle details. Please refresh and try again.",
        );
      }
    };
    void loadSpecs();
  }, []);

  // ── Split specifications into "Brand" vs the rest (Vehicle Details) ──────
  const brandSpec = useMemo(
    () => specifications.find(isBrandSpec),
    [specifications],
  );
  const vehicleDetailSpecs = useMemo(
    () => specifications.filter((s) => !isBrandSpec(s)),
    [specifications],
  );

  // ── Refetch brand values scoped to the selected sub category ──────────────
  // Brand values are stored per sub_category_id on the backend, so the
  // global load in the bootstrap effect isn't enough — whenever the sub
  // category changes we need brand options for THAT sub category only.
  const [brandLoading, setBrandLoading] = useState(false);
  const lastBrandSubcategoryRef = useRef<string>("");

  useEffect(() => {
    if (!brandSpec) return;
    const subId = values.subcategory_id;
    if (!subId) {
      setSpecValueMap((prev) => ({ ...prev, [specId(brandSpec)]: [] }));
      return;
    }
    if (lastBrandSubcategoryRef.current === subId) return;
    lastBrandSubcategoryRef.current = subId;

    setBrandLoading(true);
    getSpecificationValues({ specification_id: specId(brandSpec), subcategory_id: subId })
      .then((fetched) => {
        setSpecValueMap((prev) => ({ ...prev, [specId(brandSpec)]: fetched ?? [] }));
        // The brand chosen for a different sub category is no longer valid.
        const idx = values.specifications.findIndex(
          (s) => s.specification_id === specId(brandSpec),
        );
        const stillValid =
          idx >= 0 &&
          (fetched ?? []).some((v) => valueId(v) === values.specifications[idx].specification_value);
        if (idx >= 0 && !stillValid) {
          updateSpecValue(specId(brandSpec), "");
        }
      })
      .catch(() => setSpecValueMap((prev) => ({ ...prev, [specId(brandSpec)]: [] })))
      .finally(() => setBrandLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandSpec, values.subcategory_id]);

  // ── Initialise one form row per catalog specification ─────────────────────
  // Runs once specifications finish loading; merges with any values already
  // populated from an existing product (edit mode) so nothing is lost.
  useEffect(() => {
    if (specifications.length === 0 || specsInitializedRef.current) return;
    specsInitializedRef.current = true;

    const existingMap = new Map(
      values.specifications.map((s) => [s.specification_id, s.specification_value]),
    );

    const merged = specifications.map((spec) => ({
      specification_id: specId(spec),
      specification_value: existingMap.get(specId(spec)) ?? "",
    }));

    setFieldValue("specifications", merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specifications]);

  const getSpecEntry = useCallback(
    (specId: string) => {
      const idx = values.specifications.findIndex(
        (s) => s.specification_id === specId,
      );
      return { idx, value: idx >= 0 ? values.specifications[idx].specification_value : "" };
    },
    [values.specifications],
  );

  const updateSpecValue = useCallback(
    (specId: string, val: string) => {
      const idx = values.specifications.findIndex(
        (s) => s.specification_id === specId,
      );
      const updated = [...values.specifications];
      if (idx >= 0) {
        updated[idx] = { specification_id: specId, specification_value: val };
      } else {
        updated.push({ specification_id: specId, specification_value: val });
      }
      setFieldValue("specifications", updated);
    },
    [values.specifications, setFieldValue],
  );

  // ── Populate form on edit ─────────────────────────────────────────────────
  useEffect(() => {
    if (!product) return;

    const catId =
      typeof product.category_id === "object" && product.category_id
        ? (product.category_id as any)._id
        : String(product.category_id ?? "");
    const subId =
      typeof product.subcategory_id === "object" && product.subcategory_id
        ? (product.subcategory_id as any)._id
        : String(product.subcategory_id ?? "");

    setFieldValue("category_id", catId);
    setFieldValue("subcategory_id", subId);
    setFieldValue("price", String(product.price ?? ""));
    setFieldValue("description", product.description ?? "");
    setFieldValue(
      "specifications",
      (product.specifications || []).map((s) => ({
        specification_id: String(s.specification_id),
        specification_value: String(s.specification_value),
      })),
    );
    setFieldValue("address", product.address ?? "");
    setFieldValue("pincode", product.pincode ?? "");
    setFieldValue("userid", extractProductUserId(product));

    // Seed the LocationSelector with whatever ids the product has — it will
    // resolve the matching country/state/city and their display names once
    // its option lists have loaded.
    setLocation({
      countryId: String(product.country_id ?? ""),
      country: "",
      stateId: String(product.state_id ?? ""),
      state: "",
      cityId: String(product.city_id ?? ""),
      city: "",
    });

    // toStatus() converts any API string → valid BuySellStatus union member
    const savedStatus = toStatus(product.status);
    setFieldValue("status", savedStatus);
    setIsDraft(savedStatus === "draft");

    const existing: ImageEntry[] = (product.images ?? [])
      .filter(Boolean)
      .map((url) => ({ kind: "existing" as const, url }));
    setImageEntries(existing);
  }, [product, setFieldValue]);

  // ── Preload spec values on edit ───────────────────────────────────────────
  useEffect(() => {
    if (!product || specifications.length === 0) return;
    product.specifications?.forEach((s) => {
      const specId = String(s.specification_id);
      if (specId) ensureSpecValuesLoaded(specId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, specifications]);

  // ── Sync isDraft → form status (create mode only) ─────────────────────────
  useEffect(() => {
    if (isEdit) return;
    const next: BuySellStatus = isDraft ? "draft" : "pending";
    setFieldValue("status", next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDraft, isEdit]);

  // ── Image handlers ────────────────────────────────────────────────────────
  const handleImageFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    // Reset immediately so the same file can be re-picked later.
    e.target.value = "";
    if (!files.length) return;

    const target = pendingSlotRef.current;
    pendingSlotRef.current = null;

    if (target != null) {
      // Assign / replace a specific required angle slot (Front/Back/Left/Right).
      const file = files[0];
      const newEntry: ImageEntry = {
        kind: "new",
        file,
        preview: URL.createObjectURL(file),
      };
      setImageEntries((prev) => {
        const next = [...prev];
        const pos = Math.min(target, MAX_PHOTOS - 1);
        if (pos < next.length) {
          if (next[pos].kind === "new") URL.revokeObjectURL(next[pos].preview);
          next[pos] = newEntry;
        } else {
          next.push(newEntry);
        }
        return next;
      });
      setError("");
      return;
    }

    // No specific slot → append as additional photos ("Add more"), capped at max.
    setImageEntries((prev) => {
      const remaining = MAX_PHOTOS - prev.length;
      if (remaining <= 0) {
        setError(`You can upload a maximum of ${MAX_PHOTOS} images.`);
        return prev;
      }
      const filesToAdd = files.slice(0, remaining);
      if (files.length > remaining) {
        setError(
          `Only ${remaining} more image(s) can be added (max ${MAX_PHOTOS} total).`,
        );
      } else {
        setError("");
      }
      const newEntries: ImageEntry[] = filesToAdd.map((file) => ({
        kind: "new" as const,
        file,
        preview: URL.createObjectURL(file),
      }));
      return [...prev, ...newEntries];
    });
  };

  const handleRemoveImage = (idx: number) => {
    setImageEntries((prev) => {
      const entry = prev[idx];
      if (entry.kind === "new") URL.revokeObjectURL(entry.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const userOptions: SelectOption[] = useMemo(() => {
    if (!isAdmin) return [];
    return users
      .map((u) => ({
        value: getUserRowId(u),
        label: userOptionLabel(u),
      }))
      .filter((o) => o.value);
  }, [isAdmin, users]);

  // Align stored userid (Mongo _id or uuid) with dropdown option values.
  useEffect(() => {
    if (!isAdmin || !values.userid || users.length === 0) return;
    const match = users.find(
      (u) =>
        getUserRowId(u) === values.userid ||
        String(u._id || "") === values.userid ||
        String(u.id || "") === values.userid,
    );
    const canonical = match ? getUserRowId(match) : "";
    if (canonical && canonical !== values.userid) {
      setFieldValue("userid", canonical);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, users, values.userid]);

  // ── Step validation ────────────────────────────────────────────────────────
  // Every required field returns a { field, message } pair so the same
  // "X is required" text can be shown both in the top alert and inline on
  // the field itself (exactly how State / City already behave).
  const collectStepErrors = useCallback(
    (step: number): FieldError[] => {
      const errors: FieldError[] = [];

      if (step === 0) {
        if (isAdmin && !isEdit && !values.userid)
          errors.push({
            field: "userid",
            message: "Please select a user to post this listing",
          });
        if (!values.category_id)
          errors.push({ field: "category_id", message: "Category is required" });
        if (!values.subcategory_id)
          errors.push({
            field: "subcategory_id",
            message: "Sub category is required",
          });
        if (!values.price || isNaN(Number(values.price)))
          errors.push({ field: "price", message: "Valid price is required" });
        return errors;
      }

      if (step === 1) {
        // Keep the display order so the alert always names the first
        // empty field the user can see on screen.
        vehicleDetailSpecs.forEach((spec) => {
          if (!isRequiredVehicleSpec(spec)) return;
          const id = specId(spec);

          // A dropdown with no configured values can never be filled —
          // don't dead-end the form on it. Values that haven't loaded yet
          // (undefined) still count as required.
          if (spec.type === "selectable") {
            const loaded = specValueMap[id];
            if (loaded !== undefined && optionsForSpec(spec, loaded).length === 0) {
              return;
            }
          }

          const val = String(getSpecEntry(id).value ?? "").trim();
          if (!val) {
            errors.push({
              field: id,
              message: `${spec.specification_name} is required`,
            });
          }
        });
        return errors;
      }

      if (step === 2) {
        if (!location.countryId)
          errors.push({ field: "country", message: "Country is required" });
        if (!location.stateId)
          errors.push({ field: "state", message: "State is required" });
        if (!location.cityId)
          errors.push({ field: "city", message: "City is required" });
        if (!String(values.address ?? "").trim())
          errors.push({ field: "address", message: "Address is required" });
        if (!String(values.pincode ?? "").trim())
          errors.push({ field: "pincode", message: "Pincode is required" });
        return errors;
      }

      return errors;
    },
    [
      isAdmin,
      isEdit,
      values.userid,
      values.category_id,
      values.subcategory_id,
      values.price,
      values.address,
      values.pincode,
      vehicleDetailSpecs,
      specValueMap,
      getSpecEntry,
      location.countryId,
      location.stateId,
      location.cityId,
    ],
  );

  // Fields the user has already tried to skip — only these show inline
  // errors, and they clear themselves as soon as the field is filled.
  const [flaggedFields, setFlaggedFields] = useState<Record<string, boolean>>({});

  const flagFields = useCallback((errors: FieldError[]) => {
    setFlaggedFields((prev) => {
      const next = { ...prev };
      errors.forEach((e) => {
        next[e.field] = true;
      });
      return next;
    });
  }, []);

  const activeStepErrors = useMemo(
    () => collectStepErrors(activeStep),
    [collectStepErrors, activeStep],
  );

  const fieldErrors = useMemo(() => {
    const map: Record<string, string> = {};
    activeStepErrors.forEach((e) => {
      if (flaggedFields[e.field]) map[e.field] = e.message;
    });
    return map;
  }, [activeStepErrors, flaggedFields]);

  const visibleError = error || activeStepErrors.find((e) => flaggedFields[e.field])?.message || "";

  const dismissErrors = () => {
    setError("");
    setFlaggedFields({});
  };

  const handleNext = () => {
    const errs = collectStepErrors(activeStep);
    if (errs.length > 0) {
      flagFields(errs);
      setError("");
      return;
    }
    setError("");
    setActiveStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setError("");
    setActiveStep((s) => Math.max(s - 1, 0));
  };

  const goToStep = (step: number) => {
    // Only allow jumping to a step already reachable (all prior steps valid)
    for (let i = 0; i < step; i++) {
      const errs = collectStepErrors(i);
      if (errs.length > 0) {
        flagFields(errs);
        setError("");
        setActiveStep(i);
        return;
      }
    }
    setError("");
    setActiveStep(step);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (requireAuth && !currentUser) {
      const msg = "Please log in to list your vehicle.";
      setError(msg);
      notify({ type: "error", message: msg });
      return;
    }

    // Re-check every step so a required field can never slip through by
    // jumping straight to the last step.
    for (const step of [0, 1, 2]) {
      const errs = collectStepErrors(step);
      if (errs.length > 0) {
        flagFields(errs);
        setActiveStep(step);
        return;
      }
    }

    // Photos: enforce the min 4 / max 10 rule (same as the user-side flow).
    if (imageEntries.length < MIN_PHOTOS) {
      const msg = `Upload at least ${MIN_PHOTOS} photos (Front, Back, Left Side and Right Side).`;
      setError(msg);
      notify({ type: "error", message: msg });
      setActiveStep(3);
      return;
    }
    if (imageEntries.length > MAX_PHOTOS) {
      const msg = `You can upload a maximum of ${MAX_PHOTOS} images.`;
      setError(msg);
      notify({ type: "error", message: msg });
      setActiveStep(3);
      return;
    }

    setSubmitting(true);
    try {
      // Upload any newly picked files first, keep existing URLs as-is.
      // We keep the original order so the saved image order matches the preview grid.
      setUploadingImages(true);
      const finalImages: string[] = [];

      for (const entry of imageEntries) {
        if (entry.kind === "existing") {
          finalImages.push(entry.url);
        } else {
          const url = await uploadFile(entry.file, "buy_sell_doc");
          finalImages.push(url);
        }
      }
      setUploadingImages(false);

      const currentStatus = isEdit ? toStatus(product?.status) : "pending";
      const canChangeStatus =
        !isEdit ||
        currentStatus === "draft" ||
        currentStatus === "pending" ||
        currentStatus === "rejected" ||
        currentStatus === "inactive";

      const payload: {
        category_id: string;
        subcategory_id: string;
        price: number;
        description: string;
        country_id: string;
        state_id: string;
        city_id: string;
        address: string;
        pincode: string;
        specifications: typeof values.specifications;
        images: string[];
        status?: "draft" | "pending";
        userid?: string;
      } = {
        category_id: values.category_id,
        subcategory_id: values.subcategory_id,
        price: Number(values.price),
        description: values.description.trim(),
        country_id: location.countryId,
        state_id: location.stateId,
        city_id: location.cityId,
        address: values.address,
        pincode: values.pincode,
        specifications: values.specifications.filter(
          (s) => s.specification_id && s.specification_value,
        ),
        images: finalImages,
      };

      if (isAdmin && !isEdit && values.userid) {
        payload.userid = values.userid;
      }

      if (canChangeStatus) {
        payload.status =
          isDraft || values.status === "draft" ? "draft" : "pending";
      }

      if (isEdit && product) {
        await updateBuySellProduct(getBuySellRowId(product), payload);
        notify({ type: "success", message: "Product updated successfully." });
      } else {
        await createBuySellProduct(payload);
        notify({ type: "success", message: "Product created successfully." });
      }

      onSuccess ? onSuccess() : router.push(cancelTarget);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : isEdit
            ? "Failed to update"
            : "Failed to create";
      setError(msg);
      notify({ type: "error", message: msg });
    } finally {
      setSubmitting(false);
      setUploadingImages(false);
    }
  };

  const isLastStep = activeStep === STEPS.length - 1;

  const stepFooter = (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        mt: 2,
        pt: 3,
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      <Button
        type="button"
        variant="outlined"
        onClick={activeStep === 0 ? () => router.push(cancelTarget) : handleBack}
        startIcon={activeStep !== 0 ? <ArrowBackIcon sx={{ fontSize: 14 }} /> : undefined}
        disabled={submitting}
      >
        {activeStep === 0 ? "Cancel" : "Back"}
      </Button>

      {!isLastStep ? (
        <Button
          type="button"
          variant="contained"
          onClick={handleNext}
          endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
        >
          Next
        </Button>
      ) : (
        <FormFooter
          formId={FORM_ID}
          submitting={submitting}
          submitLabel={isEdit ? "Update" : "Create"}
          submittingLabel={
            uploadingImages
              ? "Uploading images..."
              : isEdit
                ? "Updating..."
                : "Creating..."
          }
          onCancel={() => router.push(cancelTarget)}
        />
      )}
    </Box>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  if (requireAuth && authReady && !currentUser) {
    return (
      <Alert
        severity="warning"
        action={
          <Button color="inherit" size="small" onClick={() => router.push(loginHref)}>
            Log in
          </Button>
        }
        sx={{ borderRadius: 2 }}
      >
        You need to be signed in to sell a vehicle on TRUCK99.
      </Alert>
    );
  }

  if (requireAuth && !authReady) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <PageContainer maxWidth={960}>
      <PageHeader
        title={isEdit ? "Edit Listing" : "Create Listing"}
        subtitle={
          isEdit
            ? product?.description || "Update your buy/sell listing."
            : isAdmin
              ? "Select a user, then post a new buy/sell listing."
              : "Post a new buy/sell listing."
        }
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Buy / Sell", href: routes.buysell.list() },
          { label: isEdit ? "Edit" : "Create" },
        ] as BreadcrumbItem[]}
        action={<BackButton fallback={cancelTarget} label={backButtonLabel} />}
      />
      <PageSection>
        <Stepper
        activeStep={activeStep}
        sx={{ mb: 3, cursor: "pointer" }}
        nonLinear
      >
        {STEPS.map((label, idx) => (
          <Step key={label} completed={idx < activeStep}>
            <StepLabel onClick={() => goToStep(idx)} sx={{ cursor: "pointer" }}>
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {visibleError && (
        <Alert severity="error" onClose={dismissErrors} sx={{ mb: 2.5 }}>
          {visibleError}
        </Alert>
      )}

      <Box
        component="form"
        id={FORM_ID}
        onSubmit={handleSubmit}
        sx={{ minHeight: 320, "& > *": { minWidth: 0 } }}
      >
          {/* ── Step 0: Category, Sub Category & Brand ─────────────────── */}
          {activeStep === 0 && (
            <Box>
              <StepIntro
                title="What are you listing?"
                subtitle={
                  isAdmin
                    ? "Select the user this vehicle belongs to, then pick category, sub category and brand."
                    : "Pick a category, sub category and brand to get started."
                }
              />
              <FormGrid>
                {isAdmin && (
                  <FormGridFull>
                    <SearchableSelect
                      label="User"
                      value={values.userid}
                      onChange={(v) => setFieldValue("userid", v)}
                      options={userOptions}
                      placeholder="Search and select user"
                      required={!isEdit}
                      disabled={isEdit}
                      helperText={
                        isEdit
                          ? "Owner cannot be changed after the listing is created."
                          : "This listing will be posted under the selected user."
                      }
                    />
                  </FormGridFull>
                )}
                <CategorySubcategorySelector
                  variant="form"
                  categoryId={values.category_id}
                  subcategoryId={values.subcategory_id}
                  onCategoryChange={(id) => setFieldValue("category_id", id)}
                  onSubcategoryChange={(id) =>
                    setFieldValue("subcategory_id", id)
                  }
                  required
                />

                {brandSpec && (
                  <SpecField
                    spec={brandSpec}
                    value={getSpecEntry(specId(brandSpec)).value}
                    onChange={(v) => updateSpecValue(specId(brandSpec), v)}
                    values={specValueMap[specId(brandSpec)] ?? []}
                    loading={brandLoading}
                    disabled={!values.subcategory_id}
                  />
                )}

                <FormTextField
                  label="Price (₹)"
                  value={values.price}
                  onChange={(v) => setFieldValue("price", v)}
                  required
                  digitsOnly
                />

                <FormGridFull>
                  <FormTextField
                    label="Description"
                    value={values.description}
                    onChange={(v) => setFieldValue("description", v)}
                    multiline
                    rows={3}
                  />
                </FormGridFull>
              </FormGrid>
            </Box>
          )}

          {/* ── Step 1: Vehicle Details (remaining specifications) ─────── */}
          {activeStep === 1 && (
            <Box>
              <StepIntro
                title="Vehicle Details"
                subtitle="All vehicle details are required — buyers rely on them to compare listings."
              />
              {vehicleDetailSpecs.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No additional details are configured for this category.
                </Typography>
              ) : (
                <FormGrid>
                  {vehicleDetailSpecs.map((spec) => (
                    <SpecField
                      key={specId(spec)}
                      spec={spec}
                      value={getSpecEntry(specId(spec)).value}
                      onChange={(v) => updateSpecValue(specId(spec), v)}
                      values={specValueMap[specId(spec)] ?? []}
                      loading={!!specValueLoadingMap[specId(spec)]}
                      required={isRequiredVehicleSpec(spec)}
                      error={fieldErrors[specId(spec)]}
                    />
                  ))}
                </FormGrid>
              )}
            </Box>
          )}

          {/* ── Step 2: Location ─────────────────────────────────────────── */}
          {activeStep === 2 && (
            <Box>
              <StepIntro
                title="Where is it located?"
                subtitle="Buyers use this to filter listings near them."
              />
              <FormGrid>
                <LocationSelector
                  value={location}
                  onChange={setLocation}
                  disabled={submitting}
                  required
                />

                <FormGridFull>
                  <FormTextField
                    label="Address"
                    value={values.address}
                    onChange={(v) => setFieldValue("address", v)}
                    required
                    error={!!fieldErrors.address}
                    helperText={fieldErrors.address || undefined}
                  />
                </FormGridFull>

                <FormTextField
                  label="Pincode"
                  value={values.pincode}
                  onChange={(v) => setFieldValue("pincode", v)}
                  required
                  digitsOnly
                  error={!!fieldErrors.pincode}
                  helperText={fieldErrors.pincode || undefined}
                />
              </FormGrid>
            </Box>
          )}

          {/* ── Step 3: Images & Status ──────────────────────────────────── */}
          {activeStep === 3 && (
            <Box>
              <StepIntro
                title="Photos"
                subtitle="Upload Front, Back, Left Side and Right Side (min 4, max 10)."
              />

              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                style={{ display: "none" }}
                onChange={handleImageFilePick}
              />

              {/* Required 2x2 angle grid: Front / Back / Left Side / Right Side */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 150px))",
                  gap: 1.5,
                  mb: 2,
                }}
              >
                {PHOTO_SLOT_LABELS.map((label, slotIdx) => {
                  const entry = imageEntries[slotIdx];
                  const filled = !!entry;
                  const src =
                    entry?.kind === "existing"
                      ? getBuySellImageUrl(entry.url)
                      : entry?.preview;
                  return (
                    <Box
                      key={label}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (submitting) return;
                        pendingSlotRef.current = slotIdx;
                        imageInputRef.current?.click();
                      }}
                      onKeyDown={(e) => {
                        if (submitting) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          pendingSlotRef.current = slotIdx;
                          imageInputRef.current?.click();
                        }
                      }}
                      sx={{
                        position: "relative",
                        height: 150,
                        borderRadius: 2,
                        border: "2px dashed",
                        borderColor: filled ? "primary.main" : "divider",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 0.25,
                        cursor: submitting ? "default" : "pointer",
                        bgcolor: filled ? "transparent" : "grey.50",
                        overflow: "hidden",
                        transition: "border-color 0.15s, background 0.15s",
                        "&:hover": {
                          borderColor: submitting ? "divider" : "primary.main",
                        },
                      }}
                    >
                      {filled ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt={label}
                            onError={handleBuySellImageError}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              padding: 12,
                              boxSizing: "border-box",
                              borderRadius: 8,
                              display: "block",
                            }}
                          />
                          <IconButton
                            size="small"
                            type="button"
                            disabled={submitting}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage(slotIdx);
                            }}
                            sx={{
                              position: "absolute",
                              top: 6,
                              right: 6,
                              bgcolor: "rgba(0,0,0,0.55)",
                              color: "#fff",
                              p: 0.25,
                              borderRadius: "50%",
                              "&:hover": { bgcolor: "error.main" },
                            }}
                          >
                            <CloseIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </>
                      ) : (
                        <>
                          <PhotoCameraIcon
                            sx={{ fontSize: 24, color: "text.disabled" }}
                          />
                          <Typography variant="subtitle2" fontWeight={600}>
                            {label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Required
                          </Typography>
                        </>
                      )}
                    </Box>
                  );
                })}
              </Box>

              {/* Additional (optional) photos beyond the 4 required angles */}
              {imageEntries.length > MIN_PHOTOS && (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                    gap: 1.5,
                    mb: 2,
                  }}
                >
                  {imageEntries.slice(MIN_PHOTOS).map((entry, i) => {
                    const idx = i + MIN_PHOTOS;
                    const src =
                      entry.kind === "existing"
                        ? getBuySellImageUrl(entry.url)
                        : entry.preview;
                    const isNew = entry.kind === "new";
                    return (
                      <Box
                        key={idx}
                        sx={{
                          position: "relative",
                          borderRadius: 2,
                          overflow: "hidden",
                          border: "2px dashed",
                          borderColor: isNew ? "primary.main" : "divider",
                          aspectRatio: "1 / 1",
                          bgcolor: "grey.50",
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt={`Image ${idx + 1}`}
                          onError={handleBuySellImageError}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                        {isNew && (
                          <Box
                            sx={{
                              position: "absolute",
                              bottom: 4,
                              left: 4,
                              bgcolor: "primary.main",
                              color: "primary.contrastText",
                              fontSize: 10,
                              fontWeight: 700,
                              px: 0.5,
                              borderRadius: 0.5,
                              lineHeight: 1.6,
                            }}
                          >
                            NEW
                          </Box>
                        )}
                        <IconButton
                          size="small"
                          type="button"
                          disabled={submitting}
                          onClick={() => handleRemoveImage(idx)}
                          sx={{
                            position: "absolute",
                            top: 2,
                            right: 2,
                            bgcolor: "rgba(0,0,0,0.55)",
                            color: "#fff",
                            p: 0.25,
                            "&:hover": { bgcolor: "error.main" },
                          }}
                        >
                          <CloseIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                    );
                  })}
                </Box>
              )}

              {imageEntries.length < MAX_PHOTOS && (
                <Button
                  type="button"
                  variant="outlined"
                  startIcon={<CloudUploadIcon />}
                  disabled={submitting}
                  onClick={() => {
                    pendingSlotRef.current = null;
                    imageInputRef.current?.click();
                  }}
                  sx={{ mb: 3 }}
                >
                  {`Add more photos (${imageEntries.length}/${MAX_PHOTOS})`}
                </Button>
              )}

              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontWeight: 600,
                  fontSize: "0.68rem",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  display: "block",
                  mb: 1,
                }}
              >
                Status
              </Typography>

              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: !isEdit ? 1.5 : 0 }}>
                {STATUS_OPTIONS.map((s) => {
                  const isSelected = values.status === s.value;
                  return (
                    <Chip
                      key={s.value}
                      label={s.label}
                      color={s.color}
                      variant={isSelected ? "filled" : "outlined"}
                      onClick={() => {
                        setFieldValue("status", s.value);
                        setIsDraft(s.value === "draft");
                      }}
                      sx={{
                        cursor: "pointer",
                        fontWeight: isSelected ? 600 : 400,
                        fontSize: 13,
                        borderRadius: 5,
                        px: 0.5,
                        transition: "all 0.15s",
                        "&:hover": { opacity: 0.85 },
                      }}
                    />
                  );
                })}
              </Box>

              {!isEdit && (
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1,
                    px: 1.5,
                    py: 0.75,
                    border: "1px solid",
                    borderColor: isDraft ? "primary.main" : "divider",
                    borderRadius: 2,
                    bgcolor: isDraft ? "action.selected" : "transparent",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onClick={() => setIsDraft((prev) => !prev)}
                >
                  <Checkbox
                    checked={isDraft}
                    onChange={(e) => setIsDraft(e.target.checked)}
                    size="small"
                    sx={{ p: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Typography variant="body2" fontWeight={isDraft ? 600 : 400}>
                    Save as Draft
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </PageSection>
      {stepFooter}
    </PageContainer>
  );
}

export default BuySellForm;