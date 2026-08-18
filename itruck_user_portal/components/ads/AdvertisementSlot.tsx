"use client";

import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import { GoogleAd } from "./GoogleAd";
import { ADSENSE_SLOTS } from "./adsConfig";
import { isGoogleAdEligiblePage } from "./googleAdPages";

export interface AdvertisementSlotProps {
  adUnitId?: string;
  slot?: string;
  sx?: object;
}

/**
 * Inline Google AdSense slot. Remounts on route change so ads re-initialize
 * correctly after client-side navigation.
 */
export function AdvertisementSlot({
  adUnitId,
  slot = ADSENSE_SLOTS.listing,
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
        key={`google-ad-${pathname}-${slot || adUnitId || "listing"}`}
        slot={slot}
        adUnitId={adUnitId}
        format="auto"
        responsive
        enabled
      />
    </Box>
  );
}
