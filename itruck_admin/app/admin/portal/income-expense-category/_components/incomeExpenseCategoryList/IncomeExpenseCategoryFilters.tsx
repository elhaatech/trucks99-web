"use client";

import { IncomeExpenseTypeFilter } from "@/components/common/Filter/IncomeExpenseTypeFilter";
import type { FilterState } from "../interface/incomeExpenseCategoryTypes";

export interface IncomeExpenseCategoryFiltersProps {
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onSearch: () => void;
  onClear: () => void;
  disabled?: boolean;
}

export function IncomeExpenseCategoryFilters(
  props: IncomeExpenseCategoryFiltersProps,
) {
  return (
    <IncomeExpenseTypeFilter
      {...props}
      title="Income and expense category filters"
      subtitle="Narrow categories by type and name."
      categoryLabel="Category Name"
      clearLabel="Clear filter"
    />
  );
}
