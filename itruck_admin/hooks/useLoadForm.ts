import { useCallback, useEffect, useState } from "react";
import {
  createLoad,
  updateLoad,
  cancelLoad,
  type Load,
  type LoadLocation,
  type User,
  getRowId,
} from "@/model/api";
import { useForm } from "@/hooks/useForm";
import { useNotification } from "@/hooks/useNotification";
import { haversineKm } from "@/lib/loadUtils";
import {
  EMPTY_FORM,
  type FormState,
  type SetFormFieldFn,
} from "@/app/admin/portal/load/_components/interface/loadTypes";

export function useLoadForm(users: Map<string, User>, currentUser: User | null, onSuccess: () => void) {
  const { notify } = useNotification();
  const { values: form, setFieldValue, setValues } = useForm<FormState>(EMPTY_FORM);
  const [editing, setEditing] = useState<Load | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Load | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  /** Same as `useForm`’s `setFieldValue` — use directly to avoid generic mismatch with a `useCallback` wrapper. */
  const set: SetFormFieldFn = setFieldValue;

  useEffect(() => {
    const pLat = form.pickupLat ? Number(form.pickupLat) : NaN;
    const pLng = form.pickupLng ? Number(form.pickupLng) : NaN;
    const dLat = form.dropLat ? Number(form.dropLat) : NaN;
    const dLng = form.dropLng ? Number(form.dropLng) : NaN;
    if ([pLat, pLng, dLat, dLng].every(Number.isFinite)) {
      setFieldValue("distanceKm", String(haversineKm(pLat, pLng, dLat, dLng)));
    }
  }, [form.pickupLat, form.pickupLng, form.dropLat, form.dropLng, setFieldValue]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setValues({
      ...EMPTY_FORM,
      userId: currentUser?._id ?? (currentUser as { id?: string } | null)?.id ?? "",
    });
    setDialogOpen(true);
  }, [currentUser, setValues]);

  const openEdit = useCallback(
    (row: Load) => {
      setEditing(row);
      const rowOwner =
        (row as { ownerId?: string; userId?: string; createdBy?: string }).ownerId ??
        (row as { userId?: string }).userId ??
        (row as { createdBy?: string }).createdBy ??
        "";
      const uid = String(rowOwner);
      setValues({
        description: row.description || "",
        pickupAddress: row.pickupLocation?.address || "",
        pickupLat: row.pickupLocation?.lat != null ? String(row.pickupLocation.lat) : "",
        pickupLng: row.pickupLocation?.lng != null ? String(row.pickupLocation.lng) : "",
        dropAddress: row.dropLocation?.address || "",
        dropLat: row.dropLocation?.lat != null ? String(row.dropLocation.lat) : "",
        dropLng: row.dropLocation?.lng != null ? String(row.dropLocation.lng) : "",
        materialId: row.materialId || "",
        vehicleType: row.vehicleType || "",
        vehicleBodyType: row.vehicleBodyType || "",
        vehicleCapacity: row.vehicleCapacity != null ? String(row.vehicleCapacity) : "",
        loadCapacity: (row as { loadCapacity?: string | number }).loadCapacity != null
          ? String((row as { loadCapacity?: string | number }).loadCapacity)
          : "", totalTire: row.total_tire || "",
        containerFeet: row.containerFeet || "",
        pickupTimeISO: row.pickupTime || "",
        bit: row.bit != null ? String(row.bit) : "",
        distanceKm: row.distanceKm != null ? String(row.distanceKm) : "",
        status: (row.status as FormState["status"]) || "pending",
        userId: uid || currentUser?._id || (currentUser as { id?: string } | undefined)?.id || "",
        usear: "",
      });
      setDialogOpen(true);
    },
    [currentUser, setValues]
  );

  const handleSubmit = useCallback(async () => {
    const pickupAddr = form.pickupAddress.trim();
    const dropAddr = form.dropAddress.trim();
    if (!pickupAddr || !dropAddr) {
      notify({ type: "error", message: "Pickup and Drop are required." });
      throw new Error("Pickup and Drop are required.");
    }
    const pickupLocation: LoadLocation = {
      address: pickupAddr,
      lat: form.pickupLat ? Number(form.pickupLat) : 0,
      lng: form.pickupLng ? Number(form.pickupLng) : 0,
    };
    const dropLocation: LoadLocation = {
      address: dropAddr,
      lat: form.dropLat ? Number(form.dropLat) : 0,
      lng: form.dropLng ? Number(form.dropLng) : 0,
    };
    const selectedUser = form.userId ? users.get(form.userId) : null;
    const resolved = selectedUser ?? currentUser;
    const userPayload = resolved
      ? { name: resolved.name, role: resolved.role, mobile: resolved.mobile }
      : undefined;

    const body = {
      description: form.description.trim() || undefined,
      pickupLocation,
      dropLocation,
      materialId: form.materialId || undefined,
      vehicleType: form.vehicleType.trim() || undefined,
      vehicleCapacity: form.vehicleCapacity ? Number(form.vehicleCapacity) : undefined,
      total_tire: form.totalTire.trim() || undefined,
      containerFeet: form.containerFeet.trim() || undefined,
      pickupTime: form.pickupTimeISO.trim() || undefined,
      bit: form.bit ? Number(form.bit) : undefined,
      distanceKm: form.distanceKm ? Number(form.distanceKm) : undefined,
      ownerId: form.userId || currentUser?._id || (currentUser as { id?: string } | undefined)?.id || undefined,
      userId: form.userId || currentUser?._id || (currentUser as { id?: string } | undefined)?.id || undefined,
      vehicle_id: form.vehicleBodyType.trim() || undefined,
      status: form.status,
      stop: [] as { address: string; lat?: number; lng?: number }[],
      user: userPayload,
      requestingUser: userPayload,
    };

    if (editing) {
      await updateLoad(getRowId(editing), body);
      notify({ type: "success", message: "Load updated successfully." });
    } else {
      await createLoad(body);
      notify({ type: "success", message: "Load created successfully." });
    }
    setDialogOpen(false);
    onSuccess();
  }, [form, editing, users, currentUser, onSuccess, notify]);

  const openCancel = useCallback(
    (row: Load) => {
      if (row.status === "delivered" || row.status === "rejected") {
        notify({ type: "error", message: "This load is already completed or cancelled." });
        return;
      }
      setCancelTarget(row);
      setCancelReason(row.rejectReason || "");
      setCancelDialogOpen(true);
    },
    [notify]
  );

  const handleCancelSubmit = useCallback(async () => {
    const row = cancelTarget;
    if (!row) return;
    const reason = cancelReason.trim();
    if (!reason) {
      notify({ type: "error", message: "Reason for cancel is required." });
      throw new Error("Reason for cancel is required.");
    }
    const rowOwnerId =
      (row as { ownerId?: string; userId?: string; createdBy?: string }).ownerId ||
      (row as { userId?: string }).userId ||
      (row as { createdBy?: string }).createdBy;
    const rowWithOwner = row as { ownerUser?: User };
    const cancelUser =
      rowWithOwner.ownerUser ||
      (rowOwnerId ? users.get(String(rowOwnerId)) : undefined) ||
      currentUser;
    const userPayload = cancelUser
      ? {
        id: getRowId(cancelUser) ?? (cancelUser as { _id?: string })._id,
        name: cancelUser.name,
        role: cancelUser.role,
        mobile: cancelUser.mobile,
      }
      : undefined;
    await cancelLoad(getRowId(row), reason, userPayload);
    setCancelDialogOpen(false);
    notify({ type: "success", message: "Cancel reason saved." });
    onSuccess();
  }, [cancelTarget, cancelReason, users, currentUser, onSuccess, notify]);

  return {
    form,
    set,
    editing,
    dialogOpen,
    setDialogOpen,
    cancelDialogOpen,
    setCancelDialogOpen,
    cancelReason,
    setCancelReason,
    openCreate,
    openEdit,
    openCancel,
    handleSubmit,
    handleCancelSubmit,
  };
}
