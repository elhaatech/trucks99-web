"use client";

import * as React from "react";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import TextField, { type TextFieldProps } from "@mui/material/TextField";
import type { SxProps, Theme } from "@mui/material/styles";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  helperText?: React.ReactNode;
  required?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  size?: "small" | "medium";
  noOptionsText?: string;
  loading?: boolean;
  slotProps?: {
    textfield?: Partial<TextFieldProps>;
  };
  sx?: SxProps<Theme>;
  className?: string;
  inputProps?: TextFieldProps["inputProps"];
  id?: string;
}

const filter = createFilterOptions<SelectOption>();

export function SearchableSelect({
  options,
  value,
  onChange,
  label,
  placeholder,
  helperText,
  required,
  fullWidth = true,
  disabled = false,
  size = "small",
  noOptionsText = "No results found",
  loading = false,
  slotProps,
  sx,
  className,
  inputProps,
  id,
}: SearchableSelectProps) {
  const selectedOption = options.find((o) => o.value === value) ?? null;

  const enrichedOptions = React.useMemo(() => {
    if (value && !options.some((o) => o.value === value)) {
      return [...options, { value, label: value }];
    }
    return options;
  }, [options, value]);

  return (
    <Autocomplete
      id={id}
      options={enrichedOptions}
      value={selectedOption}
      onChange={(_, newValue) => {
        if (newValue && typeof newValue === "object") {
          onChange(newValue.value);
        } else {
          onChange("");
        }
      }}
      getOptionLabel={(option) => option.label}
      filterOptions={(opts, params) => filter(opts, params)}
      noOptionsText={noOptionsText}
      disabled={disabled}
      fullWidth={fullWidth}
      className={className}
      sx={sx}
      loading={loading}
      slotProps={{
        popper: {
          sx: {
            "& .MuiPaper-root": {
              borderRadius: 1,
              boxShadow: (theme) => theme.shadows[3],
            },
            "& .MuiAutocomplete-option": {
              fontSize: 14,
              padding: "6px 12px",
              "&.Mui-focused": {
                backgroundColor: (theme) => theme.palette.action.hover,
              },
              "&[aria-selected='true']": {
                backgroundColor: (theme) => theme.palette.primary.main,
                color: (theme) => theme.palette.primary.contrastText,
                "&:hover": {
                  backgroundColor: (theme) => theme.palette.primary.dark,
                },
              },
            },
          },
        },
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          {...slotProps?.textfield}
          size={size}
          label={label}
          placeholder={placeholder}
          required={required}
          helperText={helperText}
          inputProps={{
            ...params.inputProps,
            ...inputProps,
          }}
        />
      )}
    />
  );
}
