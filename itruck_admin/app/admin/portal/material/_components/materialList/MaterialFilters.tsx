"use client";

import { FilterCard, FilterFieldItem, FilterTextInput } from "@/components/common";
import type { FilterState } from "../interface/materialTypes";

export interface MaterialFiltersProps {
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onSearch: () => void;
  onClear: () => void;
}

export function MaterialFilters({ filters, onChange, onSearch, onClear }: MaterialFiltersProps) {
  return (
    <FilterCard
      title="Material filters"
      subtitle="Search material records by type."
      onSearch={onSearch}
      onClear={onClear}
      clearDisabled={filters.search.trim().length === 0}
    >
      <FilterFieldItem>
        <FilterTextInput
          label="Search"
          value={filters.search}
          onChange={(v) => onChange({ search: v })}
          placeholder="Type material type..."
        />
      </FilterFieldItem>
    </FilterCard>
  );
}

