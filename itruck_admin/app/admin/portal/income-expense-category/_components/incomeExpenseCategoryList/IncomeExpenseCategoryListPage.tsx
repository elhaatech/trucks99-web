"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";

import type { IncomeExpenseCategory, User } from "@/model/api";
import {
  blockUnblock,
  deleteIncomeExpenseCategory,
  getCurrentUser,
  getIncomeExpenseCategoryAll,
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
  ViewIcon,
  EditIcon,
  DeleteIcon,
  BlockIcon,
  UnblockIcon,
} from "@/components/ui/Icons";

import type { FilterState } from "../interface/incomeExpenseCategoryTypes";
import { EMPTY_FILTERS } from "../interface/incomeExpenseCategoryTypes";

import { IncomeExpenseCategoryFilters } from "./IncomeExpenseCategoryFilters";
import { useIncomeExpenseCategoryColumns } from "./IncomeExpenseCategoryColumns";
import { getBlockUnblockAction } from "@/lib/blockUnblockUtils";

type DeleteCtx =
  | { mode: "single"; row: IncomeExpenseCategory }
  | { mode: "bulk" };
type BlockCtx = { row: IncomeExpenseCategory; action: "block" | "unblock" };

export function IncomeExpenseCategoryListPage() {
  const router = useRouter();
  const { notify } = useNotification();

  const { filters, setFiltersPatch, resetFilters } =
    useFilters<FilterState>(EMPTY_FILTERS);
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedType, setAppliedType] = useState<string>("");

  const [items, setItems] = useState<IncomeExpenseCategory[]>([]);
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
      const res = await getIncomeExpenseCategoryAll();
      setItems(res ?? []);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load categories";
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

    const q = appliedSearch.trim().toLowerCase();
    if (!q) return list;

    return list.filter((row) => {
      const type = (row.type ?? "").toLowerCase();
      const name = (row.categoryName ?? "").toLowerCase();
      return type.includes(q) || name.includes(q);
    });
  }, [appliedSearch, items, appliedType]);

  const columns = useIncomeExpenseCategoryColumns();

  const canCreate = canAccess(
    currentUser?.role,
    "income_expense_categories",
    "create",
  );
  const canEdit = canAccess(
    currentUser?.role,
    "income_expense_categories",
    "update",
  );
  const canView = canAccess(
    currentUser?.role,
    "income_expense_categories",
    "view",
  );
  const canDelete = canAccess(
    currentUser?.role,
    "income_expense_categories",
    "delete",
  );

  const handleDelete = useCallback(
    (row: IncomeExpenseCategory) => {
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
        await deleteIncomeExpenseCategory([getRowId(ctx.row)]);
        setSelectedIds((prev) => prev.filter((id) => id !== getRowId(ctx.row)));
        notify({ type: "danger", message: "Category deleted successfully." });
      } else {
        await deleteIncomeExpenseCategory(selectedIds);
        setSelectedIds([]);
        notify({ type: "danger", message: "Categories deleted successfully." });
      }
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setError(msg);
      notify({ type: "error", message: msg });
    }
  }, [deleteTarget, loadAll, notify, selectedIds]);

  const handleBlockUnblock = useCallback(
    (row: IncomeExpenseCategory, action: "block" | "unblock") => {
      openBlockConfirm({ row, action });
    },
    [openBlockConfirm],
  );

  const handleConfirmBlockUnblock = useCallback(async () => {
    if (!blockTarget) return;
    const { row, action } = blockTarget;

    try {
      await blockUnblock("income-expense-category", getRowId(row), action);
      const msg =
        action === "block"
          ? "Category blocked successfully."
          : "Category unblocked successfully.";
      notify({ type: "success", message: msg });
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Block/unblock failed";
      setError(msg);
      notify({ type: "error", message: msg });
    }
  }, [blockTarget, loadAll, notify, setError]);

  const rowActions = useCallback(
    (row: IncomeExpenseCategory): DataTableAction<IncomeExpenseCategory>[] => {
      const actions: DataTableAction<IncomeExpenseCategory>[] = [];

      // if (canView) {
      //   actions.push({
      //     label: "View",
      //     icon: <ViewIcon />,
      //     onClick: () => router.push(routes.incomeExpenseCategory.view(getRowId(row))),
      //   });
      // }

      if (canEdit) {
        actions.push({
          label: "Edit",
          icon: <EditIcon />,
          onClick: (r) =>
            router.push(routes.incomeExpenseCategory.edit(getRowId(r))),
        });
      }

      if (canEdit) {
        const { action, label } = getBlockUnblockAction(row.status);
        actions.push({
          label,
          icon: action === "block" ? <BlockIcon /> : <UnblockIcon />,
          onClick: (r) =>
            handleBlockUnblock(r, getBlockUnblockAction(r.status).action),
          color: action === "block" ? "error" : "success",
        });
      }

      if (canDelete) {
        actions.push({
          label: "Delete",
          icon: <DeleteIcon />,
          onClick: () => handleDelete(row),
          color: "error",
        });
      }

      return actions;
    },
    [canDelete, canEdit, canView, handleBlockUnblock, handleDelete, router],
  );

  const deleteTitle =
    deleteTarget?.mode === "bulk"
      ? "Delete selected categories?"
      : "Delete category?";
  const deleteDescription =
    deleteTarget?.mode === "bulk"
      ? `This will permanently delete ${selectedIds.length} selected category(ies).`
      : deleteTarget?.mode === "single"
        ? `This will permanently delete "${deleteTarget.row.categoryName}".`
        : undefined;

  const blockTitle =
    blockTarget?.action === "block"
      ? "Block category?"
      : blockTarget?.action === "unblock"
        ? "Unblock category?"
        : undefined;

  const blockDescription =
    blockTarget && blockTarget.row
      ? blockTarget.action === "block"
        ? `This will block "${blockTarget.row.categoryName || getRowId(blockTarget.row)}".`
        : `This will unblock "${blockTarget.row.categoryName || getRowId(blockTarget.row)}".`
      : undefined;

  return (
    <ModulePageLayout
      title="Income & Expense Categories"
      subtitle="Manage income and expense categories."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Income & Expense Categories" },
      ]}
      error={error}
      onErrorClose={() => setError("")}
      action={
        canCreate ? (
          <Button
            variant="contained"
            onClick={() => router.push(routes.incomeExpenseCategory.create())}
          >
            Add Category
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

      <IncomeExpenseCategoryFilters
        filters={filters}
        onChange={updateFilter}
        onSearch={handleSearch}
        onClear={handleClear}
        disabled={loading}
      />

      <DataTable<IncomeExpenseCategory>
        columns={columns}
        rows={filteredItems}
        getRowId={getRowId}
        loading={loading}
        emptyMessage="No categories yet. Add one to get started."
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
