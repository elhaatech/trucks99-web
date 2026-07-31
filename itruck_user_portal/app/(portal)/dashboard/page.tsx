"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import {
  HeroSearchSection,
  MarketplaceStatsCards,
  CategoryCard,
  CategoryScroller,
  VehicleGrid,
  FeaturedVehiclesGrid,
  StatsSkeleton,
  mapDashboardMetricsToMarketplaceStats,
} from "@/app/common/components/buysell";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { PRODUCT_THEME as T, GRADIENT, PRIMARY_DARK } from "@/lib/theme";
import { toBuySellListPayload } from "@/lib/buySellListUtils";
import {
  getBuySellDashboardStats,
  getBuySellFeaturedVehicles,
  getBuySellListPage,
  getBuySellRowId,
  type BuySellProduct,
  type BuySellDashboardStatsResponse,
} from "@/model/services/buysellapi";
import { getCategories, type Category } from "@/model/services/category";
import { addFavorite, removeFavorite } from "@/model/services/favoriteapi";
import { useNotification } from "@/hooks/useNotification";
import { ensureLoggedInToViewProduct } from "@/lib/requireMarketplaceLogin";
import type { MarketplaceStats } from "@/app/common/components/buysell/utils";
import { EMPTY_FILTERS } from "@/app/admin/portal/buysell/_components/interface/buysell_interface";
import { useMarketplaceAuth } from "@/components/marketplace/MarketplaceAuthProvider";
import { MARKETPLACE } from "@/constants/marketplace";
import { toErrorMessage } from "@/lib/errors";
import { isAbortError } from "@/lib/apiCache";

const EMPTY_STATS: MarketplaceStats = {
  totalListings: 0,
  activeListings: 0,
  soldVehicles: 0,
  totalOffers: 0,
};

function seedFavoritesFromProducts(products: BuySellProduct[]): Set<string> {
  const ids = new Set<string>();
  for (const p of products) {
    if (p.is_favorite) {
      ids.add(getBuySellRowId(p));
    }
  }
  return ids;
}

export default function UserProductDashboardPage() {
  const router = useRouter();
  const { notify } = useNotification();
  const notifyRef = useRef(notify);
  notifyRef.current = notify;
  const { isLoggedIn, authReady } = useMarketplaceAuth();

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [exploreVehicles, setExploreVehicles] = useState<BuySellProduct[]>([]);
  const [explorePage, setExplorePage] = useState(1);
  const [exploreTotalPages, setExploreTotalPages] = useState(1);
  const [featuredVehicles, setFeaturedVehicles] = useState<BuySellProduct[]>([]);
  const [dashboardData, setDashboardData] = useState<
    BuySellDashboardStatsResponse["data"] | null
  >(null);
  const [statsError, setStatsError] = useState("");
  const [statsUpdatedAt, setStatsUpdatedAt] = useState<Date | null>(null);
  const [listError, setListError] = useState("");
  const [featuredError, setFeaturedError] = useState("");
  const [loading, setLoading] = useState(true);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const favoriteIdsRef = useRef(favoriteIds);
  favoriteIdsRef.current = favoriteIds;

  const loadExplorePage = useCallback(
    async (page: number, signal?: AbortSignal) => {
      const result = await getBuySellListPage(
        {
          ...toBuySellListPayload({ ...EMPTY_FILTERS, usear_type: "all" }),
          statuses: [...MARKETPLACE.BROWSE_STATUSES],
          page,
          limit: MARKETPLACE.VEHICLE_PAGE_SIZE,
        },
        { signal },
      );
      return result;
    },
    [],
  );

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setStatsError("");
    setListError("");
    setFeaturedError("");
    try {
      const [cats, exploreResult, featuredResult, dashStats] = await Promise.all([
        getCategories({ activeOnly: true }),
        loadExplorePage(1, signal).catch((err) => {
          if (isAbortError(err)) throw err;
          setListError(
            toErrorMessage(err, "Failed to load vehicles"),
          );
          return {
            items: [] as BuySellProduct[],
            total: 0,
            page: 1,
            limit: MARKETPLACE.VEHICLE_PAGE_SIZE,
            totalPages: 1,
          };
        }),
        getBuySellFeaturedVehicles(MARKETPLACE.FEATURED_SECTION_LIMIT)
          .then((data) => ({ data: data ?? [], error: "" as string }))
          .catch((err) => ({
            data: [] as BuySellProduct[],
            error:
              err instanceof Error ? err.message : "Failed to load featured vehicles",
          })),
        getBuySellDashboardStats().catch((err) => {
          setStatsError(
            err instanceof Error ? err.message : "Failed to load statistics",
          );
          return null;
        }),
      ]);
      if (signal?.aborted) return;
      setCategories(cats ?? []);
      setExploreVehicles(exploreResult.items ?? []);
      setExplorePage(exploreResult.page ?? 1);
      setExploreTotalPages(exploreResult.totalPages ?? 1);
      setFeaturedVehicles(featuredResult.data);
      setFeaturedError(featuredResult.error);
      setFavoriteIds(
        seedFavoritesFromProducts([
          ...(exploreResult.items ?? []),
          ...featuredResult.data,
        ]),
      );
      setDashboardData(dashStats);
      if (dashStats) setStatsUpdatedAt(new Date());

      if ((exploreResult.items?.length ?? 0) === 0) {
        setListError("No vehicles to show yet. List a vehicle or check back soon.");
      }
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) return;
      const message = err instanceof Error ? err.message : "Failed to load dashboard";
      setListError(message);
      notifyRef.current({ type: "error", message });
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [loadExplorePage]);

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => {
      controller.abort();
    };
  }, [loadData]);

  const handleExplorePageChange = useCallback(
    async (page: number) => {
      setExploreLoading(true);
      setListError("");
      try {
        const result = await loadExplorePage(page);
        setExploreVehicles(result.items ?? []);
        setExplorePage(result.page ?? page);
        setExploreTotalPages(result.totalPages ?? 1);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          for (const p of result.items ?? []) {
            if (p.is_favorite) next.add(getBuySellRowId(p));
          }
          return next;
        });
        if ((result.items?.length ?? 0) === 0) {
          setListError("No vehicles to show yet. List a vehicle or check back soon.");
        }
      } catch (err) {
        setListError(
          err instanceof Error ? err.message : "Failed to load vehicles",
        );
      } finally {
        setExploreLoading(false);
      }
    },
    [loadExplorePage],
  );

  const marketplaceStats = useMemo(() => {
    if (dashboardData?.marketplace) {
      return mapDashboardMetricsToMarketplaceStats(dashboardData.marketplace);
    }
    return EMPTY_STATS;
  }, [dashboardData]);

  const mySellStats = useMemo(() => {
    if (dashboardData?.mySell) {
      return mapDashboardMetricsToMarketplaceStats(dashboardData.mySell);
    }
    return null;
  }, [dashboardData]);

  const handleSearch = () => {
    router.push(
      userProductRoutes.list({
        ...(search.trim() ? { q: search.trim() } : {}),
        ...(categoryId ? { category_id: categoryId } : {}),
      }),
    );
  };

  const handleFavoriteToggle = useCallback(
    async (productId: string) => {
      const isFav = favoriteIdsRef.current.has(productId);
      setTogglingIds((prev) => new Set(prev).add(productId));
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        isFav ? next.delete(productId) : next.add(productId);
        return next;
      });

      try {
        if (isFav) {
          await removeFavorite("buySell", productId);
        } else {
          await addFavorite("buySell", productId);
        }
      } catch (err) {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          isFav ? next.add(productId) : next.delete(productId);
          return next;
        });
        notify({
          type: "error",
          message: toErrorMessage(err, "Favorite update failed"),
        });
      } finally {
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      }
    },
    [notify],
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
    <Box>
      <HeroSearchSection
        search={search}
        categoryId={categoryId}
        categories={categories}
        onSearchChange={setSearch}
        onCategoryChange={setCategoryId}
        onSearch={handleSearch}
      />

      <Box
        sx={{
          mt: 3,
          mb: 1,
          p: { xs: 2.5, md: 3 },
          borderRadius: 3,
          background: GRADIENT,
          color: "#fff",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { sm: "center" },
          justifyContent: "space-between",
          gap: 2,
          boxShadow: "0 12px 32px rgba(37, 99, 235, 0.28)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              opacity: 0.85,
              mb: 0.75,
            }}
          >
            Quick actions
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: 18, md: 22 }, mb: 0.5, letterSpacing: "-0.02em" }}>
            AI Assistant
          </Typography>
          <Typography sx={{ opacity: 0.92, fontSize: 14, maxWidth: 560, lineHeight: 1.55 }}>
            Create listings by chatting, check inventory status, and search your vehicles — no forms needed.
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            onClick={() => router.push(userProductRoutes.assistant())}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              bgcolor: "#fff",
              color: PRIMARY_DARK,
              borderRadius: 2.5,
              px: 2.5,
              boxShadow: "none",
              "&:hover": { bgcolor: "rgba(255,255,255,0.92)", boxShadow: "none" },
            }}
          >
            Open Assistant
          </Button>
          <Button
            variant="outlined"
            onClick={() =>
              router.push(
                `${userProductRoutes.assistant()}?q=${encodeURIComponent("I want to sell my truck")}`,
              )
            }
            sx={{
              textTransform: "none",
              fontWeight: 600,
              color: "#fff",
              borderColor: "rgba(255,255,255,0.55)",
              borderRadius: 2.5,
              "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.08)" },
            }}
          >
            Sell with AI
          </Button>
        </Box>
      </Box>

      <Box sx={{ mt: 4 }}>
        {statsError && !loading ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {statsError}
          </Alert>
        ) : null}
        {loading ? (
          <StatsSkeleton />
        ) : (
          <MarketplaceStatsCards
            stats={marketplaceStats}
            mySell={mySellStats}
            updatedAt={statsUpdatedAt}
            onViewMyListings={() => router.push(userProductRoutes.sellVehicle())}
          />
        )}
      </Box>

      <Box sx={{ mt: 5 }}>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: { xs: 18, md: 20 },
            mb: 2,
            color: T.color.textPrimary,
            letterSpacing: "-0.02em",
          }}
        >
          Top categories
        </Typography>
        <CategoryScroller>
          {categories.map((cat) => (
            <CategoryCard
              key={cat._id}
              category={cat}
              onClick={(id) =>
                router.push(userProductRoutes.list({ category_id: id }))
              }
            />
          ))}
        </CategoryScroller>
      </Box>

      <Box sx={{ mt: 5 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
            gap: 2,
          }}
        >
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: { xs: 18, md: 20 },
              color: T.color.textPrimary,
              letterSpacing: "-0.02em",
            }}
          >
            Explore all vehicles
          </Typography>
          <Button
            onClick={() => router.push(userProductRoutes.list())}
            sx={{ textTransform: "none", fontWeight: 700, color: "primary.main" }}
          >
            View all →
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Browse every active listing on TRUCKS99
          {!loading && exploreVehicles.length > 0
            ? ` · page ${explorePage} of ${exploreTotalPages}`
            : ""}
          .
        </Typography>
        {listError && !loading && exploreVehicles.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            {listError}
          </Alert>
        ) : null}
        <VehicleGrid
          products={exploreVehicles}
          loading={loading || exploreLoading}
          favoriteIds={favoriteIds}
          togglingFavoriteIds={togglingIds}
          onFavoriteToggle={handleFavoriteToggle}
          onProductClick={(id) => void handleViewProduct(id)}
          page={explorePage}
          totalPages={exploreTotalPages}
          onPageChange={(page) => void handleExplorePageChange(page)}
          emptyDescription="No vehicles to explore yet. Be the first to list on TRUCKS99."
        />
      </Box>

      <Box sx={{ mt: 5 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
            gap: 2,
          }}
        >
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: { xs: 18, md: 20 },
              color: T.color.textPrimary,
              letterSpacing: "-0.02em",
            }}
          >
            Featured vehicles
          </Typography>
          <Button
            onClick={() => router.push(userProductRoutes.featuredVehicles())}
            sx={{ textTransform: "none", fontWeight: 700, color: "primary.main" }}
          >
            View all →
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Premium listings with paid featured visibility on TRUCKS99.
        </Typography>
        <FeaturedVehiclesGrid
          products={featuredVehicles}
          loading={loading}
          error={featuredError}
          onRetry={() => void loadData()}
          onViewDetails={(id) => void handleViewProduct(id)}
          onBrowseAll={() => router.push(userProductRoutes.list())}
          emptyDescription="No featured listings yet. Browse all vehicles or feature yours from your listing page."
        />
      </Box>
    </Box>
  );
}
