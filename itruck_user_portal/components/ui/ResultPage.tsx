"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { alpha, useTheme } from "@mui/material/styles";

export interface ResultPageProps {
  variant: "success" | "error" | "warning" | "info";
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description?: string;
  actions?: React.ReactNode;
}

const variantColors = {
  success: { main: "success.main", bg: "success", border: "success.light" },
  error: { main: "error.main", bg: "error", border: "error.light" },
  warning: { main: "warning.main", bg: "warning", border: "warning.light" },
  info: { main: "info.main", bg: "info", border: "info.light" },
} as const;

export function ResultPage({
  variant,
  icon,
  title,
  subtitle,
  description,
  actions,
}: ResultPageProps) {
  const theme = useTheme();
  const colors = variantColors[variant];
  const accentMain =
    variant === "success"
      ? theme.palette.success.main
      : variant === "error"
        ? theme.palette.error.main
        : variant === "warning"
          ? theme.palette.warning.main
          : theme.palette.info.main;

  return (
    <Box
      className="page-enter"
      sx={{
        mt: 2,
        p: { xs: 3, sm: 4 },
        borderRadius: "16px",
        textAlign: "center",
        bgcolor: alpha(accentMain, 0.06),
        border: "1px solid",
        borderColor: alpha(accentMain, 0.2),
        backgroundImage: `radial-gradient(circle at 50% 0%, ${alpha(accentMain, 0.08)} 0%, transparent 55%)`,
      }}
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          mx: "auto",
          mb: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: alpha(accentMain, 0.12),
          color: colors.main,
          animation: "fadeInUp 0.4s ease",
        }}
      >
        {icon}
      </Box>
      <Typography variant="h5" fontWeight={800} letterSpacing="-0.02em">
        {title}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 480, mx: "auto" }}>
        {subtitle}
      </Typography>
      {description ? (
        <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
          {description}
        </Typography>
      ) : null}
      {actions ? (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, justifyContent: "center", mt: 3 }}>
          {actions}
        </Box>
      ) : null}
    </Box>
  );
}

export function ResultActionButton({
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button variant="contained" sx={{ minWidth: 140, px: 3 }} {...props}>
      {children}
    </Button>
  );
}
