"use client";

import { useMemo } from "react";
import Chip from "@mui/material/Chip";

import type { IncomeExpense } from "@/model/api";
import { getRowId } from "@/model/api";

import type { DataTableColumn } from "@/components/common";
import { BlockStatusChip, createdAtColumn } from "@/components/common";

import { routes } from "@/lib/routes";
import { renderClickableName } from "@/components/common/table/tableColumnHelpers";

export function useIncomeExpenseColumns() {
  return useMemo<Array<DataTableColumn<IncomeExpense>>>(
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
        id: "category",
        label: "Category",
        minWidth: 160,
        sortable: true,
        render: (row) => {
          const categoryName = row.category
            ? ((row.category as { categoryName?: string }).categoryName ??
              row.category_id)
            : row.category_id;

          return renderClickableName(
            categoryName || "",
            routes.incomeExpense.view(getRowId(row)),
          );
        },
      },

      {
        id: "status",
        label: "Status",
        sortable: true,
        minWidth: 110,
        render: (row) => <BlockStatusChip status={row.status} size="small" />,
      },

      {
        id: "remarks",
        label: "Remarks",
        minWidth: 140,
        render: (row) => row.remarks || "—",
      },

      {
        id: "amount",
        label: "Amount (₹)",
        sortable: true,
        minWidth: 110,
        render: (row) =>
          row.amount != null ? Number(row.amount).toLocaleString() : "—",
      },
      createdAtColumn<IncomeExpense>(),
    ],
    [],
  );
}
