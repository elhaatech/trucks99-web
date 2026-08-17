// app/(dashboard)/trucks/_components/TruckStatusDialog.tsx
"use client";
import { useState } from "react";
import Box from "@mui/material/Box";
import { FormDialog, ModalSection } from "@/components/ui";
import { FormSelectField, FormTextField } from "@/components/common";
import { updateTruckStatusLocation, type Truck, getRowId } from "@/model/api";
import { useToast } from "@/lib/toast";
import { STATUS_OPTIONS } from "./truckTypes";

interface Props {
  truck: Truck | null;
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

export function TruckStatusDialog({ truck, onClose, onSuccess, onError }: Props) {
  const toast = useToast();
  const [status, setStatus] = useState(truck?.status || "available");
  const [location, setLocation] = useState(truck?.currentLocation || "");

  // reset when truck changes
  if (truck && status !== (truck.status || "available") && location !== (truck.currentLocation || "")) {
    setStatus(truck.status || "available");
    setLocation(truck.currentLocation || "");
  }

  const handleSubmit = async () => {
    if (!truck) return;
    try {
      await updateTruckStatusLocation(getRowId(truck), {
        status,
        currentLocation: location.trim() || undefined,
      });
      toast.success("Truck status/location updated");
      onClose();
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update status/location";
      onError(msg);
      toast.error(msg);
      throw err;
    }
  };

  return (
    <FormDialog
      open={!!truck}
      onClose={onClose}
      title="Update Truck Status / Location"
      description="Change availability status and update the truck's current location."
      submitLabel="Update"
      onSubmit={handleSubmit}
      maxWidth="sm"
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <ModalSection title="Live status update" subtitle="Update availability and truck location for dispatch visibility.">
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <FormSelectField
              label="Status" value={status} onChange={setStatus}
              options={STATUS_OPTIONS} fullWidth
            />
            <FormTextField
              label="Current location" value={location} onChange={setLocation}
              placeholder="e.g. Chennai, TN" fullWidth
            />
          </Box>
        </ModalSection>
      </Box>
    </FormDialog>
  );
}