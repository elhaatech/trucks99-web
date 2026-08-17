"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";

import type { User } from "@/model/api";
import {
  blockUnblock,
  deleteMaterial,
  getCurrentUser,
  getMaterialAll,
  getRowId,
  type Material as MaterialT,
} from "@/model/api";
import {
  DataTable,
  ConfirmDialog,
  ModulePageLayout,
  SelectionBanner,
} from "@/components/common";
import {
  ViewIcon,
  EditIcon,
  DeleteIcon,
  BlockIcon,
  UnblockIcon,
} from "@/components/ui/Icons";
import { routes } from "@/lib/routes";
import { useNotification } from "@/hooks/useNotification";
import { useFilters } from "@/hooks/useFilters";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { MaterialFilters } from "./MaterialFilters";
import { useMaterialColumns } from "./MaterialColumns";
import type { FilterState } from "../interface/materialTypes";
import { EMPTY_FILTERS } from "../interface/materialTypes";
import { canAccess } from "@/lib/permissions";
import type { DataTableAction } from "@/components/common/DataTable";

type DeleteCtx = { mode: "single"; row: MaterialT } | { mode: "bulk" };
type BlockCtx = { row: MaterialT; action: "block" | "unblock" };

export function MaterialsPage() {
  const router = useRouter();
  const { notify } = useNotification();

  const { filters, setFiltersPatch, resetFilters } = useFilters(EMPTY_FILTERS);
  const [appliedSearch, setAppliedSearch] = useState("");
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

  const [items, setItems] = useState<MaterialT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const loadAll = useCallback(() => {
    setLoading(true);
    setError("");
    return getMaterialAll()
      .then((res) => setItems(res ?? []))
      .catch((err) => {
        const msg =
          err instanceof Error ? err.message : "Failed to load materials";
        setError(msg);
        notify({ type: "error", message: msg });
      })
      .finally(() => setLoading(false));
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

  const handleClear = useCallback(() => {
    resetFilters();
    setAppliedSearch("");
    setSelectedIds([]);
  }, [resetFilters]);

  const handleSearch = useCallback(() => {
    setAppliedSearch(filters.search.trim().toLowerCase());
  }, [filters.search]);

  const filteredItems = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter((m) => {
      const type = (m.materials_type ?? "").toLowerCase();
      return type.includes(q);
    });
  }, [items, appliedSearch]);

  const columns = useMaterialColumns();

  // ✅ After
  const canCreate = canAccess(currentUser?.role, "materials", "create");
  const canEdit = canAccess(currentUser?.role, "materials", "update"); // "edit" not "update"
  const canDelete = canAccess(currentUser?.role, "materials", "delete");

  const handleDelete = useCallback(
    (row: MaterialT) => {
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
        await deleteMaterial([getRowId(ctx.row)]);
        notify({ type: "danger", message: "Material deleted." });
      } else {
        await deleteMaterial(selectedIds);
        setSelectedIds([]);
        notify({ type: "danger", message: "Materials deleted." });
      }
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setError(msg);
      notify({ type: "error", message: msg });
    }
  }, [deleteTarget, loadAll, notify, selectedIds]);

  const handleBlockUnblock = useCallback(
    (row: MaterialT, action: "block" | "unblock") => {
      openBlockConfirm({ row, action });
    },
    [openBlockConfirm],
  );

  const handleConfirmBlockUnblock = useCallback(async () => {
    if (!blockTarget) return;
    const { row, action } = blockTarget;

    setError("");
    try {
      await blockUnblock("material", getRowId(row), action);
      notify({
        type: "success",
        message:
          action === "block"
            ? "Material blocked successfully."
            : "Material unblocked successfully.",
      });
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Block/unblock failed";
      setError(msg);
      notify({ type: "error", message: msg });
    }
  }, [blockTarget, loadAll, notify]);

  const rowActions = useCallback(
    (row: MaterialT): DataTableAction<MaterialT>[] => {
      const status = (
        (row as unknown as { status?: string }).status ?? "active"
      ).toLowerCase();

      return [
        ...(canEdit
          ? [
              // { label: "View", icon: <ViewIcon />, onClick: (r: MaterialT) => router.push(routes.material.view(getRowId(r))) },
              {
                label: "Edit",
                icon: <EditIcon />,
                onClick: (r: MaterialT) =>
                  router.push(routes.material.edit(getRowId(r))),
              },
              ...(status === "inactive"
                ? [
                    {
                      label: "Unblock",
                      icon: <UnblockIcon />,
                      onClick: (r: MaterialT) =>
                        handleBlockUnblock(r, "unblock"),
                      color: "success" as const,
                    },
                  ]
                : [
                    {
                      label: "Block",
                      icon: <BlockIcon />,
                      onClick: (r: MaterialT) => handleBlockUnblock(r, "block"),
                      color: "error" as const,
                    },
                  ]),
            ]
          : []),
        ...(canDelete
          ? [
              {
                label: "Delete",
                icon: <DeleteIcon />,
                onClick: (r: MaterialT) => handleDelete(r),
                color: "error" as const,
              },
            ]
          : []),
      ];
    },
    [canDelete, canEdit, handleBlockUnblock, handleDelete, router],
  );

  const deleteTitle =
    deleteTarget?.mode === "bulk"
      ? "Delete selected materials?"
      : "Delete material?";
  const deleteDescription =
    deleteTarget?.mode === "bulk"
      ? `Permanently delete ${selectedIds.length} material(s).`
      : deleteTarget?.mode === "single"
        ? `This will permanently delete "${deleteTarget.row.materials_type || getRowId(deleteTarget.row)}".`
        : undefined;

  const blockTitle =
    blockTarget?.action === "block"
      ? "Block material?"
      : blockTarget?.action === "unblock"
        ? "Unblock material?"
        : undefined;

  const blockDescription =
    blockTarget && blockTarget.row
      ? blockTarget.action === "block"
        ? `This will block "${blockTarget.row.materials_type || getRowId(blockTarget.row)}".`
        : `This will unblock "${blockTarget.row.materials_type || getRowId(blockTarget.row)}".`
      : undefined;

  return (
    <ModulePageLayout
      title="Materials"
      subtitle="Manage material types."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Materials" },
      ]}
      error={error}
      onErrorClose={() => setError("")}
      action={
        canCreate ? (
          <Button
            variant="contained"
            onClick={() => router.push(routes.material.create())}
          >
            Add Material
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

      <MaterialFilters
        filters={filters}
        onChange={updateFilter}
        onSearch={handleSearch}
        onClear={handleClear}
      />

      <DataTable<MaterialT>
        columns={columns}
        rows={filteredItems}
        getRowId={getRowId}
        loading={loading}
        emptyMessage="No materials yet. Add one to get started."
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
