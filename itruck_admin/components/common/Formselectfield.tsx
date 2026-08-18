"use client";

import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";

export interface SelectOption {
  value: string;
  label: string;
}

export interface FormSelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  helperText?: string;
}

/**
 * Standard dropdown / select input.
 *
 * Usage:
 *   <FormSelectField
 *     label="Material"
 *     value={materialId}
 *     onChange={setMaterialId}
 *     options={materials.map(m => ({ value: m.id, label: m.materials_type }))}
 *   />
 */
export default function FormSelectField({
  label,
  value,
  onChange,
  options,
  placeholder = `— Select ${label} —`,
  required = false,
  fullWidth = true,
  disabled = false,
  helperText,
}: FormSelectFieldProps) {
  return (
    <TextField
      size="small"
      select
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      fullWidth={fullWidth}
      disabled={disabled}
      helperText={helperText}
    >
      <MenuItem value="">{placeholder}</MenuItem>
      {options.map((opt) => (
        <MenuItem key={opt.value} value={opt.value}>
          {opt.label}
        </MenuItem>
      ))}
    </TextField>
  );
}