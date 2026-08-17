"use client";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ModulePageLayout, SelectionBanner } from "@/components/common";
import { useDeleteConfirm } from "@/lib/hooks";
import { deleteTruck, type Truck, getRowId } from "@/model/api";
import { routes } from "@/lib/routes";
import { useToast } from "@/lib/toast";
import { useTruckData } from "../truck/list/components/useTruckData";
import { useTruckForm } from "../truck/list/components/useTruckForm";
import { useTruckColumns } from "../truck/list/components/TruckColumns";
import { TruckFilters } from "../truck/_components/truckList/TruckFilters";
import { TruckStatusDialog } from "../truck/_components/truckList/TruckStatusDialog";
import { TruckViewDialog } from "../truck/_components/truckList/TruckViewDialog";
import { TruckImagePreview } from "../truck/_components/truckList/TruckImagePreview";
import { TruckFormDialog } from "../truck/_components/truckList/TruckFormDialog";

function EditIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}
function DeleteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  );
}
function StatusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 16.17L4.83 12 3.41 13.41 9 19l12-12-1.41-1.41z" />
    </svg>
  );
}
function RouteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  );
}

function FindTruckPage() {
  const router = useRouter();
  const toast = useToast();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const {
    items,
    totalCount,
    loading,
    error,
    setError,
    users,
    vehicleTypes,
    vehicleBodyTypes,
    currentUser,
    vehicleTypeOptions,
    vehicleBodyTypeOptions,
    userOptions,
    filters,
    updateFilters,
    load,
    clearFilters,
  } = useTruckData({ page: page + 1, limit: pageSize, skipUserFilter: true }); // ← always fetch all trucks

  // ──── Filter out current user from users list for dropdown ────
  const filteredUsers = useMemo(() => {
    if (!currentUser) return [];

    const currentUserIds = [
      currentUser.id,
      currentUser._id,
      (currentUser as any).uuid,
    ].filter(Boolean);

    return (users || []).filter((user) => {
      const userId = user.id || user._id || (user as any).uuid;
      return !currentUserIds.includes(userId);
    });
  }, [users, currentUser]);

  // ──── Filter out current user's own trucks ────
  const filteredItems = useMemo(() => {
    if (!currentUser) return items;

    const currentUserIds = [
      currentUser.id,
      currentUser._id,
      (currentUser as any).uuid,
    ].filter(Boolean);

    return items.filter((truck) => {
      const truckOwnerId =
        truck.ownerId || truck.userId || truck.createdBy || (truck as any).createdByUser;

      // Exclude if truck owner matches current user (check both id and _id)
      return !currentUserIds.includes(truckOwnerId);
    });
  }, [items, currentUser]);

  const { form, set, editing, dialogOpen, setDialogOpen, handleSubmit } =
    useTruckForm(load);

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [viewingTruck, setViewingTruck] = useState<Truck | null>(null);
  const [statusTruck, setStatusTruck] = useState<Truck | null>(null);

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
    confirmOpen,
    onClose: onConfirmClose,
    handleConfirm: handleConfirmDelete,
    confirmTitle,
    confirmDescription,
    selectedIds,
    setSelectedIds,
    openConfirmSingle,
    openConfirmBulk,
  } = deleteConfirm;

  const columns = useTruckColumns({
    vehicleTypes,
    vehicleBodyTypes,
    onPreviewImage: setImagePreviewUrl,
  });

  const rowActions = useCallback(
    (row: Truck) => [
      {
        label: "Edit",
        icon: <EditIcon />,
        onClick: (r: Truck) => router.push(routes.truck.edit(getRowId(r))),
      },
      {
        label: "Status/Location",
        icon: <StatusIcon />,
        onClick: (r: Truck) => setStatusTruck(r),
      },
      {
        label: "Routes",
        icon: <RouteIcon />,
        onClick: (r: Truck) => router.push(routes.truck.route(getRowId(r))),
      },
      {
        label: "Delete",
        icon: <DeleteIcon />,
        onClick: openConfirmSingle,
        color: "error" as const,
      },
    ],
    [router, openConfirmSingle],
  );

  const handlePageChange = useCallback(
    (newPage: number) => setPage(newPage),
    [],
  );

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  }, []);

  const handleApply = useCallback(() => {
    setPage(0);
    setTimeout(() => load(), 0);
  }, [load]);

  const handleClear = useCallback(() => {
    setPage(0);
    setTimeout(() => clearFilters(), 0);
  }, [clearFilters]);

  return (
    <ModulePageLayout
      title="Find Truck"
      subtitle="Browse available trucks from other users."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Find Truck" },
      ]}
      error={error}
      onErrorClose={() => setError("")}
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
        users={filteredUsers} // ✅ Fixed: pass filtered users
        userOptions={userOptions} // ✅ Added: for user dropdown
        currentUser={currentUser} 
        showUserFilter={true}
      />

      <DataTable<Truck>
        columns={columns}
        rows={filteredItems}
        getRowId={getRowId}
        loading={loading}
        emptyMessage="No trucks found."
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

      <TruckFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editing}
        form={form}
        set={set}
        onSubmit={handleSubmit}
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

      <TruckImagePreview
        url={imagePreviewUrl}
        onClose={() => setImagePreviewUrl(null)}
      />

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

export default FindTruckPage;