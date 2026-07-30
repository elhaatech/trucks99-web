"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  sortProducts,
  paginateProducts,
  getTotalPages,
  VEHICLE_PAGE_SIZE,
} from "@/app/common/components/buysell";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { PRODUCT_THEME as T } from "@/lib/theme";
import { toBuySellListPayload } from "@/lib/buySellListUtils";
import {
  getBuySellDashboardStats,
  getBuySellFeaturedVehicles,
  getBuySellList,
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

const EMPTY_STATS: MarketplaceStats = {
  totalListings: 0,
  activeListings: 0,
  soldVehicles: 0,
  totalOffers: 0,
};

const FEATURED_SECTION_LIMIT = 8;
const BROWSE_STATUSES = new Set(["active", "pending"]);

/** Marketplace explore — every seller via POST /api/buy-sell/list { usear_type: "all" }. */
async function loadExploreAllVehicles(): Promise<BuySellProduct[]> {
  const list = await getBuySellList(
    toBuySellListPayload({ ...EMPTY_FILTERS, usear_type: "all" }),
  );
  const browse = (list ?? []).filter((p) =>
    BROWSE_STATUSES.has((p.status ?? "").toLowerCase()),
  );
  return sortProducts(browse, "newest");
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
  const [allVehicles, setAllVehicles] = useState<BuySellProduct[]>([]);
  const [explorePage, setExplorePage] = useState(1);
  const [featuredVehicles, setFeaturedVehicles] = useState<BuySellProduct[]>([]);
  const [dashboardData, setDashboardData] = useState<
    BuySellDashboardStatsResponse["data"] | null
  >(null);
  const [statsError, setStatsError] = useState("");
  const [statsUpdatedAt, setStatsUpdatedAt] = useState<Date | null>(null);
  const [listError, setListError] = useState("");
  const [featuredError, setFeaturedError] = useState("");
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    setStatsError("");
    setListError("");
    setFeaturedError("");
    try {
      const [cats, explore, featuredResult, dashStats] = await Promise.all([
        getCategories({ activeOnly: true }),
        loadExploreAllVehicles().catch((err) => {
          setListError(
            err instanceof Error ? err.message : "Failed to load vehicles",
          );
          return [] as BuySellProduct[];
        }),
        getBuySellFeaturedVehicles(FEATURED_SECTION_LIMIT)
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
      setCategories(cats ?? []);
      setAllVehicles(explore ?? []);
      setExplorePage(1);
      setFeaturedVehicles(featuredResult.data);
      setFeaturedError(featuredResult.error);
      setFavoriteIds(
        seedFavoritesFromProducts([...(explore ?? []), ...featuredResult.data]),
      );
      setDashboardData(dashStats);
      if (dashStats) setStatsUpdatedAt(new Date());

      if ((explore?.length ?? 0) === 0) {
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

  const exploreTotalPages = useMemo(
    () => getTotalPages(allVehicles.length, VEHICLE_PAGE_SIZE),
    [allVehicles.length],
  );

  const pagedExploreVehicles = useMemo(
    () => paginateProducts(allVehicles, explorePage, VEHICLE_PAGE_SIZE),
    [allVehicles, explorePage],
  );

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
          background: "linear-gradient(135deg, #0C4A6E 0%, #0369A1 48%, #0EA5E9 100%)",
          color: "#fff",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { sm: "center" },
          justifyContent: "space-between",
          gap: 2,
          boxShadow: "0 12px 32px rgba(3, 105, 161, 0.28)",
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
              color: "#0C4A6E",
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
          {!loading && allVehicles.length > 0
            ? ` · ${allVehicles.length.toLocaleString("en-IN")} vehicles`
            : ""}
          .
        </Typography>
        {listError && !loading && allVehicles.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            {listError}
          </Alert>
        ) : null}
        <VehicleGrid
          products={pagedExploreVehicles}
          loading={loading}
          favoriteIds={favoriteIds}
          togglingFavoriteIds={togglingIds}
          onFavoriteToggle={handleFavoriteToggle}
          onProductClick={(id) => void handleViewProduct(id)}
          page={explorePage}
          totalPages={exploreTotalPages}
          onPageChange={setExplorePage}
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
