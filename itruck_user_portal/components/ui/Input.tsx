"use client";

import * as React from "react";
import TextField, { type TextFieldProps } from "@mui/material/TextField";
import { SearchableSelect, type SelectOption } from "@/components/common/SearchableSelect";

export type InputProps =
  | (Omit<TextFieldProps, "select" | "children"> & { inputType?: "text" })
  | (Omit<TextFieldProps, "select"> & {
      inputType: "select";
      options: { value: string; label: string }[];
    });

/** Thin unified TextField wrapper (text / date / number / select). */
export function Input(props: InputProps) {
  if ("inputType" in props && props.inputType === "select") {
    const { options, inputType: _inputType, ...rest } = props;
    return (
      <SearchableSelect
        {...(rest as any)}
        options={options as SelectOption[]}
      />
    );
  }
  return <TextField size="small" fullWidth {...props} />;
}
