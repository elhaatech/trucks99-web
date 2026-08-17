"use client";

import { useEffect, useMemo, useState } from "react";
import { FilterCard, FilterFieldItem, FilterSelectInput } from "@/components/common";
import { getIncomeExpenseCategoryAll } from "@/model/api";
import type { IncomeExpenseCategory } from "@/model/api";

export type IncomeExpenseType = "" | "income" | "expense";

export interface IncomeExpenseFilterState {
  type: IncomeExpenseType;
  search: string;
}

export interface IncomeExpenseTypeFilterProps {
  filters: IncomeExpenseFilterState;
  onChange: (patch: Partial<IncomeExpenseFilterState>) => void;
  onSearch: () => void;
  onClear: () => void;
  disabled?: boolean;
  title: string;
  subtitle: string;
  categoryLabel?: string;
  clearLabel?: string;
}

export function IncomeExpenseTypeFilter({
  filters,
  onChange,
  onSearch,
  onClear,
  disabled,
  title,
  subtitle,
  categoryLabel = "Category",
  clearLabel,
}: IncomeExpenseTypeFilterProps) {
  const [allCategories, setAllCategories] = useState<IncomeExpenseCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  useEffect(() => {
    setCategoriesLoading(true);
    getIncomeExpenseCategoryAll()
      .then((res) => setAllCategories(res ?? []))
      .catch(() => setAllCategories([]))
      .finally(() => setCategoriesLoading(false));
  }, []);

  const typeOptions = useMemo(
    () => [
      { value: "income", label: "Income" },
      { value: "expense", label: "Expense" },
    ],
    []
  );

  const categoryOptions = useMemo(() => {
    const filtered = filters.type
      ? allCategories.filter(
          (cat) => (cat.type ?? "").toLowerCase() === filters.type.toLowerCase()
        )
      : allCategories;

    return filtered.map((cat) => ({
      value: cat.categoryName ?? "",
      label: cat.categoryName ?? "",
    }));
  }, [allCategories, filters.type]);

  const handleTypeChange = (v: string) => {
    onChange({ type: (v as IncomeExpenseType) || "", search: "" });
  };

  const hasAny = Boolean(filters.type) || filters.search.trim().length > 0;

  return (
    <FilterCard
      title={title}
      subtitle={subtitle}
      onSearch={onSearch}
      onClear={onClear}
      disabled={disabled}
      clearDisabled={!hasAny}
      clearLabel={clearLabel}
    >
      <FilterFieldItem>
        <FilterSelectInput
          label="Type"
          value={filters.type}
          onChange={handleTypeChange}
          options={typeOptions}
          placeholder="All"
          disabled={disabled}
        />
      </FilterFieldItem>

      <FilterFieldItem>
        <FilterSelectInput
          label={categoryLabel}
          value={filters.search}
          onChange={(v) => onChange({ search: v })}
          options={categoryOptions}
          placeholder={
            categoriesLoading
              ? "Loading..."
              : filters.type
              ? `All ${filters.type} categories`
              : "All categories"
          }
          disabled={disabled || categoriesLoading}
        />
      </FilterFieldItem>
    </FilterCard>
  );
}