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
  const [statsLoading, setStatsLoading] = useState(true);
  const [featuredLoading, setFeaturedLoading] = useState(true);
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

  /** Critical path first (explore), then stats/featured/categories — don't block first paint. */
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    setLoading(true);
    setStatsLoading(true);
    setFeaturedLoading(true);
    setStatsError("");
    setListError("");
    setFeaturedError("");

    void (async () => {
      try {
        const exploreResult = await loadExplorePage(1, signal);
        if (signal.aborted) return;
        setExploreVehicles(exploreResult.items ?? []);
        setExplorePage(exploreResult.page ?? 1);
        setExploreTotalPages(exploreResult.totalPages ?? 1);
        setFavoriteIds(seedFavoritesFromProducts(exploreResult.items ?? []));
        if ((exploreResult.items?.length ?? 0) === 0) {
          setListError("No vehicles to show yet. List a vehicle or check back soon.");
        }
      } catch (err) {
        if (isAbortError(err) || signal.aborted) return;
        const message = toErrorMessage(err, "Failed to load vehicles");
        setListError(message);
        notifyRef.current({ type: "error", message });
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    })();

    void getCategories({ activeOnly: true })
      .then((cats) => {
        if (!signal.aborted) setCategories(cats ?? []);
      })
      .catch(() => {
        /* categories are non-critical for first paint */
      });

    void getBuySellDashboardStats()
      .then((dashStats) => {
        if (signal.aborted) return;
        setDashboardData(dashStats);
        if (dashStats) setStatsUpdatedAt(new Date());
      })
      .catch((err) => {
        if (signal.aborted) return;
        setStatsError(toErrorMessage(err, "Failed to load statistics"));
      })
      .finally(() => {
        if (!signal.aborted) setStatsLoading(false);
      });

    void getBuySellFeaturedVehicles(MARKETPLACE.FEATURED_SECTION_LIMIT)
      .then((data) => {
        if (signal.aborted) return;
        const items = data ?? [];
        setFeaturedVehicles(items);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          for (const p of items) {
            if (p.is_favorite) next.add(getBuySellRowId(p));
          }
          return next;
        });
      })
      .catch((err) => {
        if (signal.aborted) return;
        setFeaturedError(toErrorMessage(err, "Failed to load featured vehicles"));
      })
      .finally(() => {
        if (!signal.aborted) setFeaturedLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [loadExplorePage]);

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

  

      <Box sx={{ mt: 4 }}>
        {statsError && !statsLoading ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {statsError}
          </Alert>
        ) : null}
        {statsLoading ? (
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
          loading={featuredLoading}
          error={featuredError}
          onRetry={() => {
            setFeaturedLoading(true);
            setFeaturedError("");
            void getBuySellFeaturedVehicles(MARKETPLACE.FEATURED_SECTION_LIMIT)
              .then((data) => setFeaturedVehicles(data ?? []))
              .catch((err) =>
                setFeaturedError(
                  toErrorMessage(err, "Failed to load featured vehicles"),
                ),
              )
              .finally(() => setFeaturedLoading(false));
          }}
          onViewDetails={(id) => void handleViewProduct(id)}
          onBrowseAll={() => router.push(userProductRoutes.list())}
          emptyDescription="No featured listings yet. Browse all vehicles or feature yours from your listing page."
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


    </Box>
  );
}
