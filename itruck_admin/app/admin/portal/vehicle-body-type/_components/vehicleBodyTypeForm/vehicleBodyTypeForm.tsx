"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import LinearProgress from "@mui/material/LinearProgress";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import SyncOutlinedIcon from "@mui/icons-material/SyncOutlined";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import StraightenOutlinedIcon from "@mui/icons-material/StraightenOutlined";
import type {
  User,
  VehicleBodyType,
  VehicleBodyTypePayload,
} from "@/model/api";
import {
  createVehicleBodyType,
  getCurrentUser,
  getRowId,
  updateVehicleBodyType,
} from "@/model/api";
import { useNotification } from "@/hooks/useNotification";
import { resolveApiBase, getAuthHeaders } from "@/model/services/common";
import { getFileUrl } from "@/lib/fileUrl";
import type { FormState } from "../interface/vehicleBodyTypeTypes";
import { EMPTY_FORM } from "../interface/vehicleBodyTypeTypes";
import { routes } from "@/lib/routes";

export interface VehicleBodyTypeFormProps {
  vehicleBodyType?: VehicleBodyType;
  mode?: "create" | "edit";
  onSuccess?: () => void;
}

const WHEEL_OPTIONS: number[] = Array.from(
  { length: 19 },
  (_, i) => (i + 2) * 2,
);
const LENGTH_OPTIONS: number[] = Array.from({ length: 45 }, (_, i) => i + 6);
const CAPACITY_LENGTH_OPTIONS: number[] = Array.from(
  { length: 45 },
  (_, i) => i + 6,
);

type Step = 0 | 1 | 2 | 3 | 4;

const STEPS = [
  {
    label: "Basic info",
    icon: <LocalShippingOutlinedIcon sx={{ fontSize: 18 }} />,
  },
  { label: "Wheels", icon: <SyncOutlinedIcon sx={{ fontSize: 18 }} /> },
  { label: "Length", icon: <SwapHorizOutlinedIcon sx={{ fontSize: 18 }} /> },
  { label: "Capacity", icon: <StraightenOutlinedIcon sx={{ fontSize: 18 }} /> },
  { label: "Review", icon: <ListAltOutlinedIcon sx={{ fontSize: 18 }} /> },
];

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("key", "vehicle_body");
  formData.append("file", file);
  const res = await fetch(`${resolveApiBase()}/api/upload`, {
    method: "POST",
    body: formData,
    headers: { ...getAuthHeaders() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "File upload failed");
  return (data.url || data.path) as string;
}

function toggleValue(arr: number[], val: number): number[] {
  return arr.includes(val)
    ? arr.filter((v) => v !== val)
    : [...arr, val].sort((a, b) => a - b);
}

// ── Stepper dots ─────────────────────────────────────────────────────────────
function StepperDots({ current }: { current: Step }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <Box
            key={i}
            sx={{
              display: "flex",
              alignItems: "center",
              flex: i < STEPS.length - 1 ? 1 : "none",
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid",
                  borderColor: done
                    ? "success.main"
                    : active
                      ? "primary.main"
                      : "divider",
                  bgcolor: done
                    ? "success.main"
                    : active
                      ? "primary.main"
                      : "background.paper",
                  color: done || active ? "#fff" : "text.secondary",
                  transition: "all .2s",
                }}
              >
                {done ? (
                  <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />
                ) : (
                  s.icon
                )}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: done
                    ? "success.main"
                    : active
                      ? "primary.main"
                      : "text.secondary",
                  fontWeight: active || done ? 600 : 400,
                  whiteSpace: "nowrap",
                }}
              >
                {s.label}
              </Typography>
            </Box>
            {i < STEPS.length - 1 && (
              <Box
                sx={{
                  flex: 1,
                  height: "1px",
                  bgcolor: done ? "success.main" : "divider",
                  mx: 1,
                  mb: "18px",
                  transition: "background .2s",
                }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
}

// ── Chip selector ─────────────────────────────────────────────────────────────
function ChipSelector({
  options,
  selected,
  onChange,
  unit = "",
}: {
  options: number[];
  selected: number[];
  onChange: (v: number[]) => void;
  unit?: string;
}) {
  return (
    <Box>
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          display: "flex",
          flexWrap: "wrap",
          gap: 0.75,
          maxHeight: 148,
          overflowY: "auto",
          bgcolor: "background.default",
        }}
      >
        {options.map((opt) => (
          <Chip
            key={opt}
            label={`${opt}${unit}`}
            size="small"
            onClick={() => onChange(toggleValue(selected, opt))}
            color={selected.includes(opt) ? "primary" : "default"}
            variant={selected.includes(opt) ? "filled" : "outlined"}
            sx={{
              cursor: "pointer",
              fontWeight: selected.includes(opt) ? 600 : 400,
            }}
          />
        ))}
      </Paper>
      {selected.length > 0 && (
        <Typography
          variant="caption"
          sx={{
            mt: 0.5,
            color: "success.main",
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />
          {selected.length} selected: {selected.join(", ")}
          {unit}
        </Typography>
      )}
    </Box>
  );
}

// ── Toggle Yes/No ─────────────────────────────────────────────────────────────
function YesNoToggle({
  value,
  onChange,
}: {
  value: "Yes" | "No";
  onChange: (v: "Yes" | "No") => void;
}) {
  return (
    <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
      {(["No", "Yes"] as const).map((v) => (
        <Button
          key={v}
          variant={value === v ? "contained" : "outlined"}
          color={value === v && v === "Yes" ? "primary" : "inherit"}
          size="small"
          onClick={() => onChange(v)}
          sx={{
            flex: 1,
            fontWeight: value === v ? 600 : 400,
            borderColor: "divider",
            ...(value === v &&
              v === "No" && {
                bgcolor: "action.selected",
                color: "text.secondary",
              }),
          }}
        >
          {v === "Yes" ? "Has variants" : "No variants"}
        </Button>
      ))}
    </Box>
  );
}

// ── Summary card ──────────────────────────────────────────────────────────────
function SummaryCard({
  icon,
  label,
  value,
  chips,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  chips?: number[];
}) {
  return (
    <Box
      sx={{
        bgcolor: "background.default",
        borderRadius: 1.5,
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          color: "text.secondary",
        }}
      >
        {icon}
        <Typography variant="caption" sx={{ fontWeight: 500 }}>
          {label}
        </Typography>
      </Box>
      {chips && chips.length > 0 ? (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.25 }}>
          {chips.map((c) => (
            <Chip
              key={c}
              label={c}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ height: 20, fontSize: 11 }}
            />
          ))}
        </Box>
      ) : (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            color: value ? "text.primary" : "text.disabled",
          }}
        >
          {value || "—"}
        </Typography>
      )}
    </Box>
  );
}

// ── Panel wrapper ─────────────────────────────────────────────────────────────
function StepPanel({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          mb: 2.5,
          pb: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: "primary.50" as string,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "primary.main",
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 600, lineHeight: 1.2 }}
          >
            {title}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {subtitle}
          </Typography>
        </Box>
      </Box>
      {children}
    </Box>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────
export function VehicleBodyTypeForm({
  vehicleBodyType,
  mode,
  onSuccess,
}: VehicleBodyTypeFormProps) {
  const effectiveMode: "create" | "edit" =
    mode ?? (vehicleBodyType ? "edit" : "create");
  const isEdit = effectiveMode === "edit";

  const router = useRouter();
  const { notify } = useNotification();

  const [step, setStep] = useState<Step>(0);
  const [vehicleName, setVehicleName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [hasWheelVariants, setHasWheelVariants] = useState<"Yes" | "No">("No");
  const [availableWheelsCount, setAvailableWheelsCount] = useState<number[]>(
    [],
  );
  const [hasLengthVariants, setHasLengthVariants] = useState<"Yes" | "No">(
    "No",
  );
  const [availableLengths, setAvailableLengths] = useState<number[]>([]);
  const [hasCapacityVariants, setHasCapacityVariants] = useState<
    "Yes" | "No"
  >("No");
  const [availableCapacityLengths, setAvailableCapacityLengths] = useState<
    number[]
  >([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then((u) => setCurrentUser(u as User))
      .catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    setImageFile(null);
    setImagePreviewUrl("");
    if (!vehicleBodyType) {
      setVehicleName("");
      setImageUrl("");
      setHasWheelVariants("No");
      setAvailableWheelsCount([]);
      setHasLengthVariants("No");
      setAvailableLengths([]);
      setHasCapacityVariants("No");
      setAvailableCapacityLengths([]);
      return;
    }
    setVehicleName(vehicleBodyType.vehicle_name || "");
    setImageUrl(vehicleBodyType.image || "");
    setHasWheelVariants(vehicleBodyType.has_wheel_variants ?? "No");
    setAvailableWheelsCount(vehicleBodyType.available_wheels_count ?? []);
    setHasLengthVariants(vehicleBodyType.has_length_variants ?? "No");
    setAvailableLengths(vehicleBodyType.available_lengths ?? []);
    const existingCapacityLengths =
      vehicleBodyType.available_capacity_lengths ?? [];
    setHasCapacityVariants(existingCapacityLengths.length > 0 ? "Yes" : "No");
    setAvailableCapacityLengths(existingCapacityLengths);
  }, [vehicleBodyType]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const previewSrc = useMemo(
    () => imagePreviewUrl || getFileUrl(imageUrl),
    [imagePreviewUrl, imageUrl],
  );

  const goNext = () => {
    if (step === 0) {
      if (!vehicleName.trim()) {
        setNameError(true);
        return;
      }
      setNameError(false);
    }
    setStep((s) => Math.min(s + 1, 4) as Step);
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0) as Step);

  const handleSubmit = async () => {
    setError("");
    const name = vehicleName.trim();
    if (!name) {
      setStep(0);
      setNameError(true);
      return;
    }

    const userPayload = currentUser
      ? { name: currentUser.name, role: currentUser.role }
      : undefined;

    setSubmitting(true);
    try {
      let nextImage = imageUrl;
      if (imageFile) nextImage = await uploadImage(imageFile);

      const payload: VehicleBodyTypePayload = {
        vehicle_name: name,
        image: nextImage || undefined,
        user: userPayload,
        has_wheel_variants: hasWheelVariants,
        ...(hasWheelVariants === "Yes" && {
          available_wheels_count: availableWheelsCount,
        }),
        has_length_variants: hasLengthVariants,
        ...(hasLengthVariants === "Yes" && {
          available_lengths: availableLengths,
        }),
        ...(hasCapacityVariants === "Yes" && {
          available_capacity_lengths: availableCapacityLengths,
        }),
      };

      if (isEdit && vehicleBodyType) {
        await updateVehicleBodyType(getRowId(vehicleBodyType), payload);
        notify({
          type: "success",
          message: "Vehicle body type updated successfully.",
        });
      } else {
        await createVehicleBodyType(payload);
        notify({
          type: "success",
          message: "Vehicle body type created successfully.",
        });
      }

      onSuccess ? onSuccess() : router.push(routes.vehicleBodyType.list());
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
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <Box>
      <Box
        sx={{
          px: 4,
          py: 4,
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 1,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 3,
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {isEdit ? "Edit vehicle body type" : "Create vehicle body type"}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", mt: 0.25 }}
            >
              {isEdit
                ? vehicleBodyType?.vehicle_name
                : "Add a new vehicle body type to the fleet system"}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push(routes.vehicleBodyType.list())}
          >
            Back to list
          </Button>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Stepper */}
        <StepperDots current={step} />

        {/* Progress bar */}
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ mb: 3, height: 3, borderRadius: 2 }}
        />

        {/* Step 0 — Basic info */}
        {step === 0 && (
          <StepPanel
            icon={<LocalShippingOutlinedIcon />}
            title="Basic info"
            subtitle="Name your vehicle body type and optionally add an image"
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 500,
                    color: "text.secondary",
                    display: "block",
                    mb: 0.75,
                  }}
                >
                  Vehicle body type name{" "}
                  <span style={{ color: "#e24b4a" }}>*</span>
                </Typography>
                <Box
                  component="input"
                  value={vehicleName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setVehicleName(e.target.value);
                    if (e.target.value.trim()) setNameError(false);
                  }}
                  placeholder="e.g. Flatbed, Container, Tanker, Tipper…"
                  sx={{
                    width: "100%",
                    padding: "10px 14px",
                    fontSize: 14,
                    borderRadius: 1.5,
                    border: "1px solid",
                    borderColor: nameError ? "error.main" : "divider",
                    bgcolor: "background.paper",
                    color: "text.primary",
                    outline: "none",
                    "&:focus": {
                      borderColor: "primary.main",
                      boxShadow: "0 0 0 3px rgba(83,74,183,0.1)",
                    },
                  }}
                />
                {nameError && (
                  <Typography
                    variant="caption"
                    color="error"
                    sx={{ mt: 0.5, display: "block" }}
                  >
                    Vehicle body type name is required
                  </Typography>
                )}
              </Box>

              {/* Image upload */}
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 500,
                    color: "text.secondary",
                    display: "block",
                    mb: 0.75,
                  }}
                >
                  Vehicle image
                </Typography>
                <Box
                  component="label"
                  htmlFor="vbt-img-upload"
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    p: 3,
                    border: "1.5px dashed",
                    borderColor: previewSrc ? "success.main" : "divider",
                    borderRadius: 2,
                    bgcolor: previewSrc
                      ? ("success.50" as string)
                      : "background.default",
                    cursor: "pointer",
                    transition: "all .15s",
                    "&:hover": {
                      borderColor: "primary.main",
                      bgcolor: "primary.50" as string,
                    },
                  }}
                >
                  {previewSrc ? (
                    <>
                      <Box
                        component="img"
                        src={previewSrc}
                        alt="preview"
                        sx={{
                          width: 100,
                          height: 75,
                          objectFit: "cover",
                          borderRadius: 1.5,
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{ color: "success.main", fontWeight: 500 }}
                      >
                        {imageFile ? imageFile.name : "Current image"} · Click
                        to change
                      </Typography>
                    </>
                  ) : (
                    <>
                      <CloudUploadIcon
                        sx={{ fontSize: 32, color: "text.disabled" }}
                      />
                      <Typography
                        variant="body2"
                        sx={{ color: "text.secondary" }}
                      >
                        Click to upload image
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: "text.disabled" }}
                      >
                        PNG, JPG up to 5MB
                      </Typography>
                    </>
                  )}
                  <Box
                    component="input"
                    id="vbt-img-upload"
                    type="file"
                    accept="image/*"
                    sx={{ display: "none" }}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setImageFile(e.target.files?.[0] || null)
                    }
                  />
                </Box>
              </Box>
            </Box>
          </StepPanel>
        )}

        {/* Step 1 — Wheel variants */}
        {step === 1 && (
          <StepPanel
            icon={<SyncOutlinedIcon />}
            title="Wheel variants"
            subtitle="Does this body type come in different wheel counts?"
          >
            <YesNoToggle
              value={hasWheelVariants}
              onChange={(v) => {
                setHasWheelVariants(v);
                if (v === "No") setAvailableWheelsCount([]);
              }}
            />
            {hasWheelVariants === "Yes" && (
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 500,
                    color: "text.secondary",
                    display: "block",
                    mb: 1,
                  }}
                >
                  Select available wheel counts
                </Typography>
                <ChipSelector
                  options={WHEEL_OPTIONS}
                  selected={availableWheelsCount}
                  onChange={setAvailableWheelsCount}
                  unit=" wheels"
                />
              </Box>
            )}
            {hasWheelVariants === "No" && (
              <Box sx={{ py: 3, textAlign: "center", color: "text.disabled" }}>
                <SyncOutlinedIcon sx={{ fontSize: 36, mb: 1, opacity: 0.4 }} />
                <Typography variant="body2">
                  No wheel variants for this body type
                </Typography>
              </Box>
            )}
          </StepPanel>
        )}

        {/* Step 2 — Length variants */}
        {step === 2 && (
          <StepPanel
            icon={<SwapHorizOutlinedIcon />}
            title="Length variants"
            subtitle="Does this body type come in different lengths?"
          >
            <YesNoToggle
              value={hasLengthVariants}
              onChange={(v) => {
                setHasLengthVariants(v);
                if (v === "No") setAvailableLengths([]);
              }}
            />
            {hasLengthVariants === "Yes" && (
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 500,
                    color: "text.secondary",
                    display: "block",
                    mb: 1,
                  }}
                >
                  Select available lengths (ft)
                </Typography>
                <ChipSelector
                  options={LENGTH_OPTIONS}
                  selected={availableLengths}
                  onChange={setAvailableLengths}
                  unit=" ft"
                />
              </Box>
            )}
            {hasLengthVariants === "No" && (
              <Box sx={{ py: 3, textAlign: "center", color: "text.disabled" }}>
                <SwapHorizOutlinedIcon
                  sx={{ fontSize: 36, mb: 1, opacity: 0.4 }}
                />
                <Typography variant="body2">
                  No length variants for this body type
                </Typography>
              </Box>
            )}
          </StepPanel>
        )}

        {/* Step 3 — Capacity length variants */}
        {step === 3 && (
          <StepPanel
            icon={<StraightenOutlinedIcon />}
            title="Capacity lengths"
            subtitle="Does this body type come in different capacity lengths?"
          >
            <YesNoToggle
              value={hasCapacityVariants}
              onChange={(v) => {
                setHasCapacityVariants(v);
                if (v === "No") setAvailableCapacityLengths([]);
              }}
            />
            {hasCapacityVariants === "Yes" && (
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 500,
                    color: "text.secondary",
                    display: "block",
                    mb: 1,
                  }}
                >
                  Select available capacity lengths (ft)
                </Typography>
                <ChipSelector
                  options={CAPACITY_LENGTH_OPTIONS}
                  selected={availableCapacityLengths}
                  onChange={setAvailableCapacityLengths}
                  unit=" ft"
                />
              </Box>
            )}
            {hasCapacityVariants === "No" && (
              <Box sx={{ py: 3, textAlign: "center", color: "text.disabled" }}>
                <StraightenOutlinedIcon
                  sx={{ fontSize: 36, mb: 1, opacity: 0.4 }}
                />
                <Typography variant="body2">
                  No capacity length variants for this body type
                </Typography>
              </Box>
            )}
          </StepPanel>
        )}

        {/* Step 4 — Review */}
        {step === 4 && (
          <StepPanel
            icon={<ListAltOutlinedIcon />}
            title="Review & confirm"
            subtitle="Check everything before saving"
          >
            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}
            >
              <SummaryCard
                icon={<LocalShippingOutlinedIcon sx={{ fontSize: 15 }} />}
                label="Body type name"
                value={vehicleName || "—"}
              />
              <SummaryCard
                icon={<CloudUploadIcon sx={{ fontSize: 15 }} />}
                label="Image"
                value={
                  imageFile
                    ? imageFile.name
                    : previewSrc
                      ? "Current image"
                      : "No image"
                }
              />
              <SummaryCard
                icon={<SyncOutlinedIcon sx={{ fontSize: 15 }} />}
                label="Wheel variants"
                chips={
                  hasWheelVariants === "Yes" && availableWheelsCount.length > 0
                    ? availableWheelsCount
                    : undefined
                }
                value={
                  hasWheelVariants === "No"
                    ? "No variants"
                    : availableWheelsCount.length === 0
                      ? "None selected"
                      : undefined
                }
              />
              <SummaryCard
                icon={<SwapHorizOutlinedIcon sx={{ fontSize: 15 }} />}
                label="Length variants"
                chips={
                  hasLengthVariants === "Yes" && availableLengths.length > 0
                    ? availableLengths
                    : undefined
                }
                value={
                  hasLengthVariants === "No"
                    ? "No variants"
                    : availableLengths.length === 0
                      ? "None selected"
                      : undefined
                }
              />
              <SummaryCard
                icon={<StraightenOutlinedIcon sx={{ fontSize: 15 }} />}
                label="Capacity lengths"
                chips={
                  hasCapacityVariants === "Yes" &&
                  availableCapacityLengths.length > 0
                    ? availableCapacityLengths
                    : undefined
                }
                value={
                  hasCapacityVariants === "No"
                    ? "No variants"
                    : availableCapacityLengths.length === 0
                      ? "None selected"
                      : undefined
                }
              />
            </Box>
          </StepPanel>
        )}

        {/* Nav buttons */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mt: 3,
            pt: 2,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<ArrowBackIcon />}
            onClick={
              step === 0
                ? () => router.push(routes.vehicleBodyType.list())
                : goBack
            }
          >
            {step === 0 ? "Cancel" : "Back"}
          </Button>

          {step < 4 ? (
            <Button
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              onClick={goNext}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircleOutlineIcon />}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? isEdit
                  ? "Updating…"
                  : "Creating…"
                : isEdit
                  ? "Update"
                  : "Create vehicle type"}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}