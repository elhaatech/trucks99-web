"use client";

import {
  FilterCard,
  FilterFieldItem,
  FilterSelectInput,
  FilterTextInput,
  CategorySubcategorySelector,
} from "@/components/common";
import { FilterState } from "../interface/buysell_interface";

export interface UserOption {
  value: string;
  label: string;
}

export interface BuySellFiltersProps {
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onSearch: () => void;
  onClear: () => void;
  disabled?: boolean;
  userOptions: UserOption[];
}

export function BuySellFilters({
  filters,
  onChange,
  onSearch,
  onClear,
  disabled,
  userOptions,
}: BuySellFiltersProps) {
  const typeOptions = [
    { value: "buy", label: "Buy" },
    { value: "sell", label: "Sell" },
  ];

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "pending", label: "Pending" },
    { value: "draft", label: "Draft" },
    { value: "rejected", label: "Rejected" },
    { value: "booking", label: "Booked" },
    { value: "purchased", label: "Purchased" },
    { value: "sold", label: "Sold" },
  ];

  const hasAny =
    Boolean(filters.status) ||
    Boolean(filters.category_id) ||
    Boolean(filters.subcategory_id) ||
    Boolean(filters.userid) ||
    Boolean(filters.min_price) ||
    Boolean(filters.max_price) ||
    filters.search.trim().length > 0;

  return (
    <FilterCard
      title="Buy & Sell filters"
      subtitle="Narrow listings by category, type, price, or keyword."
      onSearch={onSearch}
      onClear={onClear}
      disabled={disabled}
      clearDisabled={!hasAny}
      clearLabel="Clear filter"
    >
      <FilterFieldItem>
        <FilterSelectInput
          label="Type"
          value={filters.usear_type || "buy"}
          onChange={(v) =>
            onChange({ usear_type: (v as FilterState["usear_type"]) || "buy" })
          }
          options={typeOptions}
          disabled={disabled}
        />
      </FilterFieldItem>

      <FilterFieldItem>
        <FilterSelectInput
          label="User"
          value={filters.userid}
          onChange={(v) => onChange({ userid: v || "" })}
          options={userOptions}
          placeholder="All users"
          disabled={disabled}
        />
      </FilterFieldItem>

      <CategorySubcategorySelector
        variant="filter"
        categoryId={filters.category_id}
        subcategoryId={filters.subcategory_id}
        onCategoryChange={(categoryId) =>
          onChange({ category_id: categoryId, subcategory_id: "" })
        }
        onSubcategoryChange={(subcategoryId) =>
          onChange({ subcategory_id: subcategoryId })
        }
        disabled={disabled}
      />

      <FilterFieldItem>
        <FilterTextInput
          label="Min price"
          value={filters.min_price}
          onChange={(v) => onChange({ min_price: v })}
          placeholder="0"
          disabled={disabled}
        />
      </FilterFieldItem>

      <FilterFieldItem>
        <FilterTextInput
          label="Max price"
          value={filters.max_price}
          onChange={(v) => onChange({ max_price: v })}
          placeholder="Any"
          disabled={disabled}
        />
      </FilterFieldItem>

      <FilterFieldItem>
        <FilterSelectInput
          label="Status"
          value={filters.status}
          onChange={(v) => onChange({ status: v || "" })}
          options={statusOptions}
          placeholder="All"
          disabled={disabled}
        />
      </FilterFieldItem>

      <FilterFieldItem>
        <FilterTextInput
          label="Search"
          value={filters.search}
          onChange={(v) => onChange({ search: v })}
          placeholder="Description, address…"
          disabled={disabled}
        />
      </FilterFieldItem>
    </FilterCard>
  );
}
