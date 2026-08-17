"use client";

import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { FilterCard, FilterTextInput } from "@/components/common";
import type { FilterState } from "../interface/userTypes";

export interface UserFiltersProps {
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onSearch: () => void;
  onClear: () => void;
  roles?: Array<{ id: string; name: string }>;
  cities?: string[];
  states?: string[];
}

export function UserFilters({
  filters,
  onChange,
  onSearch,
  onClear,
  roles = [],
  cities = [],
  states = [],
}: UserFiltersProps) {
  const clearDisabled =
    filters.search.trim().length === 0 &&
    !filters.role &&
    !filters.state &&
    !filters.city &&
    !filters.dojFrom &&
    !filters.dojTo;

  return (
    <FilterCard
      title="User filters"
      subtitle="Search users by name, mobile, company, role, location, or date of joining."
      onSearch={onSearch}
      onClear={onClear}
      clearDisabled={clearDisabled}
    >
      {/* Row 1: Search + Role */}
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <FilterTextInput
          label="Search (name, mobile, company)"
          value={filters.search}
          onChange={(v) => onChange({ search: v })}
          placeholder="Type to search..."
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <TextField
          select
          fullWidth
          size="small"
          label="Role"
          value={filters.role ?? ""}
          onChange={(e) => onChange({ role: e.target.value || undefined })}
        >
          <MenuItem value="">All roles</MenuItem>
          {roles.map((r) => (
            <MenuItem key={r.id} value={r.id}>
              {r.name}
            </MenuItem>
          ))}
        </TextField>
      </Grid>

      {/* Row 2: State + City */}
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        {states.length > 0 ? (
          <TextField
            select
            fullWidth
            size="small"
            label="State"
            value={filters.state ?? ""}
            onChange={(e) =>
              onChange({ state: e.target.value || undefined, city: undefined })
            }
          >
            <MenuItem value="">All states</MenuItem>
            {states.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <FilterTextInput
            label="State"
            value={filters.state ?? ""}
            onChange={(v) => onChange({ state: v || undefined })}
            placeholder="Filter by state..."
          />
        )}
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        {cities.length > 0 ? (
          <TextField
            select
            fullWidth
            size="small"
            label="City"
            value={filters.city ?? ""}
            onChange={(e) => onChange({ city: e.target.value || undefined })}
          >
            <MenuItem value="">All cities</MenuItem>
            {cities.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <FilterTextInput
            label="City"
            value={filters.city ?? ""}
            onChange={(v) => onChange({ city: v || undefined })}
            placeholder="Filter by city..."
          />
        )}
      </Grid>

      {/* Row 3: DOJ From + DOJ To */}
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <TextField
          fullWidth
          size="small"
          type="date"
          label="Date of Joining — From"
          InputLabelProps={{ shrink: true }}
          value={filters.dojFrom ?? ""}
          onChange={(e) => onChange({ dojFrom: e.target.value || undefined })}
          inputProps={{ max: filters.dojTo ?? undefined }}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <TextField
          fullWidth
          size="small"
          type="date"
          label="Date of Joining — To"
          InputLabelProps={{ shrink: true }}
          value={filters.dojTo ?? ""}
          onChange={(e) => onChange({ dojTo: e.target.value || undefined })}
          inputProps={{ min: filters.dojFrom ?? undefined }}
        />
      </Grid>
    </FilterCard>
  );
}