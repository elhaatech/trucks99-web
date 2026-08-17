"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { useRouter } from "next/navigation";

import {
  AD_TYPES,
  DISPLAY_LOCATIONS,
  createAdvertisement,
  updateAdvertisement,
  getRowId,
  type Advertisement,
} from "@/model/api";
import { PageHeader } from "@/components/ui";
import { routes } from "@/lib/routes";
import {
  FormFooter,
  FormSelectField,
  FormTextField,
} from "@/components/common";
import { useForm } from "@/hooks/useForm";
import { useNotification } from "@/hooks/useNotification";

import type { FormState } from "../interface/advertisementTypes";
import {
  EMPTY_FORM,
  isVideoMedia,
  mediaTypesRequiringFile,
  resolveMediaUrl,
  toDateInputValue,
  validateMediaFile,
} from "../interface/advertisementTypes";

export interface AdvertisementFormProps {
  advertisement?: Advertisement;
  mode?: "create" | "edit";
  onSuccess?: () => void;
}

const FORM_ID = "advertisement-form";

function isValidUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function AdvertisementForm({
  advertisement,
  mode,
  onSuccess,
}: AdvertisementFormProps) {
  const effectiveMode: "create" | "edit" =
    mode ?? (advertisement ? "edit" : "create");
  const isEdit = effectiveMode === "edit";

  const { notify } = useNotification();
  const router = useRouter();
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const { values, setFieldValue } = useForm<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState("");
  const [mediaError, setMediaError] = useState("");

  useEffect(() => {
    setMediaFile(null);
    setMediaPreviewUrl("");
    setMediaError("");
    if (mediaInputRef.current) mediaInputRef.current.value = "";

    if (!advertisement) return;

    setFieldValue("adTitle", advertisement.adTitle || "");
    setFieldValue("clientName", advertisement.clientName || "");
    setFieldValue("adType", advertisement.adType || "Banner");
    setFieldValue("description", advertisement.description || "");
    setFieldValue("redirectUrl", advertisement.redirectUrl || "");
    setFieldValue("displayLocation", advertisement.displayLocation || "Home Page");
    setFieldValue("startDate", toDateInputValue(advertisement.startDate));
    setFieldValue("expiryDate", toDateInputValue(advertisement.expiryDate));
    setFieldValue(
      "displayPriority",
      String(advertisement.displayPriority ?? 0),
    );
    setFieldValue(
      "status",
      advertisement.status === "Disabled" ? "Disabled" : "Enabled",
    );
    setFieldValue("mediaUrl", advertisement.mediaUrl || "");
  }, [advertisement, setFieldValue]);

  useEffect(() => {
    if (!mediaFile) {
      setMediaPreviewUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(mediaFile);
    setMediaPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [mediaFile]);

  const adTypeOptions = useMemo(
    () => AD_TYPES.map((t) => ({ value: t, label: t })),
    [],
  );

  const locationOptions = useMemo(
    () => DISPLAY_LOCATIONS.map((l) => ({ value: l, label: l })),
    [],
  );

  const statusOptions = useMemo(
    () => [
      { value: "Enabled", label: "Enabled" },
      { value: "Disabled", label: "Disabled" },
    ],
    [],
  );

  const requiresMedia = mediaTypesRequiringFile(values.adType);

  const previewSrc = useMemo(
    () => mediaPreviewUrl || resolveMediaUrl(values.mediaUrl),
    [mediaPreviewUrl, values.mediaUrl],
  );

  const showVideoPreview = isVideoMedia(values.adType, values.mediaUrl, mediaFile);

  const acceptMedia =
    values.adType === "Video"
      ? "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,image/png,image/jpeg,image/jpg,image/gif,image/webp"
      : "image/png,image/jpeg,image/jpg,image/gif,image/webp";

  const handleMediaSelect = (file: File | null) => {
    setMediaError("");
    if (!file) {
      setMediaFile(null);
      return;
    }

    const validationError = validateMediaFile(file, values.adType);
    if (validationError) {
      setMediaFile(null);
      setMediaError(validationError);
      notify({ type: "error", message: validationError });
      if (mediaInputRef.current) mediaInputRef.current.value = "";
      return;
    }

    setMediaFile(file);
  };

  const buildFormData = (): FormData => {
    const formData = new FormData();
    formData.append("adTitle", values.adTitle.trim());
    formData.append("clientName", values.clientName.trim());
    formData.append("adType", values.adType);
    formData.append("description", values.description.trim());
    formData.append("redirectUrl", values.redirectUrl.trim());
    formData.append("displayLocation", values.displayLocation);
    formData.append("startDate", values.startDate);
    formData.append("expiryDate", values.expiryDate);
    formData.append("displayPriority", String(Number(values.displayPriority) || 0));

    if (isEdit) {
      formData.append("status", values.status);
    }

    if (mediaFile) {
      formData.append("media", mediaFile, mediaFile.name);
    } else if (isEdit && values.mediaUrl.trim()) {
      formData.append("mediaUrl", values.mediaUrl.trim());
    }

    return formData;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMediaError("");

    const adTitle = values.adTitle.trim();
    if (!adTitle) {
      const msg = "Ad title is required";
      setError(msg);
      notify({ type: "error", message: msg });
      return;
    }

    const clientName = values.clientName.trim();
    if (!clientName) {
      const msg = "Client name is required";
      setError(msg);
      notify({ type: "error", message: msg });
      return;
    }

    if (!values.startDate) {
      const msg = "Start date is required";
      setError(msg);
      notify({ type: "error", message: msg });
      return;
    }

    if (!values.expiryDate) {
      const msg = "Expiry date is required";
      setError(msg);
      notify({ type: "error", message: msg });
      return;
    }

    if (new Date(values.startDate) > new Date(values.expiryDate)) {
      const msg = "Expiry date must be on or after start date";
      setError(msg);
      notify({ type: "error", message: msg });
      return;
    }

    if (!isValidUrl(values.redirectUrl)) {
      const msg = "Redirect URL must be a valid http or https URL";
      setError(msg);
      notify({ type: "error", message: msg });
      return;
    }

    if (
      requiresMedia &&
      !mediaFile &&
      !(isEdit && values.mediaUrl.trim())
    ) {
      const msg = `Media file is required for ${values.adType} ads`;
      setMediaError(msg);
      setError(msg);
      notify({ type: "error", message: msg });
      return;
    }

    if (mediaFile) {
      const validationError = validateMediaFile(mediaFile, values.adType);
      if (validationError) {
        setMediaError(validationError);
        setError(validationError);
        notify({ type: "error", message: validationError });
        return;
      }
    }

    setSubmitting(true);
    try {
      const formData = buildFormData();

      if (isEdit && advertisement) {
        await updateAdvertisement(getRowId(advertisement), formData);
        notify({ type: "success", message: "Advertisement updated successfully." });
      } else {
        await createAdvertisement(formData);
        notify({ type: "success", message: "Advertisement created successfully." });
      }

      onSuccess
        ? onSuccess()
        : router.push(routes.advertisement.list());
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : isEdit
            ? "Failed to update advertisement"
            : "Failed to create advertisement";
      setError(msg);
      notify({ type: "error", message: msg });
    } finally {
      setSubmitting(false);
    }
  };

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
        <PageHeader
          title={isEdit ? "Edit Advertisement" : "Create Advertisement"}
          subtitle={
            isEdit
              ? advertisement?.adTitle
              : "Add a new promotional advertisement."
          }
          action={
            <Button
              variant="outlined"
              onClick={() => router.push(routes.advertisement.list())}
              disabled={submitting}
            >
              Back to list
            </Button>
          }
        />

        {error && (
          <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          component="form"
          id={FORM_ID}
          onSubmit={handleSubmit}
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 2,
            "& > *": { minWidth: 0 },
            "& .fullWidth": { gridColumn: "1 / -1" },
          }}
        >
          <FormTextField
            label="Ad title"
            value={values.adTitle}
            onChange={(v) => setFieldValue("adTitle", v)}
            required
            disabled={submitting}
          />

          <FormTextField
            label="Client name"
            value={values.clientName}
            onChange={(v) => setFieldValue("clientName", v)}
            required
            disabled={submitting}
          />

          <FormSelectField
            label="Ad type"
            value={values.adType}
            onChange={(v) => {
              setFieldValue("adType", v as FormState["adType"]);
              setMediaFile(null);
              setMediaError("");
              if (mediaInputRef.current) mediaInputRef.current.value = "";
            }}
            options={adTypeOptions}
            required
            disabled={submitting}
          />

          <FormSelectField
            label="Display location"
            value={values.displayLocation}
            onChange={(v) =>
              setFieldValue("displayLocation", v as FormState["displayLocation"])
            }
            options={locationOptions}
            required
            disabled={submitting}
          />

          <FormTextField
            label="Start date"
            type="date"
            value={values.startDate}
            onChange={(v) => setFieldValue("startDate", v)}
            required
            disabled={submitting}
            InputLabelProps={{ shrink: true }}
          />

          <FormTextField
            label="Expiry date"
            type="date"
            value={values.expiryDate}
            onChange={(v) => setFieldValue("expiryDate", v)}
            required
            disabled={submitting}
            InputLabelProps={{ shrink: true }}
          />

          <FormTextField
            label="Display priority"
            type="number"
            value={values.displayPriority}
            onChange={(v) => setFieldValue("displayPriority", v)}
            helperText="Lower number = higher priority"
            disabled={submitting}
          />

          {isEdit ? (
            <FormSelectField
              label="Status"
              value={values.status}
              onChange={(v) =>
                setFieldValue("status", v as FormState["status"])
              }
              options={statusOptions}
              required
              disabled={submitting}
            />
          ) : null}

          <Box className="fullWidth">
            <FormTextField
              label="Redirect URL"
              value={values.redirectUrl}
              onChange={(v) => setFieldValue("redirectUrl", v)}
              placeholder="https://example.com/landing"
              disabled={submitting}
            />
          </Box>

          <Box className="fullWidth">
            <FormTextField
              label="Description"
              value={values.description}
              onChange={(v) => setFieldValue("description", v)}
              multiline
              rows={3}
              disabled={submitting}
            />
          </Box>

          {requiresMedia ? (
            <Box className="fullWidth">
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                Media {isEdit ? "(optional — leave unchanged to keep current)" : "(required)"}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                {values.adType === "Video"
                  ? "Supported: MP4, WebM, MOV, or image files up to 50MB."
                  : "Supported: PNG, JPEG, GIF, WebP up to 50MB."}
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                <Button
                  component="label"
                  variant="outlined"
                  size="small"
                  disabled={submitting}
                >
                  {mediaFile
                    ? "Change media"
                    : values.mediaUrl
                      ? "Replace media"
                      : "Upload media"}
                  <input
                    ref={mediaInputRef}
                    type="file"
                    accept={acceptMedia}
                    hidden
                    disabled={submitting}
                    onChange={(e) => handleMediaSelect(e.target.files?.[0] || null)}
                  />
                </Button>

                {mediaFile ? (
                  <Button
                    size="small"
                    color="inherit"
                    disabled={submitting}
                    onClick={() => {
                      setMediaFile(null);
                      setMediaError("");
                      if (mediaInputRef.current) mediaInputRef.current.value = "";
                    }}
                  >
                    Clear selection
                  </Button>
                ) : null}

                {submitting ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CircularProgress size={18} />
                    <Typography variant="caption" color="text.secondary">
                      Uploading…
                    </Typography>
                  </Box>
                ) : null}
              </Box>

              {mediaFile ? (
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  Selected: {mediaFile.name} ({(mediaFile.size / (1024 * 1024)).toFixed(2)} MB)
                </Typography>
              ) : isEdit && values.mediaUrl ? (
                <Typography variant="caption" display="block" sx={{ mt: 1 }} color="text.secondary">
                  Current media will be kept unless you upload a new file.
                </Typography>
              ) : null}

              {mediaError ? (
                <Alert severity="error" sx={{ mt: 1.5 }}>
                  {mediaError}
                </Alert>
              ) : null}

              {previewSrc ? (
                <Box sx={{ mt: 1.5 }}>
                  {showVideoPreview ? (
                    <Box
                      component="video"
                      src={previewSrc}
                      controls
                      sx={{
                        maxWidth: 360,
                        maxHeight: 220,
                        borderRadius: 1,
                        border: "1px solid",
                        borderColor: "divider",
                        bgcolor: "grey.900",
                      }}
                    />
                  ) : (
                    <Box
                      component="img"
                      src={previewSrc}
                      alt="Ad media preview"
                      onError={() =>
                        setMediaError("Unable to preview this media file.")
                      }
                      sx={{
                        maxWidth: 360,
                        maxHeight: 220,
                        borderRadius: 1,
                        border: "1px solid",
                        borderColor: "divider",
                        objectFit: "contain",
                        bgcolor: "grey.50",
                      }}
                    />
                  )}
                </Box>
              ) : null}
            </Box>
          ) : null}

          <Box className="fullWidth">
            <FormFooter
              formId={FORM_ID}
              submitting={submitting}
              submitLabel={isEdit ? "Update" : "Create"}
              submittingLabel={isEdit ? "Updating…" : "Creating…"}
              onCancel={() => router.push(routes.advertisement.list())}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default AdvertisementForm;
