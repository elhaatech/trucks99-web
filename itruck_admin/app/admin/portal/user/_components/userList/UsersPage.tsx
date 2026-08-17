"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DownloadIcon from "@mui/icons-material/Download";

import type { User } from "@/model/api";
import { blockUnblock, deleteUser, getRowId } from "@/model/api";
import { DataTable, ConfirmDialog, ModulePageLayout, SelectionBanner } from "@/components/common";
import { EditIcon, DeleteIcon, BlockIcon, UnblockIcon } from "@/components/ui/Icons";
import { routes } from "@/lib/routes";
import { useNotification } from "@/hooks/useNotification";
import { useFilters } from "@/hooks/useFilters";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useUserData } from "@/hooks/useUserData";
import { useUserForm } from "@/hooks/useUserForm";
import { EMPTY_FILTERS, type FilterState } from "../interface/userTypes";
import { UserFilters } from "./UserFilters";
import { useUserColumns } from "./UserColumns";
import { UserFormDialog } from "./UserFormDialog";
import { exportUsersToCSV } from "./Exportusers";

type DeleteCtx    = { mode: "single"; row: User } | { mode: "bulk" };
type BlockCtx     = { row: User; action: "block" | "unblock" };
type BulkBlockCtx = { action: "block" | "unblock" };

function isProtectedUser(u: User) {
  const role = u.role as unknown as { name?: string } | string | undefined;
  const roleName = (typeof role === "string" ? role : role?.name ?? "").trim().toLowerCase();
  if (roleName === "super admin") return true;
  const name = (u.name || "").trim().toLowerCase();
  return name === "superadmin" || name === "superadmi";
}

/** Derive sorted unique values from a list of users for a given field */
function uniqueValues(users: User[], field: string): string[] {
  const set = new Set<string>();
  users.forEach((u) => {
    const v = (u as any)[field];
    if (v && typeof v === "string") set.add(v.trim());
  });
  return Array.from(set).sort();
}

/**
 * Extract the creation date from a user object.
 *
 * Priority:
 *  1. `createdAt` field if present and valid
 *  2. MongoDB ObjectId timestamp encoded in `_id`
 *     — the first 4 bytes of a 24-hex ObjectId are seconds since Unix epoch.
 *     e.g. "69be2825..." → 0x69be2825 = 1773675557 → 2026-03-21
 *
 * Returns null if neither source yields a valid date.
 */
function getCreatedAt(u: User): Date | null {
  // 1. Explicit createdAt field
  const raw = (u as any).createdAt;
  if (raw) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Decode from MongoDB ObjectId (_id is a 24-char hex string)
  const mongoId: string = (u as any)._id ?? "";
  if (mongoId && /^[0-9a-fA-F]{24}$/.test(mongoId)) {
    const timestampHex = mongoId.substring(0, 8);
    const timestampSec = parseInt(timestampHex, 16);
    if (!isNaN(timestampSec) && timestampSec > 0) {
      return new Date(timestampSec * 1000);
    }
  }

  return null;
}

/**
 * Extract all possible role IDs from a user object.
 * The API returns both a MongoDB _id (e.g. "69be27f5...") and a UUID id (e.g. "471aff48-...").
 * roleOptions is built from the roles list which may use either format as its key,
 * so we check both to ensure the filter always matches.
 */
function getUserRoleIds(u: User): string[] {
  const ids: string[] = [];

  // From roleId field (populated object or raw string id)
  const roleId = (u as any).roleId;
  if (roleId) {
    if (typeof roleId === "string") {
      ids.push(roleId);
    } else {
      if (roleId._id) ids.push(roleId._id);
      if (roleId.id) ids.push(roleId.id);
    }
  }

  // From role field (also a populated object in this API)
  const role = (u as any).role;
  if (role && typeof role === "object") {
    if (role._id) ids.push(role._id);
    if (role.id) ids.push(role.id);
  }

  return ids.filter(Boolean);
}

export function UsersPage() {
  const router = useRouter();
  const { notify } = useNotification();

  const { filters, setFiltersPatch, resetFilters } = useFilters(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(EMPTY_FILTERS);

  // ─── Confirm dialogs ───────────────────────────────────────────────────────
  const { open: deleteOpen, target: deleteTarget, openWith: openDeleteConfirm, close: closeDeleteConfirm } =
    useConfirmDialog<DeleteCtx>();

  const { open: blockOpen, target: blockTarget, openWith: openBlockConfirm, close: closeBlockConfirm } =
    useConfirmDialog<BlockCtx>();

  const { open: bulkBlockOpen, target: bulkBlockTarget, openWith: openBulkBlockConfirm, close: closeBulkBlockConfirm } =
    useConfirmDialog<BulkBlockCtx>();

  // ─── Data & form ──────────────────────────────────────────────────────────
  const { loading, error, setError, rawItems, roles, currentUser, loadAll } = useUserData();
  const { form, set, editing, dialogOpen, setDialogOpen, handleSubmit } = useUserForm(roles, currentUser, loadAll);
  const columns = useUserColumns();

  // ─── Derived filter options from raw data ──────────────────────────────────

  /**
   * FIX: Use _id (MongoDB ObjectId) as the option value.
   * The user objects store roleId._id / role._id as the MongoDB ObjectId string,
   * so the dropdown value must match that same string for the filter to work.
   * We fall back to the UUID `id` field if `_id` is absent.
   */
  const roleOptions = useMemo(
    () =>
      roles.map((r: any) => ({
        id: r._id ?? r.id,
        name: r.name,
      })),
    [roles]
  );

  const stateOptions = useMemo(() => uniqueValues(rawItems, "state"), [rawItems]);

  /**
   * FIX: City options should update as the user changes the state dropdown (live filter),
   * not only after they click Search (appliedFilters). Using `filters.state` here means
   * the city list narrows immediately when a state is selected.
   */
  const cityOptions = useMemo(() => {
    const source = filters.state
      ? rawItems.filter((u) => (u as any).state === filters.state)
      : rawItems;
    return uniqueValues(source, "city");
  }, [rawItems, filters.state]);

  // ─── Filter handlers ───────────────────────────────────────────────────────
  const updateFilter = useCallback(
    (patch: Partial<FilterState>) => setFiltersPatch(patch),
    [setFiltersPatch]
  );

  const handleClear = useCallback(() => {
    resetFilters();
    setAppliedFilters(EMPTY_FILTERS);
  }, [resetFilters]);

  const handleSearch = useCallback(() => {
    setAppliedFilters({ ...filters });
  }, [filters]);

  // ─── Filtered items ────────────────────────────────────────────────────────
  const items = useMemo(() => {
    let result = rawItems;

    // Text search
    const q = appliedFilters.search.trim().toLowerCase();
    if (q) {
      result = result.filter((u) => {
        const name = (u.name ?? "").toLowerCase();
        const mobile = (u.mobile ?? "").toLowerCase();
        const company = ((u as any).company_name ?? "").toLowerCase();
        return name.includes(q) || mobile.includes(q) || company.includes(q);
      });
    }

    /**
     * FIX: Role filter — compare the selected option value (MongoDB _id string)
     * against all role id fields present on the user object (_id and UUID id),
     * covering both roleId and role populated fields.
     */
    if (appliedFilters.role) {
      result = result.filter((u) => {
        const userRoleIds = getUserRoleIds(u);
        return userRoleIds.includes(appliedFilters.role as string);
      });
    }

    // State filter
    if (appliedFilters.state) {
      result = result.filter(
        (u) => ((u as any).state ?? "").toLowerCase() === appliedFilters.state!.toLowerCase()
      );
    }

    // City filter
    if (appliedFilters.city) {
      result = result.filter(
        (u) => ((u as any).city ?? "").toLowerCase() === appliedFilters.city!.toLowerCase()
      );
    }

    // DOJ from — include users whose creation date is >= start of the selected day.
    // Users with no resolvable date are excluded when a date filter is active.
    if (appliedFilters.dojFrom) {
      const from = new Date(appliedFilters.dojFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter((u) => {
        const d = getCreatedAt(u);
        return d !== null && d >= from;
      });
    }

    // DOJ to — include users whose creation date is <= end of the selected day.
    if (appliedFilters.dojTo) {
      const to = new Date(appliedFilters.dojTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((u) => {
        const d = getCreatedAt(u);
        return d !== null && d <= to;
      });
    }

    return result;
  }, [rawItems, appliedFilters]);

  // ─── Export ────────────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const timestamp = new Date().toISOString().slice(0, 10);
    exportUsersToCSV(items, `users_${timestamp}.csv`);
    notify({ type: "success", message: `Exported ${items.length} user(s) to CSV.` });
  }, [items, notify]);

  // ─── Delete ────────────────────────────────────────────────────────────────
  const userPayload = currentUser ? { name: currentUser.name, role: currentUser.role } : undefined;

  const handleDelete = useCallback(
    (row: User) => openDeleteConfirm({ mode: "single", row }),
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
        await deleteUser({
          mobile: ctx.row.mobile || undefined,
          id: ctx.row.mobile ? undefined : getRowId(ctx.row),
          name: ctx.row.name,
          user: userPayload,
        });
        notify({ type: "danger", message: "User deleted." });
      } else {
        const toDelete = rawItems.filter(
          (u) => selectedIds.includes(getRowId(u)) && !isProtectedUser(u)
        );
        if (toDelete.length === 0) {
          notify({ type: "warning", message: "No deletable users selected." });
          return;
        }
        for (const u of toDelete) {
          await deleteUser({
            mobile: u.mobile || undefined,
            id: u.mobile ? undefined : getRowId(u),
            name: u.name,
            user: userPayload,
          });
        }
        setSelectedIds([]);
        notify({ type: "danger", message: "Users deleted." });
      }
      loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setError(msg);
      notify({ type: "error", message: msg });
    }
  }, [deleteTarget, notify, loadAll, rawItems, selectedIds, setError, userPayload]);

  // ─── Single row block / unblock ────────────────────────────────────────────
  const handleBlockUnblock = useCallback(
    (row: User, action: "block" | "unblock") => openBlockConfirm({ row, action }),
    [openBlockConfirm]
  );

  const handleConfirmBlockUnblock = useCallback(async () => {
    if (!blockTarget) return;
    const { row, action } = blockTarget;
    setError("");
    try {
      await blockUnblock("user", getRowId(row), action);
      notify({ type: "success", message: action === "block" ? "User blocked." : "User unblocked." });
      loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Block/unblock failed";
      setError(msg);
      notify({ type: "error", message: msg });
    }
  }, [blockTarget, loadAll, notify, setError]);

  // ─── Bulk block / unblock ──────────────────────────────────────────────────
  const handleBulkBlockUnblock = useCallback(
    (action: "block" | "unblock") => {
      if (!selectedIds.length) return;
      openBulkBlockConfirm({ action });
    },
    [openBulkBlockConfirm, selectedIds.length]
  );

  const handleConfirmBulkBlockUnblock = useCallback(async () => {
    if (!bulkBlockTarget) return;
    const { action } = bulkBlockTarget;
    const targets = rawItems.filter(
      (u) => selectedIds.includes(getRowId(u)) && !isProtectedUser(u)
    );
    if (targets.length === 0) {
      notify({ type: "warning", message: "No eligible users selected." });
      return;
    }
    setError("");
    try {
      for (const u of targets) {
        await blockUnblock("user", getRowId(u), action);
      }
      setSelectedIds([]);
      notify({
        type: "success",
        message:
          action === "block"
            ? `Blocked ${targets.length} user(s).`
            : `Unblocked ${targets.length} user(s).`,
      });
      loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bulk block/unblock failed";
      setError(msg);
      notify({ type: "error", message: msg });
    }
  }, [bulkBlockTarget, rawItems, selectedIds, notify, setError, loadAll]);

  // ─── Row actions ───────────────────────────────────────────────────────────
  const rowActions = useCallback(
    (row: User) => {
      const status = (row as any).status || "active";
      const blockUnblockActions =
        status === "inactive"
          ? [{ label: "Unblock", icon: <UnblockIcon />, onClick: (r: User) => handleBlockUnblock(r, "unblock"), color: "success" as const }]
          : [{ label: "Block", icon: <BlockIcon />, onClick: (r: User) => handleBlockUnblock(r, "block"), color: "error" as const }];

      return [
        { label: "Edit", icon: <EditIcon />, onClick: (r: User) => router.push(routes.user.edit(getRowId(r))) },
        ...blockUnblockActions,
        { label: "Delete", icon: <DeleteIcon />, onClick: handleDelete, color: "error" as const, disabled: isProtectedUser(row) },
      ];
    },
    [handleBlockUnblock, handleDelete, router]
  );

  // ─── Dialog labels ─────────────────────────────────────────────────────────
  const deleteTitle = deleteTarget?.mode === "bulk" ? "Delete selected users?" : "Delete user?";
  const deleteDescription =
    deleteTarget?.mode === "bulk"
      ? `Permanently delete ${selectedIds.length} user(s).`
      : deleteTarget?.mode === "single"
      ? `This will permanently delete "${deleteTarget.row.name || getRowId(deleteTarget.row)}".`
      : undefined;

  const blockTitle =
    blockTarget?.action === "block" ? "Block user?" : blockTarget?.action === "unblock" ? "Unblock user?" : undefined;
  const blockDescription =
    blockTarget?.row
      ? blockTarget.action === "block"
        ? `This will block "${blockTarget.row.name || getRowId(blockTarget.row)}".`
        : `This will unblock "${blockTarget.row.name || getRowId(blockTarget.row)}".`
      : undefined;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <ModulePageLayout
      title="Users"
      subtitle="Create, edit, and manage user accounts."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Users" },
      ]}
      error={error}
      onErrorClose={() => setError("")}
      action={
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            disabled={items.length === 0}
          >
            Export CSV
          </Button>
          <Button variant="contained" onClick={() => router.push(routes.user.create())}>
            Add User
          </Button>
        </Box>
      }
    >
      <SelectionBanner
        count={selectedIds.length}
        total={items.length}
        onAction={handleDeleteSelected}
        actionLabel="Delete selected"
        onClear={() => setSelectedIds([])}
        onSelectAll={() => setSelectedIds(items.map(getRowId))}
      />

      {selectedIds.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2.5 }}>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={() => handleBulkBlockUnblock("block")}
          >
            Block selected ({selectedIds.length})
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="success"
            onClick={() => handleBulkBlockUnblock("unblock")}
          >
            Unblock selected ({selectedIds.length})
          </Button>
        </Box>
      )}

      <UserFilters
        filters={filters}
        onChange={updateFilter}
        onSearch={handleSearch}
        onClear={handleClear}
        roles={roleOptions}
        states={stateOptions}
        cities={cityOptions}
      />

      <DataTable<User>
        columns={columns}
        rows={items}
        getRowId={getRowId}
        loading={loading}
        emptyMessage="No users found."
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        actions={rowActions}
      />

      <UserFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editing}
        form={form}
        set={set}
        onSubmit={handleSubmit}
        roles={roles}
      />

      {/* Single delete */}
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

      {/* Single block / unblock */}
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

      {/* Bulk block / unblock */}
      <ConfirmDialog
        open={bulkBlockOpen}
        onClose={closeBulkBlockConfirm}
        onConfirm={handleConfirmBulkBlockUnblock}
        title={
          bulkBlockTarget?.action === "block"
            ? `Block ${selectedIds.length} user(s)?`
            : `Unblock ${selectedIds.length} user(s)?`
        }
        description="Protected users (super admin) will be skipped."
        confirmLabel={bulkBlockTarget?.action === "block" ? "Block all" : "Unblock all"}
        confirmColor={bulkBlockTarget?.action === "block" ? "error" : "primary"}
        pendingLabel={bulkBlockTarget?.action === "block" ? "Blocking…" : "Unblocking…"}
      />
    </ModulePageLayout>
  );
}