"use client";

import { useMemo } from "react";
import Chip from "@mui/material/Chip";

import type { IncomeExpenseCategory } from "@/model/api";
import { getRowId } from "@/model/api";

import type { DataTableColumn } from "@/components/common";
import { BlockStatusChip, createdAtColumn } from "@/components/common";

import { routes } from "@/lib/routes";
import { renderClickableName } from "@/components/common/table/tableColumnHelpers";

export function useIncomeExpenseCategoryColumns() {
  return useMemo<Array<DataTableColumn<IncomeExpenseCategory>>>(
    () => [
      {
        id: "type",
        label: "Type",
        minWidth: 100,
        sortable: true,
        render: (row) => (
          <Chip
            label={row.type}
            size="small"
            color={row.type === "income" ? "success" : "warning"}
            variant="outlined"
          />
        ),
      },

      {
        id: "categoryName",
        label: "Category name",
        minWidth: 180,
        sortable: true,
        render: (row) =>
          renderClickableName(
            row.categoryName || "",
            routes.incomeExpenseCategory.view(getRowId(row)),
          ),
      },

      {
        id: "status",
        label: "Status",
        sortable: true,
        minWidth: 100,
        render: (row) => <BlockStatusChip status={row.status} size="small" />,
      },
      createdAtColumn<IncomeExpenseCategory>(),
    ],
    [],
  );
}
