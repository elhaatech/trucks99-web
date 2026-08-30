"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import RefreshIcon from "@mui/icons-material/Refresh";

import type { User } from "@/model/api";
import { getDeletedUsers, restoreUser, getCurrentUser, getRowId } from "@/model/api";
import { DataTable, ConfirmDialog, ModulePageLayout } from "@/components/common";
import RestoreIcon from "@mui/icons-material/Restore";
import { routes } from "@/lib/routes";
import { useNotification } from "@/hooks/useNotification";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useUserColumns } from "./UserColumns";

type RestoreCtx = { row: User };

export function DeletedUsersPage() {
  const router = useRouter();
  const { notify } = useNotification();
  const columns = useUserColumns();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<{ name?: string; role?: { name?: string } | string } | null>(null);

  const { open: restoreOpen, target: restoreTarget, openWith: openRestoreConfirm, close: closeRestoreConfirm } =
    useConfirmDialog<RestoreCtx>();

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getDeletedUsers();
      setItems(res || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load deleted users";
      setError(msg);
      notify({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    getCurrentUser().then(setCurrentUser).catch(console.error);
    loadAll();
  }, [loadAll]);

  const handleRestore = useCallback(
    (row: User) => openRestoreConfirm({ row }),
    [openRestoreConfirm]
  );

  const handleConfirmRestore = useCallback(async () => {
    if (!restoreTarget) return;
    try {
      const userPayload = currentUser ? { name: currentUser.name, role: currentUser.role } : undefined;
      await restoreUser(getRowId(restoreTarget.row), userPayload);
      notify({ type: "success", message: "User restored successfully." });
      loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Restore failed";
      setError(msg);
      notify({ type: "error", message: msg });
    }
  }, [restoreTarget, currentUser, notify, loadAll]);

  const rowActions = useCallback(
    () => {
      return [
        { label: "Restore", icon: <RestoreIcon />, onClick: handleRestore, color: "primary" as const },
      ];
    },
    [handleRestore]
  );

  const restoreTitle = "Restore User?";
  const restoreDescription = restoreTarget?.row
    ? `This will restore the account of "${restoreTarget.row.name || getRowId(restoreTarget.row)}" and all their previous data.`
    : undefined;

  return (
    <ModulePageLayout
      title="Deleted Users / Account Recovery"
      subtitle="View and restore soft-deleted user accounts."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Users", href: routes.user.list() },
        { label: "Deleted Users" },
      ]}
      error={error}
      onErrorClose={() => setError("")}
      action={
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadAll}
          >
            Refresh
          </Button>
        </Box>
      }
    >
      <DataTable<User>
        columns={columns}
        rows={items}
        getRowId={getRowId}
        loading={loading}
        emptyMessage="No deleted users found."
        selectable={false}
        actions={rowActions}
      />

      <ConfirmDialog
        open={restoreOpen}
        onClose={closeRestoreConfirm}
        onConfirm={handleConfirmRestore}
        title={restoreTitle}
        description={restoreDescription}
        confirmLabel="Restore"
        confirmColor="primary"
        pendingLabel="Restoring…"
      />
    </ModulePageLayout>
  );
}
