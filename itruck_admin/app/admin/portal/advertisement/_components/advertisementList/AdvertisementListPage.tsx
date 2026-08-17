"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";

import type { Advertisement, User } from "@/model/api";
import {
  deleteAdvertisement,
  getAdvertisements,
  getCurrentUser,
  getRowId,
  updateAdvertisementStatus,
} from "@/model/api";
import { canModuleAction } from "@/lib/permissions";
import { routes } from "@/lib/routes";
import { useNotification } from "@/hooks/useNotification";
import { useFilters } from "@/hooks/useFilters";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

import {
  DataTable,
  ConfirmDialog,
  ModulePageLayout,
  type DataTableAction,
} from "@/components/common";
import {
  ViewIcon,
  EditIcon,
  DeleteIcon,
  BlockIcon,
  UnblockIcon,
} from "@/components/ui/Icons";

import type { FilterState } from "../interface/advertisementTypes";
import { EMPTY_FILTERS } from "../interface/advertisementTypes";
import {
  getAdvertisementStatusAction,
} from "../AdvertisementStatusChip";
import { AdvertisementFilters } from "./AdvertisementFilters";
import { useAdvertisementColumns } from "./AdvertisementColumns";

type DeleteCtx = { row: Advertisement };
type StatusCtx = { row: Advertisement; action: "enable" | "disable" };

export function AdvertisementListPage() {
  const router = useRouter();
  const { notify } = useNotification();

  const { filters, setFiltersPatch, resetFilters } =
    useFilters<FilterState>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(EMPTY_FILTERS);

  const [items, setItems] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const {
    open: deleteOpen,
    target: deleteTarget,
    openWith: openDeleteConfirm,
    close: closeDeleteConfirm,
  } = useConfirmDialog<DeleteCtx>();

  const {
    open: statusOpen,
    target: statusTarget,
    openWith: openStatusConfirm,
    close: closeStatusConfirm,
  } = useConfirmDialog<StatusCtx>();

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAdvertisements();
      setItems(res ?? []);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load advertisements";
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
    setAppliedFilters({
      status: filters.status,
      adType: filters.adType,
      displayLocation: filters.displayLocation,
      search: filters.search.trim().toLowerCase(),
    });
  }, [filters]);

  const handleClear = useCallback(() => {
    resetFilters();
    setAppliedFilters(EMPTY_FILTERS);
  }, [resetFilters]);

  const filteredItems = useMemo(() => {
    let list = items;

    if (appliedFilters.status) {
      list = list.filter((row) => row.status === appliedFilters.status);
    }
    if (appliedFilters.adType) {
      list = list.filter((row) => row.adType === appliedFilters.adType);
    }
    if (appliedFilters.displayLocation) {
      list = list.filter(
        (row) => row.displayLocation === appliedFilters.displayLocation,
      );
    }

    const q = appliedFilters.search.trim().toLowerCase();
    if (q) {
      list = list.filter((row) => {
        const title = (row.adTitle ?? "").toLowerCase();
        const client = (row.clientName ?? "").toLowerCase();
        const desc = (row.description ?? "").toLowerCase();
        return title.includes(q) || client.includes(q) || desc.includes(q);
      });
    }

    return list;
  }, [appliedFilters, items]);

  const columns = useAdvertisementColumns();

  const canCreate = canModuleAction(currentUser?.role, "advertisement", "create");
  const canEdit = canModuleAction(currentUser?.role, "advertisement", "update");
  const canView = canModuleAction(currentUser?.role, "advertisement", "view");
  const canDelete = canModuleAction(currentUser?.role, "advertisement", "delete");

  const handleDelete = useCallback(
    (row: Advertisement) => {
      openDeleteConfirm({ row });
    },
    [openDeleteConfirm],
  );

  const handleConfirmDelete = useCallback(async () => {
    const ctx = deleteTarget;
    if (!ctx) return;

    try {
      const userPayload = currentUser
        ? { name: currentUser.name, role: currentUser.role }
        : undefined;
      await deleteAdvertisement(getRowId(ctx.row), { user: userPayload });
      notify({ type: "danger", message: "Advertisement deleted successfully." });
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setError(msg);
      notify({ type: "error", message: msg });
    }
  }, [currentUser, deleteTarget, loadAll, notify]);

  const handleStatusToggle = useCallback(
    (row: Advertisement, action: "enable" | "disable") => {
      openStatusConfirm({ row, action });
    },
    [openStatusConfirm],
  );

  const handleConfirmStatus = useCallback(async () => {
    if (!statusTarget) return;
    const { row, action } = statusTarget;
    const nextStatus = action === "enable" ? "Enabled" : "Disabled";

    try {
      const userPayload = currentUser
        ? { name: currentUser.name, role: currentUser.role }
        : undefined;
      await updateAdvertisementStatus(getRowId(row), {
        status: nextStatus,
        user: userPayload,
      });
      notify({
        type: "success",
        message:
          action === "enable"
            ? "Advertisement enabled successfully."
            : "Advertisement disabled successfully.",
      });
      await loadAll();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Status update failed";
      setError(msg);
      notify({ type: "error", message: msg });
    }
  }, [currentUser, loadAll, notify, statusTarget]);

  const rowActions = useCallback(
    (row: Advertisement): DataTableAction<Advertisement>[] => {
      const actions: DataTableAction<Advertisement>[] = [];

      if (canView) {
        actions.push({
          label: "View",
          icon: <ViewIcon />,
          onClick: (r) =>
            router.push(routes.advertisement.view(getRowId(r))),
        });
      }

      if (canEdit) {
        actions.push({
          label: "Edit",
          icon: <EditIcon />,
          onClick: (r) =>
            router.push(routes.advertisement.edit(getRowId(r))),
        });
      }

      if (canEdit) {
        const { action, label } = getAdvertisementStatusAction(row.status);
        actions.push({
          label,
          icon: action === "disable" ? <BlockIcon /> : <UnblockIcon />,
          onClick: (r) =>
            handleStatusToggle(r, getAdvertisementStatusAction(r.status).action),
          color: action === "disable" ? "error" : "success",
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
    [canDelete, canEdit, canView, handleDelete, handleStatusToggle, router],
  );

  const deleteDescription = deleteTarget
    ? `This will permanently delete "${deleteTarget.row.adTitle}".`
    : undefined;

  const statusTitle =
    statusTarget?.action === "disable"
      ? "Disable advertisement?"
      : statusTarget?.action === "enable"
        ? "Enable advertisement?"
        : undefined;

  const statusDescription =
    statusTarget?.row
      ? statusTarget.action === "disable"
        ? `This will disable "${statusTarget.row.adTitle}".`
        : `This will enable "${statusTarget.row.adTitle}".`
      : undefined;

  return (
    <ModulePageLayout
      title="Advertisements"
      subtitle="Manage promotional ads across the platform."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Advertisements" },
      ]}
      error={error}
      onErrorClose={() => setError("")}
      action={
        canCreate ? (
          <Button
            variant="contained"
            onClick={() => router.push(routes.advertisement.create())}
          >
            Add Advertisement
          </Button>
        ) : undefined
      }
    >
      <AdvertisementFilters
        filters={filters}
        onChange={updateFilter}
        onSearch={handleSearch}
        onClear={handleClear}
        disabled={loading}
      />

      <DataTable<Advertisement>
        columns={columns}
        rows={filteredItems}
        getRowId={getRowId}
        loading={loading}
        emptyMessage="No advertisements yet. Add one to get started."
        actions={rowActions}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={closeDeleteConfirm}
        onConfirm={handleConfirmDelete}
        title="Delete advertisement?"
        description={deleteDescription}
        confirmLabel="Delete"
        confirmColor="error"
        pendingLabel="Deleting…"
      />

      <ConfirmDialog
        open={statusOpen}
        onClose={closeStatusConfirm}
        onConfirm={handleConfirmStatus}
        title={statusTitle}
        description={statusDescription}
        confirmLabel={
          statusTarget?.action === "disable" ? "Disable" : "Enable"
        }
        confirmColor={
          statusTarget?.action === "disable" ? "error" : "primary"
        }
        pendingLabel={
          statusTarget?.action === "disable" ? "Disabling…" : "Enabling…"
        }
      />
    </ModulePageLayout>
  );
}
