"use client";

import * as React from "react";
import TextField, { TextFieldProps } from "@mui/material/TextField";
import { styled } from "@mui/material/styles";
import { PRIMARY, RADIUS, TRANSITION } from "@/lib/theme";

const StyledTextField = styled(TextField)({
  "& .MuiOutlinedInput-root": {
    borderRadius: RADIUS.sm,
    transition: `box-shadow ${TRANSITION.fast}`,
    "&.Mui-focused": {
      boxShadow: `0 0 0 3px rgba(92, 77, 150, 0.12)`,
    },
  },
  "& .MuiInputLabel-root": {
    fontWeight: 500,
    "&.Mui-focused": {
      color: PRIMARY,
      fontWeight: 600,
    },
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "rgba(15, 23, 42, 0.12)",
  },
});

export type AuthTextFieldProps = TextFieldProps;

export function AuthTextField(props: AuthTextFieldProps) {
  return (
    <StyledTextField
      variant="outlined"
      fullWidth
      margin="normal"
      {...props}
    />
  );
}
