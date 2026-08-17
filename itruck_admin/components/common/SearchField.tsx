"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import type { SxProps, Theme } from "@mui/material/styles";

export interface SearchFieldProps {
  /** Current search value (controlled) */
  value: string;
  /** Called when input value changes */
  onChange: (value: string) => void;
  /** Called when Search button is clicked or Enter is pressed */
  onSearch: () => void;
  /** Called when Clear button is clicked; parent should clear value and reload data */
  onClear: () => void;
  /** Label for the input (e.g. "Search by name", "Search (name, mobile, company)") */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Disable input and Search button (e.g. while loading) */
  disabled?: boolean;
  /** Min width of the text field */
  minWidth?: number | string;
  /** Optional sx for the root Box */
  sx?: SxProps<Theme>;
}

/**
 * Reusable search + filter bar: text field, Search button, Clear button.
 * Clear is shown only when value is non-empty. Enter key triggers Search.
 */
export default function SearchField({
  value,
  onChange,
  onSearch,
  onClear,
  label = "Search",
  placeholder = "Type to search...",
  disabled = false,
  minWidth = 280,
  sx,
}: SearchFieldProps) {
  const hasValue = value.trim().length > 0;

  return (
    <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap", ...sx }}>
      <TextField
        size="small"
        label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onSearch())}
        disabled={disabled}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <span style={{ opacity: 0.7 }}>🔍</span>
            </InputAdornment>
          ),
        }}
        sx={{ minWidth: typeof minWidth === "number" ? minWidth : minWidth }}
      />
      <Button variant="outlined" onClick={onSearch} disabled={disabled}>
        Search
      </Button>
      {hasValue && (
        <Button variant="text" onClick={onClear} disabled={disabled}>
          Clear
        </Button>
      )}
    </Box>
  );
}
