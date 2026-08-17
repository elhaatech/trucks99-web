"use client";

import { useMemo } from "react";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";

import type { Advertisement } from "@/model/api";
import { getRowId } from "@/model/api";
import type { DataTableColumn } from "@/components/common";
import { createdAtColumn } from "@/components/common";
import { renderClickableName } from "@/components/common/table/tableColumnHelpers";
import { routes } from "@/lib/routes";

import { AdvertisementStatusChip } from "../AdvertisementStatusChip";
import {
  formatDisplayDate,
  isVideoMedia,
  resolveMediaUrl,
} from "../interface/advertisementTypes";

export function useAdvertisementColumns() {
  return useMemo<Array<DataTableColumn<Advertisement>>>(
    () => [
      {
        id: "adTitle",
        label: "Ad title",
        minWidth: 180,
        sortable: true,
        render: (row) =>
          renderClickableName(
            row.adTitle || "",
            routes.advertisement.view(getRowId(row)),
          ),
      },
      {
        id: "clientName",
        label: "Client",
        minWidth: 140,
        sortable: true,
        render: (row) => row.clientName || "—",
      },
      {
        id: "adType",
        label: "Type",
        minWidth: 100,
        sortable: true,
        render: (row) => (
          <Chip label={row.adType} size="small" variant="outlined" />
        ),
      },
      {
        id: "mediaUrl",
        label: "Media",
        minWidth: 90,
        render: (row) => {
          const src = resolveMediaUrl(row.mediaUrl || "");
          if (!src) return "—";
          if (isVideoMedia(row.adType, row.mediaUrl)) {
            return (
              <Box
                component="video"
                src={src}
                muted
                sx={{
                  width: 56,
                  height: 40,
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "divider",
                  objectFit: "cover",
                  bgcolor: "grey.900",
                }}
              />
            );
          }
          return (
            <Box
              component="img"
              src={src}
              alt={row.adTitle}
              sx={{
                width: 56,
                height: 40,
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
                objectFit: "cover",
                bgcolor: "grey.50",
              }}
            />
          );
        },
      },
      {
        id: "displayLocation",
        label: "Location",
        minWidth: 140,
        sortable: true,
        render: (row) => row.displayLocation || "—",
      },
      {
        id: "startDate",
        label: "Start",
        minWidth: 110,
        sortable: true,
        render: (row) => formatDisplayDate(row.startDate),
      },
      {
        id: "expiryDate",
        label: "Expiry",
        minWidth: 110,
        sortable: true,
        render: (row) => formatDisplayDate(row.expiryDate),
      },
      {
        id: "displayPriority",
        label: "Priority",
        minWidth: 80,
        sortable: true,
        align: "center",
        render: (row) => row.displayPriority ?? 0,
      },
      {
        id: "status",
        label: "Status",
        minWidth: 100,
        sortable: true,
        render: (row) => <AdvertisementStatusChip status={row.status} />,
      },
      createdAtColumn<Advertisement>(),
      {
        id: "isActive",
        label: "Live",
        minWidth: 90,
        sortable: true,
        render: (row) => (
          <Chip
            size="small"
            label={row.isActive ? "Yes" : "No"}
            color={row.isActive ? "success" : "default"}
            variant="outlined"
          />
        ),
      },
    ],
    [],
  );
}
