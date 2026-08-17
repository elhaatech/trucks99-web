"use client";

import { useMemo } from "react";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import { alpha, useTheme } from "@mui/material/styles";
import type { DataTableColumn } from "@/components/common";
import { createdAtColumn } from "@/components/common";

export interface SubscriptionItemRow {
  id: string;
  docId: string;
  packageName: string;
  packageType: string;
  fieldName: string;
  price: number;
  durationDays: number;
  status: string;
  description?: string;
  createdAt?: string;
}

export function useSubscriptionColumns() {
  const theme = useTheme();

  return useMemo<Array<DataTableColumn<SubscriptionItemRow>>>(
    () => [
  
      {
        id: "packageName",
        label: "Package Name",
        minWidth: 150,
        sortable: true,
        render: (row: SubscriptionItemRow) => (
          <Typography fontWeight={600}>{row.packageName || "—"}</Typography>
        ),
      },
      {
        id: "packageType",
        label: "Type",
        minWidth: 130,
        sortable: true,
        render: (row: SubscriptionItemRow) => {
          const typeColors: Record<string, string> = {
            match_load: "#4f46e5",
            match_truck: "#0891b2",
            match_product: "#059669",
          };
          const color = typeColors[row.packageType] || theme.palette.primary.main;
          return (
            <Chip
              label={row.packageType.replace("match_", "")}
              size="small"
              sx={{
                fontWeight: 600,
                bgcolor: color + "18",
                color,
                borderRadius: 1,
                textTransform: "capitalize",
              }}
            />
          );
        },
      },
      {
        id: "fieldName",
        label: "Field",
        minWidth: 110,
        sortable: true,
        render: (row: SubscriptionItemRow) => (
          <Chip
            label={row.fieldName}
            size="small"
            sx={{
              fontWeight: 600,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: "primary.main",
              borderRadius: 1,
            }}
          />
        ),
      },
      {
        id: "price",
        label: "Price",
        minWidth: 100,
        sortable: true,
        align: "right",
        render: (row: SubscriptionItemRow) => (
          <Typography fontWeight={700} color="success.main">
            ₹{(row.price ?? 0).toLocaleString()}
          </Typography>
        ),
      },
      {
        id: "durationDays",
        label: "Duration",
        minWidth: 110,
        sortable: true,
        align: "center",
        render: (row: SubscriptionItemRow) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography fontWeight={600}>{row.durationDays ?? 0}</Typography>
            <Typography variant="caption" color="text.secondary">
              days
            </Typography>
          </Box>
        ),
      },
      {
        id: "status",
        label: "Status",
        minWidth: 100,
        sortable: true,
        render: (row: SubscriptionItemRow) => (
          <Chip
            label={row.status || "active"}
            size="small"
            color={row.status === "active" ? "success" : "warning"}
            variant={row.status === "active" ? "filled" : "outlined"}
            sx={{ fontWeight: 700, textTransform: "capitalize", borderRadius: 1 }}
          />
        ),
      },
      createdAtColumn<SubscriptionItemRow>(),
    ],
    [theme]
  );
}