"use client";

import { useId } from "react";
import type React from "react";
import TextField, { type TextFieldProps } from "@mui/material/TextField";

export interface FormTextFieldProps
  extends Omit<TextFieldProps, "size" | "variant" | "onChange" | "type"> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: React.InputHTMLAttributes<HTMLInputElement>["type"];
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  minRows?: number;
  maxRows?: number;
  required?: boolean;
  fullWidth?: boolean;
  error?: boolean;
  helperText?: React.ReactNode;
}

export default function FormTextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  multiline = false,
  rows,
  minRows,
  maxRows,
  required = false,
  fullWidth = true,
  error,
  helperText,
  sx,
  inputProps,
  ...rest
}: FormTextFieldProps) {
  // Stable ID shared between server and client — fixes MUI hydration mismatch
  const stableId = useId();

  const multilineProps = multiline
    ? {
        multiline: true,
        rows,
        minRows: minRows ?? 2,
        maxRows: maxRows ?? 6,
        inputProps: { style: { minHeight: 56 }, ...inputProps },
        sx: {
          "& .MuiInputBase-root": { minHeight: 56, alignItems: "flex-start" },
          ...sx,
        },
      }
    : { inputProps, sx };

  return (
    <TextField
      id={stableId}
      size="small"
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      type={type}
      placeholder={placeholder}
      required={required}
      fullWidth={fullWidth}
      error={error}
      helperText={helperText}
      {...multilineProps}
      {...rest}
    />
  );
}