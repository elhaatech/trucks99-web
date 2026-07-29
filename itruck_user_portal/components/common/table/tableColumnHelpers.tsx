"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import { PRIMARY } from "@/lib/theme";

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
  if (!src) return "—";

  return (
    <Box
      component="img"
      src={src}
      alt={alt || "Image"}
      sx={{
        width: 48,
        height: 36,
        objectFit: "cover",
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
      }}
    />
  );
}