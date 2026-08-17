"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
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
import { CMSPage, deleteCMSPage, EMPTY_FILTERS, FilterState, getCMSPageAll, updateCMSPage } from "@/model/services/cms";
import { getCurrentUser, User } from "@/model/services/user";
import { useCMSColumns } from "./cmsColumns";
import { getRowId } from "@/model/api";
import { CMSFilters } from "./cmsFilters";

type DeleteCtx = { mode: "single"; row: CMSPage } | { mode: "bulk" };
type BlockCtx = { row: CMSPage; action: "block" | "unblock" };

export function CMSListPage() {
  const router = useRouter();
  const { notify } = useNotification();

  const { filters, setFiltersPatch, resetFilters } =
    useFilters<FilterState>(EMPTY_FILTERS);
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");

  const [items, setItems] = useState<CMSPage[]>([]);
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
      const res = await getCMSPageAll();
      setItems(res ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load pages";
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
    (patch: Partial<FilterState>) => setFiltersPatch(patch),
    [setFiltersPatch],
  );

  const handleSearch = useCallback(() => {
    setAppliedSearch(filters.search.trim().toLowerCase());
    setAppliedStatus(filters.status || "");
  }, [filters.search, filters.status]);

  const handleClear = useCallback(() => {
    resetFilters();
    setAppliedSearch("");
    setAppliedStatus("");
    setSelectedIds([]);
  }, [resetFilters]);

  const filteredItems = useMemo(() => {
    let list = items;

    if (appliedStatus) {
      list = list.filter(
        (row) => (row.status ?? "active").toLowerCase() === appliedStatus,
      );
    }

    if (appliedSearch) {
      list = list.filter(
        (row) =>
          row.page_title.toLowerCase().includes(appliedSearch) ||
          row.slug.toLowerCase().includes(appliedSearch),
      );
    }

    return list;
  }, [appliedSearch, appliedStatus, items]);

  const columns = useCMSColumns();

  const canCreate = canAccess(currentUser?.role, "cms", "create");
  const canEdit = canAccess(currentUser?.role, "cms", "update");
  const canDelete = canAccess(currentUser?.role, "cms", "delete");

  const handleDelete = useCallback(
    (row: CMSPage) => openDeleteConfirm({ mode: "single", row }),
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
        await deleteCMSPage([getRowId(ctx.row)]);
        setSelectedIds((prev) =>
          prev.filter((id) => id !== getRowId(ctx.row)),
        );
        notify({ type: "danger", message: "CMS page deleted successfully." });
      } else {
        await deleteCMSPage(selectedIds);
        setSelectedIds([]);
        notify({ type: "danger", message: "CMS pages deleted successfully." });
      }
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setError(msg);
      notify({ type: "error", message: msg });
    }
  }, [deleteTarget, loadAll, notify, selectedIds]);

  const handleBlockUnblock = useCallback(
    (row: CMSPage, action: "block" | "unblock") =>
      openBlockConfirm({ row, action }),
    [openBlockConfirm],
  );

  const handleConfirmBlockUnblock = useCallback(async () => {
    if (!blockTarget) return;
    const { row, action } = blockTarget;

    setError("");
    try {
      await updateCMSPage(getRowId(row), {
        status: action === "block" ? "inactive" : "active",
      });
      notify({
        type: "success",
        message:
          action === "block"
            ? "Page blocked successfully."
            : "Page unblocked successfully.",
      });
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Block/unblock failed";
      setError(msg);
      notify({ type: "error", message: msg });
    }
  }, [blockTarget, loadAll, notify]);

  const rowActions = useCallback(
    (row: CMSPage): DataTableAction<CMSPage>[] => {
      const actions: DataTableAction<CMSPage>[] = [];

      if (canEdit) {
        actions.push({
          label: "Edit",
          icon: <EditIcon />,
          onClick: (r) => router.push(routes.cms.edit(getRowId(r))),
        });

        const status = (row.status ?? "active").toLowerCase();
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
    deleteTarget?.mode === "bulk" ? "Delete selected pages?" : "Delete page?";
  const deleteDescription =
    deleteTarget?.mode === "bulk"
      ? `This will permanently delete ${selectedIds.length} selected page(s).`
      : deleteTarget?.mode === "single"
        ? `This will permanently delete "${deleteTarget.row.page_title}".`
        : undefined;

  const blockTitle =
    blockTarget?.action === "block"
      ? "Block page?"
      : blockTarget?.action === "unblock"
        ? "Unblock page?"
        : undefined;

  const blockDescription = blockTarget?.row
    ? blockTarget.action === "block"
      ? `This will block "${blockTarget.row.page_title}".`
      : `This will unblock "${blockTarget.row.page_title}".`
    : undefined;

  return (
    <ModulePageLayout
      title="CMS Pages"
      subtitle="Create and manage static content pages."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "CMS Pages" },
      ]}
      error={error}
      onErrorClose={() => setError("")}
      action={
        canCreate ? (
          <Button variant="contained" onClick={() => router.push(routes.cms.create())}>
            Add Page
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

      <CMSFilters
        filters={filters}
        onChange={updateFilter}
        onSearch={handleSearch}
        onClear={handleClear}
        disabled={loading}
      />

      <DataTable<CMSPage>
        columns={columns}
        rows={filteredItems}
        getRowId={getRowId}
        loading={loading}
        emptyMessage="No CMS pages yet. Add one to get started."
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
