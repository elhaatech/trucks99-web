"use client";

import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { FilterState } from "@/model/services/cms";


export interface CMSFiltersProps {
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onSearch: () => void;
  onClear: () => void;
  disabled?: boolean;
}

export function CMSFilters({
  filters,
  onChange,
  onSearch,
  onClear,
  disabled,
}: CMSFiltersProps) {
  return (
    <Box
      sx={{
        p: 2.5,
        mb: 2,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
      }}
    >
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
        CMS page filters
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "2fr 1fr auto auto" },
          gap: 1.5,
          alignItems: "center",
        }}
      >
        <TextField
          size="small"
          label="Search by title or slug"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          disabled={disabled}
        />
        <TextField
          size="small"
          select
          label="Status"
          value={filters.status}
          onChange={(e) => onChange({ status: e.target.value })}
          disabled={disabled}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </TextField>
        <Button variant="contained" onClick={onSearch} disabled={disabled}>
          Search
        </Button>
        <Button variant="outlined" onClick={onClear} disabled={disabled}>
          Clear
        </Button>
      </Box>
    </Box>
  );
}