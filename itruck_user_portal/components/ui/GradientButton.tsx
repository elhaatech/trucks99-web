"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Button, { ButtonProps } from "@mui/material/Button";
import { styled } from "@mui/material/styles";
import { GRADIENT, GRADIENT_HOVER, RADIUS, SHADOW, TRANSITION } from "@/lib/theme";

const ArrowIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
  </svg>
);

const GradientButtonRoot = styled(Button)({
  background: GRADIENT,
  color: "#fff",
  textTransform: "none",
  fontWeight: 600,
  letterSpacing: "0.02em",
  padding: "13px 28px",
  borderRadius: RADIUS.sm,
  boxShadow: SHADOW.primary,
  transition: `all ${TRANSITION.normal}`,
  "&:hover": {
    background: GRADIENT_HOVER,
    boxShadow: SHADOW.primaryLg,
    transform: "translateY(-1px)",
  },
  "&:active": {
    transform: "scale(0.98)",
  },
  "&:disabled": {
    background: "#cbd5e1",
    color: "rgba(255,255,255,0.8)",
    boxShadow: "none",
  },
});

export interface GradientButtonProps extends Omit<ButtonProps, "color"> {
  showArrow?: boolean;
  children: React.ReactNode;
}

export function GradientButton({
  showArrow = true,
  children,
  ...props
}: GradientButtonProps) {
  return (
    <GradientButtonRoot fullWidth variant="contained" disableElevation {...props}>
      {children}
      {showArrow && (
        <Box component="span" sx={{ ml: 1, display: "inline-flex" }}>
          <ArrowIcon />
        </Box>
      )}
    </GradientButtonRoot>
  );
}
