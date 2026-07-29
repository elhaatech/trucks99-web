"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { PRODUCT_THEME as T } from "./theme";

export interface SpecEntry {
  name: string;
  value: string | number;
}

/** Responsive card grid for arbitrary spec name/value pairs. */
export function ProductSpecificationsGrid({ specs }: { specs: SpecEntry[] }) {
  if (!specs.length) return null;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
        gap: 1,
      }}
    >
      {specs.map((spec, idx) => (
        <Box
          key={`${spec.name}-${idx}`}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 0.4,
            px: 1.5,
            py: 1.1,
            borderRadius: T.radius.sm,
            border: `1px solid ${T.color.border}`,
            bgcolor: T.color.surfaceMuted,
            transition: "box-shadow 0.15s ease, transform 0.15s ease",
            "&:hover": { boxShadow: T.shadow.card, transform: "translateY(-1px)" },
          }}
        >
          <Typography sx={{ fontFamily: T.font.body, fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: T.color.textMuted }}>
            {spec.name}
          </Typography>
          <Typography sx={{ fontFamily: T.font.body, fontSize: 14, fontWeight: 600, color: T.color.textPrimary }}>
            {spec.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
