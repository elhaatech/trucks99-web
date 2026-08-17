"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";

export interface DetailFieldProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function DetailField({ label, value, icon, fullWidth }: DetailFieldProps) {
  const theme = useTheme();
  if (value == null || value === "" || value === "—") return null;

  return (
    <Box
      sx={{
        gridColumn: fullWidth ? "1 / -1" : undefined,
        p: 2,
        borderRadius: "10px",
        bgcolor: alpha(theme.palette.background.default, 0.6),
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
        {icon ? (
          <Box sx={{ color: "primary.main", display: "flex", fontSize: 18 }}>{icon}</Box>
        ) : null}
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
          {label}
        </Typography>
      </Box>
      <Typography variant="body1" fontWeight={600} color="text.primary">
        {value}
      </Typography>
    </Box>
  );
}

export interface ViewDetailGridProps {
  children: React.ReactNode;
  columns?: { xs?: number; sm?: number; md?: number };
}

export function ViewDetailGrid({ children, columns = { xs: 1, sm: 2, md: 3 } }: ViewDetailGridProps) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: `repeat(${columns.xs ?? 1}, minmax(0, 1fr))`,
          sm: `repeat(${columns.sm ?? 2}, minmax(0, 1fr))`,
          md: `repeat(${columns.md ?? 3}, minmax(0, 1fr))`,
        },
        gap: 2,
      }}
    >
      {children}
    </Box>
  );
}

export interface ViewPageSectionProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function ViewPageSection({ title, subtitle, action, children }: ViewPageSectionProps) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        mb: 3,
        p: { xs: 2, sm: 3 },
        borderRadius: "12px",
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: theme.tokens.shadow.card,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2.5, gap: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700} letterSpacing="-0.01em">
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {action}
      </Box>
      {children}
    </Box>
  );
}
