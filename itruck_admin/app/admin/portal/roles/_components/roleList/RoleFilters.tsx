"use client";

import { FilterCard, FilterFieldItem, FilterTextInput } from "@/components/common";
import type { FilterState } from "../interface/roleTypes";

export interface RoleFiltersProps {
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onSearch: () => void;
  onClear: () => void;
  disabled?: boolean;
}

export function RoleFilters({ filters, onChange, onSearch, onClear, disabled }: RoleFiltersProps) {
  return (
    <FilterCard
      title="Role filters"
      subtitle="Find roles by name."
      onSearch={onSearch}
      onClear={onClear}
      disabled={disabled}
      clearDisabled={filters.search.trim().length === 0}
    >
      <FilterFieldItem>
        <FilterTextInput
          label="Search by role name"
          value={filters.search}
          onChange={(v) => onChange({ search: v })}
          placeholder="Type role name..."
          disabled={disabled}
        />
      </FilterFieldItem>
    </FilterCard>
  );
}

