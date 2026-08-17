"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Button from "@mui/material/Button";
import type { Load } from "@/model/api";
import { deleteLoad, getRowId } from "@/model/api";
import { DataTable, ConfirmDialog, ModulePageLayout, SelectionBanner } from "@/components/common";
import { routes } from "@/lib/routes";
import { ViewIcon, EditIcon, DeleteIcon } from "@/components/ui/Icons";
import { ROUTES } from "@/lib/routes";
import { loadListState, usePersistListState } from "@/lib/navigation";
import { useNotification } from "@/hooks/useNotification";
import { useFilters } from "@/hooks/useFilters";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useLoadData } from "@/hooks/useLoadData";
import { useLoadMaps } from "@/hooks/useLoadMaps";
import { useLoadForm } from "@/hooks/useLoadForm";
import { EMPTY_FILTERS, type FilterState } from "../interface/loadTypes";
import { useLoadColumns } from "./LoadColumns";
import { LoadFilters } from "./LoadFilters";
import { LoadFormDialog } from "./LoadFormDialog";
import { LoadCancelDialog } from "./LoadCancelDialog";
import { dropStr, pickupStr } from "@/lib/loadUtils";

type DeleteCtx = { mode: "single"; row: Load } | { mode: "bulk" };

function RepostLabel() {
  return (
    <span style={{ color: "#d32f2f", fontSize: 12, fontWeight: 600 }}>
      Repost
    </span>
  );
}

function CancelLabel() {
  return (
    <span style={{ color: "#d32f2f", fontSize: 12, fontWeight: 600 }}>
      Cancel
    </span>
  );
}

export function LoadsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const listStorageKey = pathname + (searchParams.toString() ? `?${searchParams}` : "");
  const { notify } = useNotification();

  // ── Read optional filters injected via URL params ──────────────────────────
  // ?dateFrom / ?dateTo  → from Dashboard "Loads created (7 days)" card
  // ?userId              → from User view page "View All Loads" button (mongo ID for API)
  // ?userName            → pre-fills the User name text input so the user sees who is filtered

  const initialFilters: FilterState = useMemo(() => {
    const saved = loadListState<{
      filters: FilterState;
      page: number;
      pageSize: number;
    }>(listStorageKey);

    if (saved?.filters) {
      return saved.filters;
    }

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
  }, []); // intentionally run only on mount so the user can freely edit filters afterward

  const savedListState = loadListState<{
    filters: FilterState;
    page: number;
    pageSize: number;
  }>(listStorageKey);

  const { filters, setFiltersPatch, resetFilters } = useFilters(initialFilters);

  // ── Server-side pagination state (0-based page index to match MUI) ─────────
  const [page, setPage] = useState(savedListState?.page ?? 0);
  const [pageSize, setPageSize] = useState(savedListState?.pageSize ?? 10);

  usePersistListState({ filters, page, pageSize });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const {
    open: deleteOpen,
    target: deleteTarget,
    openWith: openDeleteConfirm,
    close: closeDeleteConfirm,
  } = useConfirmDialog<DeleteCtx>();

  // Pass page/pageSize into useLoadData (API expects 1-based page)
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
  } = useLoadData({ page: page + 1, limit: pageSize, skipUserFilter: false });

  // ── Determine if user filter should be shown (only for admins) ──────────────
  const showUserFilter = currentUser?.role?.status === "admin";

  const maps = useLoadMaps(users, materials, vehicleTypes, vehicleBodyTypes,  currentUser ?? undefined  // ← Convert null to undefined
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
    openCreate,
    openEdit,
    openCancel,
    handleSubmit,
    handleCancelSubmit,
  } = useLoadForm(maps.usersMap, currentUser, loadAll);

  // Re-fetch whenever page or pageSize changes
  useEffect(() => {
    syncListState({ filters, page: page + 1, pageSize });
  }, [filters, page, pageSize, syncListState]);

  // ── Filter handlers ────────────────────────────────────────────────────────
  const updateFilter = useCallback(
    (patch: Partial<FilterState>) => setFiltersPatch(patch),
    [setFiltersPatch],
  );
  const handleClear = useCallback(() => {
    const cleared = { ...EMPTY_FILTERS };
    resetFilters();
    setFiltersPatch(cleared); // ← force override to truly empty state
    setPage(0);
    syncListState({ filters: cleared, page: 1, pageSize });
    loadAll(cleared);

    // Clear URL params
    router.replace(pathname);
  }, [loadAll, pathname, resetFilters, setFiltersPatch, syncListState, pageSize, router]);

  const handleSearch = useCallback(() => {
    setPage(0); // reset to first page on new search
    // sync FIRST so listStateRef has the latest filters before loadAll reads them
    syncListState({ filters, page: 1, pageSize });
    loadAll(filters); // also pass filters directly as overrides to guarantee freshness
  }, [filters, pageSize, syncListState, loadAll]);

  // ── Derived address lists (from current page items) ───────────────────────
  const uniquePickupAddresses = useMemo(() => {
    const s = new Set<string>();
    rawItems.forEach((l) => {
      const a = (
        l.pickupLocation?.address ||
        (l as { origin?: string }).origin ||
        ""
      ).trim();
      if (a) s.add(a);
    });
    return Array.from(s).sort();
  }, [rawItems]);

  const uniqueDropAddresses = useMemo(() => {
    const s = new Set<string>();
    rawItems.forEach((l) => {
      const a = (
        l.dropLocation?.address ||
        (l as { destination?: string }).destination ||
        ""
      ).trim();
      if (a) s.add(a);
    });
    return Array.from(s).sort();
  }, [rawItems]);

  // Derive sorted unique load numbers from current page for dropdown suggestions
  const uniqueLoadNumbers = useMemo(() => {
    const s = new Set<string>();
    rawItems.forEach((l) => {
      if (l.loadNumber) s.add(l.loadNumber);
    });
    return Array.from(s).sort((a, b) => {
      // Sort numerically: L001 < L002 < L010
      const numA = parseInt(a.replace(/\D/g, ""), 10);
      const numB = parseInt(b.replace(/\D/g, ""), 10);
      return isNaN(numA) || isNaN(numB) ? a.localeCompare(b) : numA - numB;
    });
  }, [rawItems]);

  const columns = useLoadColumns(maps);

  // ── Delete handlers ────────────────────────────────────────────────────────
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

  // ── Pagination handlers ────────────────────────────────────────────────────
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  }, []);

  // ── Row actions ────────────────────────────────────────────────────────────
  const rowActions = useCallback(
    (row: Load) => [
      {
        label: "Edit",
        icon: <EditIcon />,
        onClick: (r: Load) => router.push(ROUTES.load.edit(getRowId(r))),
      },
      ...(row.rejectReason?.trim()
        ? [
            // {
            //   label: "Repost",
            //   icon: <RepostLabel />,
            //   onClick: (r: Load) =>
            //     router.push(`${ROUTES.load.create}?from=${encodeURIComponent(getRowId(r))}`),
            //   color: "error" as const,
            // },
            {
              label: "Delete",
              icon: <DeleteIcon />,
              onClick: handleDelete,
              color: "error" as const,
            },
          ]
        : [
            // { label: "Cancel", icon: <CancelLabel />, onClick: openCancel, color: "error" as const },
            {
              label: "Delete",
              icon: <DeleteIcon />,
              onClick: handleDelete,
              color: "error" as const,
            },
          ]),
    ],
    [router, handleDelete, openCancel],
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
      title="Load"
      subtitle="Create, edit, and delete loads."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Load" },
      ]}
      error={error}
      onErrorClose={() => setError("")}
      action={
        <Button
          variant="contained"
          color="primary"
          onClick={() => router.push(ROUTES.load.create)}
        >
          Add Load
        </Button>
      }
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
        users={users}
        vehicleTypes={vehicleTypes}
        vehicleBodyTypes={vehicleBodyTypes}
        uniquePickupAddresses={uniquePickupAddresses}
        uniqueDropAddresses={uniqueDropAddresses}
        loadNumbers={uniqueLoadNumbers}
        showUserFilter={showUserFilter}
      />

      <DataTable<Load>
        columns={columns}
        rows={rawItems}
        getRowId={getRowId}
        loading={loading}
        emptyMessage="No loads yet."
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        actions={rowActions}
        // server-side pagination props ↓
        totalCount={totalCount}
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
        users={users}
        materials={materials}
        vehicleTypes={vehicleTypes}
        vehicleBodyTypes={vehicleBodyTypes}
        currentUser={currentUser}
        // ← add this
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