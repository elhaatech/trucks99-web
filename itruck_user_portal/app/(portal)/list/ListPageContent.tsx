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
import { getCurrentUser } from "@/model/services/user";
import { useNotification } from "@/hooks/useNotification";

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

export default function UserProductListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notify } = useNotification();

  const initialFilters = useMemo(
    () => filtersFromSearchParams(searchParams),
    [searchParams],
  );

  const [filters, setFilters] = useState<VehicleFilterValues>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [layout, setLayout] = useState<"grid" | "list">("list");
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [products, setProducts] = useState<BuySellProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  const { favoriteIds, togglingIds, syncFromProductsAndApi, toggleFavorite } =
    useBuySellFavorites(notify);

  useEffect(() => {
    getCurrentUser()
      .then((user) => setLoggedIn(Boolean(user?.id || (user as { _id?: string })?._id)))
      .catch(() => setLoggedIn(false));
  }, []);

  useEffect(() => {
    const next = filtersFromSearchParams(searchParams);
    setFilters(next);
    setAppliedFilters(next);
    setPage(1);
  }, [searchParams]);

  const loadProducts = useCallback(
    async (applied: VehicleFilterValues) => {
      setLoading(true);
      try {
        const res = await getBuySellList(toBuySellListPayload(applied));
        const items = res ?? [];
        setProducts(items);
        await syncFromProductsAndApi(items);
      } catch (err) {
        notify({
          type: "error",
          message: err instanceof Error ? err.message : "Failed to load vehicles",
        });
      } finally {
        setLoading(false);
      }
    },
    [notify, syncFromProductsAndApi],
  );

  useEffect(() => {
    void loadProducts(appliedFilters);
  }, [appliedFilters, loadProducts]);

  const displayProducts = useMemo(() => {
    const fromApi = appliedFilters.search.trim()
      ? filterBuySellBySearch(products, appliedFilters.search)
      : products;
    return sortProducts(fromApi, sortBy);
  }, [products, appliedFilters.search, sortBy]);

  const pagedProducts = useMemo(
    () => paginateProducts(displayProducts, page, VEHICLE_PAGE_SIZE),
    [displayProducts, page],
  );
  const totalPages = getTotalPages(displayProducts.length, VEHICLE_PAGE_SIZE);

  const handleApplyFilters = () => {
    const next = { ...filters, usear_type: "buy" as const };
    setAppliedFilters(next);
    setPage(1);
    setMobileFiltersOpen(false);
    router.replace(userProductRoutes.list(filtersToQuery(next)), { scroll: false });
  };

  const handleClearFilters = () => {
    const cleared = { ...EMPTY_VEHICLE_FILTERS, usear_type: "buy" as const };
    setFilters(cleared);
    setAppliedFilters(cleared);
    setPage(1);
    setMobileFiltersOpen(false);
    router.replace(userProductRoutes.list(), { scroll: false });
  };

  const handleFavoriteToggle = useCallback(
    (productId: string) => {
      void toggleFavorite(productId, { requireLogin: !loggedIn });
    },
    [loggedIn, toggleFavorite],
  );

  const handleViewProduct = useCallback(
    async (productId: string) => {
      const allowed = await ensureLoggedInToViewProduct(productId, {
        notify,
        onNeedLogin: (loginPath) => router.push(loginPath),
      });
      if (allowed) router.push(userProductRoutes.view(productId));
    },
    [notify, router],
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
