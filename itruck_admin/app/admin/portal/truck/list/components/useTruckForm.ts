// app/(dashboard)/trucks/_components/useTruckForm.ts
import { useCallback, useState } from "react";
import {
  createTruck, updateTruck,
  type Truck, getRowId,
} from "@/model/api";
import { useToast } from "@/lib/toast";
import { resolveApiBase, getAuthHeaders } from "@/model/services/common";
import { EMPTY_FORM, type TruckFormState } from "./truckTypes";

const uploadFile = async (file: File, key: string): Promise<string> => {
  const formData = new FormData();
  formData.append("key", key);
  formData.append("file", file);
  const res = await fetch(`${resolveApiBase()}/api/upload`, {
    method: "POST",
    body: formData,
    headers: { ...getAuthHeaders() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "File upload failed");
  return (data.url || data.path) as string;
};

export function useTruckForm(onSuccess: () => void) {
  const toast = useToast();
  const [form, setForm] = useState<TruckFormState>(EMPTY_FORM);
  const [editing, setEditing] = useState<Truck | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const set = useCallback(<K extends keyof TruckFormState>(key: K, val: TruckFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((row: Truck) => {
    setEditing(row);
    setForm({
      
      vehicleNumber:        row.vehicleNumber        || row.registrationNumber || "",
      driverName:           row.driverName           || "",
      driverId:             row.driverId             || "",
      vehicleType:          row.vehicleType          || row.truckType          || "",
      vehicleBody:          row.vehicleBody          || "",
      vehicleBodyType:      row.vehicleBodyType      || "",
      vehicleBodyLength:    row.vehicleBodyLength    || "",
      containerFeet:        row.containerFeet        || "",
      capacity:             row.vehicleCapacity      || row.capacity           || "",
      vehicleTyre:          row.vehicleTyre          || row.total_tire         || "",
      status:               row.status               || "available",
      truckStatus:          row.truckStatus          || (row as any).truck_status || "",
      loadStatus:           (row as any).load_status || "",
      currentLocation:      row.currentLocation      || "",
      dropLocation:         (row as any).dropLocation || "",
      price:                (row as any).price        || "",
      contactNumber:        row.contactNumber        || "",
      ownerId:              row.ownerId || (row as any).createdBy || "",
      bit:                  row.bit  != null ? String(row.bit) : "",
      bitReason:            row.bitReason            || "",
      vehicleImageUrl:      row.vehicleImage         || "",
      vehicleImages:        Array.isArray(row.vehicleImages) ? row.vehicleImages : [],
      vehicleImageFile:     null,
      vehicleImageFiles:    [],
      vehicleRCDocumentUrl: row.vehicleRCDocument    || "",
      vehicleRCDocumentFile: null,
      loadCapacity:         row.loadCapacity         || "",  // not stored on backend — auto-filled from capacity + truckStatus; editable 
    });
    setDialogOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.capacity.trim()) throw new Error("Vehicle capacity is required");

    // ── Upload primary image if a new file was selected ────────────────────
    let nextVehicleImage = form.vehicleImageUrl;
    if (form.vehicleImageFile) {
      nextVehicleImage = await uploadFile(form.vehicleImageFile, "truck_image");
    }

    // ── Upload additional images if any new files were selected ───────────
    let nextVehicleImages = form.vehicleImages;
    if (form.vehicleImageFiles.length > 0) {
      const uploaded = await Promise.all(
        form.vehicleImageFiles.map((f) => uploadFile(f, "truck_image"))
      );
      nextVehicleImages = [...nextVehicleImages, ...uploaded];
    }

    // ── Upload RC document if a new file was selected ──────────────────────
    let nextVehicleRCDocument = form.vehicleRCDocumentUrl;
    if (form.vehicleRCDocumentFile) {
      nextVehicleRCDocument = await uploadFile(form.vehicleRCDocumentFile, "truck_rc_doc");
    }

    // ── Build payload — all field names match what the backend reads ───────
    const body: Record<string, unknown> = {
      // Identity
      registrationNumber: form.vehicleNumber.trim()    || undefined,
      vehicleNumber:      form.vehicleNumber.trim()    || undefined,  // alias accepted by backend

      // Classification
      truckType:          form.vehicleType.trim()      || undefined,  // backend reads truckType
      vehicleType:        form.vehicleType.trim()      || undefined,  // backend alias
      vehicleBody:        form.vehicleBody.trim()      || undefined,
      vehicleBodyType:    form.vehicleBodyType.trim()  || undefined,
      vehicleBodyLength:  form.vehicleBodyLength.trim()|| undefined,
      containerFeet:      form.containerFeet.trim()    || undefined,
      loadCapacity:       form.loadCapacity.trim()     || undefined,  // auto-filled from capacity + truckStatus; editable
      // Capacity & tyres
      capacity:           form.capacity.trim(),                        // required
      vehicleCapacity:    form.capacity.trim(),                        // alias
      total_tire:         form.vehicleTyre.trim()      || undefined,
      vehicleTyre:        form.vehicleTyre.trim()      || undefined,   // alias

      // Status
      status:             form.status                  || "available",
      truck_status:       form.truckStatus             || undefined,
      load_status:        form.loadStatus              || undefined,

      // Location / pricing
      currentLocation:    form.currentLocation.trim()  || undefined,
      dropLocation:       form.dropLocation.trim()     || undefined,
      price:              form.price.trim()            || undefined,

      // Contact
      contactNumber:      form.contactNumber.trim()    || undefined,
      driverId:           form.driverId                || undefined,
      driverName:         form.driverName.trim()       || undefined,

      // Owner — backend reads ownerId or userId
      ownerId:            form.ownerId                 || undefined,
      userId:             form.ownerId                 || undefined,

      // Bid fields
      bit:                form.bit ? Number(form.bit)  : undefined,
      bitReason:          form.bitReason.trim()        || undefined,

      // Images & documents
      vehicleImage:       nextVehicleImage             || undefined,
      vehicleImages:      nextVehicleImages.length > 0 ? nextVehicleImages : undefined,
      vehicleRCDocument:  nextVehicleRCDocument        || undefined,

      routes: [],
    };

    if (editing) {
      await updateTruck(getRowId(editing), body);
      toast.success("Truck updated successfully");
    } else {
      await createTruck(body);
      toast.success("Truck created successfully");
    }
    setDialogOpen(false);
    onSuccess();
  }, [form, editing, onSuccess, toast]);

  return {
    form, set, editing,
    dialogOpen, setDialogOpen,
    openCreate, openEdit, handleSubmit,
  };
}