"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Typography from "@mui/material/Typography";

import type { Material } from "@/model/api";
import { getRowId } from "@/model/api";

import { routes } from "@/lib/routes";

import type { DataTableColumn } from "@/components/common";
import { BlockStatusChip, createdAtColumn } from "@/components/common";

export function useMaterialColumns() {
  const router = useRouter();

  return useMemo<Array<DataTableColumn<Material>>>(
    () => [
      {
        id: "materials_type",
        label: "Material Type",
        minWidth: 160,
        sortable: true,
        render: (row: Material) => (
          <Typography
            sx={{
              color: "primary.main",
              cursor: "pointer",
              fontWeight: 600,
              "&:hover": {
                textDecoration: "underline",
              },
            }}
            onClick={() =>
              router.push(
                routes.material.view(getRowId(row))
              )
            }
          >
            {row.materials_type || "—"}
          </Typography>
        ),
      },

      {
        id: "status",
        label: "Status",
        sortable: true,
        minWidth: 110,
        render: (row: Material) => (
          <BlockStatusChip
            status={row.status}
            size="small"
          />
        ),
      },
      createdAtColumn<Material>(),
    ],
    [router]
  );
}