"use client";

import { useMemo } from "react";
import type { User } from "@/model/api";
import { getRowId } from "@/model/api";
import { routes } from "@/lib/routes";
import { BlockStatusChip } from "@/components/common";
import { createdAtColumn } from "@/components/common";
import { renderClickableName } from "@/components/common/table/tableColumnHelpers";

export function useUserColumns() {
  return useMemo(() => {
    return [
      {
        id: "name",
        label: "Name",
        minWidth: 140,
        sortable: true,
        render: (row: User) =>
          renderClickableName(row.name || "", routes.user.view(getRowId(row))),
      },

      {
        id: "mobile",
        label: "Mobile",
        minWidth: 150,
        sortable: true,
        render: (row: User) => row.mobile || "—",
      },

      {
        id: "company_name",
        label: "Company",
        minWidth: 190,
        sortable: true,
        render: (row: User) =>
          ((row as any).company_name as string | undefined) || "—",
      },

      {
        id: "role",
        label: "Role",
        minWidth: 140,
        sortable: true,
        render: (row: User) => {
          const role = row.role as { name?: string } | string | undefined;
          return typeof role === "string"
            ? role || "—"
            : role?.name || (row as any).roleId || "—";
        },
      },
      createdAtColumn<User>({
        getValue: (row) =>
          (row as any).createdAt ||
          (row as any)?.role?.createdAt ||
          (row as any)?.roleId?.createdAt,
      }),

      {
        id: "status",
        label: "Status",
        minWidth: 120,
        sortable: true,
        render: (row: User) => (
          <BlockStatusChip
            status={(row as { status?: string }).status}
            size="small"
          />
        ),
      },
    ];
  }, []);
}
