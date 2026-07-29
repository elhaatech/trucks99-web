"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCategories,
  getCategoryRowId,
  getCategoryUuid,
  type Category,
} from "@/model/services/category";
import {
  getSubCategories,
  getSubCategoryRowId,
  type SubCategory,
} from "@/model/services/sub-category";

export type CategorySubcategorySelectOption = {
  value: string;
  label: string;
};

export type UseCategorySubcategoriesOptions = {
  /** Selected category Mongo _id (BuySell / filter value). */
  categoryId: string;
  /** When true, only active categories and subcategories are loaded. Default true. */
  activeOnly?: boolean;
  /** Admin screens: load all subcategory statuses. */
  includeInactiveSubcategories?: boolean;
};

export function useCategorySubcategories({
  categoryId,
  activeOnly = true,
  includeInactiveSubcategories = false,
}: UseCategorySubcategoriesOptions) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [categoriesError, setCategoriesError] = useState("");
  const [subcategoriesError, setSubcategoriesError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoadingCategories(true);
    setCategoriesError("");

    getCategories(activeOnly ? { activeOnly: true } : {})
      .then((data) => {
        if (!cancelled) setCategories(data ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setCategories([]);
          setCategoriesError(
            err instanceof Error ? err.message : "Failed to load categories",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCategories(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeOnly]);

  const selectedCategory = useMemo(
    () =>
      categories.find(
        (c) =>
          getCategoryRowId(c) === categoryId ||
          getCategoryUuid(c) === categoryId,
      ) ?? null,
    [categories, categoryId],
  );

  const selectedCategoryUuid = useMemo(
    () => (selectedCategory ? getCategoryUuid(selectedCategory) : ""),
    [selectedCategory],
  );

  /** Backend resolves Mongo _id or uuid — do not wait for categories list. */
  const categoryKeyForApi = selectedCategoryUuid || categoryId;

  useEffect(() => {
    if (!categoryId || !categoryKeyForApi) {
      setSubcategories([]);
      setSubcategoriesError("");
      setLoadingSubcategories(false);
      return;
    }

    let cancelled = false;
    setLoadingSubcategories(true);
    setSubcategoriesError("");

    getSubCategories(categoryKeyForApi, {
      activeOnly: activeOnly && !includeInactiveSubcategories,
      includeInactive: includeInactiveSubcategories,
    })
      .then((data) => {
        if (!cancelled) setSubcategories(data ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setSubcategories([]);
          setSubcategoriesError(
            err instanceof Error ? err.message : "Failed to load subcategories",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSubcategories(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    categoryId,
    categoryKeyForApi,
    activeOnly,
    includeInactiveSubcategories,
  ]);

  const categoryOptions = useMemo<CategorySubcategorySelectOption[]>(
    () =>
      categories.map((c) => ({
        value: getCategoryRowId(c),
        label: c.category_name,
      })),
    [categories],
  );

  const subcategoryOptions = useMemo<CategorySubcategorySelectOption[]>(
    () =>
      subcategories.map((s) => ({
        value: getSubCategoryRowId(s),
        label: s.sub_category_name,
      })),
    [subcategories],
  );

  const subcategoriesEmpty =
    !!categoryId &&
    !loadingSubcategories &&
    !subcategoriesError &&
    subcategoryOptions.length === 0;

  const isSubcategoryValid = useCallback(
    (subcategoryId: string) =>
      !subcategoryId ||
      subcategoryOptions.some((opt) => opt.value === subcategoryId),
    [subcategoryOptions],
  );

  return {
    categories,
    subcategories,
    categoryOptions,
    subcategoryOptions,
    loadingCategories,
    loadingSubcategories,
    categoriesError,
    subcategoriesError,
    subcategoriesEmpty,
    selectedCategory,
    selectedCategoryUuid,
    isSubcategoryValid,
  };
}
