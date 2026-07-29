"use client";

import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import { GoogleAd, Google_TEST_BANNER_ID } from "./GoogleAd";
import { isGoogleAdEligiblePage } from "./googleAdPages";

export interface AdvertisementSlotProps {
  adUnitId?: string;
  sx?: object;
}

/**
 * Inline Google AdSense slot. Remounts on route change so ads re-initialize
 * correctly after client-side navigation.
 */
export function AdvertisementSlot({
  adUnitId = Google_TEST_BANNER_ID,
  sx,
}: AdvertisementSlotProps) {
  const pathname = usePathname() ?? "";

  if (!isGoogleAdEligiblePage(pathname)) {
    return null;
  }

  return (
    <Box
      key={`ad-slot-${pathname}`}
      sx={{
        mb: 2,
        width: "100%",
        minHeight: { xs: 90, sm: 120 },
        display: "block",
        position: "relative",
        visibility: "visible",
        overflow: "visible",
        ...sx,
      }}
      aria-label="Advertisement"
      data-google-ad-slot="inline"
    >
      <GoogleAd
        key={`google-ad-${pathname}-${adUnitId}`}
        adUnitId={adUnitId}
        enabled
      />
    </Box>
  );
}
