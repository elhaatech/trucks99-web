"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import OutlinedInput from "@mui/material/OutlinedInput";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import CircularProgress from "@mui/material/CircularProgress";

import type { User, VehicleType, VehicleBodyType } from "@/model/api";
import {
  createVehicleType,
  getCurrentUser,
  getRowId,
  updateVehicleType,
  getVehicleBodyTypeAll,
} from "@/model/api";
import { resolveApiBase, getAuthHeaders } from "@/model/services/common";
import {
  BackButton,
  FormFooter,
  FormPageLayout,
  FormTextField,
} from "@/components/common";
import { useForm } from "@/hooks/useForm";
import { useNotification } from "@/hooks/useNotification";
import type { FormState } from "../interface/vehicleTypeTypes";
import { EMPTY_FORM } from "../interface/vehicleTypeTypes";
import { routes } from "@/lib/routes";

export interface VehicleTypeFormProps {
  vehicleType?: VehicleType;
  mode?: "create" | "edit";
  onSuccess?: () => void;
}

function getFileUrl(path?: string) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${resolveApiBase()}${path}`;
}

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("key", "vehicle_type");
  formData.append("file", file);

  const res = await fetch(`${resolveApiBase()}/api/upload`, {
    method: "POST",
    body: formData,
    headers: {
      ...getAuthHeaders(),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "File upload failed");
  return (data.url || data.path) as string;
}

/** Extract vehicle_id string from a body type entry (populated object or raw string) */
function extractBodyTypeId(entry: VehicleBodyType | string): string {
  if (typeof entry === "string") return entry;
  return entry.vehicle_id || entry.id || entry._id || "";
}

export function VehicleTypeForm({ vehicleType, mode, onSuccess }: VehicleTypeFormProps) {
  const effectiveMode: "create" | "edit" = mode ?? (vehicleType ? "edit" : "create");
  const isEdit = effectiveMode === "edit";

  const router = useRouter();
  const { notify } = useNotification();

  const { values, setFieldValue } = useForm<FormState>(EMPTY_FORM);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");

  // available_body_type: list of selected vehicle_id strings
  const [selectedBodyTypeIds, setSelectedBodyTypeIds] = useState<string[]>([]);
  // all body types fetched from API
  const [allBodyTypes, setAllBodyTypes] = useState<VehicleBodyType[]>([]);
  const [bodyTypesLoading, setBodyTypesLoading] = useState(false);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch current user
  useEffect(() => {
    getCurrentUser()
      .then((u) => setCurrentUser(u as User))
      .catch(() => setCurrentUser(null));
  }, []);

  // Fetch all body types once on mount
  useEffect(() => {
    setBodyTypesLoading(true);
    getVehicleBodyTypeAll()
      .then((list) => setAllBodyTypes(list))
      .catch(() => setAllBodyTypes([]))
      .finally(() => setBodyTypesLoading(false));
  }, []);

  // Populate form when editing
  useEffect(() => {
    setImageFile(null);
    setImagePreviewUrl("");

    if (!vehicleType) {
      setSelectedBodyTypeIds([]);
      return;
    }

    setFieldValue("vehicleTypeName", vehicleType.vehicle_type || "");
    setFieldValue("description", vehicleType.description || "");
    setFieldValue("minimumCapacity", vehicleType.minimumCapacity ?? "");
    setFieldValue("maximumCapacity", vehicleType.maximumCapacity ?? "");
    setFieldValue("imageUrl", vehicleType.image || "");

    // Extract IDs whether available_body_type is populated objects or raw strings
    const rawList = vehicleType.available_body_type || [];
    const ids = (rawList as (VehicleBodyType | string)[]).map(extractBodyTypeId).filter(Boolean);
    setSelectedBodyTypeIds(ids);
  }, [vehicleType, setFieldValue]);

  // Image preview
  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl("");
      return;
    }
    const objUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(objUrl);
    return () => URL.revokeObjectURL(objUrl);
  }, [imageFile]);

  const previewSrc = useMemo(
    () => imagePreviewUrl || getFileUrl(values.imageUrl),
    [imagePreviewUrl, values.imageUrl]
  );

  const handleBodyTypeChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedBodyTypeIds(typeof value === "string" ? value.split(",") : value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const vehicleTypeName = values.vehicleTypeName.trim();
    if (!vehicleTypeName) {
      const msg = "Vehicle type is required";
      setError(msg);
      notify({ type: "error", message: msg });
      return;
    }

    const userPayload = currentUser
      ? { name: currentUser.name, role: currentUser.role }
      : undefined;

    setSubmitting(true);
    try {
      let nextImage = values.imageUrl;
      if (imageFile) {
        nextImage = await uploadImage(imageFile);
      }

      const payload = {
        vehicle_type: vehicleTypeName,
        description: values.description.trim() || undefined,
        minimumCapacity: values.minimumCapacity.trim() || undefined,
        maximumCapacity: values.maximumCapacity.trim() || undefined,
        image: nextImage || undefined,
        available_body_type: selectedBodyTypeIds,
        user: userPayload,
      };

      if (isEdit && vehicleType) {
        await updateVehicleType(getRowId(vehicleType), payload);
        notify({ type: "success", message: "Vehicle type updated successfully." });
      } else {
        await createVehicleType(payload);
        notify({ type: "success", message: "Vehicle type created successfully." });
      }

      onSuccess ? onSuccess() : router.push(routes.vehicleType.list());
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : isEdit ? "Failed to update" : "Failed to create";
      setError(msg);
      notify({ type: "error", message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormPageLayout
      title={isEdit ? "Edit Vehicle Type" : "Create Vehicle Type"}
      subtitle={isEdit ? vehicleType?.vehicle_type : "Add a new vehicle type."}
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Vehicle Types", href: routes.vehicleType.list() },
        { label: isEdit ? "Edit" : "Create" },
      ]}
      backButton={<BackButton fallback={routes.vehicleType.list()} label="Back to list" />}
      footer={
        <FormFooter
          formId="vehicle-type-form"
          submitting={submitting}
          submitLabel={isEdit ? "Update" : "Create"}
          submittingLabel={isEdit ? "Updating…" : "Creating…"}
          onCancel={() => router.push(routes.vehicleType.list())}
        />
      }
    >
      {error ? (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2.5 }}>
          {error}
        </Alert>
      ) : null}

      <Box
        component="form"
        id="vehicle-type-form"
        onSubmit={handleSubmit}
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
          gap: 2.5,
          "& > *": { minWidth: 0 },
          "& .fullWidth": { gridColumn: "1 / -1" },
        }}
      >
          <FormTextField
            label="Vehicle Type"
            value={values.vehicleTypeName}
            onChange={(v) => setFieldValue("vehicleTypeName", v)}
            placeholder="e.g. LCV, Container"
            required
            fullWidth
          />

          <FormTextField
            label="Minimum Capacity"
            value={values.minimumCapacity}
            onChange={(v) => setFieldValue("minimumCapacity", v)}
            placeholder="e.g. 1"
            fullWidth
          />

          <FormTextField
            label="Maximum Capacity"
            value={values.maximumCapacity}
            onChange={(v) => setFieldValue("maximumCapacity", v)}
            placeholder="e.g. 5"
            fullWidth
          />

          {/* Available Body Types multiselect */}
          <Box className="fullWidth">
            <FormControl fullWidth size="small">
              <InputLabel id="body-type-label">
                Available Body Types
                {bodyTypesLoading && (
                  <CircularProgress size={12} sx={{ ml: 1 }} />
                )}
              </InputLabel>
              <Select
                labelId="body-type-label"
                multiple
                value={selectedBodyTypeIds}
                onChange={handleBodyTypeChange}
                input={<OutlinedInput label="Available Body Types" />}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {(selected as string[]).map((id) => {
                      const bt = allBodyTypes.find(
                        (b) => (b.vehicle_id || b.id) === id
                      );
                      return (
                        <Chip
                          key={id}
                          label={bt?.vehicle_name || id}
                          size="small"
                        />
                      );
                    })}
                  </Box>
                )}
                disabled={bodyTypesLoading}
              >
                {allBodyTypes.map((bt) => {
                  const btId = bt.vehicle_id || bt.id || "";
                  return (
                    <MenuItem key={btId} value={btId}>
                      <Checkbox checked={selectedBodyTypeIds.includes(btId)} />
                      <ListItemText primary={bt.vehicle_name} />
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Box>

          <Box className="fullWidth">
            <FormTextField
              label="Description"
              value={values.description}
              onChange={(v) => setFieldValue("description", v)}
              multiline
              rows={2}
              placeholder="Optional description"
            />
          </Box>

          <Box className="fullWidth">
            <Button component="label" variant="outlined" size="small">
              {imageFile ? "Change image" : values.imageUrl ? "Change image" : "Upload image"}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setImageFile(file);
                }}
              />
            </Button>

            {previewSrc ? (
              <Box sx={{ mt: 1 }}>
                <Box
                  component="img"
                  src={previewSrc}
                  alt="Vehicle type"
                  sx={{
                    maxWidth: 160,
                    maxHeight: 120,
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                />
              </Box>
            ) : null}

            {imageFile ? (
              <Box sx={{ mt: 1 }}>
                <Box component="span" sx={{ fontSize: 12 }}>
                  Selected: {imageFile.name}
                </Box>
              </Box>
            ) : null}
          </Box>

      </Box>
    </FormPageLayout>
  );
}