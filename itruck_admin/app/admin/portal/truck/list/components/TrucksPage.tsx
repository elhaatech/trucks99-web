// app/(dashboard)/trucks/_components/TrucksPage.tsx
"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import { DataTable } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ModulePageLayout, SelectionBanner } from "@/components/common";
import { useDeleteConfirm } from "@/lib/hooks";
import { deleteTruck, type Truck, getRowId } from "@/model/api";
import { routes } from "@/lib/routes";
import { useToast } from "@/lib/toast";

import { useTruckData } from "./useTruckData";
import { useTruckForm } from "./useTruckForm";
import { useTruckColumns } from "./TruckColumns";
import { TruckFilters } from "./TruckFilters";
import { TruckFormDialog } from "./TruckFormDialog";
import { TruckStatusDialog } from "./TruckStatusDialog";
import { TruckViewDialog } from "./TruckViewDialog";
import { TruckImagePreview } from "./TruckImagePreview";

// ── Icons ──────────────────────────────────────────────────────────────────────
function EditIcon()   { return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>; }
function DeleteIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>; }
function StatusIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12 3.41 13.41 9 19l12-12-1.41-1.41z"/></svg>; }
function RouteIcon()  { return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>; }

export function TrucksPage() {
  const router = useRouter();
  const toast  = useToast();

  // ── Pagination state (0-based to match MUI; hook receives page+1) ──────────
  const [page,     setPage]     = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Pass 1-based page to the hook. When page/pageSize change, the hook's
  // useEffect([page, limit]) fires automatically and re-fetches.
  const {
    items, totalCount, loading, error, setError,
    vehicleTypes, vehicleBodyTypes, currentUser,
    vehicleTypeOptions, vehicleBodyTypeOptions,
    filters, updateFilters,
    userOptions,
    load, clearFilters,
  } = useTruckData({ page: page + 1, limit: pageSize , skipUserFilter: false });

  // ── Determine if user filter should be shown (only for admins) ──────────────
  const showUserFilter = currentUser?.role?.status === "admin";

  const { form, set, editing, dialogOpen, setDialogOpen, handleSubmit } =
    useTruckForm(load);

  // ── Dialogs ────────────────────────────────────────────────────────────────
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [viewingTruck,    setViewingTruck]    = useState<Truck | null>(null);
  const [statusTruck,     setStatusTruck]     = useState<Truck | null>(null);

  // ── Delete confirm ─────────────────────────────────────────────────────────
  const deleteConfirm = useDeleteConfirm<Truck>({
    onDeleteSingle: async (row) => {
      try {
        await deleteTruck([getRowId(row)]);
        toast.danger("Truck deleted successfully");
        load();
      } catch (err) {
        const m = err instanceof Error ? err.message : "Delete failed";
        setError(m);
        toast.error(m);
      }
    },
    onDeleteBulk: async (ids) => {
      try {
        await deleteTruck(ids);
        toast.danger("Trucks deleted successfully");
        load();
      } catch (err) {
        const m = err instanceof Error ? err.message : "Delete failed";
        setError(m);
        toast.error(m);
      }
    },
    getRowId,
    getLabel: (t) => t.vehicleNumber || t.registrationNumber || getRowId(t),
  });

  const {
    confirmOpen, onClose: onConfirmClose, handleConfirm: handleConfirmDelete,
    confirmTitle, confirmDescription, selectedIds, setSelectedIds,
    openConfirmSingle, openConfirmBulk,
  } = deleteConfirm;

  const columns = useTruckColumns({
    vehicleTypes,
    vehicleBodyTypes,
    onPreviewImage: setImagePreviewUrl,
  });

  const rowActions = useCallback(
    (row: Truck) => [
      { label: "Edit",            icon: <EditIcon />,   onClick: (r: Truck) => router.push(routes.truck.edit(getRowId(r))) },
      { label: "Status/Location", icon: <StatusIcon />, onClick: (r: Truck) => setStatusTruck(r) },
      { label: "Routes",          icon: <RouteIcon />,  onClick: (r: Truck) => router.push(routes.truck.route(getRowId(r))) },
      { label: "Delete",          icon: <DeleteIcon />, onClick: openConfirmSingle, color: "error" as const },
    ],
    [router, openConfirmSingle]
  );

  // ── Pagination handlers ─────────────────────────────────────────────────────
  // Updating page/pageSize state causes re-render → hook receives new props →
  // hook's useEffect([page, limit]) fires → API called with new page/limit.
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(0); // reset to first page whenever page size changes
  }, []);

  // ── Filter apply / clear ───────────────────────────────────────────────────
  // Reset to page 0 first so the hook's useEffect fires with page=1.
  // Then call load() so it immediately re-fetches with the updated filters
  // (the useEffect won't fire again since page didn't change from 0 to 0).
  const handleApply = useCallback(() => {
    setPage(0);
    // Give React one tick to propagate the new page into the hook's ref
    // before calling load(), so pageRef.current === 1 when buildPayload runs.
    setTimeout(() => load(), 0);
  }, [load]);

  const handleClear = useCallback(() => {
    setPage(0);
    setTimeout(() => clearFilters(), 0);
  }, [clearFilters]);

  return (
    <ModulePageLayout
      title="Trucks"
      subtitle="Manage trucks, capacity, and vehicle owner."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Trucks" },
      ]}
      error={error}
      onErrorClose={() => setError("")}
      action={
        <Button
          variant="contained"
          color="primary"
          onClick={() => router.push(routes.truck.create())}
        >
          Add Truck
        </Button>
      }
    >
      <SelectionBanner
        count={selectedIds.length}
        onAction={openConfirmBulk}
        onClear={() => setSelectedIds([])}
      />

      <TruckFilters
        filters={filters}
        onChange={updateFilters}
        onApply={handleApply}
        onClear={handleClear}
        vehicleTypeOptions={vehicleTypeOptions}
        vehicleBodyTypeOptions={vehicleBodyTypeOptions}
        showUserFilter={showUserFilter}
        userOptions={userOptions}
      />

      <DataTable<Truck>
        columns={columns}
        rows={items}
        getRowId={getRowId}
        loading={loading}
        emptyMessage="No trucks yet. Add one to get started."
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        actions={rowActions}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      <TruckFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editing}
        form={form}
        set={set}
        onSubmit={handleSubmit}
        currentUser={currentUser}
        vehicleTypeOptions={vehicleTypeOptions}
        vehicleBodyTypeOptions={vehicleBodyTypeOptions}
      />

      <TruckStatusDialog
        truck={statusTruck}
        onClose={() => setStatusTruck(null)}
        onSuccess={load}
        onError={setError}
      />

      <TruckViewDialog
        truck={viewingTruck}
        onClose={() => setViewingTruck(null)}
        vehicleTypes={vehicleTypes}
        vehicleBodyTypes={vehicleBodyTypes}
      />

      <TruckImagePreview url={imagePreviewUrl} onClose={() => setImagePreviewUrl(null)} />

      <ConfirmDialog
        open={confirmOpen}
        onClose={onConfirmClose}
        onConfirm={handleConfirmDelete}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel="Delete"
        confirmColor="error"
      />
    </ModulePageLayout>
  );
}