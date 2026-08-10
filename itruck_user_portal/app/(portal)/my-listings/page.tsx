"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Spinner } from "@/components/ui";
import { BuySellErrorState } from "@/app/common/components/buysell";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { PRODUCT_THEME as T } from "@/lib/theme";
import {
  deleteBuySellProducts,
  getBuySellListPage,
  getBuySellRowId,
  type BuySellProduct,
} from "@/model/services/buysellapi";
import { toBuySellListPayload } from "@/lib/buySellListUtils";
import {
  EMPTY_FILTERS,
  type FilterState,
} from "@/app/admin/portal/buysell/_components/interface/buysell_interface";
import { useNotification } from "@/hooks/useNotification";
import { getProductTitle } from "@/app/common/components/buysell/utils";
import { useMarketplaceAuth } from "@/components/marketplace/MarketplaceAuthProvider";
import {
  VehicleFilterPanel,
  MobileFilterButton,
  VehicleGrid,
  VehicleListHeader,
  EMPTY_VEHICLE_FILTERS,
  VEHICLE_PAGE_SIZE,
} from "@/app/common/components/buysell";
import {
  PostListingFeaturedFlow,
  type NewListingFeaturedPrompt,
} from "./_components/PostListingFeaturedFlow";
import { SellVehiclePageHeader } from "./_components/SellVehiclePageHeader";
import type { BuySellFormSuccessContext } from "@/app/admin/portal/buysell/_components/buysellcolumnsForm/buysellForm";
import { toErrorMessage } from "@/lib/errors";
import { MARKETPLACE } from "@/constants/marketplace";
import { isAbortError } from "@/lib/apiCache";

const BuySellForm = dynamic(
  () =>
    import("@/app/admin/portal/buysell/_components/buysellcolumnsForm/buysellForm"),
  {
    ssr: false,
    loading: () => (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    ),
  },
);

const FeaturedVehiclePlansDialog = dynamic(
  () =>
    import("@/app/(portal)/viewproduct/_components/FeaturedVehiclePlansDialog").then(
      (m) => m.FeaturedVehiclePlansDialog,
    ),
  { ssr: false },
);

function SellVehicleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notify } = useNotification();
  const { user: currentUser, authReady } = useMarketplaceAuth();

  const isCreate = searchParams.get("tab") === "create";
  const [products, setProducts] = useState<BuySellProduct[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<BuySellProduct | null>(null);
  const [featuredPrompt, setFeaturedPrompt] = useState<NewListingFeaturedPrompt | null>(null);
  const [featurePlansTarget, setFeaturePlansTarget] =
    useState<NewListingFeaturedPrompt | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    ...EMPTY_FILTERS,
    usear_type: "sell",
    no_of_owners_min: "1",
    km_min: "10000",
  });
  const [applyLoading, setApplyLoading] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const listingCount = total;
  const pageSize = VEHICLE_PAGE_SIZE || MARKETPLACE.VEHICLE_PAGE_SIZE;

  const loadListings = useCallback(
    async (options?: { silent?: boolean; page?: number }) => {
      const pageToLoad = options?.page ?? page;
      if (!options?.silent) {
        setLoading(true);
      }
      setListError("");
      try {
        const result = await getBuySellListPage({
          ...toBuySellListPayload(filters),
          page: pageToLoad,
          limit: pageSize,
        });
        const items = result.items ?? [];
        const nextPage = result.page ?? pageToLoad;
        const nextTotal = result.total ?? items.length;
        setProducts(items);
        setTotal(nextTotal);
        setTotalPages(result.totalPages ?? 1);
        // If delete emptied the last page, step back once.
        if (items.length === 0 && nextPage > 1 && nextTotal > 0) {
          setPage(nextPage - 1);
        }
      } catch (err) {
        if (isAbortError(err)) return;
        const message = toErrorMessage(err, "Failed to load listings");
        setListError(message);
        if (!options?.silent) {
          notify({ type: "error", message });
        }
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [notify, page, pageSize, filters],
  );

  useEffect(() => {
    if (!isCreate) {
      void loadListings({ page });
    }
  }, [isCreate, page, loadListings]);

  const handleCreateSuccess = (ctx?: BuySellFormSuccessContext) => {
    router.replace(userProductRoutes.sellVehicle());
    if (ctx?.mode === "create" && ctx.product) {
      setFeaturedPrompt({
        productId: getBuySellRowId(ctx.product),
        title: getProductTitle(ctx.product),
      });
    }
    void loadListings({ silent: true });
  };

  const handleEdit = useCallback(
    (productId: string) => {
      router.push(userProductRoutes.edit(productId));
    },
    [router],
  );

  const handleDeleteRequest = useCallback(
    (productId: string) => {
      const product = products.find((p) => getBuySellRowId(p) === productId);
      if (product) setDeleteTarget(product);
    },
    [products],
  );

  const deleteInProgress = useMemo(() => {
    if (!deleteTarget) return false;
    return deletingIds.has(getBuySellRowId(deleteTarget));
  }, [deleteTarget, deletingIds]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget || deleteInProgress) return;

    const id = getBuySellRowId(deleteTarget);
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await deleteBuySellProducts([id]);
      notify({ type: "success", message: "Listing deleted successfully." });
      setDeleteTarget(null);
      await loadListings();
    } catch (err) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to delete listing",
      });
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [deleteTarget, deleteInProgress, loadListings, notify]);

  const listNewVehicleButton = (
    <Button
      variant="contained"
      startIcon={<AddIcon />}
      fullWidth
      onClick={() => router.push(userProductRoutes.sellVehicle("create"))}
      sx={{ textTransform: "none", fontWeight: 700, px: 2.5 }}
    >
      List new vehicle
    </Button>
  );

  const openFeaturePlansForProduct = useCallback(
    (productId: string) => {
      const product = products.find((p) => getBuySellRowId(p) === productId);
      setFeaturePlansTarget({
        productId,
        title: product ? getProductTitle(product) : "Your vehicle",
      });
    },
    [products],
  );

  const handleApplyFilters = useCallback(async () => {
    setApplyLoading(true);
    setMobileFiltersOpen(false);
    setPage(1);
    try {
      const payload = {
        ...toBuySellListPayload(filters),
        page: 1,
        limit: pageSize,
      };
      const result = await getBuySellListPage(payload);
      setProducts(result.items ?? []);
      setTotal(result.total ?? 0);
      setTotalPages(result.totalPages ?? 1);
      setPage((result.page ?? 1) - 1);
    } catch (err) {
      notify({
        type: "error",
        message: toErrorMessage(err, "Failed to apply filters"),
      });
    } finally {
      setApplyLoading(false);
    }
  }, [filters, pageSize, notify]);

  const handleClearFilters = useCallback(() => {
    const cleared = {
      ...EMPTY_VEHICLE_FILTERS,
      usear_type: "sell" as FilterState["usear_type"],
      no_of_owners_min: "1",
      km_min: "10000",
    };
    setFilters(cleared);
    setPage(1);
    setMobileFiltersOpen(false);
  }, []);

  const handleFilterChange = useCallback(
    (patch: Partial<FilterState>) => {
      setFilters((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const featuredFlow = (
    <PostListingFeaturedFlow
      listing={featuredPrompt}
      onDismiss={() => setFeaturedPrompt(null)}
      currentUser={currentUser}
      onViewListing={(productId) => {
        setFeaturedPrompt(null);
        router.push(userProductRoutes.view(productId));
      }}
      onPaymentSuccess={(_plan, detail) => {
        notify({
          type: "success",
          message:
            detail?.message || "Payment successful. Your vehicle is now featured.",
        });
        void loadListings({ silent: true });
      }}
    />
  );

  const featurePlansDialog = (
    <FeaturedVehiclePlansDialog
      open={Boolean(featurePlansTarget)}
      onClose={() => setFeaturePlansTarget(null)}
      currentUser={currentUser}
      productTitle={featurePlansTarget?.title}
      buySellProductId={featurePlansTarget?.productId ?? null}
      onPaymentSuccess={(_plan, detail) => {
        notify({
          type: "success",
          message:
            detail?.message || "Payment successful. Your vehicle is now featured.",
        });
        setFeaturePlansTarget(null);
        void loadListings({ silent: true });
      }}
    />
  );

  if (isCreate) {
    return (
      <Box sx={{ width: "100%" }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push(userProductRoutes.sellVehicle())}
          sx={{ mb: 2, textTransform: "none", fontWeight: 600, color: T.color.textSecondary }}
        >
          Back to my listings
        </Button>

        <SellVehiclePageHeader
          title="List new vehicle"
          description="Four quick steps — category, details, location, and photos. You can save as draft or publish right away."
        />

        {!authReady ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress size={36} aria-label="Checking login" />
          </Box>
        ) : (
          <BuySellForm
            mode="create"
            requireAuth
            presentation="marketplace"
            loginHref={userProductRoutes.login(userProductRoutes.sellVehicle("create"))}
            cancelHref={userProductRoutes.sellVehicle()}
            backLabel="Back to my listings"
            onSuccess={handleCreateSuccess}
          />
        )}
        {featuredFlow}
        {featurePlansDialog}
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <SellVehiclePageHeader
        title="My listings"
        description="Manage your ads, edit details, or list another vehicle on TRUCK99."
        action={listNewVehicleButton}
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "280px 1fr" },
          gap: 3,
          width: "100%",
        }}
      >
        <VehicleFilterPanel
          values={filters}
          onChange={handleFilterChange}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
          mobileOpen={mobileFiltersOpen}
          onMobileClose={() => setMobileFiltersOpen(false)}
          applyLoading={applyLoading}
        />

        <Box>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 2,
              mb: 2,
            }}
          >
            <Box>
              {!loading && !listError ? (
                <Chip
                  label={
                    listingCount === 1
                      ? "1 listing"
                      : `${listingCount} listings`
                  }
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              ) : null}
            </Box>
            <MobileFilterButton onClick={() => setMobileFiltersOpen(true)} />
          </Box>

          {listError && !loading ? (
            <BuySellErrorState
              title="Couldn't load your listings"
              message={listError}
              onRetry={() => void loadListings()}
            />
          ) : (
            <VehicleGrid
              products={products}
              loading={loading}
              layout="grid"
              onProductClick={(id) => router.push(userProductRoutes.view(id))}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
              deletingIds={deletingIds}
              showOwnerFeaturedControls
              showOwnerActionsMenu
              onFeaturePayNow={openFeaturePlansForProduct}
              emptyTitle="No listings yet"
              emptyDescription='Tap "List new vehicle" to create your first ad. It only takes a few minutes.'
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}

          {!loading ? (
            <Box sx={{ display: { xs: "flex", sm: "none" }, mt: 3 }}>{listNewVehicleButton}</Box>
          ) : null}
        </Box>
      </Box>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleteInProgress && setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete listing?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: T.color.textSecondary, lineHeight: 1.6 }}>
            {deleteTarget
              ? `Remove "${getProductTitle(deleteTarget)}" from your listings? This cannot be undone.`
              : "Remove this listing?"}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deleteInProgress}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => void handleConfirmDelete()}
            disabled={deleteInProgress}
            startIcon={
              deleteInProgress ? <CircularProgress size={16} color="inherit" /> : undefined
            }
            sx={{ textTransform: "none", minWidth: 100 }}
          >
            {deleteInProgress ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {featuredFlow}
      {featurePlansDialog}
    </Box>
  );
}

export default function SellVehiclePage() {
  return (
    <Suspense fallback={<Spinner label="Loading…" />}>
      <SellVehicleContent />
    </Suspense>
  );
}
