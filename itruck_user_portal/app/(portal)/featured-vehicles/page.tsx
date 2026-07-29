"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Pagination from "@mui/material/Pagination";
import SearchIcon from "@mui/icons-material/Search";
import { PRODUCT_THEME as T } from "@/lib/theme";
import { userProductRoutes } from "@/lib/userProductRoutes";
import {
  SortDropdown,
  type SortOption,
  BuySellErrorState,
  VehicleGridSkeleton,
} from "@/app/common/components/buysell";

const FEATURED_SORT_OPTIONS = [
  "newest",
  "oldest",
  "price_asc",
  "price_desc",
  "expiry_soon",
] as const;

type FeaturedSortOption = (typeof FEATURED_SORT_OPTIONS)[number];

function isFeaturedSort(value: string): value is FeaturedSortOption {
  return (FEATURED_SORT_OPTIONS as readonly string[]).includes(value);
}
import { FeaturedVehicleCard } from "@/app/common/components/buysell/FeaturedVehicleCard";
import { EmptyState } from "@/components/ui/EmptyState";
import SearchOffOutlinedIcon from "@mui/icons-material/SearchOffOutlined";
import {
  fetchFeaturedVehicles,
  type BuySellProduct,
} from "@/model/services/buysellapi";
import { useNotification } from "@/hooks/useNotification";
import {
  ensureLoggedInToViewProduct,
} from "@/lib/requireMarketplaceLogin";

const PAGE_SIZE = 12;

export default function FeaturedVehiclesMarketplacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notify } = useNotification();

  const initialSearch = useMemo(
    () => searchParams.get("q")?.trim() || "",
    [searchParams],
  );
  const initialSort = useMemo((): FeaturedSortOption => {
    const s = searchParams.get("sort");
    return s && isFeaturedSort(s) ? s : "newest";
  }, [searchParams]);
  const initialPage = useMemo(() => {
    const p = Number.parseInt(searchParams.get("page") || "1", 10);
    return Number.isFinite(p) && p > 0 ? p : 1;
  }, [searchParams]);

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [sortBy, setSortBy] = useState<FeaturedSortOption>(initialSort);
  const [page, setPage] = useState(initialPage);
  const [products, setProducts] = useState<BuySellProduct[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const syncUrl = useCallback(
    (next: { q?: string; sort?: string; page?: number }) => {
      const params = new URLSearchParams();
      if (next.q) params.set("q", next.q);
      if (next.sort && next.sort !== "newest") params.set("sort", next.sort);
      if (next.page && next.page > 1) params.set("page", String(next.page));
      const qs = params.toString();
      router.replace(
        `${userProductRoutes.featuredVehicles()}${qs ? `?${qs}` : ""}`,
        { scroll: false },
      );
    },
    [router],
  );

  const loadFeatured = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchFeaturedVehicles({
        page,
        limit: PAGE_SIZE,
        search,
        sort: sortBy,
      });
      setProducts(res.data ?? []);
      setTotalPages(res.pagination?.totalPages ?? 1);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load featured vehicles";
      setError(message);
      notify({ type: "error", message });
    } finally {
      setLoading(false);
    }
  }, [notify, page, search, sortBy]);

  useEffect(() => {
    void loadFeatured();
  }, [loadFeatured]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchInput.trim();
    setSearch(q);
    setPage(1);
    syncUrl({ q, sort: sortBy, page: 1 });
  };

  const handleSortChange = (value: SortOption) => {
    const next: FeaturedSortOption = isFeaturedSort(value) ? value : "newest";
    setSortBy(next);
    setPage(1);
    syncUrl({ q: search, sort: next, page: 1 });
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    syncUrl({ q: search, sort: sortBy, page: value });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
      <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5, color: T.color.textPrimary }}>
        Featured Vehicles
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Premium listings with paid featured visibility on TRUCK99.
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box
          component="form"
          onSubmit={handleSearchSubmit}
          sx={{ flex: 1, minWidth: 220 }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Search by vehicle, brand, model, or location…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <SortDropdown value={sortBy as SortOption} onChange={handleSortChange} />
      </Box>

      {error && !loading ? (
        <BuySellErrorState message={error} onRetry={() => void loadFeatured()} />
      ) : null}

      {loading ? (
        <VehicleGridSkeleton count={6} />
      ) : products.length === 0 ? (
        <EmptyState
          title="No featured vehicles"
          description="There are no active featured listings right now. Check back soon or browse all vehicles."
          icon={<SearchOffOutlinedIcon sx={{ fontSize: 36 }} />}
          action={
            <Button variant="contained" onClick={() => router.push(userProductRoutes.list())}>
              Browse all vehicles
            </Button>
          }
        />
      ) : (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                lg: "repeat(3, 1fr)",
                xl: "repeat(4, 1fr)",
              },
              gap: 2.5,
            }}
          >
            {products.map((product) => (
              <FeaturedVehicleCard
                key={String(product._id || product.id)}
                product={product}
                onViewDetails={(id) => void handleViewProduct(id)}
              />
            ))}
          </Box>

          {totalPages > 1 ? (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                shape="rounded"
              />
            </Box>
          ) : null}
        </>
      )}
    </Box>
  );
}
