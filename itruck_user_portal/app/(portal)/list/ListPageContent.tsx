"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

  const [filters, setFilters] = useState<VehicleFilterValues>(urlFilters);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [layout, setLayout] = useState<"grid" | "list">("list");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [products, setProducts] = useState<BuySellProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyLoading, setApplyLoading] = useState(false);

  const { favoriteIds, togglingIds, syncFromProducts, toggleFavorite } =
    useBuySellFavorites(notify);

  useEffect(() => {
    setFilters(urlFilters);
    setPage(1);
  }, [urlKey]); // eslint-disable-line react-hooks/exhaustive-deps -- sync when URL filter key changes

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const payload = {
          ...toBuySellListPayload(urlFilters),
          search: urlFilters.search.trim() || undefined,
          sort: sortBy,
          page,
          limit: VEHICLE_PAGE_SIZE,
        };
        const result = await getBuySellListPage(payload, {
          signal: controller.signal,
        });
        if (cancelled || controller.signal.aborted) return;
        const items = result.items ?? [];
        setProducts(items);
        setTotal(result.total ?? items.length);
        setTotalPages(result.totalPages ?? 1);
        syncFromProducts(items);
      } catch (err) {
        if (cancelled || isAbortError(err)) return;
        notify({
          type: "error",
          message: toErrorMessage(err, "Failed to load vehicles"),
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [urlKey, urlFilters, sortBy, page, notify, syncFromProducts]);

  const handleApplyFilters = async () => {
    const next = { ...filters, usear_type: "buy" as const };
    setApplyLoading(true);
    setMobileFiltersOpen(false);
    setPage(1);

    try {
      const payload = {
        ...toBuySellListPayload(next),
        page: 1,
        limit: VEHICLE_PAGE_SIZE,
        sort: sortBy,
      };
      const result = await getBuySellListPage(payload);
      setProducts(result.items ?? []);
      setTotal(result.total ?? 0);
      setTotalPages(result.totalPages ?? 1);
      setPage((result.page ?? 1) - 1);
      router.replace(userProductRoutes.list(filtersToQuery(next)), { scroll: false });
    } catch (err) {
      notify({
        type: "error",
        message: toErrorMessage(err, "Failed to apply filters"),
      });
    } finally {
      setApplyLoading(false);
    }
  };

  const handleClearFilters = () => {
    const cleared = {
      ...EMPTY_VEHICLE_FILTERS,
      usear_type: "buy" as const,
      no_of_owners_min: "1",
      km_min: "10000",
    };
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

  const handleSortChange = useCallback((v: SortOption) => {
    setSortBy(v);
    setPage(1);
  }, []);

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
        <VehicleListHeader count={total} title="All Vehicles" loading={loading} />

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center" }}>
          <SortDropdown value={sortBy} onChange={handleSortChange} />
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
          applyLoading={applyLoading}
        />

        <VehicleGrid
          products={products}
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
