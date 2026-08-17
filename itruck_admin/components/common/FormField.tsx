"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";

export interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  /** Layout: full width block (default) */
  fullWidth?: boolean;
}

/** Labeled wrapper for inputs (spacing + optional error). */
export function FormField({
  label,
  required,
  error,
  hint,
  children,
  fullWidth = true,
}: FormFieldProps) {
  const theme = useTheme();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, width: fullWidth ? 1 : "auto" }}>
      <Typography
        component="label"
        variant="body2"
        fontWeight={600}
        color="text.primary"
        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
      >
        {label}
        {required ? (
          <Box
            component="span"
            sx={{ color: "error.main", fontWeight: 700, lineHeight: 1 }}
            aria-hidden
          >
            *
          </Box>
        ) : null}
      </Typography>
      {children}
      {hint && !error ? (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45 }}>
          {hint}
        </Typography>
      ) : null}
      {error ? (
        <Typography
          variant="caption"
          color="error"
          sx={{
            lineHeight: 1.45,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            bgcolor: alpha(theme.palette.error.main, 0.06),
            px: 1,
            py: 0.5,
            borderRadius: "6px",
          }}
        >
          {error}
        </Typography>
      ) : null}
    </Box>
  );
}
