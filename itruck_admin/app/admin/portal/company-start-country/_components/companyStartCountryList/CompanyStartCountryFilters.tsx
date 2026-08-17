"use client";

import {
  FilterCard,
  FilterFieldItem,
  FilterTextInput,
} from "@/components/common";
import type { FilterState } from "../interface/companyStartCountryTypes";

export interface CompanyStartCountryFiltersProps {
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onSearch: () => void;
  onClear: () => void;
  disabled?: boolean;
}

export function CompanyStartCountryFilters({
  filters,
  onChange,
  onSearch,
  onClear,
  disabled,
}: CompanyStartCountryFiltersProps) {
  return (
    <FilterCard
      title="Location filters"
      subtitle="Search by city/state/country."
      onSearch={onSearch}
      onClear={onClear}
      disabled={disabled}
      clearDisabled={filters.search.trim().length === 0}
    >
      <FilterFieldItem>
        <FilterTextInput
          label="Search"
          value={filters.search}
          onChange={(v) => onChange({ search: v })}
          placeholder="City/state/country..."
          disabled={disabled}
        />
      </FilterFieldItem>
    </FilterCard>
  );
}
