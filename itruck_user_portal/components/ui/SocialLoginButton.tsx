"use client";

import * as React from "react";
import Button, { ButtonProps } from "@mui/material/Button";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";

const SocialButtonRoot = styled(Button)({
  textTransform: "none",
  fontWeight: 600,
  justifyContent: "flex-start",
  padding: "10px 16px",
  borderRadius: 4,
  "& .MuiButton-startIcon": {
    marginRight: 12,
  },
});

export type SocialProvider = "google" | "github" | "twitter" | "facebook";


export interface SocialLoginButtonProps extends Omit<ButtonProps, "color"> {
  provider: SocialProvider;
  href?: string;
}

export function SocialLoginButton({
  provider,
  href,
  ...props
}: SocialLoginButtonProps) {
;
  return (
   <></>
  );
}
