"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Pagination from "@mui/material/Pagination";

import {
  listAdminFavorites,
  removeFavoriteById,
  type AdminFavoriteRow,
} from "@/model/services/favoriteapi";
import { getBuySellRowId } from "@/model/services/buysellapi";
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
import { ViewIcon, DeleteIcon } from "@/components/ui/Icons";

import { useFavoriteColumns } from "./FavoriteColumns";
import {
  FavoriteFilters,
  EMPTY_FAVORITE_FILTERS,
  type FavoriteFilterState,
} from "./FavoriteFilters";

type DeleteCtx = { row: AdminFavoriteRow };

export function FavoritesListPage() {
  const router = useRouter();
  const { notify } = useNotification();
  const { filters, setFiltersPatch, resetFilters } =
    useFilters<FavoriteFilterState>(EMPTY_FAVORITE_FILTERS);
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [items, setItems] = useState<AdminFavoriteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const {
    open: deleteOpen,
    target: deleteTarget,
    openWith: openDeleteConfirm,
    close: closeDeleteConfirm,
  } = useConfirmDialog<DeleteCtx>();

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listAdminFavorites({
        entity: "buySell",
        page,
        limit: 20,
        search: appliedSearch,
      });
      setItems(res.data ?? []);
      setTotalPages(Number(res.pagination?.totalPages) || 1);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "Failed to load favorites");
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, page]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleSearch = useCallback(() => {
    setPage(1);
    setAppliedSearch(filters.search.trim());
  }, [filters.search]);

  const handleClear = useCallback(() => {
    resetFilters();
    setAppliedSearch("");
    setPage(1);
  }, [resetFilters]);

  const columns = useFavoriteColumns();

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget?.row.favoriteId) return;
    try {
      await removeFavoriteById(deleteTarget.row.favoriteId);
      notify({ type: "danger", message: "Favorite removed." });
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Remove failed";
      setError(msg);
      notify({ type: "error", message: msg });
    }
  }, [deleteTarget, loadAll, notify]);

  const rowActions = useCallback(
    (row: AdminFavoriteRow): DataTableAction<AdminFavoriteRow>[] => {
      const actions: DataTableAction<AdminFavoriteRow>[] = [
        {
          label: "View listing",
          icon: <ViewIcon />,
          onClick: (r) => {
            const id = getBuySellRowId(r);
            if (id) router.push(routes.buysell.view(id));
          },
        },
      ];
      if (row.favoriteId) {
        actions.push({
          label: "Remove",
          icon: <DeleteIcon />,
          color: "error",
          onClick: (r) => openDeleteConfirm({ row: r }),
        });
      }
      return actions;
    },
    [openDeleteConfirm, router],
  );

  return (
    <ModulePageLayout
      title="Favorites"
      subtitle="All saved vehicles. Super admin sees every user's favorites."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Favorites" },
      ]}
      error={error}
      onErrorClose={() => setError("")}
      showAds={false}
    >
      <FavoriteFilters
        filters={filters}
        onChange={setFiltersPatch}
        onSearch={handleSearch}
        onClear={handleClear}
        disabled={loading}
      />

      <DataTable<AdminFavoriteRow>
        columns={columns}
        rows={items}
        getRowId={(row) =>
          String(row.favoriteId || `${row._id}-${row.favoritedBy?._id || ""}`)
        }
        loading={loading}
        emptyMessage="No favorites found."
        actions={rowActions}
      />

      {totalPages > 1 ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        onClose={closeDeleteConfirm}
        onConfirm={handleConfirmDelete}
        title="Remove favorite?"
        description={
          deleteTarget
            ? `Remove this saved vehicle for ${deleteTarget.row.favoritedBy?.name || "this user"}?`
            : undefined
        }
        confirmLabel="Remove"
        confirmColor="error"
        pendingLabel="Removing…"
      />
    </ModulePageLayout>
  );
}
