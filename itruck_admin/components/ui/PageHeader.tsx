"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import { AppBreadcrumbs, type BreadcrumbItem } from "./AppBreadcrumbs";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  backButton?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  action,
  breadcrumbs,
  backButton,
}: PageHeaderProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        mb: 3,
        pb: 2.5,
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <AppBreadcrumbs items={breadcrumbs} />
      ) : null}

      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
          {backButton}
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="overline"
              color="primary"
              sx={{ fontWeight: 700, letterSpacing: 1.2, fontSize: 11, display: "block" }}
            >
             TRUCKS99
            </Typography>
            <Typography
              variant="h4"
              fontWeight={800}
              color="text.primary"
              sx={{ letterSpacing: "-0.02em", mt: 0.25, lineHeight: 1.2 }}
            >
              {title}
            </Typography>
            {subtitle ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.75, maxWidth: 560, lineHeight: 1.6 }}
              >
                {subtitle}
              </Typography>
            ) : null}
          </Box>
        </Box>
        {action ? (
          <Box
            sx={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 1,
              p: 0.5,
              borderRadius: "12px",
              bgcolor: alpha(theme.palette.background.default, 0.6),
            }}
          >
            {action}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
