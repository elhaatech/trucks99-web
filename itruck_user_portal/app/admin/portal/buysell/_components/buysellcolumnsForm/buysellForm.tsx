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
import ArrowBackIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIcon from "@mui/icons-material/ArrowForwardIos";
import { useRouter } from "next/navigation";
import { alpha } from "@mui/material/styles";

import { getCurrentUser, type User } from "@/model/api";
import {
  getSpecifications,
  getSpecificationValues,
  type Specification,
  type SpecificationValue,
} from "@/model/api";
import { routes } from "@/lib/routes";
import { PRODUCT_THEME as T } from "@/lib/theme";
import { getBuySellImageUrl } from "@/lib/buysellUtils";
import {
  BackButton,
  FormFooter,
  FormTextField,
  FormSelectField,
  CategorySubcategorySelector,
  FormPageLayout,
  FormGrid,
  FormGridFull,
} from "@/components/common";
import { useForm } from "@/hooks/useForm";
import { useNotification } from "@/hooks/useNotification";
import {
  BuySellProduct,
  BuySellCreatePayload,
  createBuySellProduct,
  getBuySellRowId,
  updateBuySellProduct,
} from "@/model/services/buysellapi";
import { ProductStatusChip } from "../ProductStatusChip";
import { EMPTY_FORM, FormState } from "../interface/buysell_interface";
import { uploadFile } from "@/model/services/uploadapi";
import LocationSelector, {
  EMPTY_LOCATION_VALUE,
  LocationValue,
} from "@/components/common/Locationselector";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BuySellFormSuccessContext = {
  product: BuySellProduct;
  mode: "create" | "edit";
};

export interface BuySellFormProps {
  product?: BuySellProduct;
  mode?: "create" | "edit";
  onSuccess?: (ctx?: BuySellFormSuccessContext) => void;
  /** When true, blocks create/edit until the user is authenticated. */
  requireAuth?: boolean;
  loginHref?: string;
  cancelHref?: string;
  backLabel?: string;
  /** Marketplace portal: card layout without admin breadcrumbs/page chrome. */
  presentation?: "admin" | "marketplace";
}

const FORM_ID = "buy-sell-form";

// Status union — must match FormState["status"] exactly
type BuySellStatus = FormState["status"];



const STEPS = [
  "Category & Brand",
  "Vehicle Details",
  "Location",
  "Photos & Status",
];

type ImageEntry =
  | { kind: "existing"; url: string }
  | { kind: "new"; file: File; preview: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise any string coming from the API into a valid BuySellStatus. */
function toStatus(raw: string | undefined | null): BuySellStatus {
  const lower = (raw ?? "").toLowerCase().trim() as BuySellStatus;
  const allowed: BuySellStatus[] = [
    "pending",
    "draft",
    "rejected",
    "booking",
    "purchased",
    "sold",
  ];
  return allowed.includes(lower) ? lower : "pending";
}

function toRelativeUploadPath(url: string): string {
  const trimmed = String(url || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/uploads/")) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname.startsWith("/uploads/")) return parsed.pathname;
  } catch {
    /* keep as-is */
  }
  return trimmed;
}

/** A specification counts as "Brand" if its name contains the word brand. */
function isBrandSpec(spec: Specification): boolean {
  return /\bbrand\b|\bmake\b/i.test(spec.specification_name);
}

function isYearSpec(spec: Specification): boolean {
  return /\byear\b/i.test(spec.specification_name);
}

function isKmSpec(spec: Specification): boolean {
  return /\bkm\b|\bkilometers?\b|\bmileage\b|\bodometer\b|\bdriven\b/i.test(spec.specification_name);
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
  helperText,
}: {
  spec: Specification;
  value: string;
  onChange: (val: string) => void;
  values: SpecificationValue[];
  loading: boolean;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helperText?: string;
}) {
  const isSelectable = spec.type === "selectable";

  if (isSelectable) {
    return (
      <Box sx={{ position: "relative" }}>
        <FormSelectField
          label={
            loading
              ? `${spec.specification_name} (loading...)`
              : values.length === 0
                ? `${spec.specification_name} (no values)`
                : spec.specification_name
          }
          value={value}
          onChange={(v) =>
            onChange(typeof v === "string" ? v : ((v as any)?.value ?? ""))
          }
          options={values.map((sv) => ({
            value: sv._id,
            label: sv.specification_value_name,
          }))}
          disabled={disabled || loading || values.length === 0}
          required
          error={error}
          helperText={helperText}
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
      </Box>
    );
  }

  return (
    <FormTextField
      label={spec.specification_name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required
      error={error}
      helperText={helperText}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BuySellForm({
  product,
  mode,
  onSuccess,
  requireAuth = false,
  loginHref = "/login",
  cancelHref,
  backLabel,
  presentation = "admin",
}: BuySellFormProps) {
  const isMarketplace = presentation === "marketplace";
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
  const [authReady, setAuthReady] = useState(false);

  const cancelTarget = cancelHref ?? routes.buysell.list();
  const backButtonLabel = backLabel ?? "Back to list";
  const [isDraft, setIsDraft] = useState(() => {
    if (isEdit && product?.status) {
      return toStatus(product.status) === "draft";
    }
    return values.status === "draft";
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ── Image state ───────────────────────────────────────────────────────────
  const [imageEntries, setImageEntries] = useState<ImageEntry[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

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
    async (specId: string) => {
      if (!specId) return;
      const spec = specifications.find((s) => s._id === specId);
      if (!spec || spec.type !== "selectable") return;
      if (specValueMap[specId] !== undefined || specValueLoadingMap[specId])
        return;
      setSpecValueLoadingMap((prev) => ({ ...prev, [specId]: true }));
      try {
        const fetched = await getSpecificationValues({
          specification_id: specId,
        });
        setSpecValueMap((prev) => ({ ...prev, [specId]: fetched ?? [] }));
      } catch {
        setSpecValueMap((prev) => ({ ...prev, [specId]: [] }));
      } finally {
        setSpecValueLoadingMap((prev) => ({ ...prev, [specId]: false }));
      }
    },
    [specifications, specValueMap, specValueLoadingMap],
  );

  // ── Bootstrap data on mount ───────────────────────────────────────────────
  useEffect(() => {
    getCurrentUser()
      .then((u) => setCurrentUser(u as User))
      .catch(() => setCurrentUser(null))
      .finally(() => setAuthReady(true));

    getSpecifications({ status: "Active" })
      .then((specs) => {
        setSpecifications(specs);
        specs.forEach((spec) => {
          if (spec.type === "selectable") {
            getSpecificationValues({ specification_id: spec._id })
              .then((fetched) =>
                setSpecValueMap((prev) => ({
                  ...prev,
                  [spec._id]: fetched ?? [],
                })),
              )
              .catch(() =>
                setSpecValueMap((prev) => ({ ...prev, [spec._id]: [] })),
              );
          }
        });
      })
      .catch(() => {});
  }, []);

  // ── Split specifications into "Brand" vs the rest (Vehicle Details) ──────
  const brandSpec = useMemo(
    () => specifications.find(isBrandSpec),
    [specifications],
  );
  const vehicleDetailSpecs = useMemo(
    () => specifications.filter((s) => s._id !== brandSpec?._id),
    [specifications, brandSpec],
  );

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(
    () =>
      Array.from({ length: currentYear - 1980 + 1 }, (_, i) => ({
        value: String(1980 + i),
        label: String(1980 + i),
      })),
    [currentYear],
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
      setSpecValueMap((prev) => ({ ...prev, [brandSpec._id]: [] }));
      return;
    }
    if (lastBrandSubcategoryRef.current === subId) return;
    lastBrandSubcategoryRef.current = subId;

    setBrandLoading(true);
    getSpecificationValues({
      specification_id: brandSpec._id,
      subcategory_id: subId,
    })
      .then((fetched) => {
        setSpecValueMap((prev) => ({
          ...prev,
          [brandSpec._id]: fetched ?? [],
        }));
        // The brand chosen for a different sub category is no longer valid.
        const idx = values.specifications.findIndex(
          (s) => s.specification_id === brandSpec._id,
        );
        const stillValid =
          idx >= 0 &&
          (fetched ?? []).some(
            (v) => v._id === values.specifications[idx].specification_value,
          );
        if (idx >= 0 && !stillValid) {
          updateSpecValue(brandSpec._id, "");
        }
      })
      .catch(() =>
        setSpecValueMap((prev) => ({ ...prev, [brandSpec._id]: [] })),
      )
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
      values.specifications.map((s) => [
        s.specification_id,
        s.specification_value,
      ]),
    );

    const merged = specifications.map((spec) => ({
      specification_id: spec._id,
      specification_value: existingMap.get(spec._id) ?? "",
    }));

    setFieldValue("specifications", merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specifications]);

  const getSpecEntry = useCallback(
    (specId: string) => {
      const idx = values.specifications.findIndex(
        (s) => s.specification_id === specId,
      );
      return {
        idx,
        value: idx >= 0 ? values.specifications[idx].specification_value : "",
      };
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

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const setFieldError = useCallback((field: string, message: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
  }, []);

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

    const productSpecs = (product.specifications || []).map((s) => ({
      specification_id: String(s.specification_id),
      specification_value: String(s.specification_value),
    }));

    if (specifications.length > 0) {
      const existingMap = new Map(
        productSpecs.map((s) => [s.specification_id, s.specification_value]),
      );
      const merged = specifications.map((spec) => ({
        specification_id: spec._id,
        specification_value: existingMap.get(spec._id) ?? "",
      }));
      setFieldValue("specifications", merged);
    } else {
      setFieldValue("specifications", productSpecs);
    }

    setFieldValue("address", product.address ?? "");
    setFieldValue("pincode", product.pincode ?? "");

    // Seed location from product ids (ObjectId, populated object, or string).
    const extractId = (raw: unknown): string => {
      if (raw == null || raw === "") return "";
      if (typeof raw === "object") {
        const obj = raw as { id?: unknown; _id?: unknown };
        return String(obj.id ?? obj._id ?? "");
      }
      return String(raw);
    };

    setLocation({
      countryId: extractId(product.country_id),
      country: product.country_info?.name ?? "",
      stateId: extractId(product.state_id) || extractId(product.state_info),
      state: product.state_info?.name ?? "",
      cityId: extractId(product.city_id) || extractId(product.city_info),
      city: product.city_info?.name ?? "",
    });

    // toStatus() converts any API string → valid BuySellStatus union member
    const savedStatus = toStatus(product.status);
    setFieldValue("status", savedStatus);
    setIsDraft(savedStatus === "draft");

    const existing: ImageEntry[] = (product.images ?? [])
      .map((url) => ({ kind: "existing" as const, url }));

    setImageEntries(existing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, specifications, setFieldValue]);

  // ── Preload spec values on edit ───────────────────────────────────────────
  useEffect(() => {
    if (!product || specifications.length === 0) return;
    product.specifications?.forEach((s) => {
      const specId = String(s.specification_id);
      if (specId) ensureSpecValuesLoaded(specId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, specifications]);

  // ── Sync isDraft → form status ─────────────────────────────────────────────
  useEffect(() => {
    const next: BuySellStatus = isDraft ? "draft" : "pending";
    setFieldValue("status", next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDraft, isEdit]);

  // ── Image handlers ────────────────────────────────────────────────────────
  const handleImageFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const remainingSlots = 9 - imageEntries.length;
    if (remainingSlots <= 0) {
      setError("You can upload a maximum of 9 images.");
      e.target.value = "";
      return;
    }

    const filesToAdd = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      setError(
        `Only ${remainingSlots} more image(s) can be added (max 9 total).`,
      );
    } else {
      setError("");
    }

    const newEntries: ImageEntry[] = filesToAdd.map((file) => ({
      kind: "new" as const,
      file,
      preview: URL.createObjectURL(file),
    }));
    setImageEntries((prev) => [...prev, ...newEntries]);
    e.target.value = "";
  };

  const handleRemoveImage = (idx: number) => {
    setImageEntries((prev) => {
      const entry = prev[idx];
      if (entry.kind === "new") URL.revokeObjectURL(entry.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  // ── Step validation ────────────────────────────────────────────────────────
  const validateStep = useCallback(
    (step: number): string | null => {
      if (step === 0) {
        if (!values.category_id) return "Category is required";
        if (!values.subcategory_id) return "Sub category is required";
        if (brandSpec) {
          const brandEntry = getSpecEntry(brandSpec._id);
          if (brandEntry.idx < 0 || !brandEntry.value.trim())
            return "Brand is required";
        }
        if (!values.price || isNaN(Number(values.price)))
          return "Valid price is required";
        if (Number(values.price) < 10000)
          return "Price must be at least ₹10,000";
        return null;
      }
      if (step === 1) {
        for (const spec of vehicleDetailSpecs) {
          const entry = getSpecEntry(spec._id);
          if (entry.idx < 0 || !entry.value.trim())
            return `${spec.specification_name} is required`;
        }
        return null;
      }
      if (step === 2) {
        if (!location.countryId) return "Country is required";
        if (!location.stateId) return "State is required";
        if (!location.cityId) return "City is required";
        if (!values.address.trim()) return "Address is required";
        if (!values.pincode.trim()) return "Pincode is required";
        return null;
      }
      if (step === 3) {
        if (imageEntries.length < 4)
          return "At least 4 images are required";
        if (imageEntries.length > 9)
          return "You can upload a maximum of 9 images";
        return null;
      }
      return null;
    },
    [
      values.category_id,
      values.subcategory_id,
      values.price,
      values.description,
      values.address,
      values.pincode,
      values.status,
      location.countryId,
      location.stateId,
      location.cityId,
      imageEntries,
      brandSpec,
      vehicleDetailSpecs,
      getSpecEntry,
    ],
  );

  const setFieldErrorsForStep = useCallback(
    (step: number) => {
      if (step === 0) {
        if (!values.category_id) setFieldError("category_id", "Category is required");
        else clearFieldError("category_id");
        if (!values.subcategory_id)
          setFieldError("subcategory_id", "Sub category is required");
        else clearFieldError("subcategory_id");
        if (brandSpec) {
          const brandEntry = getSpecEntry(brandSpec._id);
          if (brandEntry.idx < 0 || !brandEntry.value.trim())
            setFieldError(`spec_${brandSpec._id}`, "Brand is required");
          else clearFieldError(`spec_${brandSpec._id}`);
        }
        if (!values.price || isNaN(Number(values.price)))
          setFieldError("price", "Valid price is required");
        else clearFieldError("price");
      }
      if (step === 1) {
        for (const spec of vehicleDetailSpecs) {
          const entry = getSpecEntry(spec._id);
          if (entry.idx < 0 || !entry.value.trim())
            setFieldError(`spec_${spec._id}`, "This field is required");
          else clearFieldError(`spec_${spec._id}`);
        }
      }
      if (step === 2) {
        if (!location.countryId) setFieldError("country_id", "Country is required");
        else clearFieldError("country_id");
        if (!location.stateId) setFieldError("state_id", "State is required");
        else clearFieldError("state_id");
        if (!location.cityId) setFieldError("city_id", "City is required");
        else clearFieldError("city_id");
        if (!values.address.trim()) setFieldError("address", "Address is required");
        else clearFieldError("address");
        if (!values.pincode.trim()) setFieldError("pincode", "Pincode is required");
        else clearFieldError("pincode");
      }
      if (step === 3) {
        if (imageEntries.length < 4)
          setFieldError("images", "At least 4 images are required");
        else clearFieldError("images");
      }
    },
    [
      values.category_id,
      values.subcategory_id,
      values.price,
      values.description,
      values.address,
      values.pincode,
      values.status,
      location.countryId,
      location.stateId,
      location.cityId,
      imageEntries,
      brandSpec,
      vehicleDetailSpecs,
      getSpecEntry,
      setFieldError,
      clearFieldError,
    ],
  );

  const handleNext = () => {
    setFieldErrorsForStep(activeStep);
    const err = validateStep(activeStep);
    if (err) {
      setError(err);
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
    for (let i = 0; i < step; i++) {
      if (validateStep(i)) {
        setFieldErrorsForStep(i);
        setError(validateStep(i) as string);
        setActiveStep(i);
        return;
      }
    }
    setFieldErrorsForStep(step);
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

    const stepZeroErr = validateStep(0);
    if (stepZeroErr) {
      setFieldErrorsForStep(0);
      setActiveStep(0);
      return setError(stepZeroErr);
    }
    const stepTwoErr = validateStep(2);
    if (stepTwoErr) {
      setFieldErrorsForStep(2);
      setActiveStep(2);
      return setError(stepTwoErr);
    }

    setSubmitting(true);
    try {
      // Upload any newly picked files first, keep existing URLs as-is.
      // We keep the original order so the saved image order matches the preview grid.
      setUploadingImages(true);
      const finalImages: string[] = [];

      for (const entry of imageEntries) {
        if (entry.kind === "existing") {
          const path = toRelativeUploadPath(entry.url);
          if (path) finalImages.push(path);
        } else {
          const url = await uploadFile(entry.file, "buy_sell_doc");
          const path = toRelativeUploadPath(url);
          if (path) finalImages.push(path);
        }
      }
      setUploadingImages(false);

      const payload: BuySellCreatePayload = {
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
        status: values.status,
        // Backend accepts `images` (preferred) and `existing_images` (legacy).
        images: finalImages,
        existing_images: finalImages,
      };

      let successContext: BuySellFormSuccessContext | undefined;

      if (isEdit && product) {
        await updateBuySellProduct(getBuySellRowId(product), payload);
        notify({ type: "success", message: "Product updated successfully." });
        successContext = { product, mode: "edit" };
      } else {
        const { product: created } = await createBuySellProduct(payload);
        if (!onSuccess) {
          notify({ type: "success", message: "Product created successfully." });
        }
        successContext = { product: created, mode: "create" };
      }

      if (onSuccess) {
        onSuccess(successContext);
      } else {
        router.push(cancelTarget);
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : isEdit
            ? "Failed to update"
            : "Failed to create";
      console.error("[BuySellForm submit error]", err);
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
        variant="outlined"
        onClick={
          activeStep === 0 ? () => router.push(cancelTarget) : handleBack
        }
        startIcon={
          activeStep !== 0 ? <ArrowBackIcon sx={{ fontSize: 14 }} /> : undefined
        }
        disabled={submitting}
      >
        {activeStep === 0 ? "Cancel" : "Back"}
      </Button>

      {!isLastStep ? (
        <Button
          variant="contained"
          onClick={handleNext}
          endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
          disabled={submitting}
        >
          Next
        </Button>
      ) : (
        <FormFooter
          formId={FORM_ID}
          submitting={submitting}
          submitLabel={
            isEdit
              ? "Update listing"
              : isMarketplace
                ? "Publish listing"
                : "Create"
          }
          submittingLabel={
            uploadingImages
              ? "Uploading images..."
              : isEdit
                ? "Updating..."
                : isMarketplace
                  ? "Publishing..."
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
          <Button
            color="inherit"
            size="small"
            onClick={() => router.push(loginHref)}
          >
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

  const stepper = (
    <Stepper
      activeStep={activeStep}
      alternativeLabel={isMarketplace}
      sx={{
        mb: 3,
        cursor: "pointer",
        "& .MuiStepLabel-label": { typography: "caption" },
      }}
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
  );

  const formFields = (
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
            subtitle="Pick a category, sub category and brand to get started."
          />
          <FormGrid>
            <CategorySubcategorySelector
              variant="form"
              categoryId={values.category_id}
              subcategoryId={values.subcategory_id}
              onCategoryChange={(id) => {
                setFieldValue("category_id", id);
                clearFieldError("category_id");
              }}
              onSubcategoryChange={(id) => {
                setFieldValue("subcategory_id", id);
                clearFieldError("subcategory_id");
              }}
              required
              categoryError={!!fieldErrors["category_id"]}
              subcategoryError={!!fieldErrors["subcategory_id"]}
            />

            {brandSpec && (
              <SpecField
                spec={brandSpec}
                value={getSpecEntry(brandSpec._id).value}
                onChange={(v) => {
                  updateSpecValue(brandSpec._id, v);
                  clearFieldError(`spec_${brandSpec._id}`);
                }}
                values={specValueMap[brandSpec._id] ?? []}
                loading={brandLoading}
                disabled={!values.subcategory_id}
                required
                error={!!fieldErrors[`spec_${brandSpec._id}`]}
                helperText={fieldErrors[`spec_${brandSpec._id}`]}
              />
            )}

            <FormTextField
              label="Price (₹)"
              value={values.price}
              onChange={(v) => {
                const numeric = v.replace(/\D/g, "");
                setFieldValue("price", numeric);
                clearFieldError("price");
              }}
              required
              error={!!fieldErrors["price"]}
              helperText={fieldErrors["price"]}
            />

            <FormGridFull>
              <FormTextField
                label="Description"
                value={values.description}
                onChange={(v) => {
                  setFieldValue("description", v);
                  clearFieldError("description");
                }}
                multiline
                rows={3}
                error={!!fieldErrors["description"]}
                helperText={fieldErrors["description"]}
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
            subtitle="All fields below are required."
          />
          {vehicleDetailSpecs.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No additional details are configured for this category.
            </Typography>
          ) : (
            <FormGrid>
              {vehicleDetailSpecs.map((spec) => {
                if (isYearSpec(spec)) {
                  return (
                    <FormSelectField
                      key={spec._id}
                      label={spec.specification_name}
                      value={getSpecEntry(spec._id).value}
                      onChange={(v) => {
                        updateSpecValue(spec._id, v);
                        clearFieldError(`spec_${spec._id}`);
                      }}
                      options={yearOptions}
                      required
                      error={!!fieldErrors[`spec_${spec._id}`]}
                      helperText={fieldErrors[`spec_${spec._id}`]}
                    />
                  );
                }
                if (isKmSpec(spec)) {
                  return (
                    <FormTextField
                      key={spec._id}
                      label={spec.specification_name}
                      value={getSpecEntry(spec._id).value}
                      onChange={(v) => {
                        const numeric = v.replace(/\D/g, "");
                        updateSpecValue(spec._id, numeric);
                        clearFieldError(`spec_${spec._id}`);
                      }}
                      required
                      error={!!fieldErrors[`spec_${spec._id}`]}
                      helperText={fieldErrors[`spec_${spec._id}`]}
                    />
                  );
                }
                return (
                  <SpecField
                    key={spec._id}
                    spec={spec}
                    value={getSpecEntry(spec._id).value}
                    onChange={(v) => {
                      updateSpecValue(spec._id, v);
                      clearFieldError(`spec_${spec._id}`);
                    }}
                    values={specValueMap[spec._id] ?? []}
                    loading={!!specValueLoadingMap[spec._id]}
                    required
                    error={!!fieldErrors[`spec_${spec._id}`]}
                    helperText={fieldErrors[`spec_${spec._id}`]}
                  />
                );
              })}
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
              countryError={!!fieldErrors["country_id"]}
              stateError={!!fieldErrors["state_id"]}
              cityError={!!fieldErrors["city_id"]}
              countryHelperText={fieldErrors["country_id"]}
              stateHelperText={fieldErrors["state_id"]}
              cityHelperText={fieldErrors["city_id"]}
            />

            <FormGridFull>
              <FormTextField
                label="Address"
                value={values.address}
                onChange={(v) => {
                  setFieldValue("address", v);
                  clearFieldError("address");
                }}
                required
                error={!!fieldErrors["address"]}
                helperText={fieldErrors["address"]}
              />
            </FormGridFull>

            <FormTextField
              label="Pincode"
              value={values.pincode}
              onChange={(v) => {
                const numeric = v.replace(/\D/g, "");
                setFieldValue("pincode", numeric);
                clearFieldError("pincode");
              }}
              required
              error={!!fieldErrors["pincode"]}
              helperText={fieldErrors["pincode"]}
            />
          </FormGrid>
        </Box>
      )}

      {/* ── Step 3: Images & Status ──────────────────────────────────── */}
      {activeStep === 3 && (
        <Box>
          <StepIntro
            title="Photos"
            subtitle="Upload at least 4 photos of your vehicle."
          />

          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            style={{ display: "none" }}
            onChange={handleImageFilePick}
          />

          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            disabled={submitting || imageEntries.length >= 9}
            onClick={() => imageInputRef.current?.click()}
            sx={{ mb: 2 }}
          >
            {imageEntries.length === 0
              ? "Upload Images"
              : imageEntries.length >= 9
                ? "Maximum 9 images reached"
                : "Add More Images"}{" "}
          </Button>

          {fieldErrors["images"] && (
            <Typography
              variant="caption"
              color="error"
              sx={{ display: "block", mb: 2 }}
            >
              {fieldErrors["images"]}
            </Typography>
          )}

          {imageEntries.length > 0 ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                gap: 1.5,
                mb: 3,
              }}
            >
              {imageEntries.map((entry, idx) => {
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
                      borderRadius: 1,
                      overflow: "hidden",
                      border: "1px solid",
                      borderColor: isNew ? "primary.main" : "divider",
                      aspectRatio: "1 / 1",
                      bgcolor: "grey.100",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`Image ${idx + 1}`}
                      onError={(e) => {
                        const img = e.currentTarget;
                        img.style.display = "none";
                        const fallback =
                          img.nextElementSibling as HTMLElement | null;
                        if (fallback) fallback.style.display = "flex";
                      }}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    <Box
                      sx={{
                        display: "none",
                        position: "absolute",
                        inset: 0,
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "column",
                        gap: 0.5,
                        bgcolor: "grey.100",
                        px: 1,
                        textAlign: "center",
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mb: 1 }}
                      >
                        {imageEntries.length}/9 images added
                      </Typography>
                    </Box>
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
          ) : (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 3 }}
            >
              No images added yet. Click "Upload Images" to pick files from your
              device.
            </Typography>
          )}

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontWeight: 600,
                  fontSize: "0.68rem",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Status
              </Typography>
              <ProductStatusChip status={isDraft ? "draft" : "pending"} />
            </Box>

            {(!isEdit || toStatus(product?.status) !== "pending") && (
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1.5,
                  py: 0.75,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  bgcolor: "transparent",
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
                  {isDraft ? "Draft" : "Pending"}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );

  const formAlerts = error ? (
    <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2.5 }}>
      {error}
    </Alert>
  ) : null;

  if (isMarketplace) {
    return (
      <Box
        sx={{
          bgcolor: T.color.surface,
          border: `1px solid ${T.color.border}`,
          borderRadius: T.radius.lg,
          boxShadow: T.shadow.card,
          overflow: "hidden",
        }}
      >
        <Box sx={{ px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 3 } }}>
          {stepper}
          {formAlerts}
          {formFields}
        </Box>
        <Box sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 } }}>
          {stepFooter}
        </Box>
      </Box>
    );
  }

  return (
    <FormPageLayout
      title={isEdit ? "Edit Listing" : "Create Listing"}
      subtitle={
        isEdit
          ? product?.description || "Update your buy/sell listing."
          : "Post a new buy/sell listing."
      }
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Buy / Sell", href: routes.buysell.list() },
        { label: isEdit ? "Edit" : "Create" },
      ]}
      backButton={
        <BackButton fallback={cancelTarget} label={backButtonLabel} />
      }
      footer={stepFooter}
    >
      {stepper}
      {formAlerts}
      {formFields}
    </FormPageLayout>
  );
}

export default BuySellForm;
