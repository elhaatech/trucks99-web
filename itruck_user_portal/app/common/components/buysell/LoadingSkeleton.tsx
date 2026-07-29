"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import { PRODUCT_THEME as T } from "@/lib/theme";

export function VehicleCardSkeleton() {
  return (
    <Box
      sx={{
        bgcolor: T.color.surface,
        border: `1px solid ${T.color.border}`,
        borderRadius: T.radius.md,
        overflow: "hidden",
      }}
    >
      <Skeleton variant="rectangular" height={180} />
      <Box sx={{ p: 2 }}>
        <Skeleton width="75%" height={20} />
        <Skeleton width="50%" height={16} sx={{ mt: 1 }} />
        <Skeleton width="40%" height={24} sx={{ mt: 1.5 }} />
      </Box>
    </Box>
  );
}

export function VehicleGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, 1fr)",
          lg: "repeat(3, 1fr)",
        },
        gap: 2.5,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <VehicleCardSkeleton key={i} />
      ))}
    </Box>
  );
}

export function StatsSkeleton() {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
        gap: 2,
      }}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <Box
          key={i}
          sx={{
            p: 2.5,
            borderRadius: T.radius.md,
            border: `1px solid ${T.color.border}`,
            bgcolor: T.color.surface,
          }}
        >
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={32} sx={{ mt: 1 }} />
        </Box>
      ))}
    </Box>
  );
}

export function BuySellPageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <Box sx={{ py: 8, textAlign: "center" }}>
      <Typography color="text.secondary">{label}</Typography>
    </Box>
  );
}
