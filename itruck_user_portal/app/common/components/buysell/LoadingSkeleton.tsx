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
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Skeleton width={200} height={28} />
        <Skeleton width={120} height={18} />
      </Box>
      <Skeleton width={280} height={18} sx={{ mb: 2 }} />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr 1fr",
            md: "repeat(12, 1fr)",
          },
          gap: 1.5,
        }}
      >
        {[4, 4, 2, 2].map((span, i) => (
          <Box
            key={i}
            sx={{
              gridColumn: {
                xs: i < 2 ? "span 2" : "span 1",
                sm: i < 2 ? "span 1" : "span 1",
                md: `span ${span}`,
              },
              p: 2,
              borderRadius: T.radius.md,
              border: `1px solid ${T.color.border}`,
              bgcolor: T.color.surface,
              minHeight: i < 2 ? 120 : 96,
            }}
          >
            <Skeleton width="55%" height={12} />
            <Skeleton width="40%" height={i < 2 ? 36 : 28} sx={{ mt: 1.25 }} />
            <Skeleton width="70%" height={8} sx={{ mt: 1.5 }} />
          </Box>
        ))}
      </Box>
      <Skeleton
        variant="rounded"
        height={52}
        sx={{ mt: 2, borderRadius: T.radius.lg }}
      />
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
