"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import { InboxOutlined as InboxOutlinedIcon } from "@mui/icons-material";

export interface ListEmptyStateProps {
  title: string;
  description?: string;
  compact?: boolean;
  action?: React.ReactNode;
}

/** Shared empty state for tables and list modules. */
export function ListEmptyState({
  title,
  description,
  compact = false,
  action,
}: ListEmptyStateProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: compact ? 0.75 : 1.25,
        py: compact ? 3 : 5,
        px: 2,
        textAlign: "center",
      }}
    >
      <Box
        sx={{
          width: compact ? 48 : 64,
          height: compact ? 48 : 64,
          borderRadius: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: alpha(theme.palette.primary.main, compact ? 0.06 : 0.08),
          color: "primary.main",
          border: `1px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
        }}
      >
        <InboxOutlinedIcon sx={{ fontSize: compact ? 24 : 32 }} />
      </Box>
      <Typography
        color="text.primary"
        variant={compact ? "body2" : "subtitle1"}
        fontWeight={600}
      >
        {title}
      </Typography>
      {description ? (
        <Typography
          color="text.secondary"
          variant="caption"
          sx={{ maxWidth: 360, lineHeight: 1.5 }}
        >
          {description}
        </Typography>
      ) : null}
      {action ? <Box sx={{ mt: 1.5 }}>{action}</Box> : null}
    </Box>
  );
}
