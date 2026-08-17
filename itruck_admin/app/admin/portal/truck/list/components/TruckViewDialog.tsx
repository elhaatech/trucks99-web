// app/(dashboard)/trucks/_components/TruckViewDialog.tsx
"use client";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { FormDialog, ModalSection } from "@/components/ui";
import { FormTextField } from "@/components/common";
import type { Truck, VehicleType, VehicleBodyType } from "@/model/api";
import { getVehicleTypeLabel, getVehicleBodyTypeLabel, getFileUrl } from "./truckUtils";

interface Props {
  truck: Truck | null;
  onClose: () => void;
  vehicleTypes: VehicleType[];
  vehicleBodyTypes: VehicleBodyType[];
}

export function TruckViewDialog({ truck, onClose, vehicleTypes, vehicleBodyTypes }: Props) {
  const ro = { readOnly: true };
  return (
    <FormDialog
      open={!!truck}
      onClose={onClose}
      title="View Truck"
      description="Read-only details for the selected truck."
      cancelLabel="Close"
      hideSubmit
      maxWidth="sm"
    >
      {truck && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <ModalSection title="Truck information">
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <FormTextField label="Vehicle Number" value={truck.vehicleNumber || truck.registrationNumber || ""} onChange={() => {}} fullWidth inputProps={ro} />
              <FormTextField label="Vehicle Type" value={getVehicleTypeLabel(vehicleTypes, truck.vehicleType || truck.truckType)} onChange={() => {}} fullWidth inputProps={ro} />
              <FormTextField label="Vehicle Body Type" value={getVehicleBodyTypeLabel(vehicleBodyTypes, truck.vehicleBodyType)} onChange={() => {}} fullWidth inputProps={ro} />
              <FormTextField label="Capacity" value={truck.vehicleCapacity || truck.capacity || ""} onChange={() => {}} fullWidth inputProps={ro} />
              <FormTextField label="Body Length" value={truck.vehicleBodyLength || ""} onChange={() => {}} fullWidth inputProps={ro} />
              <FormTextField label="Vehicle Tyre" value={truck.vehicleTyre || truck.total_tire || ""} onChange={() => {}} fullWidth inputProps={ro} />
              <FormTextField label="Vehicle Owner" value={truck.createdByUser?.name ?? truck.driverName ?? "—"} onChange={() => {}} fullWidth inputProps={ro} />
              <FormTextField label="Current Location" value={truck.currentLocation || ""} onChange={() => {}} fullWidth inputProps={ro} />
              <FormTextField label="Status" value={truck.status || ""} onChange={() => {}} fullWidth inputProps={ro} />
            </Box>
          </ModalSection>

          {truck.vehicleImage && (
            <ModalSection title="Truck image">
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>Truck Image</Typography>
              <Box
                component="img"
                src={getFileUrl(truck.vehicleImage)}
                alt="Truck"
                sx={{
                  maxWidth: 200,
                  maxHeight: 150,
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              />
            </ModalSection>
          )}
          {truck.vehicleRCDocument && (
            <ModalSection title="RC document">
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>RC Document</Typography>
              <a href={getFileUrl(truck.vehicleRCDocument)} target="_blank" rel="noopener noreferrer">View RC document</a>
            </ModalSection>
          )}
          {truck.routes && truck.routes.length > 0 && (
            <ModalSection title="Routes">
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>Routes</Typography>
              <Box sx={{ maxHeight: 180, overflowY: "auto", border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.5 }}>
                {truck.routes.map((r, i) => (
                  <Box key={i} sx={{ py: 0.75, borderBottom: i < truck.routes!.length - 1 ? "1px solid" : "none", borderColor: "divider" }}>
                    <Typography variant="body2">
                      {r.from?.address || "—"} → {r.to?.address || "—"} {r.price != null ? `• ₹${r.price}` : ""}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </ModalSection>
          )}
        </Box>
      )}
    </FormDialog>
  );
}