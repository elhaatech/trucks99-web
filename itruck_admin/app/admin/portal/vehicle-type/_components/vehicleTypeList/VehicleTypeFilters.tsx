"use client";

import { FilterCard, FilterFieldItem, FilterTextInput } from "@/components/common";
import type { FilterState } from "../interface/vehicleTypeTypes";

export interface VehicleTypeFiltersProps {
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onSearch: () => void;
  onClear: () => void;
  disabled?: boolean;
}

export function VehicleTypeFilters({ filters, onChange, onSearch, onClear, disabled }: VehicleTypeFiltersProps) {
  return (
    <FilterCard
      title="Vehicle type filters"
      subtitle="Search by type name, description, and capacity details."
      onSearch={onSearch}
      onClear={onClear}
      disabled={disabled}
      clearDisabled={filters.search.trim().length === 0}
    >
      <FilterFieldItem>
        <FilterTextInput
          label="Search vehicle types"
          value={filters.search}
          onChange={(v) => onChange({ search: v })}
          placeholder="Type, description, min/max capacity..."
          disabled={disabled}
        />
      </FilterFieldItem>
    </FilterCard>
  );
}

