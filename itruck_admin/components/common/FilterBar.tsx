"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";

export interface FilterBarProps {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}

/** Consistent horizontal filter row for list pages. */
export function FilterBar({ children, sx }: FilterBarProps) {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 2, alignItems: "flex-end", ...sx }}>{children}</Box>
  );
}
