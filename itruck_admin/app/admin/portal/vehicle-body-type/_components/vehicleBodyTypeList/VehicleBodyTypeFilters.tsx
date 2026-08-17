"use client";

import { FilterCard, FilterFieldItem, FilterTextInput } from "@/components/common";
import type { FilterState } from "../interface/vehicleBodyTypeTypes";

export interface VehicleBodyTypeFiltersProps {
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onSearch: () => void;
  onClear: () => void;
}

export function VehicleBodyTypeFilters({ filters, onChange, onSearch, onClear }: VehicleBodyTypeFiltersProps) {
  return (
    <FilterCard
      title="Vehicle body type filters"
      subtitle="Search by vehicle body type name."
      onSearch={onSearch}
      onClear={onClear}
      clearDisabled={filters.search.trim().length === 0}
    >
      <FilterFieldItem>
        <FilterTextInput
          label="Search vehicle body types"
          value={filters.search}
          onChange={(v) => onChange({ search: v })}
          placeholder="Vehicle body type name..."
        />
      </FilterFieldItem>
    </FilterCard>
  );
}

