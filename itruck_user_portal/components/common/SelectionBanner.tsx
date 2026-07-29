"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";

export interface SelectionBannerProps {
  count: number;
  total?: number;
  onAction?: () => void;
  actionLabel?: string;
  onClear?: () => void;
  clearLabel?: string;
  onSelectAll?: () => void;
}

export function SelectionBanner({
  count,
  total,
  onAction,
  actionLabel = "Delete selected",
  onClear,
  clearLabel = "Clear selection",
  onSelectAll,
}: SelectionBannerProps) {
  const theme = useTheme();
  if (count <= 0) return null;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 1.5,
        mb: 2.5,
        py: 1.5,
        px: 2,
        borderRadius: "12px",
        bgcolor: alpha(theme.palette.primary.main, 0.06),
        border: "1px solid",
        borderColor: alpha(theme.palette.primary.main, 0.15),
      }}
    >
      <Typography variant="body2" fontWeight={600} color="primary.main">
        {count}
        {total != null ? ` of ${total}` : ""} selected
      </Typography>
      {onSelectAll && total != null && count < total ? (
        <Button size="small" variant="text" onClick={onSelectAll} sx={{ minWidth: 0, px: 1 }}>
          Select all {total}
        </Button>
      ) : null}
      {onAction ? (
        <Button size="small" variant="contained" color="error" onClick={onAction}>
          {actionLabel} ({count})
        </Button>
      ) : null}
      {onClear ? (
        <Button size="small" variant="outlined" onClick={onClear}>
          {clearLabel}
        </Button>
      ) : null}
    </Box>
  );
}
