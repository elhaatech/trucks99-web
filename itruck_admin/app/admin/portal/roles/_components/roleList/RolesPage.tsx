"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import type { Role } from "@/model/api";
import { canAccess } from "@/lib/permissions";
import { routes } from "@/lib/routes";
import { getCurrentUser, getRoles, getRowId } from "@/model/api";
import { DataTable, ModulePageLayout } from "@/components/common";
import { ViewIcon, EditIcon } from "@/components/ui/Icons";
import { useNotification } from "@/hooks/useNotification";
import { useFilters } from "@/hooks/useFilters";
import { EMPTY_FILTERS, type FilterState } from "../interface/roleTypes";
import { RoleFilters } from "./RoleFilters";
import { useRoleColumns } from "./RoleColumns";
import type { DataTableAction } from "@/components/common/DataTable";

function isProtectedRole(r: Role) {
  const name = (r.name || "").trim().toLowerCase();
  return name === "super admin" || name === "superadmin";
}

export function RolesPage() {
  const router = useRouter();
  const { notify } = useNotification();

  const { filters, setFiltersPatch, resetFilters } = useFilters(EMPTY_FILTERS);
  const [appliedSearch, setAppliedSearch] = useState("");

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const u = await getCurrentUser();
        if (cancelled) return;
        setCurrentUserRole(u.role ?? null);
      } catch {
        if (cancelled) return;
        setCurrentUserRole(null);
      }
      try {
        const res = await getRoles();
        if (cancelled) return;
        setRoles(res ?? []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load";
        if (cancelled) return;
        setError(msg);
        notify({ type: "error", message: msg });
        setRoles([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notify]);

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

  const columns = useRoleColumns();

  const rolePermissionsTitle = "roles";
  const canCreate = canAccess(currentUserRole ?? undefined, rolePermissionsTitle, "create");
  const canEdit = canAccess(currentUserRole ?? undefined, rolePermissionsTitle, "update");

 const tableActions = useCallback(
  (row: Role): DataTableAction<Role>[] => {
    const actions: DataTableAction<Role>[] = [];

    // Add View action for all roles
    actions.push({
      label: "View",
      icon: <ViewIcon />,
      onClick: (r) => router.push(routes.role.view(getRowId(r))),
    });

    if (canEdit && !isProtectedRole(row)) {
      actions.push({
        label: "Edit",
        icon: <EditIcon />,
        onClick: (r) => router.push(routes.role.edit(getRowId(r))),
      });
    }

    return actions;
  },
  [canEdit, router]
);

  const filteredRoles = useMemo(() => {
    const q = appliedSearch.trim();
    if (!q) return roles;
    return roles.filter((r) => (r.name ?? "").toLowerCase().includes(q));
  }, [roles, appliedSearch]);

  return (
    <ModulePageLayout
      title="Roles"
      subtitle="Manage roles and assign permission groups."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Roles" },
      ]}
      error={error}
      onErrorClose={() => setError("")}
      action={
        canCreate ? (
          <Button variant="contained" onClick={() => router.push(routes.role.create())}>
            Add Role
          </Button>
        ) : undefined
      }
    >
      <RoleFilters filters={filters} onChange={updateFilter} onSearch={handleSearch} onClear={handleClear} disabled={loading} />

      <DataTable<Role>
        columns={columns}
        rows={filteredRoles}
        getRowId={getRowId}
        loading={loading}
        emptyMessage="No roles yet. Add one to get started."
        selectable={false}
        actions={tableActions}
      />
    </ModulePageLayout>
  );
}

