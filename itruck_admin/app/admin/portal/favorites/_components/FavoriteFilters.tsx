"use client";

import {
  FilterCard,
  FilterTextInput,
} from "@/components/common";

export type FavoriteFilterState = {
  search: string;
};

export const EMPTY_FAVORITE_FILTERS: FavoriteFilterState = {
  search: "",
};

export interface FavoriteFiltersProps {
  filters: FavoriteFilterState;
  onChange: (patch: Partial<FavoriteFilterState>) => void;
  onSearch: () => void;
  onClear: () => void;
  disabled?: boolean;
}

export function FavoriteFilters({
  filters,
  onChange,
  onSearch,
  onClear,
  disabled,
}: FavoriteFiltersProps) {
  const hasAny = filters.search.trim().length > 0;

  return (
    <FilterCard
      title="Favorite filters"
      subtitle="Search by vehicle, user name, email, or mobile."
      onSearch={onSearch}
      onClear={onClear}
      disabled={disabled}
      clearDisabled={!hasAny}
      clearLabel="Clear filters"
    >
      <FilterTextInput
        label="Search"
        value={filters.search}
        onChange={(v) => onChange({ search: v })}
        placeholder="Vehicle, user, email, or mobile"
        disabled={disabled}
      />
    </FilterCard>
  );
}
