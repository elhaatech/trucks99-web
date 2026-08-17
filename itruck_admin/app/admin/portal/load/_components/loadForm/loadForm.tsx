"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import {
  ArrowBack,
  LocalShipping,
  FiberManualRecord,
  LocationOn,
  StraightenOutlined,
  RouteOutlined,
  LocalShippingOutlined,
  DirectionsBusOutlined,
  AccountBalanceWalletOutlined,
  NotesOutlined,
} from "@mui/icons-material";

import {
  getVehicleTypeAll,
  getVehicleBodyTypeAll,
  getMaterialAll,
  getCurrentUser,
  getUserAll,
  createLoad,
  updateLoad,
  getRowId,
  type Load,
  type LoadLocation,
  type VehicleType,
  type VehicleBodyType,
  type Material,
  type User,
} from "@/model/api";
import { ROUTES, routes } from "@/lib/routes";
import {
  BackButton,
  FormFooter,
  FormPageLayout,
} from "@/components/common";
import { useNotification } from "@/hooks/useNotification";
import { useForm } from "@/hooks/useForm";
import { haversineKm } from "@/lib/loadUtils";
import FormStops, { type StopItem } from "@/components/common/Formstops";
import FormSelectField, {
  type SelectOption,
} from "@/components/common/Formselectfield";
import FormAddressField from "@/components/common/Formaddressfield";
import FormTextField from "@/components/common/Formtextfield";
import FormDateTimePicker from "@/components/common/Formdatetimepicker";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status =
  | "pending"
  | "assigned"
  | "accepted"
  | "rejected"
  | "delivered"
  | "cancelled"
  | "draft";

export type LoadStatusUi = Status | undefined;

const ALL_STATUSES: { value: Status; label: string; color: string }[] = [
  { value: "draft", label: "Draft", color: "default" },
  { value: "pending", label: "Pending", color: "warning" },
  { value: "assigned", label: "Assigned", color: "info" },
  { value: "accepted", label: "Accepted", color: "success" },
  { value: "rejected", label: "Rejected", color: "error" },
  { value: "delivered", label: "Delivered", color: "success" },
  { value: "cancelled", label: "Cancelled", color: "default" },
];

// ─── Form values ──────────────────────────────────────────────────────────────

export interface LoadPageFormValues {
  pickupAddress: string;
  pickupLat: string;
  pickupLng: string;
  dropAddress: string;
  dropLat: string;
  dropLng: string;
  userId: string;
  description: string;
  materialId: string;
  vehicleType: string;
  vehicleBodyType: string;
  vehicleCapacity: string;
  loadCapacity: string;
  totalTire: string;
  containerFeet: string;
  pickupTimeISO: string;
  bit: string;
  distanceKm: string;
  status: Status;
  stops: StopItem[];
  truckStatus: string;
}

const INITIAL_VALUES: LoadPageFormValues = {
  pickupAddress: "",
  pickupLat: "",
  pickupLng: "",
  dropAddress: "",
  dropLat: "",
  dropLng: "",
  userId: "",
  description: "",
  materialId: "",
  vehicleType: "",
  vehicleBodyType: "",
  vehicleCapacity: "",
  loadCapacity: "",
  totalTire: "",
  containerFeet: "",
  pickupTimeISO: "",
  bit: "",
  distanceKm: "",
  status: "pending",
  stops: [],
  truckStatus: "",
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface LoadFormProps {
  load?: Load;
  mode?: "create" | "edit";
  onSuccess?: () => void;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Extract stable vehicle type ID from VehicleType object
 * Tries: uuid → id → _id (in that priority order)
 */
function getVehicleTypeId(vt: any): string {
  if (!vt) return "";
  if (typeof vt === "string") return vt;
  return vt.uuid || vt.id || vt._id || "";
}

/**
 * Extract stable vehicle body type ID from VehicleBodyType object
 * Tries: vehicle_id → id → _id (in that priority order)
 */
function getVehicleBodyTypeId(vbt: any): string {
  if (!vbt) return "";
  if (typeof vbt === "string") return vbt;
  return vbt.vehicle_id || vbt.id || vbt._id || "";
}

/**
 * Extract stable user ID from User object
 */
function getUserId(u: any): string {
  return u?._id || u?.id || "";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: 1.5,
          bgcolor: "primary.main",
          background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          "& svg": { fontSize: 16 },
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            color: "text.primary",
            lineHeight: 1.2,
            fontSize: "0.8rem",
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: "0.68rem" }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 2.5,
      }}
    >
      {children}
    </Box>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const FORM_ID = "load-form";

export function LoadForm({ load, mode, onSuccess }: LoadFormProps) {
  const effectiveMode: "create" | "edit" = mode ?? (load ? "edit" : "create");
  const isEdit = effectiveMode === "edit";
  const router = useRouter();
  const { notify } = useNotification();

  const { values, setFieldValue, setValues } =
    useForm<LoadPageFormValues>(INITIAL_VALUES);

  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [vehicleBodyTypes, setVehicleBodyTypes] = useState<VehicleBodyType[]>(
    [],
  );
  const [materials, setMaterials] = useState<Material[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadCapacityManuallySet, setLoadCapacityManuallySet] = useState(false);

  // ── Load reference data + hydrate form in edit mode ──────────────────────
  useEffect(() => {
    Promise.all([
      getVehicleTypeAll(),
      getVehicleBodyTypeAll(),
      getMaterialAll(),
      getCurrentUser(),
      getUserAll(),
    ])
      .then(([vts, vbts, mats, user, userList]) => {
        setVehicleTypes(vts ?? []);
        setVehicleBodyTypes(vbts ?? []);
        setMaterials(mats ?? []);
        setCurrentUser(user as User);
        setUsers(userList ?? []);

        // ── For non-admin create mode: auto-set userId to self ──────────────
        const isAdminUser = (user as User)?.role?.status === "admin";
        if (!load && !isAdminUser) {
          const selfId = getUserId(user as User);
          if (selfId) setFieldValue("userId", selfId);
        }

        if (load) {
          const ownerId =
            load.ownerUser?._id ||
            (load as { ownerId?: string }).ownerId ||
            (load as { userId?: string }).userId ||
            (load as { createdBy?: string }).createdBy ||
            "";

          const savedLoadCapacity = (load as { loadCapacity?: number | string })
            .loadCapacity;
          const fallbackCapacity =
            load.vehicleCapacity != null ? String(load.vehicleCapacity) : "";

          const resolvedMaterialId = (() => {
            if (load.materialId) {
              const match = (mats ?? []).find(
                (m) => m._id === load.materialId || m.id === load.materialId,
              );
              return match?._id ?? "";
            }
            if (load.material) {
              const match = (mats ?? []).find(
                (m) =>
                  m.materials_type?.toLowerCase() ===
                  load.material?.toLowerCase(),
              );
              return match?._id ?? "";
            }
            return "";
          })();

          // ── Resolve vehicle type ID ────────────────────────────────────────
          let resolvedVehicleType = "";
          if (load.vehicleType) {
            if (typeof load.vehicleType === "object") {
              resolvedVehicleType = getVehicleTypeId(load.vehicleType);
            } else {
              resolvedVehicleType = load.vehicleType;
            }
          }

          // ── Resolve vehicle body type ID ───────────────────────────────────
          let resolvedVehicleBodyType = "";
          if (load.vehicleBodyType) {
            if (typeof load.vehicleBodyType === "object") {
              resolvedVehicleBodyType = getVehicleBodyTypeId(
                load.vehicleBodyType,
              );
            } else {
              resolvedVehicleBodyType = load.vehicleBodyType;
            }
          }

          setValues({
            ...INITIAL_VALUES,
            userId: ownerId,
            description: load.description || "",
            pickupAddress: load.pickupLocation?.address || "",
            pickupLat:
              load.pickupLocation?.lat != null
                ? String(load.pickupLocation.lat)
                : "",
            pickupLng:
              load.pickupLocation?.lng != null
                ? String(load.pickupLocation.lng)
                : "",
            dropAddress: load.dropLocation?.address || "",
            dropLat:
              load.dropLocation?.lat != null
                ? String(load.dropLocation.lat)
                : "",
            dropLng:
              load.dropLocation?.lng != null
                ? String(load.dropLocation.lng)
                : "",
            materialId: resolvedMaterialId,
            vehicleType: resolvedVehicleType,
            vehicleBodyType: resolvedVehicleBodyType,
            vehicleCapacity: fallbackCapacity,
            loadCapacity:
              savedLoadCapacity != null
                ? String(savedLoadCapacity)
                : fallbackCapacity,
            totalTire: load.total_tire || "",
            containerFeet: load.containerFeet || "",
            pickupTimeISO: load.pickupTime || "",
            bit: load.bit != null ? String(load.bit) : "",
            distanceKm: load.distanceKm != null ? String(load.distanceKm) : "",
            status: (load.status as Status) || "pending",
            stops: (() => {
              const rawStops = Array.isArray(
                (load as unknown as { stop_all?: unknown[] }).stop_all,
              )
                ? (load as unknown as { stop_all: unknown[] }).stop_all
                : [];
              return rawStops.map((item) => {
                const s = item as {
                  address?: string;
                  lat?: number;
                  lng?: number;
                };
                return {
                  address: s?.address || "",
                  lat: s?.lat != null ? String(s.lat) : "",
                  lng: s?.lng != null ? String(s.lng) : "",
                };
              });
            })(),
            truckStatus: (load as { truck_status?: string }).truck_status ?? "",
          });

          if (
            savedLoadCapacity != null &&
            String(savedLoadCapacity) !== fallbackCapacity
          ) {
            setLoadCapacityManuallySet(true);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load reference data:", err);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-calculate distance ───────────────────────────────────────────────
  useEffect(() => {
    const pLat = values.pickupLat ? Number(values.pickupLat) : NaN;
    const pLng = values.pickupLng ? Number(values.pickupLng) : NaN;
    const dLat = values.dropLat ? Number(values.dropLat) : NaN;
    const dLng = values.dropLng ? Number(values.dropLng) : NaN;
    if ([pLat, pLng, dLat, dLng].every(Number.isFinite)) {
      setFieldValue("distanceKm", String(haversineKm(pLat, pLng, dLat, dLng)));
    }
  }, [
    values.pickupLat,
    values.pickupLng,
    values.dropLat,
    values.dropLng,
    setFieldValue,
  ]);

  // ── Auto-fill load capacity from truck status ─────────────────────────────
  useEffect(() => {
    if (!values.vehicleCapacity || loadCapacityManuallySet) return;
    const capacity = Number(values.vehicleCapacity);
    const status = values.truckStatus?.toLowerCase();
    if (status.includes("empty"))
      setFieldValue("loadCapacity", String(capacity));
    else if (status.includes("half"))
      setFieldValue("loadCapacity", String(capacity / 2));
  }, [
    values.vehicleCapacity,
    values.truckStatus,
    loadCapacityManuallySet,
    setFieldValue,
  ]);

  // ── Owner dropdown: admin sees all, user sees only themselves ─────────────
  const isAdmin = currentUser?.role?.status === "admin";

  const userOptions: SelectOption[] = isAdmin
    ? users.map((u) => ({
        value: getUserId(u),
        label: u.name?.trim() || u.mobile || "",
      }))
    : currentUser
      ? [
          {
            value: getUserId(currentUser),
            label: currentUser.name?.trim() || currentUser.mobile || "",
          },
        ]
      : [];

  const materialOptions: SelectOption[] = materials.map((m) => ({
    value: m._id ?? "",
    label: m.materials_type ?? "",
  }));

  // ── Vehicle type dropdown ──────────────────────────────────────────────────
  // ── Vehicle type dropdown — filtered by loadCapacity if entered ────────────
  const vehicleTypeOptions: SelectOption[] = useMemo(() => {
    const capacity = values.loadCapacity ? Number(values.loadCapacity) : NaN;

    return vehicleTypes
      .filter((vt: any) => {
        if (!Number.isFinite(capacity)) return true;
        const min = Number(vt.minimumCapacity);
        const max = Number(vt.maximumCapacity);
        return min <= capacity && capacity <= max;
      })
      .map((vt: any) => ({
        value: getVehicleTypeId(vt),
        label: `${vt.vehicle_type || vt.name || ""} (${vt.minimumCapacity}T – ${vt.maximumCapacity}T)`,
      }));
  }, [vehicleTypes, values.loadCapacity]);

  // ── Vehicle body type dropdown — filtered by selected vehicle type ────────
  const vehicleBodyTypeOptions: SelectOption[] = useMemo(() => {
    const selectedVehicleTypeId = values.vehicleType;

    if (!selectedVehicleTypeId) {
      // No vehicle type selected → show all body types
      return vehicleBodyTypes.map((vbt: any) => ({
        value: getVehicleBodyTypeId(vbt),
        label: vbt.vehicle_name || "",
      }));
    }

    // Find the selected vehicle type object
    const selectedVT = vehicleTypes.find((vt: any) => {
      const vtId = getVehicleTypeId(vt);
      return vtId === selectedVehicleTypeId;
    }) as any;

    // If found and has nested available_body_type array, use it
    if (selectedVT && Array.isArray(selectedVT.available_body_type)) {
      if (selectedVT.available_body_type.length > 0) {
        return selectedVT.available_body_type.map((vbt: any) => ({
          value: getVehicleBodyTypeId(vbt),
          label: vbt.vehicle_name || "",
        }));
      } else {
        // VT exists but has empty available_body_type
        return [];
      }
    }

    // Fallback: return all body types
    return vehicleBodyTypes.map((vbt: any) => ({
      value: getVehicleBodyTypeId(vbt),
      label: vbt.vehicle_name || "",
    }));
  }, [values.vehicleType, vehicleTypes, vehicleBodyTypes]);

  // ── Resolve selected body type object ──────────────────────────────────────
  const selectedBodyTypeObj = useMemo(() => {
    if (!values.vehicleBodyType) return null;

    // First try to find within the selected vehicle type's available_body_type
    const selectedVT = vehicleTypes.find((vt: any) => {
      const vtId = getVehicleTypeId(vt);
      return vtId === values.vehicleType;
    }) as any;

    if (selectedVT && Array.isArray(selectedVT.available_body_type)) {
      const found = selectedVT.available_body_type.find((vbt: any) => {
        const vbtId = getVehicleBodyTypeId(vbt);
        return vbtId === values.vehicleBodyType;
      });
      if (found) return found;
    }

    // Fallback: search in flat vehicleBodyTypes list
    return (
      vehicleBodyTypes.find((vbt: any) => {
        const vbtId = getVehicleBodyTypeId(vbt);
        return vbtId === values.vehicleBodyType;
      }) ?? null
    );
  }, [
    values.vehicleBodyType,
    values.vehicleType,
    vehicleTypes,
    vehicleBodyTypes,
  ]);
  // ── Reset vehicle type when it no longer matches the entered load capacity ──
  useEffect(() => {
    if (!values.vehicleType || !values.loadCapacity) return;
    const capacity = Number(values.loadCapacity);
    if (!Number.isFinite(capacity)) return;

    const selectedVT = vehicleTypes.find(
      (vt: any) => getVehicleTypeId(vt) === values.vehicleType,
    ) as any;

    if (!selectedVT) return;

    const min = Number(selectedVT.minimumCapacity);
    const max = Number(selectedVT.maximumCapacity);

    if (capacity < min || capacity > max) {
      setFieldValue("vehicleType", "");
      setFieldValue("vehicleBodyType", "");
      setFieldValue("containerFeet", "");
      setFieldValue("totalTire", "");
    }
  }, [values.loadCapacity, vehicleTypes, values.vehicleType, setFieldValue]);
  // ── Container feet (length) options from selected body type ────────────────
  const containerFeetOptions: SelectOption[] = useMemo(() => {
    const lengths: number[] =
      (selectedBodyTypeObj as any)?.available_lengths ?? [];
    if (!lengths.length) return [];
    return lengths.map((l) => ({ value: String(l), label: `${l} ft` }));
  }, [selectedBodyTypeObj]);

  // ── Wheel options from selected body type ──────────────────────────────────
  const wheelOptions: SelectOption[] = useMemo(() => {
    const wheels: number[] =
      (selectedBodyTypeObj as any)?.available_wheels_count ?? [];
    if (!wheels.length) return [];
    return wheels.map((w) => ({ value: String(w), label: `${w} Wheels` }));
  }, [selectedBodyTypeObj]);

  // ── When vehicle type changes, reset dependent fields ─────────────────────
  const handleVehicleTypeChange = (v: string) => {
    setFieldValue("vehicleType", v);
    setFieldValue("vehicleBodyType", ""); // Reset body type
    setFieldValue("containerFeet", ""); // Reset container feet
    setFieldValue("totalTire", ""); // Reset wheels
  };

  // ── When body type changes, reset dependent fields ───────────────────────
  const handleBodyTypeChange = (v: string) => {
    setFieldValue("vehicleBodyType", v);
    setFieldValue("containerFeet", ""); // Reset container feet
    setFieldValue("totalTire", ""); // Reset wheels
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!values.pickupAddress.trim() || !values.dropAddress.trim()) {
      const msg = "Pickup and Drop addresses are required.";
      setError(msg);
      notify({ type: "error", message: msg });
      return;
    }

    const pickupLocation: LoadLocation = {
      address: values.pickupAddress.trim(),
      lat: values.pickupLat ? Number(values.pickupLat) : 0,
      lng: values.pickupLng ? Number(values.pickupLng) : 0,
    };
    const dropLocation: LoadLocation = {
      address: values.dropAddress.trim(),
      lat: values.dropLat ? Number(values.dropLat) : 0,
      lng: values.dropLng ? Number(values.dropLng) : 0,
    };

    const stopPayload = values.stops
      .map((s) => ({
        address: s.address.trim(),
        lat: s.lat ? Number(s.lat) : undefined,
        lng: s.lng ? Number(s.lng) : undefined,
      }))
      .filter((s) => s.address);

    const selectedMaterial = materials.find(
      (m) =>
        m.id === values.materialId ||
        (m as { _id?: string })._id === values.materialId,
    );
    const selectedUser = values.userId
      ? users.find(
          (u) =>
            getRowId(u) === values.userId ||
            (u as { _id?: string })._id === values.userId,
        )
      : null;
    const resolvedUser = selectedUser ?? currentUser;
    const userPayload = resolvedUser
      ? {
          name: resolvedUser.name,
          role: resolvedUser.role,
          mobile: resolvedUser.mobile,
        }
      : undefined;

    const ownId =
      values.userId ||
      currentUser?._id ||
      (currentUser as { id?: string } | null)?.id ||
      undefined;

    const body = {
      description: values.description.trim() || undefined,
      pickupLocation,
      dropLocation,
      materialId: values.materialId || undefined,
      material: selectedMaterial?.materials_type || undefined,
      vehicleType: values.vehicleType.trim() || undefined,
      vehicleCapacity: values.vehicleCapacity
        ? Number(values.vehicleCapacity)
        : undefined,
      loadCapacity: values.loadCapacity
        ? Number(values.loadCapacity)
        : undefined,
      total_tire: values.totalTire.trim() || undefined,
      containerFeet: values.containerFeet.trim() || undefined,
      pickupTime: values.pickupTimeISO.trim() || undefined,
      bit: values.bit ? Number(values.bit) : undefined,
      distanceKm: values.distanceKm ? Number(values.distanceKm) : undefined,
      ownerId: ownId,
      userId: ownId,
      truck_status: values.truckStatus.trim() || undefined,
      ...(isEdit && {
        createdBy:
          currentUser?._id || (currentUser as { id?: string } | null)?.id,
      }),
      vehicle_id: values.vehicleBodyType.trim() || undefined,
      status: values.status,
      stop: stopPayload,
      user: userPayload,
      requestingUser: userPayload,
    };

    setSubmitting(true);
    try {
      if (isEdit && load) {
        await updateLoad(getRowId(load), body);
      } else {
        await createLoad(body);
        notify({ type: "success", message: "Load created successfully." });
      }
      onSuccess ? onSuccess() : router.push(ROUTES.load.list);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : `Failed to ${isEdit ? "update" : "create"} load`;
      setError(msg);
      notify({ type: "error", message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <FormPageLayout
      title={isEdit ? "Edit Load" : "Create Load"}
      subtitle={isEdit ? load?.title || "Update load details" : "Fill in the details to post a new load"}
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Loads", href: routes.load.list() },
        { label: isEdit ? "Edit" : "Create" },
      ]}
      backButton={<BackButton fallback={routes.load.list()} label="Back to list" />}
      footer={
        <FormFooter
          formId={FORM_ID}
          submitting={submitting}
          submitLabel={isEdit ? "Update Load" : "Create Load"}
          submittingLabel={isEdit ? "Updating…" : "Creating…"}
          onCancel={() => router.push(ROUTES.load.list)}
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
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        {/* ── 1. Trip Details ───────────────────────────────────────────────── */}
        <SectionCard>
          <SectionHeader
            icon={<RouteOutlined />}
            title="Trip Details"
            subtitle="Pickup, drop locations and intermediate stops"
          />

          <Box
            sx={{
              display: "flex",
              gap: 1.5,
              p: 2,
              bgcolor: "action.hover",
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              mb: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                pt: "18px",
                pb: "8px",
                flexShrink: 0,
              }}
            >
              <FiberManualRecord sx={{ fontSize: 10, color: "success.main" }} />
              <Box
                sx={{
                  flex: 1,
                  width: "1.5px",
                  bgcolor: "divider",
                  my: 0.5,
                  minHeight: 24,
                }}
              />
              <LocationOn sx={{ fontSize: 14, color: "error.main" }} />
            </Box>

            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
              }}
            >
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 600,
                    fontSize: "0.68rem",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  Pickup *
                </Typography>
                <FormAddressField
                  label=""
                  value={values.pickupAddress}
                  onChange={(v) => setFieldValue("pickupAddress", v)}
                  onPlaceSelect={(addr, { lat, lng }) => {
                    setFieldValue("pickupAddress", addr);
                    setFieldValue("pickupLat", String(lat));
                    setFieldValue("pickupLng", String(lng));
                  }}
                  required
                />
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 600,
                    fontSize: "0.68rem",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  Drop *
                </Typography>
                <FormAddressField
                  label=""
                  value={values.dropAddress}
                  onChange={(v) => setFieldValue("dropAddress", v)}
                  onPlaceSelect={(addr, { lat, lng }) => {
                    setFieldValue("dropAddress", addr);
                    setFieldValue("dropLat", String(lat));
                    setFieldValue("dropLng", String(lng));
                  }}
                  required
                />
              </Box>
            </Box>

            {values.distanceKm && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  alignSelf: "center",
                  gap: 0.5,
                  px: 1.5,
                  py: 0.5,
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 5,
                  ml: 1,
                }}
              >
                <StraightenOutlined
                  sx={{ fontSize: 13, color: "text.secondary" }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={500}
                >
                  {Number(values.distanceKm).toFixed(1)} km
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ mb: 2 }}>
            <FormStops
              stops={values.stops}
              onChange={(next) => setFieldValue("stops", next)}
            />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 2,
            }}
          >
            <FormDateTimePicker
              label="Pickup Time"
              value={values.pickupTimeISO}
              onChange={(v) => setFieldValue("pickupTimeISO", v)}
            />
            <FormTextField
              label="Distance (km)"
              value={values.distanceKm}
              onChange={(v) => setFieldValue("distanceKm", v)}
              type="number"
            />
          </Box>
        </SectionCard>

        {/* ── 2. Load Details ───────────────────────────────────────────────── */}
        <SectionCard>
          <SectionHeader
            icon={<LocalShippingOutlined />}
            title="Load Details"
            subtitle="Material type, weight and ownership"
          />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 2,
            }}
          >
            <FormSelectField
              label="Material Type"
              value={values.materialId}
              onChange={(v) => setFieldValue("materialId", v)}
              options={materialOptions}
            />
            <FormTextField
              label="Weight / Load Capacity (tonne)"
              value={values.loadCapacity}
              onChange={(v) => {
                setFieldValue("loadCapacity", v);
                setLoadCapacityManuallySet(true);
              }}
              type="number"
              placeholder="Auto-filled from truck status"
            />
            <FormSelectField
              label="Owner"
              value={values.userId}
              onChange={(v) => setFieldValue("userId", v)}
              options={userOptions}
              placeholder="— Select owner —"
              disabled={!isAdmin}
            />
          </Box>
        </SectionCard>

        {/* ── 3. Vehicle Requirement ────────────────────────────────────────── */}
        <SectionCard>
          <SectionHeader
            icon={<DirectionsBusOutlined />}
            title="Vehicle Requirement"
            subtitle="Type, body, wheels and length"
          />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 2,
            }}
          >
            {/* Vehicle Type */}
            <FormSelectField
              label="Vehicle Type"
              value={values.vehicleType}
              onChange={handleVehicleTypeChange}
              options={vehicleTypeOptions}
              placeholder="— Select —"
            />

            {/* Vehicle Body Type — cascaded from Vehicle Type */}
            <FormSelectField
              label="Body Type"
              value={values.vehicleBodyType}
              onChange={handleBodyTypeChange}
              options={vehicleBodyTypeOptions}
              placeholder={
                !values.vehicleType
                  ? "— Select vehicle type first —"
                  : vehicleBodyTypeOptions.length === 0
                    ? "No body types available"
                    : "— Select body type —"
              }
            />

            {/* Total Wheels — cascaded from Body Type (now a dropdown) */}
            <FormSelectField
              label="Total Wheels"
              value={values.totalTire}
              onChange={(v) => setFieldValue("totalTire", v)}
              options={wheelOptions}
              placeholder={
                !values.vehicleBodyType
                  ? "— Select body type first —"
                  : wheelOptions.length === 0
                    ? "No wheel options available"
                    : "— Select wheels —"
              }
            />

            {/* Container / Length (ft) — cascaded from Body Type (now a dropdown) */}
            <FormSelectField
              label="Container / Length (ft)"
              value={values.containerFeet}
              onChange={(v) => setFieldValue("containerFeet", v)}
              options={containerFeetOptions}
              placeholder={
                !values.vehicleBodyType
                  ? "— Select body type first —"
                  : containerFeetOptions.length === 0
                    ? "No lengths available"
                    : "— Select length —"
              }
            />
          </Box>
        </SectionCard>

        {/* ── 4. Budget & Booking ───────────────────────────────────────────── */}
        <SectionCard>
          <SectionHeader
            icon={<AccountBalanceWalletOutlined />}
            title="Budget & Booking"
            subtitle="Expected price and load status"
          />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 2,
            }}
          >
            <FormTextField
              label="Expected Budget (₹)"
              value={values.bit}
              onChange={(v) => setFieldValue("bit", v)}
              type="number"
            />
            <FormSelectField
              label="Load Status"
              value={values.status}
              onChange={(v) => setFieldValue("status", v as Status)}
              options={(isEdit
                ? ALL_STATUSES
                : ALL_STATUSES.filter(
                    (s) => s.value === "draft" || s.value === "pending",
                  )
              ).map((s) => ({ value: s.value, label: s.label }))}
            />
          </Box>
        </SectionCard>

        {/* ── 5. Additional Information ─────────────────────────────────────── */}
        <SectionCard>
          <SectionHeader
            icon={<NotesOutlined />}
            title="Additional Information"
            subtitle="Internal notes visible to transporter"
          />
          <FormTextField
            label="Notes / Description"
            value={values.description}
            onChange={(v) => setFieldValue("description", v)}
            multiline
            rows={3}
            minRows={2}
            maxRows={6}
          />
        </SectionCard>
      </Box>
    </FormPageLayout>
  );
}
