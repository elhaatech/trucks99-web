"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@mui/material/Button";

import type { User, VehicleType } from "@/model/api";
import {
  blockUnblock,
  deleteVehicleType,
  getCurrentUser,
  getRowId,
  getVehicleTypeAll,
} from "@/model/api";

import { DataTable, ConfirmDialog, ModulePageLayout, SelectionBanner, type DataTableAction } from "@/components/common";
import { ViewIcon, EditIcon, DeleteIcon, BlockIcon, UnblockIcon } from "@/components/ui/Icons";
import { routes } from "@/lib/routes";
import { useNotification } from "@/hooks/useNotification";
import { useFilters } from "@/hooks/useFilters";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { canAccess } from "@/lib/permissions";

import type { FilterState } from "../interface/vehicleTypeTypes";
import { EMPTY_FILTERS } from "../interface/vehicleTypeTypes";

import { VehicleTypeFilters } from "./VehicleTypeFilters";
import { useVehicleTypeColumns } from "./VehicleTypeColumns";

import { getFileUrl } from "@/lib/fileUrl";

type DeleteCtx = { mode: "single"; row: VehicleType } | { mode: "bulk" };
type BlockCtx = { row: VehicleType; action: "block" | "unblock" };

export function VehicleTypesPage() {
  const router = useRouter();
  const { notify } = useNotification();

  const { filters, setFiltersPatch, resetFilters } = useFilters<FilterState>(EMPTY_FILTERS);

  const [appliedSearch, setAppliedSearch] = useState("");

  const [items, setItems] = useState<VehicleType[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { open: deleteOpen, target: deleteTarget, openWith: openDeleteConfirm, close: closeDeleteConfirm } =
    useConfirmDialog<DeleteCtx>();

  const {
    open: blockOpen,
    target: blockTarget,
    openWith: openBlockConfirm,
    close: closeBlockConfirm,
  } = useConfirmDialog<BlockCtx>();

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getVehicleTypeAll();
      setItems(res ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load vehicle types";
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
    [setFiltersPatch]
  );

  const handleSearch = useCallback(() => {
    setAppliedSearch(filters.search.trim().toLowerCase());
  }, [filters.search]);

  const handleClear = useCallback(() => {
    resetFilters();
    setAppliedSearch("");
    setSelectedIds([]);
  }, [resetFilters]);

  const filteredItems = useMemo(() => {
    if (!appliedSearch) return items;
    return items.filter((row) => {
      const q = appliedSearch;
      const type = (row.vehicle_type ?? "").toLowerCase();
      const desc = (row.description ?? "").toLowerCase();
      const min = (row.minimumCapacity ?? "").toLowerCase();
      const max = (row.maximumCapacity ?? "").toLowerCase();
      return type.includes(q) || desc.includes(q) || min.includes(q) || max.includes(q);
    });
  }, [items, appliedSearch]);

  const columns = useVehicleTypeColumns(getFileUrl);

const canCreate = canAccess(currentUser?.role, "vehicletype", "create");
const canEdit   = canAccess(currentUser?.role, "vehicletype", "update");
const canDelete = canAccess(currentUser?.role, "vehicletype", "delete");

  const handleDelete = useCallback(
    (row: VehicleType) => {
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
        await deleteVehicleType([getRowId(ctx.row)]);
        setSelectedIds((prev) => prev.filter((id) => id !== getRowId(ctx.row)));
        notify({ type: "danger", message: "Vehicle type deleted successfully" });
      } else {
        await deleteVehicleType(selectedIds);
        setSelectedIds([]);
        notify({ type: "danger", message: "Vehicle types deleted successfully" });
      }
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setError(msg);
      notify({ type: "error", message: msg });
    }
  }, [deleteTarget, loadAll, notify, selectedIds]);

  const handleBlockUnblock = useCallback(
    (row: VehicleType, action: "block" | "unblock") => {
      openBlockConfirm({ row, action });
    },
    [openBlockConfirm]
  );

  const handleConfirmBlockUnblock = useCallback(async () => {
    if (!blockTarget) return;
    const { row, action } = blockTarget;

    setError("");
    try {
      await blockUnblock("vehicle-type", getRowId(row), action);
      notify({ type: "success", message: action === "block" ? "Vehicle type blocked" : "Vehicle type unblocked" });
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Block/unblock failed";
      setError(msg);
      notify({ type: "error", message: msg });
    }
  }, [blockTarget, loadAll, notify]);

  const rowActions = useCallback(
    (row: VehicleType): DataTableAction<VehicleType>[] => {
      const actions: DataTableAction<VehicleType>[] = [];
      const status = (row as unknown as { status?: string }).status || "active";

      if (canEdit) {
        // actions.push({
        //   label: "View",
        //   icon: <ViewIcon />,
        //   onClick: (r) => router.push(routes.vehicleType.view(getRowId(r))),
        // });
        actions.push({
          label: "Edit",
          icon: <EditIcon />,
          onClick: (r) => router.push(routes.vehicleType.edit(getRowId(r))),
        });

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

  const deleteTitle = deleteTarget?.mode === "bulk" ? "Delete selected vehicle types?" : "Delete vehicle type?";
  const deleteDescription =
    deleteTarget?.mode === "bulk"
      ? `This will permanently delete ${selectedIds.length} selected vehicle type(s).`
      : deleteTarget?.mode === "single"
        ? `This will permanently delete "${deleteTarget.row.vehicle_type || ""}".`
        : undefined;

  const blockTitle =
    blockTarget?.action === "block"
      ? "Block vehicle type?"
      : blockTarget?.action === "unblock"
        ? "Unblock vehicle type?"
        : undefined;

  const blockDescription =
    blockTarget && blockTarget.row
      ? blockTarget.action === "block"
        ? `This will block "${blockTarget.row.vehicle_type || getRowId(blockTarget.row)}".`
        : `This will unblock "${blockTarget.row.vehicle_type || getRowId(blockTarget.row)}".`
      : undefined;

  return (
    <ModulePageLayout
      title="Vehicle Types"
      subtitle="Manage vehicle types (e.g. LCV, Container, 7-60 Tonnes)."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Vehicle Types" },
      ]}
      error={error}
      onErrorClose={() => setError("")}
      action={
        canCreate ? (
          <Button
            variant="contained"
            onClick={() => router.push(routes.vehicleType.create())}
          >
            Add Vehicle Type
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

      <VehicleTypeFilters filters={filters} onChange={updateFilter} onSearch={handleSearch} onClear={handleClear} disabled={loading} />

      <DataTable<VehicleType>
        columns={columns}
        rows={filteredItems}
        getRowId={getRowId}
        loading={loading}
        emptyMessage="No vehicle types yet. Add one to get started."
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

