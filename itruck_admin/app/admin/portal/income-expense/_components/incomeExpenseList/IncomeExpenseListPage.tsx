"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";

import type { IncomeExpense, User } from "@/model/api";
import {
  blockUnblock,
  deleteIncomeExpense,
  getCurrentUser,
  getIncomeExpenseAll,
  getRowId,
} from "@/model/api";
import { canAccess } from "@/lib/permissions";
import { routes } from "@/lib/routes";
import { useNotification } from "@/hooks/useNotification";
import { useFilters } from "@/hooks/useFilters";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

import {
  DataTable,
  ConfirmDialog,
  ModulePageLayout,
  SelectionBanner,
  type DataTableAction,
} from "@/components/common";
import {
  EditIcon,
  DeleteIcon,
  BlockIcon,
  UnblockIcon,
} from "@/components/ui/Icons";

import type { FilterState } from "../interface/incomeExpenseTypes";
import { EMPTY_FILTERS } from "../interface/incomeExpenseTypes";

import { IncomeExpenseFilters } from "./IncomeExpenseFilters";
import { useIncomeExpenseColumns } from "./IncomeExpenseColumns";

type DeleteCtx = { mode: "single"; row: IncomeExpense } | { mode: "bulk" };
type BlockCtx = { row: IncomeExpense; action: "block" | "unblock" };

export function IncomeExpenseListPage() {
  const router = useRouter();
  const { notify } = useNotification();

  const { filters, setFiltersPatch, resetFilters } =
    useFilters<FilterState>(EMPTY_FILTERS);
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedType, setAppliedType] = useState<string>("");

  const [items, setItems] = useState<IncomeExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const {
    open: deleteOpen,
    target: deleteTarget,
    openWith: openDeleteConfirm,
    close: closeDeleteConfirm,
  } = useConfirmDialog<DeleteCtx>();

  const {
    open: blockOpen,
    target: blockTarget,
    openWith: openBlockConfirm,
    close: closeBlockConfirm,
  } = useConfirmDialog<BlockCtx>();

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getIncomeExpenseAll();
      setItems(res ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load entries";
      setError(msg);
      notify({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void loadAll();
    getCurrentUser()
      .then((u) => setCurrentUser(u as User))
      .catch(() => setCurrentUser(null));
  }, [loadAll]);

  const updateFilter = useCallback(
    (patch: Partial<FilterState>) => {
      setFiltersPatch(patch);
    },
    [setFiltersPatch],
  );

  const handleSearch = useCallback(() => {
    setAppliedSearch(filters.search.trim().toLowerCase());
    setAppliedType(filters.type || "");
  }, [filters.search, filters.type]);

  const handleClear = useCallback(() => {
    resetFilters();
    setAppliedSearch("");
    setAppliedType("");
    setSelectedIds([]);
  }, [resetFilters]);

  const filteredItems = useMemo(() => {
    let list = items;

    if (appliedType) {
      list = list.filter(
        (row) => (row.type ?? "").toLowerCase() === appliedType,
      );
    }

    if (appliedSearch) {
      list = list.filter((row) => {
        const categoryName =
          (row.category as { categoryName?: string } | undefined)
            ?.categoryName ??
          row.category_id ??
          "";
        return categoryName.toLowerCase() === appliedSearch;
      });
    }

    return list;
  }, [appliedSearch, appliedType, items]);

  const columns = useIncomeExpenseColumns();

  const canCreate = canAccess(currentUser?.role, "income_expense", "create");
  const canEdit = canAccess(currentUser?.role, "income_expense", "update");
  const canDelete = canAccess(currentUser?.role, "income_expense", "delete");

  const handleDelete = useCallback(
    (row: IncomeExpense) => {
      openDeleteConfirm({ mode: "single", row });
    },
    [openDeleteConfirm],
  );

  const handleDeleteSelected = useCallback(() => {
    if (!selectedIds.length) return;
    openDeleteConfirm({ mode: "bulk" });
  }, [openDeleteConfirm, selectedIds.length]);

  const handleConfirmDelete = useCallback(async () => {
    const ctx = deleteTarget;
    if (!ctx) return;

    try {
      if (ctx.mode === "single") {
        await deleteIncomeExpense([getRowId(ctx.row)]);
        setSelectedIds((prev) => prev.filter((id) => id !== getRowId(ctx.row)));
        notify({ type: "danger", message: "Entry deleted successfully." });
      } else {
        await deleteIncomeExpense(selectedIds);
        setSelectedIds([]);
        notify({ type: "danger", message: "Entries deleted successfully." });
      }
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setError(msg);
      notify({ type: "error", message: msg });
    }
  }, [deleteTarget, loadAll, notify, selectedIds]);

  const handleBlockUnblock = useCallback(
    (row: IncomeExpense, action: "block" | "unblock") => {
      openBlockConfirm({ row, action });
    },
    [openBlockConfirm],
  );

  const handleConfirmBlockUnblock = useCallback(async () => {
    if (!blockTarget) return;
    const { row, action } = blockTarget;

    setError("");
    try {
      await blockUnblock("income-expense", getRowId(row), action);
      notify({
        type: "success",
        message:
          action === "block"
            ? "Entry blocked successfully."
            : "Entry unblocked successfully.",
      });
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Block/unblock failed";
      setError(msg);
      notify({ type: "error", message: msg });
    }
  }, [blockTarget, loadAll, notify]);

  const rowActions = useCallback(
    (row: IncomeExpense): DataTableAction<IncomeExpense>[] => {
      const actions: DataTableAction<IncomeExpense>[] = [];

      if (canEdit) {
        actions.push({
          label: "Edit",
          icon: <EditIcon />,
          onClick: (r) => router.push(routes.incomeExpense.edit(getRowId(r))),
        });

        const status = (
          (row as unknown as { status?: string }).status ?? "active"
        ).toLowerCase();
        if (status === "inactive") {
          actions.push({
            label: "Unblock",
            icon: <UnblockIcon />,
            onClick: (r) => handleBlockUnblock(r, "unblock"),
            color: "success",
          });
        } else {
          actions.push({
            label: "Block",
            icon: <BlockIcon />,
            onClick: (r) => handleBlockUnblock(r, "block"),
            color: "error",
          });
        }
      }

      if (canDelete) {
        actions.push({
          label: "Delete",
          icon: <DeleteIcon />,
          onClick: (r) => handleDelete(r),
          color: "error",
        });
      }

      return actions;
    },
    [canDelete, canEdit, handleBlockUnblock, handleDelete, router],
  );

  const deleteTitle =
    deleteTarget?.mode === "bulk"
      ? "Delete selected entries?"
      : "Delete entry?";
  const deleteDescription =
    deleteTarget?.mode === "bulk"
      ? `This will permanently delete ${selectedIds.length} selected entry(ies).`
      : deleteTarget?.mode === "single"
        ? `This will permanently delete this ${(deleteTarget.row.type ?? "").toUpperCase()} entry (₹${Number(deleteTarget.row.amount).toLocaleString()}).`
        : undefined;

  const blockTitle =
    blockTarget?.action === "block"
      ? "Block entry?"
      : blockTarget?.action === "unblock"
        ? "Unblock entry?"
        : undefined;

  const blockDescription = blockTarget?.row
    ? blockTarget.action === "block"
      ? `This will block this ${(blockTarget.row.type ?? "").toUpperCase()} entry (₹${Number(blockTarget.row.amount).toLocaleString()}).`
      : `This will unblock this ${(blockTarget.row.type ?? "").toUpperCase()} entry (₹${Number(blockTarget.row.amount).toLocaleString()}).`
    : undefined;

  return (
    <ModulePageLayout
      title="Income & Expense"
      subtitle="Record and manage income and expense entries."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Income & Expense" },
      ]}
      error={error}
      onErrorClose={() => setError("")}
      action={
        canCreate ? (
          <Button
            variant="contained"
            onClick={() => router.push(routes.incomeExpense.create())}
          >
            Add Entry
          </Button>
        ) : undefined
      }
    >
      <SelectionBanner
        count={selectedIds.length}
        total={filteredItems.length}
        onAction={canDelete ? handleDeleteSelected : undefined}
        onClear={() => setSelectedIds([])}
        onSelectAll={
          canDelete
            ? () => setSelectedIds(filteredItems.map(getRowId))
            : undefined
        }
      />

      <IncomeExpenseFilters
        filters={filters}
        onChange={updateFilter}
        onSearch={handleSearch}
        onClear={handleClear}
        disabled={loading}
      />

      <DataTable<IncomeExpense>
        columns={columns}
        rows={filteredItems}
        getRowId={getRowId}
        loading={loading}
        emptyMessage="No entries yet. Add one to get started."
        selectable={canDelete}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        actions={rowActions}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={closeDeleteConfirm}
        onConfirm={handleConfirmDelete}
        title={deleteTitle}
        description={deleteDescription}
        confirmLabel="Delete"
        confirmColor="error"
        pendingLabel="Deleting…"
      />

      <ConfirmDialog
        open={blockOpen}
        onClose={closeBlockConfirm}
        onConfirm={handleConfirmBlockUnblock}
        title={blockTitle}
        description={blockDescription}
        confirmLabel={blockTarget?.action === "block" ? "Block" : "Unblock"}
        confirmColor={blockTarget?.action === "block" ? "error" : "primary"}
        pendingLabel={
          blockTarget?.action === "block" ? "Blocking…" : "Unblocking…"
        }
      />
    </ModulePageLayout>
  );
}
