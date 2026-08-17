"use client";

import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import { useSmartBack } from "@/lib/navigation";

export interface BackButtonProps {
  /** Route to use when there is no in-app history (e.g. direct link open). */
  fallback: string;
  label?: string;
  variant?: "text" | "outlined" | "contained";
  size?: "small" | "medium" | "large";
  /** Render as icon-only button when true. */
  iconOnly?: boolean;
  startIcon?: React.ReactNode;
  sx?: object;
}

export function BackButton({
  fallback,
  label = "Back",
  variant = "outlined",
  size = "medium",
  iconOnly = false,
  startIcon,
  sx,
}: BackButtonProps) {
  const goBack = useSmartBack(fallback);

  if (iconOnly) {
    return (
      <Tooltip title={label}>
        <IconButton onClick={goBack} size={size} sx={sx} aria-label={label}>
          <ArrowBackOutlinedIcon />
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={goBack}
      startIcon={startIcon ?? <ArrowBackOutlinedIcon />}
      sx={sx}
    >
      {label}
    </Button>
  );
}
