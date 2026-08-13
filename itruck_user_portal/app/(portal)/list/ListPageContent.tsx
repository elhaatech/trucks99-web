"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ViewModuleOutlinedIcon from "@mui/icons-material/ViewModuleOutlined";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import {
  VehicleFilterPanel,
  MobileFilterButton,
  VehicleGrid,
  VehicleListHeader,
  EMPTY_VEHICLE_FILTERS,
  VEHICLE_PAGE_SIZE,
  type SortOption,
  type VehicleFilterValues,
} from "@/app/common/components/buysell";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { toBuySellListPayload } from "@/lib/buySellListUtils";
import { useBuySellFavorites } from "@/lib/useBuySellFavorites";
import { ensureLoggedInToViewProduct } from "@/lib/requireMarketplaceLogin";
import {
  getBuySellListPage,
  type BuySellProduct,
} from "@/model/services/buysellapi";
import { useMarketplaceAuth } from "@/components/marketplace/MarketplaceAuthProvider";
import { useNotification } from "@/hooks/useNotification";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { isAbortError } from "@/lib/apiCache";
import { toErrorMessage } from "@/lib/errors";

function filtersFromSearchParams(searchParams: URLSearchParams): VehicleFilterValues {
  return {
    ...EMPTY_VEHICLE_FILTERS,
    category_id: searchParams.get("category_id") ?? "",
    subcategory_id: searchParams.get("subcategory_id") ?? "",
    status: searchParams.get("status") ?? "",
    min_price: searchParams.get("min_price") ?? "",
    max_price: searchParams.get("max_price") ?? "",
    no_of_owners_min: searchParams.get("no_of_owners_min") ?? "1",
    no_of_owners_max: searchParams.get("no_of_owners_max") ?? "",
    km_min: searchParams.get("km_min") ?? "10000",
    km_max: searchParams.get("km_max") ?? "",
    make_year_min: searchParams.get("make_year_min") ?? "",
    make_year_max: searchParams.get("make_year_max") ?? "",
    city_id: searchParams.get("city_id") ?? "",
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
  if (filters.no_of_owners_min) query.no_of_owners_min = filters.no_of_owners_min;
  if (filters.no_of_owners_max) query.no_of_owners_max = filters.no_of_owners_max;
  if (filters.km_min) query.km_min = filters.km_min;
  if (filters.km_max) query.km_max = filters.km_max;
  if (filters.make_year_min) query.make_year_min = filters.make_year_min;
  if (filters.make_year_max) query.make_year_max = filters.make_year_max;
  if (filters.city_id) query.city_id = filters.city_id;
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
  const urlFiltersRef = useRef(urlFilters);
  urlFiltersRef.current = urlFilters;

  const [filters, setFilters] = useState<VehicleFilterValues>(urlFilters);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);

  const { favoriteIds, togglingIds, syncFromProducts, toggleFavorite } =
    useBuySellFavorites(notify);

  const loadPage = useCallback(
    async (page: number, signal: AbortSignal) => {
      const filters = urlFiltersRef.current;
      const payload = {
        ...toBuySellListPayload(filters),
        search: filters.search.trim() || undefined,
        sort: sortBy,
        page,
        limit: VEHICLE_PAGE_SIZE,
      };
      const result = await getBuySellListPage(payload, {
        signal,
      });
      return {
        items: result.items ?? [],
        total: result.total ?? 0,
        totalPages: result.totalPages ?? 1,
        page: result.page ?? page,
      };
    },
    [urlKey, sortBy],
  );

  const list = useInfiniteScroll(loadPage);

  useEffect(() => {
    syncFromProducts(list.items);
  }, [list.items, syncFromProducts]);

  useEffect(() => {
    if (applyLoading && !list.loading) {
      setApplyLoading(false);
    }
  }, [applyLoading, list.loading]);

  useEffect(() => {
    if (list.error && !isAbortError(list.error)) {
      notify({
        type: "error",
        message: toErrorMessage(list.error, "Failed to load vehicles"),
      });
    }
  }, [list.error, notify]);

  useEffect(() => {
    setFilters(urlFilters);
  }, [urlKey]); // eslint-disable-line react-hooks/exhaustive-deps -- sync when URL filter key changes

  const handleApplyFilters = () => {
    const next = { ...filters, usear_type: "buy" as const };
    setApplyLoading(true);
    setMobileFiltersOpen(false);
    router.replace(userProductRoutes.list(filtersToQuery(next)), { scroll: false });
  };

  const handleClearFilters = () => {
    const cleared = {
      ...EMPTY_VEHICLE_FILTERS,
      usear_type: "buy" as const,
      no_of_owners_min: "1",
      km_min: "10000",
    };
    setFilters(cleared);
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

  const handleSortChange = useCallback((v: SortOption) => {
    setSortBy(v);
  }, []);

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          mb: 3,
          flexWrap: "wrap",
        }}
      >
        <VehicleListHeader
          count={list.total}
          title="All Vehicles"
          loading={list.loading}
        />

        <Box
          sx={{
            display: "flex",
            gap: 0.5,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <SearchableSelect
            label="Sort by"
            value={sortBy}
            onChange={(v) => handleSortChange(v as SortOption)}
            options={[
              { value: "newest", label: "Newest first" },
              { value: "price_asc", label: "Price: Low to High" },
              { value: "price_desc", label: "Price: High to Low" },
              { value: "views", label: "Most viewed" },
            ]}
            fullWidth={false}
            sx={{
              minWidth: 180,
              flexShrink: 0,
              "& .MuiAutocomplete-clearIndicator": { display: "none" },
            }}
          />
          <ToggleButtonGroup
            size="small"
            exclusive
            value={layout}
            onChange={(_, v) => v && setLayout(v)}
            sx={{ flexShrink: 0 }}
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
          applyLoading={applyLoading}
        />

        <VehicleGrid
          products={list.items}
          loading={list.loading}
          isLoadingMore={list.loadingMore}
          hasMore={list.hasMore}
          sentinelRef={list.sentinelRef}
          layout={layout}
          favoriteIds={favoriteIds}
          togglingFavoriteIds={togglingIds}
          onFavoriteToggle={handleFavoriteToggle}
          onProductClick={(id) => void handleViewProduct(id)}
        />
      </Box>
    </Box>
  );
}
