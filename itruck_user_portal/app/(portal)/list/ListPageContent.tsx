

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
import { useMarketplaceFavorites } from "@/components/marketplace/MarketplaceFavoritesProvider";
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
import { LAYOUT } from "@/lib/theme";
import { GoogleAdBanner } from "@/components/ads/GoogleAdBanner";
import { SHOW_ADS } from "@/components/ads/adsConfig";

// Sticky filter column: stays pinned while the page scrolls, but no longer
// owns its own independent scrollbar. The whole page is one normal scroll now.
const stickyFilterSx = {
  position: "sticky" as const,
  top: { xs: 0, lg: LAYOUT.navbarHeight + 16 },
  alignSelf: "flex-start" as const,
  maxHeight: { xs: "none", lg: `calc(100vh - ${LAYOUT.navbarHeight + 32}px)` },
  overflowY: { xs: "visible", lg: "auto" } as const,
  pr: 0.75,
  "&::-webkit-scrollbar": { width: 6 },
  "&::-webkit-scrollbar-track": { background: "transparent" },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 4,
  },
  "&::-webkit-scrollbar-thumb:hover": {
    backgroundColor: "rgba(0,0,0,0.3)",
  },
};

function filtersFromSearchParams(searchParams: URLSearchParams): VehicleFilterValues {
  return {
    ...EMPTY_VEHICLE_FILTERS,
    category_id: searchParams.get("category_id") ?? "",
    subcategory_id: searchParams.get("subcategory_id") ?? "",
    state_id: searchParams.get("state_id") ?? "",
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
  if (filters.state_id) query.state_id = filters.state_id;
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

  const { toggleFavorite } = useMarketplaceFavorites();

  const loadPage = useCallback(
    async (page: number, signal: AbortSignal) => {
      const filters = urlFiltersRef.current;
      const payload = {
        ...toBuySellListPayload({
          ...filters,
          usear_type: isLoggedIn ? "buy" : "all",
        }),
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
      void toggleFavorite(productId);
    },
    [toggleFavorite],
  );

  const handleViewProduct = useCallback(
    async (productId: string) => {
      const allowed = await ensureLoggedInToViewProduct(productId, {
        notify,
        isLoggedIn,
        authReady,
        onNeedLogin: (loginPath) => router.push(loginPath),
      });
      if (allowed) router.push(userProductRoutes.view(productId, "buy-vehicle"));
    },
    [notify, router, isLoggedIn, authReady],
  );

  const handleSortChange = useCallback((v: SortOption) => {
    setSortBy(v);
  }, []);

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ---- Header: title, sort, layout toggle ---- */}
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
            fullWidth={true}
            size="small"
            sx={{
              width: { xs: "100%", sm: 220 },
              flexShrink: 0,
              mr: 0,
              "& .MuiAutocomplete-clearIndicator": { display: "none" },
              "& .MuiOutlinedInput-root": { height: 40 },
            }}
          />
          <ToggleButtonGroup
            size="small"
            exclusive
            value={layout}
            onChange={(_, v) => v && setLayout(v)}
            sx={{
              flexShrink: 0,
              height: 40,
              ml: 0,
              "& .MuiToggleButton-root": { height: 40 },
            }}
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

      {/* ---- Body row: sticky filter pane + normal-flow product pane ---- */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "280px 1fr" },
          gap: 3,
          width: "100%",
        }}
      >
        {/* Filters — sticky, pins in place while the page scrolls */}
        <Box sx={stickyFilterSx}>
          <VehicleFilterPanel
            values={filters}
            onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
            onApply={handleApplyFilters}
            onClear={handleClearFilters}
            mobileOpen={mobileFiltersOpen}
            onMobileClose={() => setMobileFiltersOpen(false)}
            applyLoading={applyLoading}
            showStatusFilter={false}
          />
        </Box>

        {/* Products — flows normally, scrolls with the rest of the page */}
        <Box>
          {SHOW_ADS && <GoogleAdBanner placement="listing" format="auto" responsive />}
          <VehicleGrid
            products={list.items}
            loading={list.loading}
            hasMore={list.hasMore}
            sentinelRef={list.sentinelRef}
            layout={layout}
            onFavoriteToggle={handleFavoriteToggle}
            onProductClick={(id) => void handleViewProduct(id)}
          />
        </Box>
      </Box>
    </Box>
  );
}
