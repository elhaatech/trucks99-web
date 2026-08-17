"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@mui/material/Button";

import type { User, VehicleBodyType } from "@/model/api";
import { blockUnblock, deleteVehicleBodyType, getCurrentUser, getRowId, getVehicleBodyTypeAll } from "@/model/api";
import { DataTable, ConfirmDialog, ModulePageLayout, SelectionBanner, type DataTableAction } from "@/components/common";
import { ViewIcon, EditIcon, DeleteIcon, BlockIcon, UnblockIcon } from "@/components/ui/Icons";
import { routes } from "@/lib/routes";
import { useNotification } from "@/hooks/useNotification";
import { useFilters } from "@/hooks/useFilters";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { resolveApiBase } from "@/model/services/common";
import { canAccess } from "@/lib/permissions";

import type { FilterState } from "../interface/vehicleBodyTypeTypes";
import { EMPTY_FILTERS } from "../interface/vehicleBodyTypeTypes";

import { VehicleBodyTypeFilters } from "./VehicleBodyTypeFilters";
import { useVehicleBodyTypeColumns } from "./VehicleBodyTypeColumns";

type DeleteCtx = { mode: "single"; row: VehicleBodyType } | { mode: "bulk" };
type BlockCtx = { row: VehicleBodyType; action: "block" | "unblock" };

function getFileUrl(path?: string) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${resolveApiBase()}${path}`;
}

export function VehicleBodyTypesPage() {
  const router = useRouter();
  const { notify } = useNotification();

  const { filters, setFiltersPatch, resetFilters } = useFilters<FilterState>(EMPTY_FILTERS);
  const [appliedSearch, setAppliedSearch] = useState("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { open: deleteOpen, target: deleteTarget, openWith: openDeleteConfirm, close: closeDeleteConfirm } =
    useConfirmDialog<DeleteCtx>();

  const {
    open: blockOpen,
    target: blockTarget,
    openWith: openBlockConfirm,
    close: closeBlockConfirm,
  } = useConfirmDialog<BlockCtx>();

  const [items, setItems] = useState<VehicleBodyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const loadAll = useCallback(() => {
    setLoading(true);
    setError("");
    getVehicleBodyTypeAll()
      .then((res) => setItems(res ?? []))
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Failed to load vehicle body types";
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
    [setFiltersPatch]
  );

  const handleSearch = useCallback(() => {
    setAppliedSearch(filters.search.trim().toLowerCase());
  }, [filters.search]);

  const handleClear = useCallback(() => {
    resetFilters();
    setAppliedSearch("");
  }, [resetFilters]);

  const filteredItems = useMemo(() => {
    if (!appliedSearch) return items;
    return items.filter((row) => (row.vehicle_name ?? "").toLowerCase().includes(appliedSearch));
  }, [items, appliedSearch]);

  const columns = useVehicleBodyTypeColumns(getFileUrl);

  const canCreate = canAccess(currentUser?.role, "vehiclebodytype", "create");
  const canEdit = canAccess(currentUser?.role, "vehiclebodytype", "update");
  const canDelete = canAccess(currentUser?.role, "vehiclebodytype", "delete");

  const handleDelete = useCallback(
    (row: VehicleBodyType) => {
      openDeleteConfirm({ mode: "single", row });
    },
    [openDeleteConfirm]
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
        await deleteVehicleBodyType([getRowId(ctx.row)]);
        setSelectedIds((prev) => prev.filter((id) => id !== getRowId(ctx.row)));
        notify({ type: "danger", message: "Vehicle body type deleted successfully" });
      } else {
        await deleteVehicleBodyType(selectedIds);
        setSelectedIds([]);
        notify({ type: "danger", message: "Vehicle body types deleted successfully" });
      }
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setError(msg);
      notify({ type: "error", message: msg });
    }
  }, [deleteTarget, loadAll, notify, selectedIds]);

  const handleBlockUnblock = useCallback(
    (row: VehicleBodyType, action: "block" | "unblock") => {
      openBlockConfirm({ row, action });
    },
    [openBlockConfirm]
  );

  const handleConfirmBlockUnblock = useCallback(async () => {
    if (!blockTarget) return;
    const { row, action } = blockTarget;

    setError("");
    try {
      await blockUnblock("vehicle-body-type", getRowId(row), action);
      notify({
        type: "success",
        message: action === "block" ? "Vehicle body type blocked" : "Vehicle body type unblocked",
      });
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Block/unblock failed";
      setError(msg);
      notify({ type: "error", message: msg });
    }
  }, [blockTarget, loadAll, notify]);

  const rowActions = useCallback(
    (row: VehicleBodyType): DataTableAction<VehicleBodyType>[] => {
      const status = (row as unknown as { status?: string }).status || "active";

      const actions: DataTableAction<VehicleBodyType>[] = [];

      if (canEdit) {
        // actions.push({
        //   label: "View",
        //   icon: <ViewIcon />,
        //   onClick: (r) => router.push(routes.vehicleBodyType.view(getRowId(r))),
        // });
        actions.push({
          label: "Edit",
          icon: <EditIcon />,
          onClick: (r) => router.push(routes.vehicleBodyType.edit(getRowId(r))),
        });
      }

      if (canEdit) {
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
    [canDelete, canEdit, handleBlockUnblock, handleDelete, router]
  );

  const deleteTitle =
    deleteTarget?.mode === "bulk" ? "Delete selected vehicle body types?" : "Delete vehicle body type?";

  const deleteDescription =
    deleteTarget?.mode === "bulk"
      ? `This will permanently delete ${selectedIds.length} selected vehicle body type(s).`
      : deleteTarget?.mode === "single"
        ? `This will permanently delete "${deleteTarget.row.vehicle_name}".`
        : undefined;

  const blockTitle =
    blockTarget?.action === "block"
      ? "Block vehicle body type?"
      : blockTarget?.action === "unblock"
        ? "Unblock vehicle body type?"
        : undefined;

  const blockDescription =
    blockTarget && blockTarget.row
      ? blockTarget.action === "block"
        ? `This will block "${blockTarget.row.vehicle_name || getRowId(blockTarget.row)}".`
        : `This will unblock "${blockTarget.row.vehicle_name || getRowId(blockTarget.row)}".`
      : undefined;

  return (
    <ModulePageLayout
      title="Vehicle Body Types"
      subtitle="Manage vehicle body types (e.g. Open Full Body, Open Half Body)."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Vehicle Body Types" },
      ]}
      error={error}
      onErrorClose={() => setError("")}
      action={
        canCreate ? (
          <Button
            variant="contained"
            onClick={() => router.push(routes.vehicleBodyType.create())}
          >
            Add Vehicle Body Type
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

      <VehicleBodyTypeFilters filters={filters} onChange={updateFilter} onSearch={handleSearch} onClear={handleClear} />

      <DataTable<VehicleBodyType>
        columns={columns}
        rows={filteredItems}
        getRowId={getRowId}
        loading={loading}
        emptyMessage="No vehicle body types yet. Add one to get started."
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
        pendingLabel={blockTarget?.action === "block" ? "Blocking…" : "Unblocking…"}
      />
    </ModulePageLayout>
  );
}

