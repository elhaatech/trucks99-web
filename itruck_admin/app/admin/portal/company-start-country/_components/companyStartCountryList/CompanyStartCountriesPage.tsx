"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@mui/material/Button";

import type { CompanyStartCountry, User } from "@/model/api";
import {
  blockUnblock,
  deleteCompanyStartCountry,
  getCompanyStartCountryAll,
  getCurrentUser,
  getRowId,
} from "@/model/api";

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
import { routes } from "@/lib/routes";
import { useNotification } from "@/hooks/useNotification";
import { useFilters } from "@/hooks/useFilters";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { canAccess } from "@/lib/permissions";

import type { FilterState } from "../interface/companyStartCountryTypes";
import { EMPTY_FILTERS } from "../interface/companyStartCountryTypes";

import { CompanyStartCountryFilters } from "./CompanyStartCountryFilters";
import { useCompanyStartCountryColumns } from "./CompanyStartCountryColumns";
import { getBlockUnblockAction } from "@/lib/blockUnblockUtils";

type DeleteCtx =
  | { mode: "single"; row: CompanyStartCountry }
  | { mode: "bulk" };
type BlockCtx = { row: CompanyStartCountry; action: "block" | "unblock" };

export function CompanyStartCountriesPage() {
  const router = useRouter();
  const { notify } = useNotification();

  const { filters, setFiltersPatch, resetFilters } =
    useFilters<FilterState>(EMPTY_FILTERS);
  const [appliedSearch, setAppliedSearch] = useState("");

  const [items, setItems] = useState<CompanyStartCountry[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getCompanyStartCountryAll();
      setItems(res ?? []);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load locations";
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
  }, [filters.search]);

  const handleClear = useCallback(() => {
    resetFilters();
    setAppliedSearch("");
    setSelectedIds([]);
  }, [resetFilters]);

  const filteredItems = useMemo(() => {
    if (!appliedSearch) return items;
    return items.filter((row) => {
      const anyRow = row as unknown as Record<string, unknown>;
      const q = appliedSearch;
      const city = (
        row.city ??
        anyRow.startCity ??
        anyRow.start_city ??
        anyRow.city_name ??
        anyRow.cityName ??
        ""
      )
        .toString()
        .toLowerCase();
      const state = (
        row.state ??
        anyRow.startState ??
        anyRow.start_state ??
        anyRow.state_name ??
        anyRow.stateName ??
        ""
      )
        .toString()
        .toLowerCase();
      const country = (
        row.country ??
        anyRow.startCountry ??
        anyRow.start_country ??
        anyRow.country_name ??
        anyRow.countryName ??
        ""
      )
        .toString()
        .toLowerCase();
      return city.includes(q) || state.includes(q) || country.includes(q);
    });
  }, [items, appliedSearch]);

  const columns = useCompanyStartCountryColumns();

  const canCreate = canAccess(
    currentUser?.role,
    "Company Start Country",
    "create",
  );
  const canEdit = canAccess(
    currentUser?.role,
    "Company Start Country",
    "update",
  );
  const canDelete = canAccess(
    currentUser?.role,
    "Company Start Country",
    "delete",
  );

  const handleDelete = useCallback(
    (row: CompanyStartCountry) => {
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
        await deleteCompanyStartCountry([getRowId(ctx.row)]);
        setSelectedIds((prev) => prev.filter((id) => id !== getRowId(ctx.row)));
        notify({ type: "danger", message: "Deleted successfully" });
      } else {
        await deleteCompanyStartCountry(selectedIds);
        setSelectedIds([]);
        notify({ type: "danger", message: "Deleted selected successfully" });
      }
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setError(msg);
      notify({ type: "error", message: msg });
    }
  }, [deleteTarget, loadAll, notify, selectedIds]);

  const handleBlockUnblock = useCallback(
    (row: CompanyStartCountry, action: "block" | "unblock") => {
      openBlockConfirm({ row, action });
    },
    [openBlockConfirm],
  );

  const handleConfirmBlockUnblock = useCallback(async () => {
    if (!blockTarget) return;
    const { row, action } = blockTarget;

    try {
      await blockUnblock("company-start-country", getRowId(row), action);
      const msg =
        action === "block"
          ? "Location blocked successfully."
          : "Location unblocked successfully.";
      notify({ type: "success", message: msg });
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Block/unblock failed";
      setError(msg);
      notify({ type: "error", message: msg });
    }
  }, [blockTarget, loadAll, notify, setError]);

  const rowActions = useCallback(
    (row: CompanyStartCountry): DataTableAction<CompanyStartCountry>[] => {
      const actions: DataTableAction<CompanyStartCountry>[] = [];
      if (canEdit) {
        // actions.push({
        //   label: "View",
        //   icon: <ViewIcon />,
        //   onClick: (r) => router.push(routes.companyStartCountry.view(getRowId(r))),
        // });
        actions.push({
          label: "Edit",
          icon: <EditIcon />,
          onClick: (r) =>
            router.push(routes.companyStartCountry.edit(getRowId(r))),
        });
      }

      if (canDelete) {
        actions.push({
          label: "Delete",
          icon: <DeleteIcon />,
          onClick: (r) => handleDelete(r),
          color: "error",
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

      return actions;
    },
    [canDelete, canEdit, handleDelete, handleBlockUnblock, router],
  );

  const deleteTitle =
    deleteTarget?.mode === "bulk"
      ? "Delete selected locations?"
      : "Delete location?";
  const deleteDescription =
    deleteTarget?.mode === "bulk"
      ? `This will permanently delete ${selectedIds.length} selected item(s).`
      : deleteTarget?.mode === "single"
        ? `This will permanently delete "${deleteTarget.row.city || ""}, ${deleteTarget.row.state || ""}, ${deleteTarget.row.country || ""}".`
        : undefined;

  const blockTitle =
    blockTarget?.action === "block"
      ? "Block location?"
      : blockTarget?.action === "unblock"
        ? "Unblock location?"
        : undefined;

  const blockDescription =
    blockTarget && blockTarget.row
      ? blockTarget.action === "block"
        ? `This will block "${blockTarget.row.city || ""}, ${blockTarget.row.state || ""}, ${blockTarget.row.country || ""}".`
        : `This will unblock "${blockTarget.row.city || ""}, ${blockTarget.row.state || ""}, ${blockTarget.row.country || ""}".`
      : undefined;

  return (
    <ModulePageLayout
      title="Locations (City/State/Country)"
      subtitle="Manage city, state, and country values."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Locations" },
      ]}
      error={error}
      onErrorClose={() => setError("")}
      action={
        canCreate ? (
          <Button
            variant="contained"
            onClick={() => router.push(routes.companyStartCountry.create())}
          >
            Add Location
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

      <CompanyStartCountryFilters
        filters={filters}
        onChange={updateFilter}
        onSearch={handleSearch}
        onClear={handleClear}
        disabled={loading}
      />

      <DataTable<CompanyStartCountry>
        columns={columns}
        rows={filteredItems}
        getRowId={getRowId}
        loading={loading}
        emptyMessage="No locations yet."
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
        pendingLabel={
          blockTarget?.action === "block" ? "Blocking…" : "Unblocking…"
        }
      />
    </ModulePageLayout>
  );
}
