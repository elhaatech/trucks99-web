"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { GoogleAd } from "./GoogleAd";
import type { AdSensePlacement, GoogleAdFormat } from "./GoogleAd";

export interface GoogleAdBannerProps {
  placement: AdSensePlacement;
  slot?: string;
  format?: GoogleAdFormat;
  responsive?: boolean;
}

/**
 * Spaced, labeled AdSense placement for content pages.
 * Keep away from buttons, forms, and navigation.
 */
export function GoogleAdBanner({
  placement,
  slot,
  format = "auto",
  responsive = true,
}: GoogleAdBannerProps) {
  return (
    <Box
      component="aside"
      aria-label="Advertisement"
      sx={{
        my: { xs: 3, md: 4 },
        width: "100%",
        maxWidth: "100%",
        overflow: "visible",
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          display: "block",
          mb: 1,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          fontWeight: 600,
        }}
      >
        Advertisement
      </Typography>
      <GoogleAd
        key={placement}
        placement={placement}
        slot={slot}
        format={format}
        responsive={responsive}
      />
    </Box>
  );
}
