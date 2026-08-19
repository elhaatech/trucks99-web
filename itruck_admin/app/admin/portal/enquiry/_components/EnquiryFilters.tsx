"use client";

import {
  FilterCard,
  FilterSelectInput,
  FilterTextInput,
} from "@/components/common";

export type EnquiryFilterState = {
  search: string;
  status: string;
};

export const EMPTY_ENQUIRY_FILTERS: EnquiryFilterState = {
  search: "",
  status: "",
};

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
  { value: "closed", label: "Closed" },
];

export interface EnquiryFiltersProps {
  filters: EnquiryFilterState;
  onChange: (patch: Partial<EnquiryFilterState>) => void;
  onSearch: () => void;
  onClear: () => void;
  disabled?: boolean;
}

export function EnquiryFilters({
  filters,
  onChange,
  onSearch,
  onClear,
  disabled,
}: EnquiryFiltersProps) {
  const hasAny = filters.status !== "" || filters.search.trim().length > 0;

  return (
    <FilterCard
      title="Enquiry filters"
      subtitle="Search by name, email, mobile, or message."
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
        placeholder="Name, email, mobile, or message"
        disabled={disabled}
      />
      <FilterSelectInput
        label="Status"
        value={filters.status}
        onChange={(v) => onChange({ status: v })}
        options={STATUS_OPTIONS}
        disabled={disabled}
      />
    </FilterCard>
  );
}
