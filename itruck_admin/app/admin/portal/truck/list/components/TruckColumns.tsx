// app/(dashboard)/trucks/_components/TruckColumns.tsx

import { useMemo } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Link from "next/link";

import type { Truck, VehicleType, VehicleBodyType } from "@/model/api";
import { getRowId } from "@/model/api";

import { ROUTES, routes } from "@/lib/routes";

import {
  getVehicleTypeLabel,
  getVehicleBodyTypeLabel,
  getFileUrl,
} from "./truckUtils";
import { renderClickableName } from "@/components/common/table/tableColumnHelpers";
import { createdAtColumn } from "@/components/common";
import { renderNumberColumn } from "@/components/common/table/renderNumberColumn";

interface Props {
  vehicleTypes: VehicleType[];
  vehicleBodyTypes: VehicleBodyType[];
  onPreviewImage: (url: string) => void;
}

export function useTruckColumns({
  vehicleTypes,
  vehicleBodyTypes,
  onPreviewImage,
}: Props) {
  return useMemo(
    () => [
      {
        id: "truckNumber",
        label: "Truck No",
        minWidth: 160,
        render: (row: Truck) =>
          renderNumberColumn(
            row,
            row.truckNumber,
            routes.truck.view(getRowId(row)),
            renderClickableName,
          ),
      },
      {
        id: "vehicleNumber",
        label: "Vehicle No.",
        minWidth: 140,
        render: (row: Truck) => {
          const vehicleNo = row.vehicleNumber || row.registrationNumber || "";

          return renderClickableName(
            vehicleNo,
            routes.truck.view(getRowId(row)),
          );
        },
        // sortable: true,
      },
      {
        id: "vehicleType",
        label: "Vehicle Type",
        sortable: true,
        minWidth: 140,

        render: (row: Truck) => {
          // API returns object directly
          if (row.vehicleType && typeof row.vehicleType === "object") {
            const vehicleTypeObj = row.vehicleType as {
              name?: string;
              vehicle_type?: string;
            };

            return vehicleTypeObj.name || vehicleTypeObj.vehicle_type || "—";
          }

          // fallback if string id stored
          const key = String(row.vehicleType || "");

          const vt = vehicleTypes.find(
            (v: VehicleType) =>
              String(v.id) === key ||
              String(v.uuid) === key ||
              String(v._id) === key,
          ) as VehicleType | undefined;

          return vt?.vehicle_type || (vt as { name?: string })?.name || "—";
        },
      },

      {
        id: "vehicleBodyType",
        label: "Body Type",
        sortable: true,
        minWidth: 140,

        render: (row: Truck) => {
          const key =
            typeof row.vehicleBodyType === "object"
              ? (
                  row.vehicleBodyType as {
                    vehicle_id?: string;
                  }
                )?.vehicle_id
              : row.vehicleBodyType;

          if (!key) return "—";

          const vbt = vehicleBodyTypes.find(
            (v: VehicleBodyType) => String(v.vehicle_id) === String(key),
          );

          return vbt?.vehicle_name || "—";
        },
      },

      {
        id: "capacity",
        label: "Capacity",
        minWidth: 100,
        render: (row: Truck) => row.vehicleCapacity || row.capacity || "—",
        sortable: true,
      },

      {
        id: "vehicleTyre",
        label: "Wheels",
        minWidth: 90,
        render: (row: Truck) => row.vehicleTyre || row.total_tire || "—",
        // sortable: true,
      },

      {
        id: "documents",
        label: "Image",
        minWidth: 160,
        // sortable: true,0
        render: (row: Truck) => {
          const imageSrc =
            row.vehicleImage ||
            (Array.isArray(row.vehicleImages) && row.vehicleImages.length > 0
              ? row.vehicleImages[0]
              : undefined);

          const hasImage = !!imageSrc;
          const hasRc = !!row.vehicleRCDocument;

          if (!hasImage && !hasRc) return "—";

          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {hasImage && (
                <Box
                  component="img"
                  src={getFileUrl(imageSrc as string)}
                  alt="Truck"
                  sx={{
                    width: 48,
                    height: 36,
                    objectFit: "cover",
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: "divider",
                    cursor: "pointer",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreviewImage(getFileUrl(imageSrc as string));
                  }}
                />
              )}

              {/* {hasRc && (
                <Box
                  component="a"
                  href={getFileUrl(row.vehicleRCDocument as string)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  sx={{ fontSize: 12 }}
                >
                  RC
                </Box>
              )} */}
            </Box>
          );
        },
      },

      {
        id: "vehicleOwner",
        label: "Vehicle Owner",
        minWidth: 140,

        render: (row: Truck) => {
          const owner = row.ownerUser as
            | {
                name?: string;
                mobile?: string;
              }
            | undefined;

          return owner?.name || owner?.mobile || "—";
        },
      },

      {
        id: "status",
        label: "Status",
        minWidth: 110,
        render: (row: Truck) => (
          <Chip
            size="small"
            label={row.status || "—"}
            sx={{
              bgcolor:
                row.status === "available"
                  ? "success.light"
                  : row.status === "in-transit"
                    ? "info.light"
                    : row.status === "maintenance"
                      ? "warning.light"
                      : "grey.200",
              color:
                row.status === "available"
                  ? "success.dark"
                  : row.status === "in-transit"
                    ? "info.dark"
                    : row.status === "maintenance"
                      ? "warning.dark"
                      : "text.secondary",
            }}
          />
        ),
      },
      createdAtColumn<Truck>(),
    ],
    [vehicleTypes, vehicleBodyTypes, onPreviewImage],
  );
}
