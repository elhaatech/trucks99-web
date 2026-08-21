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
  getBuySellRecentVehicles,
  type BuySellProduct,
  type BuySellDashboardStatsResponse,
} from "@/model/services/buysellapi";
import { getCategories, type Category } from "@/model/services/category";
import { useNotification } from "@/hooks/useNotification";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { ensureLoggedInToViewProduct } from "@/lib/requireMarketplaceLogin";
import type { MarketplaceStats } from "@/app/common/components/buysell/utils";
import { EMPTY_FILTERS } from "@/app/admin/portal/buysell/_components/interface/buysell_interface";
import { useMarketplaceAuth } from "@/components/marketplace/MarketplaceAuthProvider";
import { MARKETPLACE } from "@/constants/marketplace";
import { toErrorMessage } from "@/lib/errors";
import { isAbortError } from "@/lib/apiCache";
import { GoogleAdBanner } from "@/components/ads/GoogleAdBanner";
import { SHOW_ADS } from "@/components/ads/adsConfig";

const EMPTY_STATS: MarketplaceStats = {
  totalListings: 0,
  activeListings: 0,
  soldVehicles: 0,
  totalOffers: 0,
};

export default function UserProductDashboard() {
  const router = useRouter();
  const { notify } = useNotification();
  const notifyRef = useRef(notify);
  notifyRef.current = notify;
  const { isLoggedIn, authReady } = useMarketplaceAuth();

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredVehicles, setFeaturedVehicles] = useState<BuySellProduct[]>([]);
  const [recentVehicles, setRecentVehicles] = useState<BuySellProduct[]>([]);
  const [dashboardData, setDashboardData] = useState<
    BuySellDashboardStatsResponse["data"] | null
  >(null);
  const [statsError, setStatsError] = useState("");
  const [statsUpdatedAt, setStatsUpdatedAt] = useState<Date | null>(null);
  const [featuredError, setFeaturedError] = useState("");
  const [recentVehiclesError, setRecentVehiclesError] = useState("");
  const [statsLoading, setStatsLoading] = useState(true);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [recentVehiclesLoading, setRecentVehiclesLoading] = useState(true);

  const loadExplorePage = useCallback(
    async (page: number, signal: AbortSignal) => {
      const result = await getBuySellListPage(
        {
          ...toBuySellListPayload({ ...EMPTY_FILTERS, usear_type: "all" }),
          page,
          limit: MARKETPLACE.VEHICLE_PAGE_SIZE,
        },
        { signal },
      );
      return {
        items: result.items ?? [],
        total: result.total ?? 0,
        totalPages: result.totalPages ?? 1,
        page: result.page ?? page,
      };
    },
    [],
  );

  const exploreList = useInfiniteScroll(loadExplorePage);

  useEffect(() => {
    if (
      exploreList.error &&
      exploreList.items.length === 0 &&
      !isAbortError(exploreList.error)
    ) {
      notifyRef.current({
        type: "error",
        message: exploreList.error.message,
      });
    }
  }, [exploreList.error, exploreList.items.length]);

  /** Critical path first (explore), then stats/featured/categories — don't block first paint. */
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    setStatsLoading(true);
    setRecentVehiclesLoading(true);
    setStatsError("");
    setRecentVehiclesError("");

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

    void getBuySellRecentVehicles(MARKETPLACE.RECENT_SECTION_LIMIT)
      .then((data) => {
        if (signal.aborted) return;
        const items = data ?? [];
        setRecentVehicles(items);
      })
      .catch((err) => {
        if (signal.aborted) return;
        setRecentVehiclesError(toErrorMessage(err, "Failed to load recent vehicles"));
      })
      .finally(() => {
        if (!signal.aborted) setRecentVehiclesLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;
    setFeaturedLoading(true);
    setFeaturedError("");

    void getBuySellFeaturedVehicles(MARKETPLACE.FEATURED_SECTION_LIMIT)
      .then((data) => {
        if (cancelled) return;
        const items = data ?? [];
        setFeaturedVehicles(items);
      })
      .catch((err) => {
        if (cancelled) return;
        setFeaturedError(toErrorMessage(err, "Failed to load featured vehicles"));
      })
      .finally(() => {
        if (!cancelled) setFeaturedLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authReady]);

  const loadFeaturedVehicles = useCallback(() => {
    setFeaturedLoading(true);
    setFeaturedError("");
    void getBuySellFeaturedVehicles(MARKETPLACE.FEATURED_SECTION_LIMIT)
      .then((data) => setFeaturedVehicles(data ?? []))
      .catch((err) =>
        setFeaturedError(toErrorMessage(err, "Failed to load featured vehicles")),
      )
      .finally(() => setFeaturedLoading(false));
  }, [isLoggedIn]);

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

      {SHOW_ADS && <GoogleAdBanner placement="dashboard" format="auto" responsive />}

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
            fontSize: 24,
            mb: 3,
            color: T.color.textPrimary,
            letterSpacing: "-0.01em",
          }}
        >
          Top Categories
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
              fontSize: 24,
              color: T.color.textPrimary,
              letterSpacing: "-0.01em",
            }}
          >
            Featured Vehicles
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
        {authReady ? (
          <FeaturedVehiclesGrid
            products={featuredVehicles}
            loading={featuredLoading}
            error={featuredError}
            onRetry={loadFeaturedVehicles}
            onViewDetails={(id) => void handleViewProduct(id)}
            onBrowseAll={() => router.push(userProductRoutes.list())}
            emptyDescription="No featured listings yet. Browse all vehicles or feature yours from your listing page."
          />
        ) : (
          <FeaturedVehiclesGrid products={[]} loading onViewDetails={() => {}} />
        )}
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
              fontSize: 24,
              color: T.color.textPrimary,
              letterSpacing: "-0.01em",
            }}
          >
            Recently Added Vehicles
          </Typography>
          <Button
            onClick={() => router.push(userProductRoutes.list())}
            sx={{ textTransform: "none", fontWeight: 700, color: "primary.main" }}
          >
            View all →
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Fresh listings posted recently on TRUCKS99.
        </Typography>
        {recentVehiclesError && !recentVehiclesLoading ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {recentVehiclesError}
          </Alert>
        ) : null}
        <VehicleGrid
          products={recentVehicles}
          loading={recentVehiclesLoading}
          onProductClick={(id) => void handleViewProduct(id)}
          emptyDescription="No recent vehicles yet. Check back soon for newly listed trucks."
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
              fontSize: 24,
              color: T.color.textPrimary,
              letterSpacing: "-0.01em",
            }}
          >
            Explore All Vehicles
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
          {!exploreList.loading && exploreList.items.length > 0
            ? ` · ${exploreList.total.toLocaleString("en-IN")} vehicle${exploreList.total !== 1 ? "s" : ""}`
            : ""}
          .
        </Typography>
        {exploreList.error &&
        exploreList.items.length === 0 &&
        !isAbortError(exploreList.error) ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            {exploreList.error.message ||
              "No vehicles to show yet. List a vehicle or check back soon."}
          </Alert>
        ) : null}
        <VehicleGrid
          products={exploreList.items}
          loading={exploreList.loading}
          hasMore={exploreList.hasMore}
          sentinelRef={exploreList.sentinelRef}
          onProductClick={(id) => void handleViewProduct(id)}
          emptyDescription="No vehicles to explore yet. Be the first to list on TRUCKS99."
        />
      </Box>


    </Box>
  );
}
