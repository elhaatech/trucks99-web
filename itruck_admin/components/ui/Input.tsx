"use client";

import * as React from "react";
import TextField, { type TextFieldProps } from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";

export type InputProps =
  | (Omit<TextFieldProps, "select" | "children"> & { inputType?: "text" })
  | (Omit<TextFieldProps, "select"> & {
      inputType: "select";
      options: { value: string; label: string }[];
    });

/** Thin unified TextField wrapper (text / date / number / select). */
export function Input(props: InputProps) {
  if ("inputType" in props && props.inputType === "select") {
    const { options, inputType: _t, ...rest } = props;
    return (
      <TextField select size="small" fullWidth {...rest}>
        {options.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }
  return <TextField size="small" fullWidth {...props} />;
}
