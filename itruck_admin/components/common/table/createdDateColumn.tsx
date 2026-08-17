"use client";

import type { DataTableColumn } from "@/components/common";
import {
  extractCreatedAt,
  formatCreatedDate,
} from "@/lib/dateUtils";

export type CreatedDateColumnOptions<T> = {
  /** Column id used for sorting. Defaults to `createdAt`. */
  id?: string;
  label?: string;
  minWidth?: number;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  /** Override how the raw created value is read from a row. */
  getValue?: (row: T) => string | Date | number | null | undefined;
};

/** Reusable Created Date column for DataTable instances. */
export function createdAtColumn<T extends object>(
  options: CreatedDateColumnOptions<T> = {},
): DataTableColumn<T> {
  const {
    id = "createdAt",
    label = "Created Date",
    minWidth = 170,
    sortable = true,
    align,
    getValue,
  } = options;

  return {
    id,
    label,
    minWidth,
    sortable,
    align,
    render: (row: T) =>
      formatCreatedDate(getValue ? getValue(row) : extractCreatedAt(row)),
  };
}

/** Render helper for non-DataTable usages (detail views, cards, etc.). */
export function renderCreatedDate(
  value?: string | Date | number | null,
): string {
  return formatCreatedDate(value);
}
