"use client";

import { useEffect } from "react";
import Box from "@mui/material/Box";
import type { User, VehicleBodyType, VehicleType, Truck } from "@/model/api";
import { FormDialog, ModalSection } from "@/components/ui";
import {
  FormTextField,
  FormSelectField,
  FormAddressField,
  type SelectOption,
} from "@/components/common";
import {
  TRUCK_STATUS_OPTIONS,
  LOAD_STATUS_OPTIONS,
  TruckFormState,
} from "./truckTypes";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TruckFormDialogProps {
  open: boolean;
  onClose: () => void;
  editing: Truck | null;
  form: TruckFormState;
  set: any;
  onSubmit: () => Promise<void>;
  currentUser?: User | null;
  vehicleTypeOptions: SelectOption[];
  vehicleBodyTypeOptions: SelectOption[];
}

const STATUS_OPTIONS: SelectOption[] = [
  { value: "available",   label: "Available"   },
  { value: "in-transit",  label: "In Transit"  },
  { value: "maintenance", label: "Maintenance" },
  { value: "unavailable", label: "Unavailable" },
  { value: "draft",       label: "Draft"       },
];

export function TruckFormDialog({
  open,
  onClose,
  editing,
  form,
  set,
  onSubmit,
  currentUser,
  vehicleTypeOptions,
  vehicleBodyTypeOptions,
}: TruckFormDialogProps) {
  // ── Role check ─────────────────────────────────────────────────────────────
  // role.status === "admin" → show all users in Owner dropdown
  // anything else ("user")  → show only the logged-in user
  const isAdmin = currentUser?.role?.status === "admin";

  // ── Auto-select logged-in user for non-admin on dialog open ───────────────
  useEffect(() => {
    if (!open) return;
    if (isAdmin) return;        // admin picks freely
    if (editing) return;        // edit mode keeps existing owner
    const selfId = (currentUser as any)?._id ?? (currentUser as any)?.id ?? "";
    if (selfId && !form.ownerId) {
      set("ownerId", selfId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Owner dropdown options ─────────────────────────────────────────────────
  // NOTE: TrucksPage passes vehicleTypeOptions / vehicleBodyTypeOptions already
  // built. For users, currentUser is passed; non-admin sees only themselves.
  // Admin would need a users list — if you want admin to pick from all users,
  // pass `users: User[]` as a prop and build the list here (same as LoadFormDialog).
  const ownerOptions: SelectOption[] = currentUser
    ? [
        {
          value: (currentUser as any)._id ?? (currentUser as any).id ?? "",
          label: (currentUser as any).name?.trim() || (currentUser as any).mobile || "",
        },
      ]
    : [];

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={editing ? "Edit Truck" : "Add Truck"}
      description={
        editing
          ? "Update truck details and status."
          : "Register a new truck with vehicle and owner details."
      }
      submitLabel={editing ? "Update" : "Create"}
      onSubmit={onSubmit}
      maxWidth="md"
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

        <ModalSection
          title="Vehicle identity"
          subtitle="Registration number and owner."
        >
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <FormTextField
              label="Vehicle Number"
              value={form.vehicleNumber}
              onChange={(v) => set("vehicleNumber", v)}
              placeholder="e.g. TN33D2342"
              required
              sx={{ minWidth: 180 }}
            />
            {/* Admin sees all users; regular user sees only themselves (disabled) */}
            <FormSelectField
              label="Vehicle Owner"
              value={form.ownerId}
              onChange={(v) => set("ownerId", v)}
              options={isAdmin ? vehicleTypeOptions : ownerOptions}
              placeholder="— Select owner —"
              disabled={!isAdmin}
              fullWidth={false}
            />
          </Box>
        </ModalSection>

        <ModalSection
          title="Vehicle classification"
          subtitle="Type, body, and container size."
        >
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ minWidth: 180 }}>
              <FormSelectField
                label="Vehicle Type"
                value={form.vehicleType}
                onChange={(v) => set("vehicleType", v)}
                options={vehicleTypeOptions}
                placeholder="— Select —"
                required
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
                required
                fullWidth
              />
            </Box>
            <FormTextField
              label="Container Feet"
              value={form.containerFeet}
              onChange={(v) => set("containerFeet", v)}
              placeholder="e.g. 20"
              type="number"
              fullWidth={false}
              sx={{ minWidth: 140 }}
            />
          </Box>
        </ModalSection>

        <ModalSection
          title="Capacity & wheels"
          subtitle="Vehicle and load capacity in tons."
        >
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <FormTextField
              label="Vehicle Capacity (tons)"
              value={form.capacity}
              onChange={(v) => set("capacity", v)}
              type="number"
              required
              fullWidth={false}
              sx={{ minWidth: 160 }}
            />
            <FormTextField
              label="Load Capacity (tons)"
              value={form.loadCapacity}
              onChange={(v) => set("loadCapacity", v)}
              type="number"
              placeholder="Auto-filled"
              fullWidth={false}
              sx={{ minWidth: 160 }}
            />
            <FormTextField
              label="Vehicle Wheels"
              value={form.vehicleTyre}
              onChange={(v) => set("vehicleTyre", v)}
              placeholder="e.g. 14"
              fullWidth={false}
              sx={{ minWidth: 120 }}
            />
          </Box>
        </ModalSection>

        <ModalSection
          title="Location & pricing"
          subtitle="Current location and freight price."
        >
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <FormAddressField
                label="Current Location"
                value={form.currentLocation}
                onChange={(v) => set("currentLocation", v)}
                onPlaceSelect={(addr) => set("currentLocation", addr)}
                placeholder="e.g. Chennai"
                required
              />
            </Box>
            <FormTextField
              label="Freight Price (₹)"
              value={form.price}
              onChange={(v) => set("price", v)}
              type="number"
              fullWidth={false}
              sx={{ minWidth: 140 }}
            />
          </Box>
        </ModalSection>

        <ModalSection title="Status">
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ minWidth: 160 }}>
              <FormSelectField
                label="Truck Status"
                value={form.truckStatus}
                onChange={(v) => set("truckStatus", v)}
                options={TRUCK_STATUS_OPTIONS}
                placeholder="— Select —"
                fullWidth
              />
            </Box>
            <Box sx={{ minWidth: 160 }}>
              <FormSelectField
                label="Load Status"
                value={form.loadStatus}
                onChange={(v) => set("loadStatus", v)}
                options={LOAD_STATUS_OPTIONS}
                placeholder="— Select —"
                fullWidth
              />
            </Box>
            <Box sx={{ minWidth: 160 }}>
              <FormSelectField
                label="Availability"
                value={form.status}
                onChange={(v) => set("status", v)}
                options={STATUS_OPTIONS}
                placeholder="— Select —"
                fullWidth
              />
            </Box>
          </Box>
        </ModalSection>

      </Box>
    </FormDialog>
  );
}