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

import { getCurrentUser, type User } from "@/model/api";
import {
  getSpecifications,
  getSpecificationValues,
  type Specification,
  type SpecificationValue,
} from "@/model/api";
import { routes } from "@/lib/routes";
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

type ImageEntry =
  | { kind: "existing"; url: string }
  | { kind: "new"; file: File; preview: string };

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

/** A specification counts as "Brand" if its name contains the word brand. */
function isBrandSpec(spec: Specification): boolean {
  return /\bbrand\b|\bmake\b/i.test(spec.specification_name);
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
}: {
  spec: Specification;
  value: string;
  onChange: (val: string) => void;
  values: SpecificationValue[];
  loading: boolean;
  disabled?: boolean;
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
          onChange={(v) => onChange(typeof v === "string" ? v : ((v as any)?.value ?? ""))}
          options={values.map((sv) => ({
            value: sv._id,
            label: sv.specification_value_name,
          }))}
          disabled={disabled || loading || values.length === 0}
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
  const [authReady, setAuthReady] = useState(false);

  const cancelTarget = cancelHref ?? routes.buysell.list();
  const backButtonLabel = backLabel ?? "Back to list";
  const [isDraft, setIsDraft] = useState(false);

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
    getSpecificationValues({ specification_id: brandSpec._id, subcategory_id: subId })
      .then((fetched) => {
        setSpecValueMap((prev) => ({ ...prev, [brandSpec._id]: fetched ?? [] }));
        // The brand chosen for a different sub category is no longer valid.
        const idx = values.specifications.findIndex(
          (s) => s.specification_id === brandSpec._id,
        );
        const stillValid =
          idx >= 0 &&
          (fetched ?? []).some((v) => v._id === values.specifications[idx].specification_value);
        if (idx >= 0 && !stillValid) {
          updateSpecValue(brandSpec._id, "");
        }
      })
      .catch(() => setSpecValueMap((prev) => ({ ...prev, [brandSpec._id]: [] })))
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
    if (!files.length) return;
    const newEntries: ImageEntry[] = files.map((file) => ({
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
        if (!values.price || isNaN(Number(values.price)))
          return "Valid price is required";
        return null;
      }
      if (step === 2) {
        if (!location.countryId) return "Country is required";
        if (!location.stateId) return "State is required";
        if (!location.cityId) return "City is required";
        return null;
      }
      return null;
    },
    [values.category_id, values.subcategory_id, values.price, location.countryId, location.stateId, location.cityId],
  );

  const handleNext = () => {
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
    // Only allow jumping to a step already reachable (all prior steps valid)
    for (let i = 0; i < step; i++) {
      if (validateStep(i)) {
        setError(validateStep(i) as string);
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

    const stepZeroErr = validateStep(0);
    if (stepZeroErr) {
      setActiveStep(0);
      return setError(stepZeroErr);
    }
    const stepTwoErr = validateStep(2);
    if (stepTwoErr) {
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
        variant="outlined"
        onClick={activeStep === 0 ? () => router.push(cancelTarget) : handleBack}
        startIcon={activeStep !== 0 ? <ArrowBackIcon sx={{ fontSize: 14 }} /> : undefined}
        disabled={submitting}
      >
        {activeStep === 0 ? "Cancel" : "Back"}
      </Button>

      {!isLastStep ? (
        <Button
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
      backButton={<BackButton fallback={cancelTarget} label={backButtonLabel} />}
      footer={stepFooter}
    >
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

      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2.5 }}>
          {error}
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
                subtitle="Pick a category, sub category and brand to get started."
              />
              <FormGrid>
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
                    value={getSpecEntry(brandSpec._id).value}
                    onChange={(v) => updateSpecValue(brandSpec._id, v)}
                    values={specValueMap[brandSpec._id] ?? []}
                    loading={brandLoading}
                    disabled={!values.subcategory_id}
                  />
                )}

                <FormTextField
                  label="Price (₹)"
                  value={values.price}
                  onChange={(v) => setFieldValue("price", v)}
                  required
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
                subtitle="Fill in the details you know — you can leave the rest blank."
              />
              {vehicleDetailSpecs.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No additional details are configured for this category.
                </Typography>
              ) : (
                <FormGrid>
                  {vehicleDetailSpecs.map((spec) => (
                    <SpecField
                      key={spec._id}
                      spec={spec}
                      value={getSpecEntry(spec._id).value}
                      onChange={(v) => updateSpecValue(spec._id, v)}
                      values={specValueMap[spec._id] ?? []}
                      loading={!!specValueLoadingMap[spec._id]}
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
                  />
                </FormGridFull>

                <FormTextField
                  label="Pincode"
                  value={values.pincode}
                  onChange={(v) => setFieldValue("pincode", v)}
                />
              </FormGrid>
            </Box>
          )}

          {/* ── Step 3: Images & Status ──────────────────────────────────── */}
          {activeStep === 3 && (
            <Box>
              <StepIntro
                title="Photos & Listing Status"
                subtitle="Add a few photos and choose whether to publish now or save as a draft."
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
                disabled={submitting}
                onClick={() => imageInputRef.current?.click()}
                sx={{ mb: 2 }}
              >
                {imageEntries.length === 0 ? "Upload Images" : "Add More Images"}
              </Button>

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
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 3 }}>
                  No images added yet. Click "Upload Images" to pick files from
                  your device.
                </Typography>
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
                  <Chip
                    label={isDraft ? "Draft" : "Pending"}
                    size="small"
                    color={isDraft ? "default" : "warning"}
                    variant="filled"
                    sx={{ fontSize: 11, height: 20, pointerEvents: "none" }}
                  />
                </Box>
              )}
            </Box>
          )}
        </Box>
    </FormPageLayout>
  );
}

export default BuySellForm;