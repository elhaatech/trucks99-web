"use client";

import { useCallback } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";

export interface FilterState {
  search: string;
  fieldName: string;
}

export interface SubscriptionFiltersProps {
  filters: FilterState;
  onFilterChange: (patch: Partial<FilterState>) => void;
  onSearch: () => void;
  onClear: () => void;
  fieldNameOptions?: string[]; // ← dynamic options from parent
}

export default function SubscriptionFilters({
  filters,
  onFilterChange,
  onSearch,
  onClear,
  fieldNameOptions = [],
}: SubscriptionFiltersProps) {
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFilterChange({ search: e.target.value });
    },
    [onFilterChange]
  );

  const handleFieldChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFilterChange({ fieldName: e.target.value });
    },
    [onFilterChange]
  );

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") onSearch();
    },
    [onSearch]
  );

  return (
    <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start", mb: 2 }}>
      <TextField
        placeholder="Search package name, type..."
        value={filters.search}
        onChange={handleSearchChange}
        onKeyDown={handleSearchKeyDown}
        size="small"
        fullWidth
        sx={{ maxWidth: 400 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: "text.secondary", mr: 1 }} />
            </InputAdornment>
          ),
        }}
      />
{/* 
      <TextField
        select
        label="Field Name"
        value={filters.fieldName}
        onChange={handleFieldChange}
        size="small"
        sx={{ minWidth: 180 }}
      >
        <MenuItem value="">All Fields</MenuItem>
        {fieldNameOptions.map((name) => (
          <MenuItem key={name} value={name}>
            {name}
          </MenuItem>
        ))}
      </TextField> */}

      <Button variant="contained" onClick={onSearch} sx={{ mt: 0.5 }}>
        Search
      </Button>
      <Button variant="outlined" onClick={onClear} sx={{ mt: 0.5 }}>
        Clear
      </Button>
    </Box>
  );
}