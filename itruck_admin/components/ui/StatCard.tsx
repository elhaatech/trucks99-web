"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import { AppCard } from "./AppCard";

export interface StatCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  /** MUI palette key or CSS color for icon background */
  accent?: "primary" | "secondary" | "success" | "info" | "warning" | "error";
  loading?: boolean;
  onClick?: () => void;
  badge?: React.ReactNode;
  trend?: { value: string; up?: boolean };
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  accent = "primary",
  loading,
  onClick,
  badge,
  trend,
}: StatCardProps) {
  const theme = useTheme();
  const accentMain =
    accent === "success"
      ? theme.palette.success.main
      : accent === "info"
        ? theme.palette.info.main
        : accent === "warning"
          ? theme.palette.warning.main
          : accent === "error"
            ? theme.palette.error.main
            : accent === "secondary"
              ? theme.palette.secondary.main
              : theme.palette.primary.main;

  return (
    <AppCard
      hover={!!onClick}
      accentTop
      accentColor={accentMain}
      onClick={onClick}
      padding={3}
      sx={{
        height: "100%",
        background: `linear-gradient(135deg, ${alpha(accentMain, 0.05)} 0%, ${theme.palette.background.paper} 55%)`,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ letterSpacing: 0.6, fontWeight: 600, display: "block" }}
          >
            {title}
          </Typography>
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{ mt: 0.75, lineHeight: 1.15, color: "text.primary" }}
          >
            {loading ? "—" : value}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {subtitle}
            </Typography>
          ) : null}
          {trend ? (
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                mt: 1.5,
                px: 1.25,
                py: 0.375,
                borderRadius: "99px",
                fontSize: 12,
                fontWeight: 600,
                bgcolor: trend.up
                  ? alpha(theme.palette.success.main, 0.1)
                  : alpha(theme.palette.error.main, 0.1),
                color: trend.up ? "success.dark" : "error.dark",
              }}
            >
              {trend.value}
            </Box>
          ) : null}
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
          {badge}
          {icon ? (
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                bgcolor: alpha(accentMain, 0.12),
                color: accentMain,
                transition: `transform ${theme.tokens.transition.fast}`,
                ".MuiCard-root:hover &": { transform: "scale(1.05)" },
              }}
            >
              {icon}
            </Box>
          ) : null}
        </Box>
      </Box>
    </AppCard>
  );
}
