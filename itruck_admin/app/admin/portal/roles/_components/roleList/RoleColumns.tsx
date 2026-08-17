"use client";

import { useMemo } from "react";
import type { Role } from "@/model/api";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import { useRouter } from "next/navigation";

import { routes } from "@/lib/routes";
import { getRowId } from "@/model/api";
import type { DataTableColumn } from "@/components/common";
import { createdAtColumn } from "@/components/common";
import { renderClickableName } from "@/components/common/table/tableColumnHelpers";

/** Normalise permissions regardless of API shape:
 *  - Array shape:  [{ title_name, access }]  → keep as-is
 *  - Object shape: { dashboard: { create, view, … }, … } → convert to array
 */
function normalisePermissions(
  permissions: Role["permissions"]
): Array<{ title_name: string; access: Record<string, boolean> }> {
  if (!permissions) return [];

  if (Array.isArray(permissions)) return permissions;

  if (typeof permissions === "object") {
    return Object.entries(permissions).map(([key, access]) => ({
      title_name: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      access: access as Record<string, boolean>,
    }));
  }

  return [];
}

function formatAccess(access?: Record<string, boolean>): string {
  if (!access || typeof access !== "object") return "";
  // Support both "edit" and "update" keys from different API versions
  const keys = ["create", "view", "edit", "update", "delete"];
  const active = keys.filter((k) => access[k]);
  return active.length
    ? active.map((k) => k.charAt(0).toUpperCase() + k.slice(1)).join(", ")
    : "—";
}

export function useRoleColumns() {
  const router = useRouter();

  return useMemo<Array<DataTableColumn<Role>>>(
    () => [
      {
        id: "name",
        label: "Name",
        minWidth: 140,
        sortable: true,
        render: (row: Role) =>
          renderClickableName(row.name || "", routes.role.view(getRowId(row))),
      },

      {
        id: "description",
        label: "Description",
        minWidth: 200,
        sortable: true,
        render: (row: Role) => row.description || "—",
      },
      createdAtColumn<Role>(),
    ],
    [router]
  );
}