"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import { InboxOutlined as InboxOutlinedIcon } from "@mui/icons-material";

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  compact = false,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        py: compact ? 4 : 6,
        px: compact ? 2 : 3,
        textAlign: "center",
        borderRadius: "12px",
        border: "1px dashed",
        borderColor: alpha(theme.palette.primary.main, 0.2),
        bgcolor: alpha(theme.palette.primary.main, 0.02),
        backgroundImage: `radial-gradient(circle at 50% 0%, ${alpha(theme.palette.primary.main, 0.04)} 0%, transparent 60%)`,
      }}
    >
      <Box
        sx={{
          width: compact ? 56 : 72,
          height: compact ? 56 : 72,
          borderRadius: "16px",
          mx: "auto",
          mb: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: alpha(theme.palette.primary.main, 0.08),
          color: "primary.main",
          "& svg": { fontSize: compact ? 28 : 36 },
        }}
      >
        {icon ?? <InboxOutlinedIcon />}
      </Box>
      <Typography variant={compact ? "subtitle2" : "h6"} fontWeight={700} color="text.primary">
        {title}
      </Typography>
      {description ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1, maxWidth: 400, mx: "auto", lineHeight: 1.6 }}
        >
          {description}
        </Typography>
      ) : null}
      {action ? <Box sx={{ mt: 3 }}>{action}</Box> : null}
    </Box>
  );
}
