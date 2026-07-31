"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ViewModuleOutlinedIcon from "@mui/icons-material/ViewModuleOutlined";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import {
  VehicleFilterPanel,
  MobileFilterButton,
  SortDropdown,
  VehicleGrid,
  VehicleListHeader,
  EMPTY_VEHICLE_FILTERS,
  paginateProducts,
  getTotalPages,
  VEHICLE_PAGE_SIZE,
  sortProducts,
  type SortOption,
  type VehicleFilterValues,
} from "@/app/common/components/buysell";
import { userProductRoutes } from "@/lib/userProductRoutes";
import {
  filterBuySellBySearch,
  toBuySellListPayload,
} from "@/lib/buySellListUtils";
import { useBuySellFavorites } from "@/lib/useBuySellFavorites";
import { ensureLoggedInToViewProduct } from "@/lib/requireMarketplaceLogin";
import {
  getBuySellList,
  type BuySellProduct,
} from "@/model/services/buysellapi";
import { useMarketplaceAuth } from "@/components/marketplace/MarketplaceAuthProvider";
import { useNotification } from "@/hooks/useNotification";
import { isAbortError } from "@/lib/apiCache";

function filtersFromSearchParams(searchParams: URLSearchParams): VehicleFilterValues {
  return {
    ...EMPTY_VEHICLE_FILTERS,
    category_id: searchParams.get("category_id") ?? "",
    subcategory_id: searchParams.get("subcategory_id") ?? "",
    status: searchParams.get("status") ?? "",
    min_price: searchParams.get("min_price") ?? "",
    max_price: searchParams.get("max_price") ?? "",
    search: searchParams.get("q") ?? "",
    usear_type: "buy",
  };
}

function filtersToQuery(filters: VehicleFilterValues): Record<string, string> {
  const query: Record<string, string> = {};
  if (filters.category_id) query.category_id = filters.category_id;
  if (filters.subcategory_id) query.subcategory_id = filters.subcategory_id;
  if (filters.status) query.status = filters.status;
  if (filters.min_price) query.min_price = filters.min_price;
  if (filters.max_price) query.max_price = filters.max_price;
  if (filters.search.trim()) query.q = filters.search.trim();
  return query;
}

function serializeFilters(filters: VehicleFilterValues): string {
  return JSON.stringify(filtersToQuery(filters));
}

export default function UserProductListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notify } = useNotification();
  const { isLoggedIn, authReady } = useMarketplaceAuth();

  const urlFilters = useMemo(
    () => filtersFromSearchParams(searchParams),
    [searchParams],
  );
  const urlKey = useMemo(() => serializeFilters(urlFilters), [urlFilters]);

  const [filters, setFilters] = useState<VehicleFilterValues>(urlFilters);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [layout, setLayout] = useState<"grid" | "list">("list");
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [products, setProducts] = useState<BuySellProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const lastFetchedKey = useRef<string | null>(null);

  const { favoriteIds, togglingIds, syncFromProducts, syncFromProductsAndApi, toggleFavorite } =
    useBuySellFavorites(notify);

  useEffect(() => {
    setFilters(urlFilters);
    setPage(1);
  }, [urlKey]); // eslint-disable-line react-hooks/exhaustive-deps -- sync when URL filter key changes

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    if (lastFetchedKey.current === urlKey) {
      // Still allow first paint after remount with same key
    }
    lastFetchedKey.current = urlKey;

    (async () => {
      setLoading(true);
      try {
        const res = await getBuySellList(toBuySellListPayload(urlFilters), {
          signal: controller.signal,
        });
        if (cancelled || controller.signal.aborted) return;
        const items = res ?? [];
        setProducts(items);
        if (isLoggedIn) {
          await syncFromProductsAndApi(items);
        } else {
          syncFromProducts(items);
        }
      } catch (err) {
        if (cancelled || isAbortError(err)) return;
        notify({
          type: "error",
          message: err instanceof Error ? err.message : "Failed to load vehicles",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [urlKey, urlFilters, isLoggedIn, notify, syncFromProducts, syncFromProductsAndApi]);

  const displayProducts = useMemo(() => {
    const fromApi = urlFilters.search.trim()
      ? filterBuySellBySearch(products, urlFilters.search)
      : products;
    return sortProducts(fromApi, sortBy);
  }, [products, urlFilters.search, sortBy]);

  const pagedProducts = useMemo(
    () => paginateProducts(displayProducts, page, VEHICLE_PAGE_SIZE),
    [displayProducts, page],
  );
  const totalPages = getTotalPages(displayProducts.length, VEHICLE_PAGE_SIZE);

  const handleApplyFilters = () => {
    const next = { ...filters, usear_type: "buy" as const };
    setMobileFiltersOpen(false);
    setPage(1);
    router.replace(userProductRoutes.list(filtersToQuery(next)), { scroll: false });
  };

  const handleClearFilters = () => {
    const cleared = { ...EMPTY_VEHICLE_FILTERS, usear_type: "buy" as const };
    setFilters(cleared);
    setPage(1);
    setMobileFiltersOpen(false);
    router.replace(userProductRoutes.list(), { scroll: false });
  };

  const handleFavoriteToggle = useCallback(
    (productId: string) => {
      void toggleFavorite(productId, { requireLogin: !isLoggedIn });
    },
    [isLoggedIn, toggleFavorite],
  );

  const handleViewProduct = useCallback(
    async (productId: string) => {
      const allowed = await ensureLoggedInToViewProduct(productId, {
        notify,
        isLoggedIn,
        authReady,
        onNeedLogin: (loginPath) => router.push(loginPath),
      });
      if (allowed) router.push(userProductRoutes.view(productId));
    },
    [notify, router, isLoggedIn, authReady],
  );

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 2,
          mb: 3,
        }}
      >
        <VehicleListHeader count={displayProducts.length} title="All Vehicles" />

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center" }}>
          <SortDropdown
            value={sortBy}
            onChange={(v) => {
              setSortBy(v);
              setPage(1);
            }}
          />
          <ToggleButtonGroup
            size="small"
            exclusive
            value={layout}
            onChange={(_, v) => v && setLayout(v)}
          >
            <ToggleButton value="grid" aria-label="Grid view">
              <ViewModuleOutlinedIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="list" aria-label="List view">
              <ViewListOutlinedIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
          <MobileFilterButton onClick={() => setMobileFiltersOpen(true)} />
        </Box>
      </Box>

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
          onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
          mobileOpen={mobileFiltersOpen}
          onMobileClose={() => setMobileFiltersOpen(false)}
        />

        <VehicleGrid
          products={pagedProducts}
          loading={loading}
          layout={layout}
          favoriteIds={favoriteIds}
          togglingFavoriteIds={togglingIds}
          onFavoriteToggle={handleFavoriteToggle}
          onProductClick={(id) => void handleViewProduct(id)}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </Box>
    </Box>
  );
}
