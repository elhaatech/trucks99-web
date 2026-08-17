"use client";

import { useEffect } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import type {
  VehicleType,
  VehicleBodyType,
  Material,
  User,
  Load,
} from "@/model/api";
import { FormDialog, ModalSection } from "@/components/ui";
import {
  FormTextField,
  FormSelectField,
  FormAddressField,
  FormDateTimePicker,
  FormField,
  type SelectOption,
} from "@/components/common";
import type { FormState, SetFormFieldFn } from "../interface/loadTypes";

export interface LoadFormDialogProps {
  open: boolean;
  onClose: () => void;
  editing: Load | null;
  form: FormState;
  set: SetFormFieldFn;
  onSubmit: () => Promise<void>;
  users: User[];
  materials: Material[];
  vehicleTypes: VehicleType[];
  vehicleBodyTypes: VehicleBodyType[];
  currentUser?: User | null;
}

const STATUS_OPTIONS: SelectOption[] = [
  { value: "pending", label: "Pending" },
  { value: "assigned", label: "Assigned" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "delivered", label: "Delivered" },
];

export function LoadFormDialog({
  open,
  onClose,
  editing,
  form,
  set,
  onSubmit,
  users,
  materials,
  vehicleTypes,
  vehicleBodyTypes,
  currentUser,
}: LoadFormDialogProps) {
  // ── Role check ─────────────────────────────────────────────────────────────
  // role.status === "admin" → show all users in Owner dropdown
  // anything else ("user")  → show only the logged-in user
  const isAdmin = currentUser?.role?.status === "admin";

  // ── Auto-select logged-in user for non-admin on dialog open ────────────────
  useEffect(() => {
    if (!open) return;
    if (isAdmin) return;               // admin can freely choose
    if (editing) return;               // edit mode keeps existing owner
    const selfId = currentUser?._id ?? currentUser?.id ?? "";
    if (selfId && !form.userId) {
      set("userId", selfId);
    }
  }, [open]);                          // run only when dialog opens/closes

  // ── Owner dropdown options ─────────────────────────────────────────────────
  const userOptions: SelectOption[] = isAdmin
    ? users.map((u) => ({
        value: u._id ?? u.id ?? "",
        label: u.name?.trim() || u.mobile || "",
      }))
    : currentUser
      ? [
          {
            value: currentUser._id ?? currentUser.id ?? "",
            label: currentUser.name?.trim() || currentUser.mobile || "",
          },
        ]
      : [];

  // ── Other dropdown options ─────────────────────────────────────────────────
  const materialOptions: SelectOption[] = materials.map((m) => {
    const id = m.id ?? (m as { _id?: string })._id ?? "";
    return { value: id, label: m.materials_type ?? id };
  });

  const vehicleTypeOptions: SelectOption[] = vehicleTypes.map((vt) => {
    const id = vt.id ?? (vt as { _id?: string })._id ?? "";
    return { value: id, label: vt.vehicle_type ?? vt.name ?? id };
  });

  const vehicleBodyTypeOptions: SelectOption[] = vehicleBodyTypes.map((vbt) => {
    const id = vbt.vehicle_id ?? vbt.id ?? (vbt as { _id?: string })._id ?? "";
    return { value: id, label: vbt.vehicle_name ?? id };
  });

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={editing ? "Edit Load" : "Add Load"}
      description={
        editing
          ? "Update load details and route information."
          : "Create a new load with route, vehicle, and pricing details."
      }
      submitLabel={editing ? "Update" : "Create"}
      onSubmit={onSubmit}
      maxWidth="md"
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <ModalSection
          title="Load basics"
          subtitle="Owner and high-level description for this load request."
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Admin: all users | Regular user: only themselves */}
            <FormSelectField
              label="User"
              value={form.userId}
              onChange={(v) => set("userId", v)}
              options={userOptions}
              placeholder="— Select user —"
              fullWidth
              disabled={!isAdmin}   // non-admin cannot change owner
            />
            <FormField label="Description (notes)">
              <TextField
                size="small"
                fullWidth
                multiline
                minRows={2}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                name="description"
                inputProps={{ "aria-label": "Description" }}
              />
            </FormField>
          </Box>
        </ModalSection>

        <ModalSection
          title="Route details"
          subtitle="Pickup and drop locations with geo-coordinates."
        >
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ flex: 1, minWidth: 180 }}>
              <FormAddressField
                label="Pickup Address*"
                value={form.pickupAddress}
                onChange={(v) => set("pickupAddress", v)}
                required
                onPlaceSelect={(addr, { lat, lng }) => {
                  set("pickupAddress", addr);
                  if (lat != null) set("pickupLat", String(lat));
                  if (lng != null) set("pickupLng", String(lng));
                }}
              />
            </Box>
            <FormTextField
              label="Pickup Lat"
              value={form.pickupLat}
              onChange={(v) => set("pickupLat", v)}
              type="number"
              fullWidth={false}
              sx={{ width: 120 }}
            />
            <FormTextField
              label="Pickup Lng"
              value={form.pickupLng}
              onChange={(v) => set("pickupLng", v)}
              type="number"
              fullWidth={false}
              sx={{ width: 120 }}
            />
          </Box>

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ flex: 1, minWidth: 180 }}>
              <FormAddressField
                label="Drop Address*"
                value={form.dropAddress}
                onChange={(v) => set("dropAddress", v)}
                required
                onPlaceSelect={(addr, { lat, lng }) => {
                  set("dropAddress", addr);
                  if (lat != null) set("dropLat", String(lat));
                  if (lng != null) set("dropLng", String(lng));
                }}
              />
            </Box>
            <FormTextField
              label="Drop Lat"
              value={form.dropLat}
              onChange={(v) => set("dropLat", v)}
              type="number"
              fullWidth={false}
              sx={{ width: 120 }}
            />
            <FormTextField
              label="Drop Lng"
              value={form.dropLng}
              onChange={(v) => set("dropLng", v)}
              type="number"
              fullWidth={false}
              sx={{ width: 120 }}
            />
          </Box>
        </ModalSection>

        <ModalSection
          title="Vehicle and material"
          subtitle="Match load to required material and vehicle profile."
        >
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ minWidth: 200 }}>
              <FormSelectField
                label="Material"
                value={form.materialId}
                onChange={(v) => set("materialId", v)}
                options={materialOptions}
                placeholder="— Select material —"
                fullWidth
              />
            </Box>
            <Box sx={{ minWidth: 180 }}>
              <FormSelectField
                label="Vehicle Type"
                value={form.vehicleType}
                onChange={(v) => set("vehicleType", v)}
                options={vehicleTypeOptions}
                placeholder="— Select —"
                fullWidth
              />
            </Box>
            <Box sx={{ minWidth: 200 }}>
              <FormSelectField
                label="Vehicle Body Type"
                value={form.vehicleBodyType}
                onChange={(v) => set("vehicleBodyType", v)}
                options={vehicleBodyTypeOptions}
                placeholder="— Select —"
                fullWidth
              />
            </Box>
          </Box>
        </ModalSection>

        <ModalSection
          title="Pricing and schedule"
          subtitle="Capacity, bid, pickup time, and supporting metrics."
        >
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <FormTextField
              label="Capacity (tonne)"
              value={form.vehicleCapacity}
              onChange={(v) => set("vehicleCapacity", v)}
              type="number"
              fullWidth={false}
              sx={{ minWidth: 160 }}
            />
            <FormTextField
              label="Total tyres"
              value={form.totalTire}
              onChange={(v) => set("totalTire", v)}
              fullWidth={false}
              sx={{ minWidth: 120 }}
            />
            <FormTextField
              label="Container feet"
              value={form.containerFeet}
              onChange={(v) => set("containerFeet", v)}
              placeholder="e.g. 32 ft Mxl"
              fullWidth={false}
              sx={{ minWidth: 160 }}
            />
            <Box sx={{ minWidth: 160 }}>
              <FormDateTimePicker
                label="Pickup time"
                value={form.pickupTimeISO}
                onChange={(iso) => set("pickupTimeISO", iso)}
              />
            </Box>
            <FormTextField
              label="Bid (₹)"
              value={form.bit}
              onChange={(v) => set("bit", v)}
              type="number"
              fullWidth={false}
              sx={{ minWidth: 140 }}
            />
            <FormTextField
              label="Distance (km)"
              value={form.distanceKm}
              onChange={(v) => set("distanceKm", v)}
              type="number"
              placeholder="Auto-filled"
              fullWidth={false}
              sx={{ minWidth: 140 }}
            />
          </Box>
        </ModalSection>

        <ModalSection title="Current status">
          <Box sx={{ minWidth: 160 }}>
            <FormSelectField
              label="Status"
              value={form.status}
              onChange={(v) => set("status", v as FormState["status"])}
              options={STATUS_OPTIONS}
              fullWidth
            />
          </Box>
        </ModalSection>
      </Box>
    </FormDialog>
  );
}