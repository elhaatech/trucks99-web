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
        borderRadius: 0,
        overflow: "hidden",
      }}
    >
      <Skeleton variant="rectangular" height={140} />
      <Box sx={{ p: 1.5 }}>
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
          md: "repeat(3, 1fr)",
          xl: "repeat(4, 1fr)",
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
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5, gap: 2, flexWrap: "wrap" }}>
        <Box>
          <Skeleton width={220} height={30} />
          <Skeleton width={320} height={16} sx={{ mt: 1 }} />
        </Box>
        <Skeleton width={140} height={34} sx={{ borderRadius: 0 }} />
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(3, minmax(0, 1fr))",
            xl: "repeat(4, minmax(0, 1fr))",
          },
          gap: { xs: 1.5, md: 2 },
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <Box
            key={i}
            sx={{
              p: { xs: 2.25, md: 2.6 },
              borderRadius: 0,
              border: `1px solid ${T.color.border}`,
              bgcolor: T.color.surface,
              minHeight: 210,
              boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Skeleton width="70%" height={14} />
              <Skeleton variant="circular" width={48} height={48} />
            </Box>
            <Skeleton width="55%" height={38} sx={{ mt: 2.25 }} />
            <Skeleton width="90%" height={16} sx={{ mt: 1.5 }} />
            <Skeleton width="100%" height={8} sx={{ mt: 2.25, borderRadius: 0 }} />
            <Skeleton width="45%" height={12} sx={{ mt: 1.25 }} />
          </Box>
        ))}
      </Box>
      <Skeleton variant="rounded" height={72} sx={{ mt: 2.25, borderRadius: 0 }} />
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
