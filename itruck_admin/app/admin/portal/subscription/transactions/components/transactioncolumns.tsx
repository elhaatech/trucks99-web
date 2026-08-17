"use client";

import { useMemo } from "react";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import type { DataTableColumn } from "@/components/common";
import { createdAtColumn } from "@/components/common";
import type { TransactionRecord } from "@/model/services/Payment";

export type { TransactionRecord };

const STATUS_COLOR: Record<
  string,
  "success" | "error" | "warning" | "default"
> = {
  success: "success",
  failed: "error",
  created: "warning",
};

export function useTransactionColumns() {
  return useMemo<Array<DataTableColumn<TransactionRecord>>>(
    () => [
      createdAtColumn<TransactionRecord>({ label: "Created Date" }),
      {
        id: "orderId",
        label: "Order ID",
        minWidth: 200,
        sortable: true,
        render: (row: TransactionRecord) => (
          <Typography
            variant="body2"
            fontFamily="monospace"
            fontSize="0.75rem"
            sx={{ color: "text.secondary" }}
          >
            {row.orderId}
          </Typography>
        ),
      },
      {
        id: "packageId",
        label: "Package ID",
        minWidth: 160,
        sortable: true,
        render: (row: TransactionRecord) => (
          <Typography
            variant="body2"
            fontFamily="monospace"
            fontSize="0.75rem"
            sx={{
              color: "text.secondary",
              maxWidth: 160,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={row.packageId}
          >
            {row.packageId}
          </Typography>
        ),
      },
      {
        id: "price",
        label: "Amount",
        minWidth: 100,
        sortable: true,
        align: "right",
        render: (row: TransactionRecord) => (
          <Typography fontWeight={700} color="success.main">
            ₹{(row.price ?? 0).toLocaleString("en-IN")}
          </Typography>
        ),
      },
      {
        id: "status",
        label: "Status",
        minWidth: 110,
        sortable: true,
        render: (row: TransactionRecord) => (
          <Chip
            label={row.status}
            size="small"
            color={STATUS_COLOR[row.status] ?? "default"}
            variant={row.status === "success" ? "filled" : "outlined"}
            sx={{ fontWeight: 700, textTransform: "capitalize", borderRadius: 1 }}
          />
        ),
      },
      {
        id: "paymentDetails",
        label: "Method",
        minWidth: 110,
        render: (row: TransactionRecord) => {
          const method = row.paymentDetails?.method;
          return method ? (
            <Chip
              label={method}
              size="small"
              variant="outlined"
              sx={{ textTransform: "capitalize", borderRadius: 1 }}
            />
          ) : (
            <Typography variant="body2" color="text.disabled">
              —
            </Typography>
          );
        },
      },
      {
        id: "paymentId",
        label: "Payment ID",
        minWidth: 180,
        render: (row: TransactionRecord) =>
          row.paymentId ? (
            <Typography
              variant="body2"
              fontFamily="monospace"
              fontSize="0.75rem"
              color="text.secondary"
            >
              {row.paymentId}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.disabled">
              —
            </Typography>
          ),
      },
    ],
    []
  );
}