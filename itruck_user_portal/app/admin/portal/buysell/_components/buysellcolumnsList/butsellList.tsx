"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import UploadFileIcon from "@mui/icons-material/UploadFile";

import type { User } from "@/model/api";
import { getCurrentUser } from "@/model/api";
import { canAccess } from "@/lib/permissions";
import { routes } from "@/lib/routes";
import { loadListState, useAppNavigate, usePersistListState } from "@/lib/navigation";
import { useNotification } from "@/hooks/useNotification";
import { useFilters } from "@/hooks/useFilters";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

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

import { getBlockUnblockAction } from "@/lib/blockUnblockUtils";
import {
  BuySellProduct,
  deleteBuySellProducts,
  getBuySellListPage,
  getBuySellRowId,
  bulkUploadBuySellProducts,
} from "@/model/services/buysellapi";
import { toBuySellListPayload } from "@/lib/buySellListUtils";
import { EMPTY_FILTERS, FilterState } from "../interface/buysell_interface";
import { useBuySellColumns } from "./buysellcolumns";
import { BuySellFilters } from "./buysellcolumnsFilters";
import { addFavorite, removeFavorite } from "@/model/services/favoriteapi";
import { BulkUploadDialog } from "./bulkuploaddialog";

const ADMIN_LIST_PAGE_SIZE = 20;

type DeleteCtx = { mode: "single"; row: BuySellProduct } | { mode: "bulk" };
type BlockCtx = { row: BuySellProduct; action: "block" | "unblock" };

type BuySellListPersistedState = {
  filters: FilterState;
  appliedFilters: FilterState;
  page?: number;
  pageSize?: number;
};

export function BuySellListPage() {
  const pathname = usePathname();
  const navigate = useAppNavigate();
  const { notify } = useNotification();

  const { filters, setFiltersPatch, resetFilters } =
    useFilters<FilterState>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<FilterState>(EMPTY_FILTERS);

  const [items, setItems] = useState<BuySellProduct[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0); // DataTable uses 0-based page
  const [pageSize, setPageSize] = useState(ADMIN_LIST_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  usePersistListState<BuySellListPersistedState>({
    filters,
    appliedFilters,
    page,
    pageSize,
  });

  // ── Favourites state ──────────────────────────────────────────────────────
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  // ── Bulk upload dialog state ──────────────────────────────────────────────
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

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

  // ── Load list (always pass filters explicitly — no closure deps) ──────────
  const loadAll = useCallback(
    async (
      applied: FilterState,
      opts?: { page?: number; pageSize?: number },
    ) => {
      setLoading(true);
      setError("");
      const nextPage = opts?.page ?? page;
      const nextPageSize = opts?.pageSize ?? pageSize;
      try {
        const result = await getBuySellListPage({
          ...toBuySellListPayload({
            ...applied,
            usear_type: applied.usear_type || "all",
          }),
          page: nextPage + 1, // API is 1-based
          limit: nextPageSize,
        });
        const products = result.items ?? [];
        setItems(products);
        setTotalCount(result.total ?? products.length);
        setPage((result.page ?? nextPage + 1) - 1);
        setPageSize(result.limit ?? nextPageSize);

        // Seed favoriteIds directly from is_favorite field returned by API
        setFavoriteIds(
          new Set(
            products
              .filter((p) => p.is_favorite)
              .map((p) => getBuySellRowId(p)),
          ),
        );
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to load products";
        setError(msg);
        notify({ type: "error", message: msg });
      } finally {
        setLoading(false);
      }
    },
    [notify, page, pageSize],
  );

  // ── Mount: restore saved filters when navigating back ─────────────────────
  useEffect(() => {
    const saved = loadListState<BuySellListPersistedState>(pathname);
    const initialApplied = saved?.appliedFilters ?? EMPTY_FILTERS;
    const initialPage = saved?.page ?? 0;
    const initialPageSize = saved?.pageSize ?? ADMIN_LIST_PAGE_SIZE;
    if (saved) {
      setFiltersPatch(saved.filters);
      setAppliedFilters(saved.appliedFilters);
      setPage(initialPage);
      setPageSize(initialPageSize);
    }
    void loadAll(initialApplied, {
      page: initialPage,
      pageSize: initialPageSize,
    });
    getCurrentUser()
      .then((u) => setCurrentUser(u as User))
      .catch(() => setCurrentUser(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount / pathname restore only
  }, [pathname, setFiltersPatch]);

  // ── Search / Clear ────────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    setAppliedFilters({ ...filters });
    setPage(0);
    void loadAll(filters, { page: 0, pageSize });
  }, [filters, loadAll, pageSize]);

  const handleClear = useCallback(() => {
    resetFilters();
    setAppliedFilters(EMPTY_FILTERS);
    setSelectedIds([]);
    setPage(0);
    void loadAll(EMPTY_FILTERS, { page: 0, pageSize });
  }, [resetFilters, loadAll, pageSize]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
      void loadAll(appliedFilters, { page: newPage, pageSize });
    },
    [appliedFilters, loadAll, pageSize],
  );

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      setPageSize(newSize);
      setPage(0);
      void loadAll(appliedFilters, { page: 0, pageSize: newSize });
    },
    [appliedFilters, loadAll],
  );

  const userOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of items) {
      if (row.userid && !seen.has(row.userid)) {
        seen.set(row.userid, row.created_by || "Unknown");
      }
    }
    return Array.from(seen.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [items]);
  // ── Favourite toggle (optimistic) ─────────────────────────────────────────
  const handleToggleFavorite = useCallback(
    async (row: BuySellProduct) => {
      const id = getBuySellRowId(row);
      const isFav = favoriteIds.has(id);

      // Optimistic UI update
      setTogglingIds((prev) => new Set(prev).add(id));
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        isFav ? next.delete(id) : next.add(id);
        return next;
      });

      try {
        if (isFav) {
          await removeFavorite("buySell", id);
          notify({ type: "success", message: "Removed from favourites." });
        } else {
          await addFavorite("buySell", id);
          notify({ type: "success", message: "Added to favourites." });
        }
      } catch (err) {
        // Revert optimistic update on failure
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          isFav ? next.add(id) : next.delete(id);
          return next;
        });
        const msg =
          err instanceof Error ? err.message : "Failed to update favourite";
        notify({ type: "error", message: msg });
      } finally {
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [favoriteIds, notify],
  );

  // ── Permissions ───────────────────────────────────────────────────────────
  const canCreate = canAccess(currentUser?.role, "buy_sell", "create");
  const canEdit = canAccess(currentUser?.role, "buy_sell", "update");
  const canView = canAccess(currentUser?.role, "buy_sell", "view");
  const canDelete = canAccess(currentUser?.role, "buy_sell", "delete");

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = useBuySellColumns({
    favoriteIds,
    togglingIds,
    onToggleFavorite: handleToggleFavorite,
  });

  // ── Delete handlers ───────────────────────────────────────────────────────
  const handleDelete = useCallback(
    (row: BuySellProduct) => openDeleteConfirm({ mode: "single", row }),
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
        await deleteBuySellProducts([getBuySellRowId(ctx.row)]);
        setSelectedIds((prev) =>
          prev.filter((id) => id !== getBuySellRowId(ctx.row)),
        );
        notify({ type: "danger", message: "Product deleted successfully." });
      } else {
        await deleteBuySellProducts(selectedIds);
        setSelectedIds([]);
        notify({ type: "danger", message: "Products deleted successfully." });
      }
      await loadAll(appliedFilters, { page, pageSize });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setError(msg);
      notify({ type: "error", message: msg });
    }
  }, [deleteTarget, loadAll, appliedFilters, notify, selectedIds, page, pageSize]);

  // ── Block / Unblock handlers ──────────────────────────────────────────────
  const handleBlockUnblock = useCallback(
    (row: BuySellProduct, action: "block" | "unblock") =>
      openBlockConfirm({ row, action }),
    [openBlockConfirm],
  );

  const handleConfirmBlockUnblock = useCallback(async () => {
    // if (!blockTarget) return;
    // const { row, action } = blockTarget;
    // try {
    //   await blockUnblock("buy-sell", getBuySellRowId(row), action);
    //   const msg = action === "block" ? "Product blocked." : "Product unblocked.";
    //   notify({ type: "success", message: msg });
    //   await loadAll(appliedFilters);
    // } catch (err) {
    //   const msg = err instanceof Error ? err.message : "Block/unblock failed";
    //   setError(msg);
    //   notify({ type: "error", message: msg });
    // }
  }, [blockTarget, loadAll, notify]);

  // ── Row actions ───────────────────────────────────────────────────────────
  const rowActions = useCallback(
    (row: BuySellProduct): DataTableAction<BuySellProduct>[] => {
      const actions: DataTableAction<BuySellProduct>[] = [];

      if (canEdit) {
        actions.push({
          label: "Edit",
          icon: <EditIcon />,
          onClick: (r) => navigate(routes.buysell.edit(getBuySellRowId(r))),
        });
      }

      // if (canEdit) {
      //   const { action, label } = getBlockUnblockAction(row.status);
      //   actions.push({
      //     label,
      //     icon: action === "block" ? <BlockIcon /> : <UnblockIcon />,
      //     onClick: (r) =>
      //       handleBlockUnblock(r, getBlockUnblockAction(r.status).action),
      //     color: action === "block" ? "error" : "success",
      //   });
      // }

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
    [canDelete, canEdit, canView, handleBlockUnblock, handleDelete, navigate],
  );

  // ── Dialog labels ─────────────────────────────────────────────────────────
  const deleteTitle =
    deleteTarget?.mode === "bulk"
      ? "Delete selected products?"
      : "Delete product?";

  const deleteDescription =
    deleteTarget?.mode === "bulk"
      ? `This will permanently delete ${selectedIds.length} selected product(s).`
      : deleteTarget?.mode === "single"
        ? `This will permanently delete this listing.`
        : undefined;

  const blockTitle =
    blockTarget?.action === "block"
      ? "Block product?"
      : blockTarget?.action === "unblock"
        ? "Unblock product?"
        : undefined;

  const blockDescription = blockTarget
    ? blockTarget.action === "block"
      ? `This will block this listing.`
      : `This will unblock this listing.`
    : undefined;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ModulePageLayout
      title="Buy & Sell"
      subtitle="Manage buy and sell product listings, favourites, and purchases."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Buy & Sell" },
      ]}
      error={error}
      onErrorClose={() => setError("")}
      action={
        canCreate ? (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={() => setBulkUploadOpen(true)}
            >
              Bulk Upload
            </Button>
            <Button variant="outlined" onClick={() => navigate(routes.buysell.cart())}>
              My Cart
            </Button>
            <Button variant="outlined" onClick={() => navigate(routes.buysell.purchasedList())}>
              My Purchases
            </Button>
            <Button variant="contained" onClick={() => navigate(routes.buysell.create())}>
              Add Product
            </Button>
          </Box>
        ) : undefined
      }
    >
      <SelectionBanner
        count={selectedIds.length}
        total={totalCount}
        onAction={canDelete ? handleDeleteSelected : undefined}
        onClear={() => setSelectedIds([])}
        onSelectAll={canDelete ? () => setSelectedIds(items.map(getBuySellRowId)) : undefined}
      />

      <BuySellFilters
        filters={filters}
        onChange={setFiltersPatch}
        onSearch={handleSearch}
        onClear={handleClear}
        disabled={loading}
        userOptions={userOptions}
      />

      <DataTable<BuySellProduct>
        columns={columns}
        rows={items}
        getRowId={getBuySellRowId}
        loading={loading}
        emptyMessage="No listings yet. Add one to get started."
        selectable={canDelete}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        actions={rowActions}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
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

      <BulkUploadDialog
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onUpload={bulkUploadBuySellProducts}
        onSuccess={() => loadAll(appliedFilters, { page, pageSize })}
        entityLabel="Buy & Sell Products"
        templateHint={
          "Excel columns required (row 1 headers, exact spelling):\n" +
          "Category ID | Subcategory ID | Price | Description | Country ID | " +
          "State ID | City ID | Address | Pincode | Status | " +
          "Specifications (JSON) | Images\n\n" +
          '"Specifications (JSON)" cell example:\n' +
          '[{"specification_id":"...","specification_value":"..."}]\n\n' +
          '"Images" cell (optional) - comma-separated URLs of already-uploaded images.'
        }
      />
    </ModulePageLayout>
  );
}
