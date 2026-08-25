"use client";

import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";
import { withAppBasePath } from "@/lib/appConfig";

export const BRAND_LOGO_SRC = "/images/trucks99-logo.png";

/** Intrinsic pixel size of trucks99-logo.png */
export const BRAND_LOGO_INTRINSIC = { width: 365, height: 240 } as const;

const ASPECT = BRAND_LOGO_INTRINSIC.width / BRAND_LOGO_INTRINSIC.height;

type BrandLogoProps = {
  /** Display height in px (width scales to keep aspect). */
  height?: number;
  /** Optional fixed width; defaults from height × aspect ratio. */
  width?: number;
  alt?: string;
  priority?: boolean;
  sx?: SxProps<Theme>;
};

/**
 * Official TRUCKS99 wordmark.
 * Place file at `public/images/trucks99-logo.png`.
 */
export function BrandLogo({
  height = 40,
  width,
  alt = "TRUCKS99",
  priority = false,
  sx,
}: BrandLogoProps) {
  const w = width ?? Math.round(height * ASPECT);
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        lineHeight: 0,
        flexShrink: 0,
        ...((sx as object) || {}),
      }}
    >
      <Box
        component="img"
        src={withAppBasePath(BRAND_LOGO_SRC)}
        alt={alt}
        width={w}
        height={height}
        {...(priority ? { fetchPriority: "high" as const } : {})}
        sx={{
          width: w,
          height,
          objectFit: "contain",
          display: "block",
        }}
      />
    </Box>
  );
}
