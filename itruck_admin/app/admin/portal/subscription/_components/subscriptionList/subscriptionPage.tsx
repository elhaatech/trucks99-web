"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import { DataTable, ConfirmDialog, ModulePageLayout, SelectionBanner } from "@/components/common";
import { EditIcon, DeleteIcon, ViewIcon } from "@/components/ui/Icons";
import { routes } from "@/lib/routes";
import { useNotification } from "@/hooks/useNotification";
import { useFilters } from "@/hooks/useFilters";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { canAccess } from "@/lib/permissions";
import type { DataTableAction } from "@/components/common/DataTable";
import { EMPTY_FILTERS } from "../interface/subscriptionType";
import {
  deleteSubscription,
  deleteSubscriptionItems,
  getSubscriptionAll,
  type Subscription,
} from "@/model/services/subscription";
import { getCurrentUser } from "@/model/api";
import type { User } from "@/model/api";
import SubscriptionFilters from "./subscriptionFilters";
import {
  useSubscriptionColumns,
  type SubscriptionItemRow,
} from "./subscriptionColumns";

type DeleteCtx =
  | { mode: "doc"; docId: string }
  | { mode: "item"; docId: string; itemIds: string[] }
  | { mode: "bulk-items"; itemsMap: Record<string, string[]> };

export function SubscriptionsPage() {
  const router = useRouter();
  const { notify } = useNotification();

  const { filters, setFiltersPatch, resetFilters } = useFilters(EMPTY_FILTERS);
  const [appliedSearch, setAppliedSearch] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  const {
    open: deleteOpen,
    target: deleteTarget,
    openWith: openDeleteConfirm,
    close: closeDeleteConfirm,
  } = useConfirmDialog<DeleteCtx>();

  const [docs, setDocs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const loadAll = useCallback(() => {
    setLoading(true);
    setError("");
    return getSubscriptionAll()
      .then((res) => setDocs(res ?? []))
      .catch((err) => {
        const msg =
          err instanceof Error ? err.message : "Failed to load subscriptions";
        setError(msg);
        notify({ type: "error", message: msg });
      })
      .finally(() => setLoading(false));
  }, [notify]);

  useEffect(() => {
    void loadAll();
    setUserLoading(true);
    getCurrentUser()
      .then((u) => setCurrentUser(u as User))
      .catch(() => setCurrentUser(null))
      .finally(() => setUserLoading(false));
  }, [loadAll]);

  const handleSearch = useCallback(() => {
    setAppliedSearch(filters.search.trim().toLowerCase());
  }, [filters.search]);

  const handleClear = useCallback(() => {
    resetFilters();
    setAppliedSearch("");
    setSelectedRowIds([]);
  }, [resetFilters]);

  const canCreate = canAccess(currentUser?.role, "subscriptions", "create");
  const canEdit = canAccess(currentUser?.role, "subscriptions", "update");
  const canDelete = canAccess(currentUser?.role, "subscriptions", "delete");

  const columns = useSubscriptionColumns();

  // FIX: doc.subscriptions is an object { load: [...], truck: [...] }, not an array.
  // Iterate Object.values() to get each field's array, then flatten items.
  const flattenedRows = useMemo(() => {
    const rows: SubscriptionItemRow[] = [];

    docs.forEach((doc: any) => {
      const subscriptions = doc.subscriptions;
      if (!subscriptions || typeof subscriptions !== "object") return;

      Object.values(subscriptions).forEach((itemsArray: any) => {
        if (!Array.isArray(itemsArray)) return;

        itemsArray.forEach((item: any) => {
          rows.push({
            id: item.id,
            docId: doc._id, // API returns _id at document level
            packageName: item.packageName,
            packageType: item.packageType,
            fieldName: item.fieldName,
            price: item.price,
            durationDays: item.durationDays,
            status: item.status,
            description: item.description,
            createdAt: doc.createdAt,
          });
        });
      });
    });

    return rows;
  }, [docs]);

  const filteredRows = useMemo(() => {
    let rows = flattenedRows;
    if (filters.fieldName) {
      rows = rows.filter((row) => row.fieldName === filters.fieldName);
    }
    const q = appliedSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (row) =>
          row.packageName?.toLowerCase().includes(q) ||
          row.packageType?.toLowerCase().includes(q) ||
          row.fieldName?.toLowerCase().includes(q) ||
          row.docId?.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [flattenedRows, appliedSearch, filters.fieldName]);

  // FIX: same object iteration fix for fieldNameOptions
  const fieldNameOptions = useMemo(() => {
    const names = new Set<string>();

    docs.forEach((doc: any) => {
      const subscriptions = doc.subscriptions;
      if (!subscriptions || typeof subscriptions !== "object") return;

      Object.values(subscriptions).forEach((itemsArray: any) => {
        if (!Array.isArray(itemsArray)) return;

        itemsArray.forEach((item: any) => {
          if (item.fieldName) names.add(item.fieldName);
        });
      });
    });

    return Array.from(names).sort();
  }, [docs]);

  const handleConfirmDelete = useCallback(async () => {
    const ctx = deleteTarget;
    if (!ctx) return;
    try {
      if (ctx.mode === "doc") {
        await deleteSubscription([ctx.docId]);
        notify({ type: "danger", message: "Subscription deleted." });
      } else if (ctx.mode === "bulk-items") {
        for (const [docId, itemIds] of Object.entries(ctx.itemsMap)) {
          await deleteSubscriptionItems(docId, itemIds);
        }
        setSelectedRowIds([]);
        notify({
          type: "danger",
          message: `${selectedRowIds.length} item(s) deleted.`,
        });
      } else {
        await deleteSubscriptionItems(ctx.docId, ctx.itemIds);
        setSelectedRowIds([]);
        notify({ type: "danger", message: "Item(s) deleted." });
      }
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setError(msg);
      notify({ type: "error", message: msg });
    }
  }, [deleteTarget, loadAll, notify, selectedRowIds.length]);

  const rowActions = useCallback(
    (row: SubscriptionItemRow): DataTableAction<SubscriptionItemRow>[] => [
      {
        label: "View",
        icon: <ViewIcon />,
        onClick: () => router.push(routes.subscription.view(row.id)),
      },
      {
        label: "Edit",
        icon: <EditIcon />,
        onClick: () => router.push(routes.subscription.edit(row.id)),
      },
      {
        label: "Delete",
        icon: <DeleteIcon />,
        onClick: () =>
          openDeleteConfirm({
            mode: "item",
            docId: row.docId,
            itemIds: [row.id],
          }),
        color: "error",
      },
    ],
    [openDeleteConfirm, router],
  );

  const handleBulkDelete = useCallback(() => {
    if (selectedRowIds.length === 0) return;
    const itemsMap: Record<string, string[]> = {};
    selectedRowIds.forEach((rowId) => {
      const row = filteredRows.find((r) => r.id === rowId);
      if (row) {
        if (!itemsMap[row.docId]) itemsMap[row.docId] = [];
        itemsMap[row.docId].push(row.id);
      }
    });
    openDeleteConfirm({ mode: "bulk-items", itemsMap });
  }, [selectedRowIds, filteredRows, openDeleteConfirm]);

  // Build currentUser shape that SubscriptionPlansPage expects
  const plansUser = currentUser
    ? {
        _id: String(currentUser._id ?? ""),
        id: String(currentUser.id ?? ""),
        name: currentUser.name ?? "",
        email: currentUser.email ?? "",
        mobile: currentUser.mobile ?? "",
        role: currentUser.role as { name?: string } | undefined,
      }
    : undefined;

  return (
    <ModulePageLayout
      title="Subscription"
      subtitle="Create, edit, and delete subscriptions."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Subscription" },
      ]}
      error={error}
      onErrorClose={() => setError("")}
      action={
        <Button
          variant="contained"
          onClick={() => router.push(routes.subscription.create())}
        >
          Add Subscription
        </Button>
      }
    >
      {/* Plans section with Pay Now buttons — currentUser required for payment */}
      {/* <SubscriptionPlansPage currentUser={plansUser} /> */}

      <SelectionBanner
        count={selectedRowIds.length}
        total={filteredRows.length}
        onAction={canDelete ? handleBulkDelete : undefined}
        onClear={() => setSelectedRowIds([])}
        onSelectAll={
          canDelete
            ? () => setSelectedRowIds(filteredRows.map((row) => row.id))
            : undefined
        }
      />

      {/* Search & Filter Row */}
      <Box sx={{ mb: 3, display: "flex", gap: 2, alignItems: "center" }}>
        <Box sx={{ flex: 1 }}>
          <SubscriptionFilters
            filters={filters}
            onFilterChange={setFiltersPatch}
            onSearch={handleSearch}
            onClear={handleClear}
            fieldNameOptions={fieldNameOptions}
          />
        </Box>
      </Box>

      {/* Main Table */}
      {loading || userLoading ? (
        <Typography
          sx={{ py: 4, textAlign: "center", color: "text.secondary" }}
        >
          Loading…
        </Typography>
      ) : filteredRows.length === 0 ? (
        <Typography
          sx={{ py: 4, textAlign: "center", color: "text.secondary" }}
        >
          {docs.length === 0
            ? "No subscriptions yet. Add one to get started."
            : "No results match your search."}
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
          <DataTable<SubscriptionItemRow>
            columns={columns}
            rows={filteredRows}
            getRowId={(row) => row.id}
            loading={false}
            emptyMessage="No items to display."
            selectable={canDelete}
            selectedIds={selectedRowIds}
            onSelectionChange={setSelectedRowIds}
            actions={(row) => rowActions(row)}
          />
        </Box>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onClose={closeDeleteConfirm}
        onConfirm={handleConfirmDelete}
        title={
          deleteTarget?.mode === "doc"
            ? "Delete subscription document?"
            : deleteTarget?.mode === "bulk-items"
              ? `Delete ${selectedRowIds.length} item(s)?`
              : "Delete subscription item?"
        }
        description={
          deleteTarget?.mode === "doc"
            ? "This will permanently delete the entire subscription document and all its items."
            : deleteTarget?.mode === "bulk-items"
              ? `This will permanently delete ${selectedRowIds.length} selected item(s).`
              : "This will permanently delete this subscription item."
        }
        confirmLabel="Delete"
        confirmColor="error"
        pendingLabel="Deleting…"
      />
    </ModulePageLayout>
  );
}