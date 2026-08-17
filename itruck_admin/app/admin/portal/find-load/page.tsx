"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Load } from "@/model/api";
import { deleteLoad, getRowId } from "@/model/api";
import { DataTable, ConfirmDialog, ModulePageLayout, SelectionBanner } from "@/components/common";
import { Spinner } from "@/components/ui";
import { EditIcon, DeleteIcon } from "@/components/ui/Icons";
import { routes } from "@/lib/routes";
import { useNotification } from "@/hooks/useNotification";
import { useFilters } from "@/hooks/useFilters";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useLoadData } from "@/hooks/useLoadData";
import { useLoadMaps } from "@/hooks/useLoadMaps";
import { useLoadForm } from "@/hooks/useLoadForm";
import {
  EMPTY_FILTERS,
  type FilterState,
} from "../load/_components/interface/loadTypes";
import { useLoadColumns } from "../load/_components/loadList/LoadColumns";
import { LoadFilters } from "../load/_components/loadList/LoadFilters";
import { LoadFormDialog } from "../load/_components/loadList/LoadFormDialog";
import { LoadCancelDialog } from "../load/_components/loadList/LoadCancelDialog";
import { dropStr, pickupStr } from "@/lib/loadUtils";

type DeleteCtx = { mode: "single"; row: Load } | { mode: "bulk" };

// ── Inner component uses useSearchParams — must be inside <Suspense> ──────────
function FindLoadsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { notify } = useNotification();

  const initialFilters: FilterState = useMemo(() => {
    const dateFrom =
      searchParams.get("dateFrom") ?? EMPTY_FILTERS.dateFrom ?? "";
    const dateTo = searchParams.get("dateTo") ?? EMPTY_FILTERS.dateTo ?? "";
    const userName = searchParams.get("userName") ?? "";
    const loadNumber = searchParams.get("loadNumber") ?? "";
    const userIdParam = searchParams.get("userId") ?? "";
    const userIds = userIdParam ? [userIdParam] : ([] as string[]);
    return {
      ...EMPTY_FILTERS,
      dateFrom,
      dateTo,
      userIds,
      userName,
      loadNumber,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { filters, setFiltersPatch, resetFilters } = useFilters(initialFilters);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const {
    open: deleteOpen,
    target: deleteTarget,
    openWith: openDeleteConfirm,
    close: closeDeleteConfirm,
  } = useConfirmDialog<DeleteCtx>();

  const {
    loading,
    error,
    setError,
    rawItems,
    totalCount,
    vehicleTypes,
    vehicleBodyTypes,
    materials,
    users,
    currentUser,
    loadAll,
    syncListState,
  } = useLoadData({ page: page + 1, limit: pageSize, skipUserFilter: true });

  // ──── Filter out current user from users list for dropdown ────
  const filteredUsers = useMemo(() => {
    if (!currentUser) return users;

    const currentUserIds = [currentUser.id, currentUser._id].filter(Boolean);

    return users.filter((user) => !currentUserIds.includes(user.id));
  }, [users, currentUser]);

  // ──── Filter out current user's own loads ────
  const filteredItems = useMemo(() => {
    if (!currentUser) return rawItems;

    const currentUserIds = [currentUser.id, currentUser._id].filter(Boolean);

    return rawItems.filter((load) => {
      const loadOwnerId = load.ownerId || load.userId || load.createdBy;

      // Exclude if load owner matches current user (check both id and _id)
      return !currentUserIds.includes(loadOwnerId);
    });
  }, [rawItems, currentUser]);

  const maps = useLoadMaps(
    filteredUsers,
    materials,
    vehicleTypes,
    vehicleBodyTypes,
  );

  const {
    form,
    set,
    editing,
    dialogOpen,
    setDialogOpen,
    cancelDialogOpen,
    setCancelDialogOpen,
    cancelReason,
    setCancelReason,
    openCancel,
    handleSubmit,
    handleCancelSubmit,
  } = useLoadForm(maps.usersMap, null, loadAll);

  useEffect(() => {
    syncListState({ filters, page: page + 1, pageSize });
  }, [filters, page, pageSize, syncListState]);

  const updateFilter = useCallback(
    (patch: Partial<FilterState>) => setFiltersPatch(patch),
    [setFiltersPatch],
  );

  const handleClear = useCallback(() => {
    const cleared = { ...EMPTY_FILTERS };
    resetFilters();
    setFiltersPatch(cleared);
    setPage(0);
    syncListState({ filters: cleared, page: 1, pageSize });
    loadAll(cleared);
    router.replace(pathname);
  }, [loadAll, pathname, resetFilters, setFiltersPatch, syncListState, pageSize, router]);

  const handleSearch = useCallback(() => {
    setPage(0);
    syncListState({ filters, page: 1, pageSize });
    loadAll(filters);
  }, [filters, pageSize, syncListState, loadAll]);

  const uniquePickupAddresses = useMemo(() => {
    const s = new Set<string>();
    filteredItems.forEach((l) => {
      const a = (l.pickupLocation?.address || (l as any).origin || "").trim();
      if (a) s.add(a);
    });
    return Array.from(s).sort();
  }, [filteredItems]);

  const uniqueDropAddresses = useMemo(() => {
    const s = new Set<string>();
    filteredItems.forEach((l) => {
      const a = (
        l.dropLocation?.address ||
        (l as any).destination ||
        ""
      ).trim();
      if (a) s.add(a);
    });
    return Array.from(s).sort();
  }, [filteredItems]);

  const uniqueLoadNumbers = useMemo(() => {
    const s = new Set<string>();
    filteredItems.forEach((l) => {
      if (l.loadNumber) s.add(l.loadNumber);
    });
    return Array.from(s).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""), 10);
      const numB = parseInt(b.replace(/\D/g, ""), 10);
      return isNaN(numA) || isNaN(numB) ? a.localeCompare(b) : numA - numB;
    });
  }, [filteredItems]);

  const columns = useLoadColumns(maps);

  const handleDelete = useCallback(
    (row: Load) => openDeleteConfirm({ mode: "single", row }),
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
        await deleteLoad([getRowId(ctx.row)]);
        notify({ type: "danger", message: "Load deleted." });
      } else {
        await deleteLoad(selectedIds);
        setSelectedIds([]);
        notify({ type: "danger", message: "Loads deleted." });
      }
      loadAll();
    } catch (err) {
      const m = err instanceof Error ? err.message : "Delete failed";
      setError(m);
      notify({ type: "error", message: m });
    }
  }, [deleteTarget, selectedIds, loadAll, setError, notify]);

  const handlePageChange = useCallback(
    (newPage: number) => setPage(newPage),
    [],
  );
  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  }, []);

  const rowActions = useCallback(
    (row: Load) => [
      {
        label: "Edit",
        icon: <EditIcon />,
        onClick: (r: Load) => router.push(routes.load.edit(getRowId(r))),
      },
      {
        label: "Delete",
        icon: <DeleteIcon />,
        onClick: handleDelete,
        color: "error" as const,
      },
    ],
    [router, handleDelete],
  );

  const deleteTitle =
    deleteTarget?.mode === "bulk" ? "Delete selected loads?" : "Delete load?";
  const deleteDescription =
    deleteTarget?.mode === "bulk"
      ? `Permanently delete ${selectedIds.length} load(s).`
      : deleteTarget?.mode === "single"
        ? `Delete "${pickupStr(deleteTarget.row)} → ${dropStr(deleteTarget.row)}"?`
        : undefined;

  return (
    <ModulePageLayout
      title="Find Load"
      subtitle="Browse available loads from other users."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Find Load" },
      ]}
      error={error}
      onErrorClose={() => setError("")}
    >
      <SelectionBanner
        count={selectedIds.length}
        onAction={handleDeleteSelected}
        onClear={() => setSelectedIds([])}
      />

      <LoadFilters
        filters={filters}
        onChange={updateFilter}
        onSearch={handleSearch}
        onClear={handleClear}
        users={filteredUsers}
        vehicleTypes={vehicleTypes}
        vehicleBodyTypes={vehicleBodyTypes}
        uniquePickupAddresses={uniquePickupAddresses}
        uniqueDropAddresses={uniqueDropAddresses}
        loadNumbers={uniqueLoadNumbers}
        showUserFilter={true}
      />

      <DataTable<Load>
        columns={columns}
        rows={filteredItems}
        getRowId={getRowId}
        loading={loading}
        emptyMessage="No loads found."
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        // actions={rowActions}
        totalCount={filteredItems.length}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      <LoadFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editing}
        form={form}
        set={set}
        onSubmit={handleSubmit}
        users={filteredUsers}
        materials={materials}
        vehicleTypes={vehicleTypes}
        vehicleBodyTypes={vehicleBodyTypes}
        currentUser={currentUser}
      />

      <LoadCancelDialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        reason={cancelReason}
        onReasonChange={setCancelReason}
        onSubmit={handleCancelSubmit}
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
    </ModulePageLayout>
  );
}

// ── Page export — wraps inner in Suspense (required for useSearchParams) ──────
export default function FindLoadsPage() {
  return (
    <Suspense
      fallback={
        <ModulePageLayout title="Find Load" subtitle="Loading…" showAds={false}>
          <Spinner label="Loading loads…" />
        </ModulePageLayout>
      }
    >
      <FindLoadsInner />
    </Suspense>
  );
}
