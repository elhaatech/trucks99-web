"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import { useRouter } from "next/navigation";
import {
  ArrowBack,
  LocalShipping,
  DirectionsBusOutlined,
  SpeedOutlined,
  LabelOutlined,
  LocationOnOutlined,
  ImageOutlined,
} from "@mui/icons-material";

import type { Truck, User, VehicleBodyType, VehicleType } from "@/model/api";
import {
  getCurrentUser,
  getUserAll,
  getVehicleBodyTypeAll,
  getVehicleTypeAll,
} from "@/model/api";
import {
  FormAddressField,
  FormSelectField,
  FormTextField,
} from "@/components/common";
import type { SelectOption } from "@/components/common";

import { useTruckForm } from "../../list/components/useTruckForm";
import { getFileUrl } from "../../list/components/truckUtils";
import {
  TRUCK_STATUS_OPTIONS,
  LOAD_STATUS_OPTIONS,
} from "../../list/components/truckTypes";
import { routes } from "@/lib/routes";
import {
  BackButton,
  FormFooter,
  FormPageLayout,
} from "@/components/common";

// ─── Status options ───────────────────────────────────────────────────────────

const STATUS_OPTIONS: SelectOption[] = [
  { value: "available", label: "Available" },
  { value: "in-transit", label: "In Transit" },
  { value: "maintenance", label: "Maintenance" },
  { value: "unavailable", label: "Unavailable" },
  { value: "draft", label: "Draft" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

export type TruckFormProps = {
  truck?: Truck | null;
};

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: 1,
          bgcolor: "action.hover",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "text.secondary",
          "& svg": { fontSize: 16 },
        }}
      >
        {icon}
      </Box>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "text.secondary",
          fontSize: "0.7rem",
        }}
      >
        {title}
      </Typography>
    </Box>
  );
}

// ─── Helper: stable user id ───────────────────────────────────────────────────
function userId(u: any): string {
  return u?._id || u?.id || "";
}

// ─── Helper: resolve vehicle type id from various shapes ─────────────────────
function resolveVehicleTypeId(vt: any): string {
  if (!vt) return "";
  if (typeof vt === "string") return vt;
  return vt.uuid || vt.id || vt._id || "";
}

// ─── Main component ───────────────────────────────────────────────────────────

const FORM_ID = "truck-form";

export default function TruckForm({ truck }: TruckFormProps) {
  const router = useRouter();

  const { form, set, editing, openCreate, openEdit, handleSubmit } =
    useTruckForm(() => router.push(routes.truck.list()));

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [vehicleBodyTypes, setVehicleBodyTypes] = useState<VehicleBodyType[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadCapacityManuallySet, setLoadCapacityManuallySet] = useState(false);

  // ── Reference data ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [u, allUsers, vt, vbt] = await Promise.all([
          getCurrentUser(),
          getUserAll(),
          getVehicleTypeAll(),
          getVehicleBodyTypeAll(),
        ]);
        if (cancelled) return;
        setCurrentUser(u);
        setUsers(allUsers ?? []);
        setVehicleTypes(vt || []);
        setVehicleBodyTypes(vbt || []);
      } catch {
        // form still renders with empty options
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Hydrate / init form ───────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;

    const isAdminUser = currentUser?.role?.status === "admin";

    if (truck) {
      openEdit({
        ...truck,
        vehicleType:
          typeof truck.vehicleType === "object"
            ? (truck.vehicleType as any)?.uuid ||
              (truck.vehicleType as any)?.id ||
              (truck.vehicleType as any)?._id ||
              ""
            : truck.vehicleType || "",
        vehicleBodyType:
          typeof truck.vehicleBodyType === "object"
            ? (truck.vehicleBodyType as any)?.vehicle_id ||
              (truck.vehicleBodyType as any)?.id ||
              (truck.vehicleBodyType as any)?._id ||
              ""
            : truck.vehicleBodyType || "",
        ownerId:
          (truck.ownerUser as any)?._id ||
          (truck.ownerUser as any)?.id ||
          truck.ownerId ||
          "",
      });

      const savedLoadCapacity = (truck as any).loadCapacity;
      const vehicleCapacity = (truck as any).vehicleCapacity;
      if (
        savedLoadCapacity != null &&
        String(savedLoadCapacity) !== String(vehicleCapacity ?? "")
      ) {
        setLoadCapacityManuallySet(true);
      }
    } else {
      openCreate();
      if (!isAdminUser) {
        const selfId = userId(currentUser);
        if (selfId) set("ownerId", selfId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [truck, currentUser]);

  // ── Auto-fill load capacity ───────────────────────────────────────────────
  useEffect(() => {
    if (!form.capacity || loadCapacityManuallySet) return;
    const capacity = Number(form.capacity);
    if (!Number.isFinite(capacity) || capacity <= 0) return;
    const status = form.truckStatus?.toLowerCase() ?? "";
    if (status.includes("empty") || status.includes("return")) {
      set("loadCapacity", String(capacity));
    } else if (status.includes("half")) {
      set("loadCapacity", String(capacity / 2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.capacity, form.truckStatus, loadCapacityManuallySet]);

  // ── Owner dropdown ─────────────────────────────────────────────────────────
  const isAdmin = currentUser?.role?.status === "admin";

  const userOptions: SelectOption[] = useMemo(() => {
    if (isAdmin) {
      return users.map((u) => ({
        value: userId(u),
        label:
          (u as any).name?.trim() ||
          (u as any).mobile ||
          (u as any).email ||
          "",
      }));
    }
    if (!currentUser) return [];
    return [
      {
        value: userId(currentUser),
        label:
          (currentUser as any).name?.trim() ||
          (currentUser as any).mobile ||
          "",
      },
    ];
  }, [isAdmin, users, currentUser]);

  // ── Vehicle type dropdown ─────────────────────────────────────────────────
  // ── Vehicle type dropdown — filtered by loadCapacity if entered ────────────
  const vehicleTypeOptions: SelectOption[] = useMemo(() => {
    const capacity = form.capacity ? Number(form.capacity) : NaN;

    return vehicleTypes
      .filter((vt: any) => {
        if (!Number.isFinite(capacity)) return true;
        const min = Number(vt.minimumCapacity);
        const max = Number(vt.maximumCapacity);
        return min <= capacity && capacity <= max;
      })
      .map((vt: any) => ({
        value: vt.uuid || vt.id || vt._id || "",
        label:
          vt.minimumCapacity && vt.maximumCapacity
            ? `${vt.vehicle_type || vt.name || ""} (${vt.minimumCapacity}T – ${vt.maximumCapacity}T)`
            : vt.vehicle_type || vt.name || "",
      }));
  }, [vehicleTypes, form.capacity]);
  // ── Reset vehicle type when it no longer matches the entered load capacity ──
  useEffect(() => {
    if (!form.vehicleType || !form.capacity) return;
    const capacity = Number(form.capacity);
    if (!Number.isFinite(capacity)) return;

    const selectedVT = vehicleTypes.find((vt: any) => {
      const vtId = vt.uuid || vt.id || vt._id || "";
      return vtId === form.vehicleType;
    }) as any;

    if (!selectedVT) return;

    const min = Number(selectedVT.minimumCapacity);
    const max = Number(selectedVT.maximumCapacity);

    if (capacity < min || capacity > max) {
      set("vehicleType", "");
      set("vehicleBodyType", "");
      set("containerFeet", "");
      set("vehicleTyre", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.capacity, vehicleTypes]);

  // ── Vehicle body type dropdown — filtered by selected vehicle type ─────────
  const vehicleBodyTypeOptions: SelectOption[] = useMemo(() => {
    const selectedVehicleTypeId = form.vehicleType;

    if (selectedVehicleTypeId) {
      const selectedVT = vehicleTypes.find((vt: any) => {
        const vtId = vt.uuid || vt.id || vt._id || "";
        return vtId === selectedVehicleTypeId;
      }) as any;

      if (selectedVT?.available_body_type?.length > 0) {
        return selectedVT.available_body_type.map((vbt: any) => ({
          value: vbt.vehicle_id || vbt.uuid || vbt.id || vbt._id || "",
          label: vbt.vehicle_name || "",
        }));
      }
    }

    return vehicleBodyTypes.map((vbt: any) => ({
      value: vbt.vehicle_id || vbt.id || vbt._id || "",
      label: vbt.vehicle_name || "",
    }));
  }, [form.vehicleType, vehicleTypes, vehicleBodyTypes]);

  // ── Resolve selected body type object (from available_body_type of selected VT) ──
  const selectedBodyTypeObj = useMemo(() => {
    if (!form.vehicleBodyType) return null;

    // First try to find within the selected vehicle type's available_body_type
    const selectedVT = vehicleTypes.find((vt: any) => {
      const vtId = vt.uuid || vt.id || vt._id || "";
      return vtId === form.vehicleType;
    }) as any;

    if (selectedVT?.available_body_type?.length > 0) {
      const found = selectedVT.available_body_type.find((vbt: any) => {
        const vbtId = vbt.vehicle_id || vbt.uuid || vbt.id || vbt._id || "";
        return vbtId === form.vehicleBodyType;
      });
      if (found) return found;
    }

    // Fallback: search in flat vehicleBodyTypes list
    return (
      vehicleBodyTypes.find((vbt: any) => {
        const vbtId = vbt.vehicle_id || vbt.id || vbt._id || "";
        return vbtId === form.vehicleBodyType;
      }) ?? null
    );
  }, [form.vehicleBodyType, form.vehicleType, vehicleTypes, vehicleBodyTypes]);

  // ── Container feet options from selected body type's available_lengths ────
  const containerFeetOptions: SelectOption[] = useMemo(() => {
    const lengths: number[] =
      (selectedBodyTypeObj as any)?.available_lengths ?? [];
    if (!lengths.length) return [];
    return lengths.map((l) => ({ value: String(l), label: `${l} ft` }));
  }, [selectedBodyTypeObj]);

  // ── Wheel options from selected body type's available_wheels_count ────────
  const wheelOptions: SelectOption[] = useMemo(() => {
    const wheels: number[] =
      (selectedBodyTypeObj as any)?.available_wheels_count ?? [];
    if (!wheels.length) return [];
    return wheels.map((w) => ({ value: String(w), label: `${w} Wheels` }));
  }, [selectedBodyTypeObj]);

  // ── When vehicle type changes, reset dependent fields ─────────────────────
  const handleVehicleTypeChange = (v: string) => {
    set("vehicleType", v);
    set("vehicleBodyType", "");
    set("containerFeet", "");
    set("vehicleTyre", "");
  };

  // ── When body type changes, reset dependent fields ────────────────────────
  const handleBodyTypeChange = (v: string) => {
    set("vehicleBodyType", v);
    set("containerFeet", "");
    set("vehicleTyre", "");
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await handleSubmit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit truck");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <FormPageLayout
        title="Truck"
        subtitle="Loading form…"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Trucks", href: routes.truck.list() },
          { label: editing ? "Edit" : "Create" },
        ]}
        backButton={<BackButton fallback={routes.truck.list()} />}
      >
        <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>Loading…</Box>
      </FormPageLayout>
    );
  }

  return (
    <FormPageLayout
      title={editing ? "Edit Truck" : "Add Truck"}
      subtitle={editing ? "Update truck details" : "Register a new truck"}
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Trucks", href: routes.truck.list() },
        { label: editing ? "Edit" : "Create" },
      ]}
      backButton={<BackButton fallback={routes.truck.list()} label="Back to list" />}
      footer={
        <FormFooter
          formId={FORM_ID}
          submitting={submitting}
          submitLabel={editing ? "Update Truck" : "Add Truck"}
          submittingLabel={editing ? "Updating…" : "Creating…"}
          onCancel={() => router.push(routes.truck.list())}
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
        id={FORM_ID}
        onSubmit={onSubmit}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 3.5,
        }}
      >
        {/* ── 1. Vehicle Identity ─────────────────────────────────────────── */}
        <Box>
          <SectionHeader icon={<LocalShipping />} title="Vehicle Identity" />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0,1fr))",
              gap: 2,
            }}
          >
            <FormTextField
              label="Vehicle Number"
              value={form.vehicleNumber}
              onChange={(v) => set("vehicleNumber", v)}
              placeholder="e.g. TN33D2342"
              required
            />
            <FormSelectField
              label="Vehicle Owner"
              value={form.ownerId}
              onChange={(v) => set("ownerId", v)}
              options={userOptions}
              placeholder="— Select owner —"
              disabled={!isAdmin}
            />
          </Box>
        </Box>
        <FormTextField
          label="Vehicle Capacity (tons)"
          value={form.capacity}
          onChange={(v) => {
            set("capacity", v);
            setLoadCapacityManuallySet(false);
          }}
          placeholder="e.g. 15"
          type="number"
          required
        />

        <Divider />

        {/* ── 2. Classification ───────────────────────────────────────────── */}
        <Box>
          <SectionHeader
            icon={<DirectionsBusOutlined />}
            title="Vehicle Classification"
          />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0,1fr))",
              gap: 2,
            }}
          >
            <FormSelectField
              label="Vehicle Type"
              value={form.vehicleType}
              onChange={handleVehicleTypeChange}
              options={vehicleTypeOptions}
              placeholder="— Select —"
              required
            />
            <FormSelectField
              label="Vehicle Body Type"
              value={form.vehicleBodyType}
              onChange={handleBodyTypeChange}
              options={vehicleBodyTypeOptions}
              placeholder={
                form.vehicleType
                  ? vehicleBodyTypeOptions.length === 0
                    ? "No body types available"
                    : "— Select body type —"
                  : "— Select vehicle type first —"
              }
              required
            />
            <FormSelectField
              label="Vehicle Feet"
              value={form.containerFeet}
              onChange={(v) => set("containerFeet", v)}
              options={containerFeetOptions}
              placeholder={
                !form.vehicleBodyType
                  ? "— Select body type first —"
                  : containerFeetOptions.length === 0
                    ? "No lengths available"
                    : "— Select length —"
              }
            />
          </Box>
        </Box>

        <Divider />

        {/* ── 3. Capacity & Wheels ────────────────────────────────────────── */}
        <Box>
          <SectionHeader icon={<SpeedOutlined />} title="Capacity & Wheels" />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0,1fr))",
              gap: 2,
            }}
          >
            <FormTextField
              label="Load Capacity (tons)"
              value={form.loadCapacity}
              onChange={(v) => {
                set("loadCapacity", v);
                setLoadCapacityManuallySet(true);
              }}
              type="number"
              placeholder="Auto-filled from capacity"
            />
            <FormSelectField
              label="Vehicle Wheels"
              value={form.vehicleTyre}
              onChange={(v) => set("vehicleTyre", v)}
              options={wheelOptions}
              placeholder={
                !form.vehicleBodyType
                  ? "— Select body type first —"
                  : wheelOptions.length === 0
                    ? "No wheel options available"
                    : "— Select wheels —"
              }
            />
          </Box>
        </Box>

        <Divider />

        {/* ── 4. Location & Pricing ───────────────────────────────────────── */}
        <Box>
          <SectionHeader
            icon={<LocationOnOutlined />}
            title="Location & Pricing"
          />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0,1fr))",
              gap: 2,
            }}
          >
            <Box>
              <FormAddressField
                label="Current Location"
                value={form.currentLocation}
                onChange={(v) => set("currentLocation", v)}
                onPlaceSelect={(addr) => set("currentLocation", addr)}
                placeholder="e.g. Chennai"
                required
              />
            </Box>
          </Box>
        </Box>

        <Divider />

        {/* ── 5. Status ───────────────────────────────────────────────────── */}
        <Box>
          <SectionHeader icon={<LabelOutlined />} title="Status" />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0,1fr))",
              gap: 2,
            }}
          >
            <FormSelectField
              label="Return Truck ?"
              value={form.truckStatus}
              onChange={(v) => {
                set("truckStatus", v);
                setLoadCapacityManuallySet(false);
              }}
              options={TRUCK_STATUS_OPTIONS}
              placeholder="— Select —"
            />
            <FormSelectField
              label="Load Status"
              value={form.loadStatus}
              onChange={(v) => set("loadStatus", v)}
              options={LOAD_STATUS_OPTIONS}
              placeholder="— Select —"
            />
            <FormSelectField
              label="Availability"
              value={form.status}
              onChange={(v) => set("status", v)}
              options={STATUS_OPTIONS}
              placeholder="— Select —"
            />
          </Box>
        </Box>

        <Divider />

        {/* ── 6. Documents & Images ───────────────────────────────────────── */}
        <Box>
          <SectionHeader icon={<ImageOutlined />} title="Documents & Images" />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0,1fr))",
              gap: 2,
            }}
          >
            {/* Truck image */}
            <Box
              sx={{
                border: "1px dashed",
                borderColor: "divider",
                borderRadius: 2,
                p: 2,
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              <Typography
                variant="caption"
                fontWeight={600}
                color="text.secondary"
                sx={{
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontSize: "0.68rem",
                }}
              >
                Truck Image
              </Typography>
              {form.vehicleImageUrl && !form.vehicleImageFile ? (
                <Box
                  component="img"
                  src={getFileUrl(form.vehicleImageUrl)}
                  alt="Truck"
                  sx={{
                    width: "100%",
                    maxHeight: 100,
                    objectFit: "cover",
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                />
              ) : form.vehicleImageFile ? (
                <Typography variant="caption" color="text.secondary">
                  Selected: {form.vehicleImageFile.name}
                </Typography>
              ) : (
                <Box
                  sx={{
                    height: 80,
                    bgcolor: "action.hover",
                    borderRadius: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "text.disabled",
                  }}
                >
                  <ImageOutlined sx={{ fontSize: 28 }} />
                </Box>
              )}
              <Button
                component="label"
                variant="outlined"
                size="small"
                sx={{ textTransform: "none", borderRadius: 1.5, fontSize: 12 }}
              >
                {form.vehicleImageFile || form.vehicleImageUrl
                  ? "Change image"
                  : "Upload image"}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) =>
                    set("vehicleImageFile", e.target.files?.[0] || null)
                  }
                />
              </Button>
            </Box>

            {/* Additional images */}
            <Box
              sx={{
                border: "1px dashed",
                borderColor: "divider",
                borderRadius: 2,
                p: 2,
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              <Typography
                variant="caption"
                fontWeight={600}
                color="text.secondary"
                sx={{
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontSize: "0.68rem",
                }}
              >
                Additional Images
              </Typography>
              {form.vehicleImages.length > 0 ? (
                <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                  {form.vehicleImages.map((url, i) => (
                    <Box
                      key={i}
                      component="img"
                      src={getFileUrl(url)}
                      alt={`Truck ${i + 1}`}
                      sx={{
                        width: 52,
                        height: 44,
                        objectFit: "cover",
                        borderRadius: 1,
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    />
                  ))}
                </Box>
              ) : (
                <Box
                  sx={{
                    height: 80,
                    bgcolor: "action.hover",
                    borderRadius: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "text.disabled",
                  }}
                >
                  <ImageOutlined sx={{ fontSize: 28 }} />
                </Box>
              )}
              {form.vehicleImageFiles.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {form.vehicleImageFiles.length} new file(s) selected
                </Typography>
              )}
              <Button
                component="label"
                variant="outlined"
                size="small"
                sx={{ textTransform: "none", borderRadius: 1.5, fontSize: 12 }}
              >
                Add images
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) =>
                    set(
                      "vehicleImageFiles",
                      e.target.files ? Array.from(e.target.files) : [],
                    )
                  }
                />
              </Button>
            </Box>

            {/* RC Document */}
            <Box
              sx={{
                border: "1px dashed",
                borderColor: "divider",
                borderRadius: 2,
                p: 2,
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              <Typography
                variant="caption"
                fontWeight={600}
                color="text.secondary"
                sx={{
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontSize: "0.68rem",
                }}
              >
                RC Document
              </Typography>
              {form.vehicleRCDocumentUrl && !form.vehicleRCDocumentFile ? (
                <Box
                  sx={{
                    height: 80,
                    bgcolor: "action.hover",
                    borderRadius: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography variant="caption" sx={{ color: "primary.main" }}>
                    <a
                      href={getFileUrl(form.vehicleRCDocumentUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View RC document
                    </a>
                  </Typography>
                </Box>
              ) : form.vehicleRCDocumentFile ? (
                <Typography variant="caption" color="text.secondary">
                  Selected: {form.vehicleRCDocumentFile.name}
                </Typography>
              ) : (
                <Box
                  sx={{
                    height: 80,
                    bgcolor: "action.hover",
                    borderRadius: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "text.disabled",
                  }}
                >
                  <ImageOutlined sx={{ fontSize: 28 }} />
                </Box>
              )}
              <Button
                component="label"
                variant="outlined"
                size="small"
                sx={{ textTransform: "none", borderRadius: 1.5, fontSize: 12 }}
              >
                {form.vehicleRCDocumentFile || form.vehicleRCDocumentUrl
                  ? "Change document"
                  : "Upload document"}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  hidden
                  onChange={(e) =>
                    set("vehicleRCDocumentFile", e.target.files?.[0] || null)
                  }
                />
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </FormPageLayout>
  );
}
