"use client";

import { useCallback, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { DataTable, ModulePageLayout } from "@/components/common";
import type { DataTableColumn } from "@/components/common/DataTable";
import { routes } from "@/lib/routes";
import {
  getNotificationHistory,
  type NotificationLogEntry,
} from "@/model/api";

const columns: DataTableColumn<NotificationLogEntry>[] = [
  {
    id: "createdAt",
    label: "Time",
    render: (row) =>
      row.createdAt ? new Date(row.createdAt).toLocaleString() : "—",
  },
  {
    id: "user",
    label: "User",
    render: (row) => {
      const u = row.userId;
      if (!u || typeof u === "string") return "—";
      return u.name || u.mobile || u.email || "—";
    },
  },
  { id: "event", label: "Event", render: (row) => row.event },
  { id: "channel", label: "Channel", render: (row) => row.channel },
  {
    id: "status",
    label: "Status",
    render: (row) => (
      <Chip
        size="small"
        label={row.status}
        color={
          row.status === "sent" || row.status === "delivered"
            ? "success"
            : row.status === "failed"
              ? "error"
              : "default"
        }
      />
    ),
  },
  {
    id: "message",
    label: "Message",
    render: (row) => (
      <Typography variant="body2" sx={{ maxWidth: 320 }} noWrap title={row.message}>
        {row.message}
      </Typography>
    ),
  },
  {
    id: "error",
    label: "Error",
    render: (row) => row.errorMessage || "—",
  },
];

export default function NotificationHistoryPage() {
  const [rows, setRows] = useState<NotificationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    getNotificationHistory({ page, limit: 50 })
      .then((res) => {
        setRows(res.data ?? []);
        setTotal(res.pagination?.total ?? 0);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load history"),
      )
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ModulePageLayout
      title="Notification History"
      subtitle={`Delivery log across WhatsApp, SMS, email, push, and in-app (${total} total).`}
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Notifications", href: routes.notifications() },
        { label: "History" },
      ]}
      error={error}
      onErrorClose={() => setError("")}
    >
      <Box
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      >
        <DataTable<NotificationLogEntry>
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id || row._id}
          loading={loading}
          emptyMessage="No notification history yet."
          totalCount={total}
          page={page - 1}
          pageSize={50}
          onPageChange={(p) => setPage(p + 1)}
        />
      </Box>
    </ModulePageLayout>
  );
}
