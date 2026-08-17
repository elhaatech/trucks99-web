"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import {
  HeroSearchSection,
  MarketplaceStatsCards,
  CategoryCard,
  CategoryScroller,
  VehicleGrid,
  StatsSkeleton,
  mapDashboardMetricsToMarketplaceStats,
  sortProducts,
} from "@/app/common/components/buysell";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { PRODUCT_THEME as T } from "@/lib/theme";
import {
  getBuySellDashboardStats,
  getBuySellRecentVehicles,
  getBuySellFeaturedVehicles,
  getBuySellList,
  getBuySellRowId,
  type BuySellProduct,
  type BuySellDashboardStatsResponse,
} from "@/model/services/buysellapi";
import { getCategories, type Category } from "@/model/services/category";
import { addFavorite, removeFavorite } from "@/model/services/favoriteapi";
import { useNotification } from "@/hooks/useNotification";
import type { MarketplaceStats } from "@/app/common/components/buysell/utils";

const EMPTY_STATS: MarketplaceStats = {
  totalListings: 0,
  activeListings: 0,
  soldVehicles: 0,
  totalOffers: 0,
};

const VEHICLE_SECTION_LIMIT = 8;

const BROWSE_STATUSES = new Set(["active", "pending"]);

async function loadDashboardRecentVehicles(limit: number): Promise<BuySellProduct[]> {
  const fromRecentApi = await getBuySellRecentVehicles(limit);
  return fromRecentApi || [];
}

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

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentVehicles, setRecentVehicles] = useState<BuySellProduct[]>([]);
  const [featuredVehicles, setFeaturedVehicles] = useState<BuySellProduct[]>([]);
  const [dashboardData, setDashboardData] = useState<
    BuySellDashboardStatsResponse["data"] | null
  >(null);
  const [statsError, setStatsError] = useState("");
  const [listError, setListError] = useState("");
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    setStatsError("");
    setListError("");
    try {
      const [cats, recent, featured, dashStats] = await Promise.all([
        getCategories({ activeOnly: true }),
        loadDashboardRecentVehicles(VEHICLE_SECTION_LIMIT).catch(() => [] as BuySellProduct[]),
        getBuySellFeaturedVehicles(VEHICLE_SECTION_LIMIT).catch(() => [] as BuySellProduct[]),
        getBuySellDashboardStats().catch((err) => {
          setStatsError(err instanceof Error ? err.message : "Failed to load statistics");
          return null;
        }),
      ]);
      setCategories(cats ?? []);
      setRecentVehicles(recent ?? []);
      const featuredList = featured ?? [];
      setFeaturedVehicles(featuredList);
      setFavoriteIds(seedFavoritesFromProducts([...(recent ?? []), ...featuredList]));
      setDashboardData(dashStats);

      if ((recent?.length ?? 0) === 0 && (featured?.length ?? 0) === 0) {
        setListError("No vehicles to show yet. List a vehicle or check back soon.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load dashboard";
      setListError(message);
      notify({ type: "error", message });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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
      const isFav = favoriteIds.has(productId);
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
          message: err instanceof Error ? err.message : "Favorite update failed",
        });
      } finally {
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      }
    },
    [favoriteIds, notify],
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

      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: 24, mb: 3, color: T.color.textPrimary, letterSpacing: "-0.01em" }}>
          Marketplace Statistics
        </Typography>
        {statsError && !loading ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {statsError}
          </Alert>
        ) : null}
        {loading ? <StatsSkeleton /> : <MarketplaceStatsCards stats={marketplaceStats} />}
      </Box>

      {mySellStats ? (
        <Box sx={{ mt: 4 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 24, mb: 3, color: T.color.textPrimary, letterSpacing: "-0.01em" }}>
            Your Sell Activity
          </Typography>
          <MarketplaceStatsCards stats={mySellStats} />
        </Box>
      ) : null}

      <Box sx={{ mt: 5 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 24, mb: 3, color: T.color.textPrimary, letterSpacing: "-0.01em" }}>
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
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 24, color: T.color.textPrimary, letterSpacing: "-0.01em" }}>
            Featured Vehicles
          </Typography>
          <Typography
            component="button"
            onClick={() => router.push(userProductRoutes.list())}
            sx={{
              border: "none",
              bgcolor: "transparent",
              color: T.color.textSecondary,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            View all →
          </Typography>
        </Box>
        <VehicleGrid
          products={featuredVehicles}
          loading={loading}
          favoriteIds={favoriteIds}
          togglingFavoriteIds={togglingIds}
          onFavoriteToggle={handleFavoriteToggle}
          onProductClick={(id) => router.push(userProductRoutes.view(id))}
          emptyDescription="No featured listings yet. Browse all vehicles or list yours on TRUCK99."
        />
      </Box>

      <Box sx={{ mt: 5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 24, color: T.color.textPrimary, letterSpacing: "-0.01em" }}>
              Recently Added Vehicles
            </Typography>
            <Typography sx={{ fontSize: 13, color: T.color.textMuted, fontWeight: 500, mt: 0.5 }}>
              Vehicles listed in the last 7 days
            </Typography>
          </Box>
          <Typography
            component="button"
            onClick={() => router.push(userProductRoutes.list())}
            sx={{
              border: "none",
              bgcolor: "transparent",
              color: T.color.textSecondary,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            View all →
          </Typography>
        </Box>
        {listError && !loading && recentVehicles.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            {listError}
          </Alert>
        ) : null}
        <VehicleGrid
          products={recentVehicles}
          loading={loading}
          favoriteIds={favoriteIds}
          togglingFavoriteIds={togglingIds}
          onFavoriteToggle={handleFavoriteToggle}
          onProductClick={(id) => router.push(userProductRoutes.view(id))}
          emptyDescription="No new listings yet. Be the first to list a vehicle on TRUCK99."
        />
      </Box>
    </Box>
  );
}
