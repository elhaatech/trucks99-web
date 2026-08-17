"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { DataTable, ModulePageLayout } from "@/components/common";
import { ViewIcon } from "@/components/ui/Icons";
import type { DataTableAction } from "@/components/common/DataTable";
import { useNotification } from "@/hooks/useNotification";
import { routes } from "@/lib/routes";
import { getTransactions, type TransactionRecord } from "@/model/services/Payment";
import { useTransactionColumns } from "./transactioncolumns";

export function TransactionsPage() {
  const router = useRouter();
  const { notify } = useNotification();

  const [rows, setRows] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAll = useCallback(() => {
    setLoading(true);
    setError("");
    return getTransactions()
      .then((data) => setRows(data ?? []))
      .catch((err) => {
        const msg =
          err instanceof Error ? err.message : "Failed to load transactions";
        setError(msg);
        notify({ type: "error", message: msg });
      })
      .finally(() => setLoading(false));
  }, [notify]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const columns = useTransactionColumns();

  const rowActions = useCallback(
    (row: TransactionRecord): DataTableAction<TransactionRecord>[] => [
      {
        label: "View",
        icon: <ViewIcon />,
        onClick: () => router.push(routes.subscription.transactionView(row._id)),
      },
    ],
    [router]
  );

  return (
    <ModulePageLayout
      title="Payment Transactions"
      subtitle="All Razorpay payment transaction records."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Subscriptions", href: routes.subscription.list() },
        { label: "Transactions" },
      ]}
      error={error}
      onErrorClose={() => setError("")}
    >
      {loading ? (
        <Typography sx={{ py: 6, textAlign: "center", color: "text.secondary" }}>
          Loading…
        </Typography>
      ) : rows.length === 0 ? (
        <Typography sx={{ py: 6, textAlign: "center", color: "text.secondary" }}>
          No transactions found.
        </Typography>
      ) : (
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            overflow: "hidden",
            bgcolor: "background.paper",
          }}
        >
          <DataTable<TransactionRecord>
            columns={columns}
            rows={rows}
            getRowId={(row) => row._id}
            loading={false}
            emptyMessage="No transactions to display."
            actions={(row) => rowActions(row)}
          />
        </Box>
      )}
    </ModulePageLayout>
  );
}