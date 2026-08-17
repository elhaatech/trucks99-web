"use client";

import { IncomeExpenseTypeFilter } from "@/components/common/Filter/IncomeExpenseTypeFilter";
import type { FilterState } from "../interface/incomeExpenseTypes";

export interface IncomeExpenseFiltersProps {
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onSearch: () => void;
  onClear: () => void;
  disabled?: boolean;
}

export function IncomeExpenseFilters(props: IncomeExpenseFiltersProps) {
  return (
    <IncomeExpenseTypeFilter
      {...props}
      title="Income and expense filters"
      subtitle="Filter by entry type and category."
      categoryLabel="Category"
    />
  );
}
