"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import { alpha } from "@mui/material/styles";

export interface ModalSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

/**
 * Reusable section block for modal forms/details.
 */
export function ModalSection({ title, subtitle, children }: ModalSectionProps) {
  return (
    <Box
      sx={{
        borderRadius: "12px",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: (t) => alpha(t.palette.background.default, 0.35),
        overflow: "hidden",
      }}
    >
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: "-0.01em" }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: "block", lineHeight: 1.45 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      <Divider />
      <Box sx={{ p: 2 }}>{children}</Box>
    </Box>
  );
}
