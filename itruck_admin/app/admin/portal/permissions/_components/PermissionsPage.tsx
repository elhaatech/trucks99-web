"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import SearchField from "@/components/common/SearchField";

import { canAccess } from "@/lib/permissions";
import { routes } from "@/lib/routes";
import { getCurrentUser, type Role } from "@/model/api";
import { getPermissions, deletePermission, type PermissionGroup } from "@/model/services/permission";
import { DataTable, ModulePageLayout } from "@/components/common";
import { ViewIcon, EditIcon } from "@/components/ui/Icons";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNotification } from "@/hooks/useNotification";
import { usePermissionColumns } from "./PermissionColumns";
import type { DataTableAction } from "@/components/common/DataTable";

export function PermissionsPage() {
  const router = useRouter();
  const { notify } = useNotification();

  const [searchName, setSearchName] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [permissions, setPermissions] = useState<PermissionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);

  const load = useCallback(async (search?: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await getPermissions({ search });
      setPermissions(res ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load permissions";
      setError(msg);
      notify({ type: "error", message: msg });
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await getCurrentUser();
        if (!cancelled) setCurrentUserRole(u.role ?? null);
      } catch {
        if (!cancelled) setCurrentUserRole(null);
      }
    })();
    load();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const handleSearch = useCallback(() => {
    const q = searchName.trim();
    setAppliedSearch(q);
    load(q || undefined);
  }, [searchName, load]);

  const handleClear = useCallback(() => {
    setSearchName("");
    setAppliedSearch("");
    load(undefined);
  }, [load]);

  const columns = usePermissionColumns();

  // We map this to the generic 'roles' permission for now, or maybe create a specific 'permissions' permission.
  const permissionsTitle = "roles";
  const canCreate = canAccess(currentUserRole ?? undefined, permissionsTitle, "create");
  const canEdit = canAccess(currentUserRole ?? undefined, permissionsTitle, "update");
  const canDelete = canAccess(currentUserRole ?? undefined, permissionsTitle, "delete");

  const handleDelete = async (row: PermissionGroup) => {
    if (!window.confirm(`Are you sure you want to delete the permission group '${row.name}'?`)) return;
    try {
      setLoading(true);
      await deletePermission(row.name);
      notify({ type: "success", message: "Permission group deleted successfully." });
      load(appliedSearch || undefined);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete";
      notify({ type: "error", message: msg });
      setLoading(false);
    }
  };

  const tableActions = useCallback(
    (row: PermissionGroup): DataTableAction<PermissionGroup>[] => {
      const actions: DataTableAction<PermissionGroup>[] = [];

      actions.push({
        label: "View",
        icon: <ViewIcon />,
        onClick: (r) => router.push(routes.permission.view(r._id)),
      });

      if (canEdit) {
        actions.push({
          label: "Edit",
          icon: <EditIcon />,
          onClick: (r) => router.push(routes.permission.edit(r._id)),
        });
      }

      if (canDelete) {
        actions.push({
          label: "Delete",
          icon: <DeleteIcon />,
          onClick: (r) => handleDelete(r),
        });
      }

      return actions;
    },
    [canEdit, canDelete, router]
  );

  return (
    <ModulePageLayout
      title="Permission Groups"
      subtitle="Manage permission groups and assign individual feature access."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Permission Groups" },
      ]}
      error={error}
      onErrorClose={() => setError("")}
      action={
        canCreate ? (
          <Button variant="contained" onClick={() => router.push(routes.permission.create())}>
            Add Permission Group
          </Button>
        ) : undefined
      }
    >
      <Box sx={{ mb: 2.5, maxWidth: 420 }}>
        <SearchField
          value={searchName}
          onChange={setSearchName}
          onSearch={handleSearch}
          onClear={handleClear}
          placeholder="Search by name..."
          disabled={loading}
          label="Search"
        />
      </Box>

      <DataTable<PermissionGroup>
        columns={columns}
        rows={permissions}
        getRowId={(r) => r._id}
        loading={loading}
        emptyMessage="No permission groups found. Add one to get started."
        selectable={false}
        actions={tableActions}
      />
    </ModulePageLayout>
  );
}
