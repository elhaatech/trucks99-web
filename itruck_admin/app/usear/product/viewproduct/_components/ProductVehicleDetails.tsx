"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { PRODUCT_THEME as T } from "@/lib/theme";

type ProductVehicleDetailsProps = {
  specs: Array<{ label: string; value: string }>;
  listingId?: string;
  bsNumber?: string;
  vehicleId?: string;
  address?: string;
  description?: string;
};

export function ProductVehicleDetails({
  specs,
  listingId,
  bsNumber,
  vehicleId,
  address,
  description,
}: ProductVehicleDetailsProps) {
  const resolvedVehicleId = vehicleId || listingId;
  const rows = [
    ...specs,
    bsNumber ? { label: "BS No", value: bsNumber } : null,
    resolvedVehicleId ? { label: "Vehicle ID", value: resolvedVehicleId } : null,
    address ? { label: "Location", value: address } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  if (rows.length === 0 && !description?.trim()) return null;

  return (
    <Box
      sx={{
        mb: 2.5,
        p: 2.5,
        borderRadius: T.radius.lg,
        border: `1px solid ${T.color.border}`,
        bgcolor: T.color.surface,
        boxShadow: T.shadow.card,
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: 16, mb: 2, color: T.color.textPrimary }}>
        Vehicle Details
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: { xs: 0, sm: 1 },
        }}
      >
        {rows.map((row, idx) => (
          <Box
            key={`${row.label}-${idx}`}
            sx={{
              py: 1.25,
              px: { sm: 1 },
              borderBottom: idx < rows.length - 1 ? `1px solid ${T.color.border}` : undefined,
            }}
          >
            <Typography sx={{ fontSize: 12, color: T.color.textMuted, mb: 0.35 }}>
              {row.label}
            </Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: T.color.textPrimary }}>
              {row.value}
            </Typography>
          </Box>
        ))}
      </Box>
      {description?.trim() ? (
        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${T.color.border}` }}>
          <Typography sx={{ fontSize: 12, color: T.color.textMuted, mb: 0.75 }}>Description</Typography>
          <Typography sx={{ fontSize: 14, color: T.color.textSecondary, lineHeight: 1.7 }}>
            {description}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}
