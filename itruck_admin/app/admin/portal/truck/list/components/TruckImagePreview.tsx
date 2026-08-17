// app/(dashboard)/trucks/_components/TruckImagePreview.tsx
"use client";
import Box from "@mui/material/Box";
import { FormDialog } from "@/components/ui";

interface Props {
  url: string | null;
  onClose: () => void;
}

export function TruckImagePreview({ url, onClose }: Props) {
  return (
    <FormDialog
      open={!!url}
      onClose={onClose}
      title="Truck Image"
      submitLabel="Close"
      onSubmit={async () => onClose()}
      maxWidth="sm"
    >
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        {url && (
          <Box
            component="img"
            src={url}
            alt="Truck"
            sx={{ maxWidth: "100%", maxHeight: 400, borderRadius: 2, border: "1px solid", borderColor: "divider" }}
          />
        )}
      </Box>
    </FormDialog>
  );
}