"use client";

import Box from "@mui/material/Box";
import { usePathname } from "next/navigation";
import { BackButton } from "@/components/common";
import {
  getBuySellBackFallback,
  shouldShowBuySellBack,
} from "@/lib/buySellBackNavigation";

export function BuySellPageBack() {
  const pathname = usePathname() ?? "";

  if (!shouldShowBuySellBack(pathname)) {
    return null;
  }

  return (
    <Box sx={{ mt: { xs: 2, md: 3 }, mb: { xs: 1.5, md: 2 } }}>
      <BackButton
        fallback={getBuySellBackFallback(pathname)}
        label="Back"
        variant="text"
        size="small"
        sx={{
          ml: -0.5,
          color: "text.secondary",
          fontWeight: 600,
          "&:hover": { bgcolor: "transparent", color: "primary.main" },
        }}
      />
    </Box>
  );
}
