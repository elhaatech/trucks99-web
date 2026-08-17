"use client";

import { useMemo } from "react";
import Box from "@mui/material/Box";

import type { VehicleBodyType } from "@/model/api";
import { getRowId } from "@/model/api";

import type { DataTableColumn } from "@/components/common";
import { BlockStatusChip, createdAtColumn } from "@/components/common";

import { routes } from "@/lib/routes";
import { renderClickableName } from "@/components/common/table/tableColumnHelpers";

export function useVehicleBodyTypeColumns(
  getFileUrl: (path?: string) => string
) {
  return useMemo<Array<DataTableColumn<VehicleBodyType>>>(
    () => [
      {
        id: "image",
        label: "Image",
        minWidth: 80,
        sortable: true,
        render: (row: VehicleBodyType) =>
          row.image ? (
            <Box
              component="img"
              src={getFileUrl(row.image)}
              alt={row.vehicle_name || "Vehicle body type"}
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
        id: "vehicle_name",
        label: "Vehicle Body Type",
        minWidth: 200,
        sortable: true,
        render: (row) =>
          renderClickableName(
            row.vehicle_name || "",
            routes.vehicleBodyType.view(getRowId(row))
          ),
      },

      {
        id: "status",
        label: "Status",
        // sortable: true,
        minWidth: 90,
        render: (row: VehicleBodyType) => (
          <BlockStatusChip
            status={(row as unknown as { status?: unknown }).status}
            size="small"
          />
        ),
      },
      createdAtColumn<VehicleBodyType>(),
    ],
    [getFileUrl]
  );
}