"use client";

import { useMemo } from "react";
import Box from "@mui/material/Box";

import type { VehicleType } from "@/model/api";
import { getRowId } from "@/model/api";

import type { DataTableColumn } from "@/components/common";
import {
  BlockStatusChip,
  createdAtColumn,
} from "@/components/common";

import { routes } from "@/lib/routes";
import { renderClickableName } from "@/components/common/table/tableColumnHelpers";

export function useVehicleTypeColumns(
  getFileUrl: (path?: string) => string
) {
  return useMemo<Array<DataTableColumn<VehicleType>>>(
    () => [
      {
        id: "image",
        label: "Image",
        minWidth: 80,
        sortable: true,
        render: (row) =>
          row.image ? (
            <Box
              component="img"
              src={getFileUrl(row.image)}
              alt={row.vehicle_type || "Vehicle type"}
              sx={{
                width: 48,
                height: 36,
                objectFit: "cover",
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
              }}
            />
          ) : (
            "—"
          ),
      },

      {
        id: "vehicle_type",
        label: "Vehicle Type",
        minWidth: 160,
        sortable: true,
        render: (row) =>
          renderClickableName(
            row.vehicle_type || "",
            routes.vehicleType.view(getRowId(row))
          ),
      },

      {
        id: "minimumCapacity",
        label: "Min Capacity",
        minWidth: 120,
        render: (row) =>
          row.minimumCapacity || "—",
        sortable: true,
      },

      {
        id: "maximumCapacity",
        label: "Max Capacity",
        minWidth: 120,
        render: (row) =>
          row.maximumCapacity || "—",
        sortable: true,
      },

      {
        id: "description",
        label: "Description",
        minWidth: 200,
        render: (row) =>
          row.description || "—",
      },

      {
        id: "status",
        label: "Status",
        minWidth: 90,
        render: (row) => (
          <BlockStatusChip
            status={
              (row as unknown as {
                status?: string;
              }).status
            }
            size="small"
          />
        ),
      },
      createdAtColumn<VehicleType>(),
    ],
    [getFileUrl]
  );
}