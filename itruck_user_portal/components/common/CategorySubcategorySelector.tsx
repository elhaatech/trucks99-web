"use client";

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import {
  FilterFieldItem,
  FilterSelectInput,
  FormSelectField,
} from "@/components/common";
import { useCategorySubcategories } from "@/hooks/useCategorySubcategories";

export type CategorySubcategorySelectorProps = {
  categoryId: string;
  subcategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  onSubcategoryChange: (subcategoryId: string) => void;
  variant?: "form" | "filter";
  disabled?: boolean;
  required?: boolean;
  categoryLabel?: string;
  subcategoryLabel?: string;
  categoryPlaceholder?: string;
  subcategoryPlaceholder?: string;
  activeOnly?: boolean;
  includeInactiveSubcategories?: boolean;
  categoryError?: boolean;
  subcategoryError?: boolean;
};

function getSubcategoryHelperText({
  loading,
  error,
  empty,
  hasCategory,
}: {
  loading: boolean;
  error: string;
  empty: boolean;
  hasCategory: boolean;
}): string | undefined {
  if (!hasCategory) return undefined;
  if (loading) return "Loading subcategories…";
  if (error) return error;
  if (empty) return "No subcategories available.";
  return undefined;
}

function SubcategoryLoadingSpinner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <Box
      sx={{
        position: "absolute",
        right: 36,
        top: "50%",
        transform: "translateY(-50%)",
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
      }}
    >
      <CircularProgress size={16} />
    </Box>
  );
}

export function CategorySubcategorySelector({
  categoryId,
  subcategoryId,
  onCategoryChange,
  onSubcategoryChange,
  variant = "form",
  disabled = false,
  required = false,
  categoryLabel = "Category",
  subcategoryLabel = variant === "filter" ? "Subcategory" : "Sub Category",
  categoryPlaceholder,
  subcategoryPlaceholder,
  activeOnly = true,
  includeInactiveSubcategories = false,
  categoryError = false,
  subcategoryError = false,
}: CategorySubcategorySelectorProps) {
  const {
    categoryOptions,
    subcategoryOptions,
    loadingCategories,
    loadingSubcategories,
    categoriesError,
    subcategoriesError,
    subcategoriesEmpty,
  } = useCategorySubcategories({
    categoryId,
    activeOnly,
    includeInactiveSubcategories,
  });

  const handleCategoryChange = (value: string) => {
    const nextCategoryId = value || "";
    onCategoryChange(nextCategoryId);
    if (subcategoryId) onSubcategoryChange("");
  };

  const subcategoryHelper = getSubcategoryHelperText({
    loading: loadingSubcategories,
    error: subcategoriesError,
    empty: subcategoriesEmpty,
    hasCategory: !!categoryId,
  });

  const categoryHelper =
    categoriesError ||
    (variant === "form" && !categoryId
      ? "Select a category first"
      : loadingCategories
        ? "Loading categories…"
        : undefined);

  const subcategoryDisabled =
    disabled || !categoryId || loadingSubcategories;

  const resolvedCategoryPlaceholder =
    categoryPlaceholder ??
    (variant === "filter" ? "All categories" : `— Select ${categoryLabel} —`);

  const resolvedSubcategoryPlaceholder =
    subcategoryPlaceholder ??
    (categoryId
      ? variant === "filter"
        ? "All subcategories"
        : `— Select ${subcategoryLabel} —`
      : "Select category first");

  const SelectComponent = variant === "filter" ? FilterSelectInput : FormSelectField;

  const categorySelect = (
    <SelectComponent
      label={categoryLabel}
      value={categoryId}
      onChange={handleCategoryChange}
      options={categoryOptions}
      placeholder={resolvedCategoryPlaceholder}
      required={required}
      disabled={disabled || loadingCategories}
      helperText={categoryHelper}
      error={categoryError}
    />
  );

  const subcategorySelect = (
    <Box sx={{ position: "relative" }}>
      <SelectComponent
        label={subcategoryLabel}
        value={subcategoryId}
        onChange={(value) => onSubcategoryChange(value || "")}
        options={subcategoryOptions}
        placeholder={resolvedSubcategoryPlaceholder}
        required={required}
        disabled={subcategoryDisabled}
        helperText={
          subcategoryHelper ||
          (variant === "form" && categoryId && !loadingSubcategories && !subcategoriesEmpty
            ? `${subcategoryOptions.length} option${subcategoryOptions.length === 1 ? "" : "s"} available`
            : undefined)
        }
        error={subcategoryError}
      />
      <SubcategoryLoadingSpinner
        show={loadingSubcategories && !!categoryId}
      />
    </Box>
  );

  if (variant === "filter") {
    return (
      <>
        <FilterFieldItem>{categorySelect}</FilterFieldItem>
        <FilterFieldItem>{subcategorySelect}</FilterFieldItem>
      </>
    );
  }

  return (
    <>
      {categorySelect}
      {subcategorySelect}
    </>
  );
}
