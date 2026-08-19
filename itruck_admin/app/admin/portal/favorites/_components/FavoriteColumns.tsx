"use client";

import { useMemo } from "react";
import Chip from "@mui/material/Chip";

import type { AdminFavoriteRow } from "@/model/services/favoriteapi";
import { getBuySellRowId } from "@/model/services/buysellapi";
import type { DataTableColumn } from "@/components/common";
import { createdAtColumn } from "@/components/common";
import { renderClickableName } from "@/components/common/table/tableColumnHelpers";
import { routes } from "@/lib/routes";

function vehicleLabel(row: AdminFavoriteRow): string {
  return (
    row.description?.trim() ||
    row.bsNumber ||
    row.vehicleId ||
    String(row._id || row.id || "Vehicle")
  );
}

export function useFavoriteColumns() {
  return useMemo<Array<DataTableColumn<AdminFavoriteRow>>>(
    () => [
      {
        id: "vehicle",
        label: "Vehicle",
        minWidth: 180,
        sortable: true,
        render: (row) =>
          renderClickableName(
            vehicleLabel(row),
            routes.buysell.view(getBuySellRowId(row)),
          ),
      },
      {
        id: "favoritedBy",
        label: "Saved by",
        minWidth: 150,
        sortable: true,
        render: (row) => row.favoritedBy?.name || "—",
      },
      {
        id: "userDetails",
        label: "User details",
        minWidth: 200,
        render: (row) =>
          [row.favoritedBy?.email, row.favoritedBy?.mobile]
            .filter(Boolean)
            .join(" · ") || "—",
      },
      {
        id: "price",
        label: "Price",
        minWidth: 110,
        sortable: true,
        render: (row) => `₹${Number(row.price || 0).toLocaleString("en-IN")}`,
      },
      {
        id: "status",
        label: "Listing status",
        minWidth: 120,
        sortable: true,
        render: (row) => (
          <Chip size="small" label={row.status || "—"} variant="outlined" />
        ),
      },
      createdAtColumn<AdminFavoriteRow>({
        id: "favoritedAt",
        label: "Saved on",
        getValue: (row) => row.favoritedAt || row.createdAt,
      }),
    ],
    [],
  );
}
