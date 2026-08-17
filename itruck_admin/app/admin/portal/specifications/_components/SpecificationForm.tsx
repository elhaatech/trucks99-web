"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Chip,
  Divider,
  TextField,
  Typography,
} from "@mui/material";
import { Controller, useForm, useWatch } from "react-hook-form";

import { FormFooter, FormSelectField, FormTextField } from "@/components/common";
import { PageHeader } from "@/components/ui";
import { routes } from "@/lib/routes";
import { useNotification } from "@/hooks/useNotification";
import {
  createSpecification,
  getRowId,
  updateSpecification,
  type ActiveInactive,
  type CreateSpecificationPayload,
  type Specification,
  type SpecificationType,
  type UpdateSpecificationPayload,
  type YesNo,
} from "@/model/api";

// ── constants ──────────────────────────────────────────────────────────────────

const SPEC_TYPE_OPTIONS: { value: SpecificationType; label: string }[] = [
  { value: "input",       label: "Input" },
  { value: "selectable",  label: "Selectable" },
  { value: "multiselect", label: "Multi-select" },
  { value: "number",      label: "Number" },
  { value: "date",        label: "Date" },
  { value: "datetime",    label: "Date & Time" },
  { value: "file",        label: "File" },
];

const YES_NO_OPTIONS = [
  { value: "Yes", label: "Yes" },
  { value: "No",  label: "No" },
];

const STATUS_OPTIONS = [
  { value: "Active",   label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

const ALLOWED_FILE_TYPES = ["pdf", "jpg", "jpeg", "png", "xlsx", "csv", "docx"];

// Types that rely on SpecificationValue records for their options
const VALUE_BASED_TYPES: SpecificationType[] = ["selectable", "multiselect"];

const FORM_ID = "specification-form";

// ── form data type ─────────────────────────────────────────────────────────────

type FormData = {
  specification_name: string;
  type: SpecificationType;
  is_required: YesNo;
  need_filter: YesNo;
  status: ActiveInactive;
  // number
  number_min: string;
  number_max: string;
  number_decimal: YesNo;
  // date / datetime
  date_min: string;
  date_max: string;
  // file
  file_max_size_mb: string;
  file_allowed_types: string[];
  file_multiple: YesNo;
};

// ── helpers ────────────────────────────────────────────────────────────────────

function buildDefaultValues(item?: Specification): FormData {
  return {
    specification_name: item?.specification_name ?? "",
    type:               item?.type               ?? "input",
    is_required:        item?.is_required        ?? "No",
    need_filter:        item?.need_filter        ?? "No",
    status:             item?.status             ?? "Active",
    number_min:         item?.number_min  != null ? String(item.number_min)  : "",
    number_max:         item?.number_max  != null ? String(item.number_max)  : "",
    number_decimal:     item?.number_decimal     ?? "No",
    date_min:           item?.date_min           ?? "",
    date_max:           item?.date_max           ?? "",
    file_max_size_mb:   item?.file_max_size_mb != null ? String(item.file_max_size_mb) : "",
    file_allowed_types: item?.file_allowed_types ?? [],
    file_multiple:      item?.file_multiple      ?? "No",
  };
}

// Strips type-config fields that don't belong to the selected type
function buildPayload(
  values: FormData
): CreateSpecificationPayload | UpdateSpecificationPayload {
  const base = {
    specification_name: values.specification_name,
    type:        values.type,
    is_required: values.is_required,
    need_filter: values.need_filter,
    status:      values.status,
  };

  if (values.type === "number") {
    return {
      ...base,
      number_min:     values.number_min !== "" ? Number(values.number_min) : null,
      number_max:     values.number_max !== "" ? Number(values.number_max) : null,
      number_decimal: values.number_decimal,
    };
  }

  if (values.type === "date" || values.type === "datetime") {
    return {
      ...base,
      date_min: values.date_min || null,
      date_max: values.date_max || null,
    };
  }

  if (values.type === "file") {
    return {
      ...base,
      file_max_size_mb:   values.file_max_size_mb !== "" ? Number(values.file_max_size_mb) : null,
      file_allowed_types: values.file_allowed_types,
      file_multiple:      values.file_multiple,
    };
  }

  // input | selectable | multiselect — no extra config
  return base;
}

// ── component ──────────────────────────────────────────────────────────────────

export function SpecificationForm({
  item,
  mode,
}: {
  item?: Specification;
  mode: "create" | "edit";
}) {
  const isEdit = mode === "edit";
  const router = useRouter();
  const { notify } = useNotification();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit, setValue } = useForm<FormData>({
    defaultValues: buildDefaultValues(item),
  });

  const selectedType      = useWatch({ control, name: "type" });
  const selectedFileTypes = useWatch({ control, name: "file_allowed_types" });

  const onSubmit = handleSubmit(async (values) => {
    setError("");
    try {
      setSubmitting(true);
      const payload = buildPayload(values);

      if (isEdit && item) {
        await updateSpecification(
          getRowId(item),
          payload as UpdateSpecificationPayload
        );
        notify({ type: "success", message: "Specification updated successfully." });
      } else {
        await createSpecification(payload as CreateSpecificationPayload);
        notify({ type: "success", message: "Specification created successfully." });
      }

      router.push(routes.specification.list());
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to save specification";
      setError(msg);
      notify({ type: "error", message: msg });
    } finally {
      setSubmitting(false);
    }
  });

  const toggleFileType = (ft: string) => {
    const current = selectedFileTypes ?? [];
    setValue(
      "file_allowed_types",
      current.includes(ft) ? current.filter((x) => x !== ft) : [...current, ft]
    );
  };

  return (
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
        title={isEdit ? "Edit Specification" : "Create Specification"}
        subtitle={
          isEdit ? item?.specification_name : "Add a new specification."
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Box
        component="form"
        id={FORM_ID}
        onSubmit={onSubmit}
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 2,
        }}
      >
        {/* ── Specification Name ────────────────────────────────── */}
        <Controller
          control={control}
          name="specification_name"
          rules={{ required: "Specification name is required" }}
          render={({ field, fieldState }) => (
            <FormTextField
              label="Specification Name"
              value={field.value}
              onChange={field.onChange}
              required
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          )}
        />

        {/* ── Type ─────────────────────────────────────────────── */}
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <FormSelectField
              label="Type"
              value={field.value}
              onChange={(v) =>
                field.onChange((v as SpecificationType) || "input")
              }
              options={SPEC_TYPE_OPTIONS}
            />
          )}
        />

        {/* ── Is Required ──────────────────────────────────────── */}
        <Controller
          control={control}
          name="is_required"
          render={({ field }) => (
            <FormSelectField
              label="Is Required"
              value={field.value}
              onChange={(v) => field.onChange((v as YesNo) || "No")}
              options={YES_NO_OPTIONS}
            />
          )}
        />

        {/* ── Need Filter ──────────────────────────────────────── */}
        <Controller
          control={control}
          name="need_filter"
          render={({ field }) => (
            <FormSelectField
              label="Need Filter"
              value={field.value}
              onChange={(v) => field.onChange((v as YesNo) || "No")}
              options={YES_NO_OPTIONS}
            />
          )}
        />

        {/* ── Status ───────────────────────────────────────────── */}
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <FormSelectField
              label="Status"
              value={field.value}
              onChange={(v) =>
                field.onChange((v as ActiveInactive) || "Active")
              }
              options={STATUS_OPTIONS}
            />
          )}
        />

        {/* ── NUMBER config ─────────────────────────────────────── */}
        {selectedType === "number" && (
          <>
            <Box sx={{ gridColumn: "1 / -1" }}>
              <Divider textAlign="left">
                <Typography variant="caption" color="text.secondary">
                  Number Settings
                </Typography>
              </Divider>
            </Box>

            <Controller
              control={control}
              name="number_min"
              render={({ field }) => (
                <TextField
                  label="Min Value"
                  type="number"
                  size="small"
                  value={field.value}
                  onChange={field.onChange}
                  fullWidth
                />
              )}
            />

            <Controller
              control={control}
              name="number_max"
              render={({ field }) => (
                <TextField
                  label="Max Value"
                  type="number"
                  size="small"
                  value={field.value}
                  onChange={field.onChange}
                  fullWidth
                />
              )}
            />

            <Controller
              control={control}
              name="number_decimal"
              render={({ field }) => (
                <FormSelectField
                  label="Allow Decimal"
                  value={field.value}
                  onChange={(v) => field.onChange((v as YesNo) || "No")}
                  options={YES_NO_OPTIONS}
                />
              )}
            />
          </>
        )}

        {/* ── DATE / DATETIME config ────────────────────────────── */}
        {(selectedType === "date" || selectedType === "datetime") && (
          <>
            <Box sx={{ gridColumn: "1 / -1" }}>
              <Divider textAlign="left">
                <Typography variant="caption" color="text.secondary">
                  Date Range (optional)
                </Typography>
              </Divider>
            </Box>

            <Controller
              control={control}
              name="date_min"
              render={({ field }) => (
                <TextField
                  label="Min Date"
                  type={selectedType === "datetime" ? "datetime-local" : "date"}
                  size="small"
                  value={field.value}
                  onChange={field.onChange}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              )}
            />

            <Controller
              control={control}
              name="date_max"
              render={({ field }) => (
                <TextField
                  label="Max Date"
                  type={selectedType === "datetime" ? "datetime-local" : "date"}
                  size="small"
                  value={field.value}
                  onChange={field.onChange}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              )}
            />
          </>
        )}

        {/* ── FILE config ───────────────────────────────────────── */}
        {selectedType === "file" && (
          <>
            <Box sx={{ gridColumn: "1 / -1" }}>
              <Divider textAlign="left">
                <Typography variant="caption" color="text.secondary">
                  File Settings
                </Typography>
              </Divider>
            </Box>

            <Controller
              control={control}
              name="file_max_size_mb"
              render={({ field }) => (
                <TextField
                  label="Max File Size (MB)"
                  type="number"
                  size="small"
                  value={field.value}
                  onChange={field.onChange}
                  fullWidth
                  inputProps={{ min: 0.1, step: 0.1 }}
                />
              )}
            />

            <Controller
              control={control}
              name="file_multiple"
              render={({ field }) => (
                <FormSelectField
                  label="Allow Multiple Files"
                  value={field.value}
                  onChange={(v) => field.onChange((v as YesNo) || "No")}
                  options={YES_NO_OPTIONS}
                />
              )}
            />

            {/* Allowed file types — chip toggle */}
            <Box sx={{ gridColumn: "1 / -1" }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Allowed File Types{" "}
                <Typography
                  component="span"
                  variant="caption"
                  color="text.disabled"
                >
                  (click to toggle)
                </Typography>
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {ALLOWED_FILE_TYPES.map((ft) => {
                  const active = (selectedFileTypes ?? []).includes(ft);
                  return (
                    <Chip
                      key={ft}
                      label={`.${ft}`}
                      size="small"
                      color={active ? "primary" : "default"}
                      variant={active ? "filled" : "outlined"}
                      onClick={() => toggleFileType(ft)}
                      sx={{ cursor: "pointer" }}
                    />
                  );
                })}
              </Box>
            </Box>
          </>
        )}

        {/* ── selectable / multiselect info note ───────────────── */}
        {VALUE_BASED_TYPES.includes(selectedType) && (
          <Box sx={{ gridColumn: "1 / -1" }}>
            <Alert severity="info" sx={{ py: 0.5 }}>
              Options for this type are managed via{" "}
              <strong>Specification Values</strong> after saving.
            </Alert>
          </Box>
        )}

        {/* ── Footer ───────────────────────────────────────────── */}
        <Box sx={{ gridColumn: "1 / -1" }}>
          <FormFooter
            formId={FORM_ID}
            submitting={submitting}
            submitLabel={isEdit ? "Update" : "Create"}
            submittingLabel={isEdit ? "Updating..." : "Creating..."}
            onCancel={() => router.push(routes.specification.list())}
          />
        </Box>
      </Box>
    </Box>
  );
}