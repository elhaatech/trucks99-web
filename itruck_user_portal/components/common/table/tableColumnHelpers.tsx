"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import { PRIMARY } from "@/lib/theme";
import { BuySellImage } from "@/components/common/BuySellImage";

export function renderClickableName(
  value: string,
  href: string
) {
  if (!value) return "—";

  return (
    <Link
      href={href}
      style={{
        color: PRIMARY,
        textDecoration: "none",
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {value}
    </Link>
  );
}

export function renderImage(
  src?: string,
  alt?: string
) {
  return (
    <Box
      sx={{
        width: 48,
        height: 36,
        borderRadius: 1,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <BuySellImage src={src} alt={alt || "Image"} />
    </Box>
  );
}