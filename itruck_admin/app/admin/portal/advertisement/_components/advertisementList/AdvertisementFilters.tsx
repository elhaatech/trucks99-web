"use client";

import {
  AD_TYPES,
  DISPLAY_LOCATIONS,
} from "@/model/api";
import {
  FilterCard,
  FilterSelectInput,
  FilterTextInput,
} from "@/components/common";

import type { FilterState } from "../interface/advertisementTypes";

export interface AdvertisementFiltersProps {
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onSearch: () => void;
  onClear: () => void;
  disabled?: boolean;
}

const STATUS_OPTIONS = [
  { value: "Enabled", label: "Enabled" },
  { value: "Disabled", label: "Disabled" },
];

export function AdvertisementFilters({
  filters,
  onChange,
  onSearch,
  onClear,
  disabled,
}: AdvertisementFiltersProps) {
  const hasAny =
    filters.status !== "" ||
    filters.adType !== "" ||
    filters.displayLocation !== "" ||
    filters.search.trim().length > 0;

  return (
    <FilterCard
      title="Advertisement filters"
      subtitle="Narrow ads by status, type, location, or search text."
      onSearch={onSearch}
      onClear={onClear}
      disabled={disabled}
      clearDisabled={!hasAny}
      clearLabel="Clear filters"
    >
      <FilterSelectInput
        label="Status"
        value={filters.status}
        onChange={(v) =>
          onChange({ status: v as FilterState["status"] })
        }
        options={STATUS_OPTIONS}
        disabled={disabled}
      />
      <FilterSelectInput
        label="Ad type"
        value={filters.adType}
        onChange={(v) => onChange({ adType: v as FilterState["adType"] })}
        options={AD_TYPES.map((t) => ({ value: t, label: t }))}
        disabled={disabled}
      />
      <FilterSelectInput
        label="Display location"
        value={filters.displayLocation}
        onChange={(v) =>
          onChange({ displayLocation: v as FilterState["displayLocation"] })
        }
        options={DISPLAY_LOCATIONS.map((l) => ({ value: l, label: l }))}
        disabled={disabled}
      />
      <FilterTextInput
        label="Search"
        value={filters.search}
        onChange={(v) => onChange({ search: v })}
        placeholder="Title, client, or description"
        disabled={disabled}
      />
    </FilterCard>
  );
}
