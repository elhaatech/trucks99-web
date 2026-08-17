"use client";

import MuiButton, { type ButtonProps as MuiButtonProps } from "@mui/material/Button";
import { alpha } from "@mui/material/styles";

export type AppButtonTone =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "warning"
  | "outline"
  | "ghost";

export interface ButtonProps extends Omit<MuiButtonProps, "color" | "variant"> {
  tone?: AppButtonTone;
}

const toneConfig: Record<
  AppButtonTone,
  { color: MuiButtonProps["color"]; variant: MuiButtonProps["variant"] }
> = {
  primary: { color: "primary", variant: "contained" },
  secondary: { color: "inherit", variant: "outlined" },
  success: { color: "success", variant: "contained" },
  danger: { color: "error", variant: "contained" },
  warning: { color: "warning", variant: "contained" },
  outline: { color: "primary", variant: "outlined" },
  ghost: { color: "inherit", variant: "text" },
};

export function Button({ tone = "primary", sx, ...rest }: ButtonProps) {
  const { color, variant } = toneConfig[tone];

  return (
    <MuiButton
      color={color}
      variant={variant}
      sx={{
        ...(tone === "ghost" && {
          "&:hover": { bgcolor: (t) => alpha(t.palette.text.primary, 0.06) },
        }),
        ...sx,
      }}
      {...rest}
    />
  );
}
