"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ViewModuleOutlinedIcon from "@mui/icons-material/ViewModuleOutlined";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCardSkeleton } from "@/components/ui/Skeleton";
import {
  SortDropdown,
  VehicleGrid,
  paginateProducts,
  getTotalPages,
  VEHICLE_PAGE_SIZE,
  sortProducts,
  type SortOption,
} from "@/app/common/components/buysell";
import { formatProductPrice } from "@/app/common/components/buysell/utils";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { useNotification } from "@/hooks/useNotification";
import { useBuySellFavorites } from "@/lib/useBuySellFavorites";
import { listBuySellFavoriteProducts } from "@/model/services/favoriteapi";
import { getBuySellRowId, type BuySellProduct } from "@/model/services/buysellapi";
import { getCurrentUser } from "@/model/services/user";
import { PRODUCT_THEME as T } from "@/lib/theme";

export default function UserProductFavoritesPage() {
  const router = useRouter();
  const { notify } = useNotification();
  const [products, setProducts] = useState<BuySellProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [layout, setLayout] = useState<"grid" | "list">("list");
  const [page, setPage] = useState(1);

  const { favoriteIds, togglingIds, syncFromProducts, toggleFavorite } =
    useBuySellFavorites(notify);

  useEffect(() => {
    getCurrentUser()
      .then((user) => setLoggedIn(Boolean(user?.id || (user as { _id?: string })?._id)))
      .catch(() => setLoggedIn(false));
  }, []);

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const items = await listBuySellFavoriteProducts();
      setProducts(items);
      syncFromProducts(items);
    } catch (err) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to load favourite list",
      });
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [notify, syncFromProducts]);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  const handleFavoriteToggle = useCallback(
    async (productId: string) => {
      if (!loggedIn) {
        notify({ type: "error", message: "Please log in to manage favourites." });
        return;
      }
      const wasFavorite = favoriteIds.has(String(productId));
      await toggleFavorite(productId);
      if (wasFavorite) {
        setProducts((prev) =>
          prev.filter((p) => String(getBuySellRowId(p)) !== String(productId)),
        );
      } else {
        void loadFavorites();
      }
    },
    [loggedIn, favoriteIds, toggleFavorite, loadFavorites, notify],
  );

  const displayProducts = useMemo(() => sortProducts(products, sortBy), [products, sortBy]);

  const pagedProducts = useMemo(
    () => paginateProducts(displayProducts, page, VEHICLE_PAGE_SIZE),
    [displayProducts, page],
  );
  const totalPages = getTotalPages(displayProducts.length, VEHICLE_PAGE_SIZE);

  const totalValue = products.reduce((sum, p) => sum + (Number(p.price) || 0), 0);

  return (
    <Box>
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
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 24, mb: 0.5, color: T.color.textPrimary }}>
            My Favorite List
          </Typography>
          <Typography sx={{ color: T.color.textSecondary, lineHeight: 1.6 }}>
            {loading
              ? "Loading your saved vehicles…"
              : products.length === 0
                ? "Vehicles you saved with the heart icon while browsing."
                : `${products.length.toLocaleString("en-IN")} vehicle${products.length !== 1 ? "s" : ""} saved`}
          </Typography>
        </Box>

        {!loading && products.length > 0 ? (
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
          </Box>
        ) : null}
      </Box>

      {loading ? (
        <StatCardSkeleton count={2} />
      ) : products.length === 0 ? (
        <EmptyState
          title="No favourites yet"
          description="Browse listings and tap the heart on any vehicle to add it to your favourite list."
          icon={<FavoriteBorderIcon sx={{ fontSize: 36 }} />}
          action={
            <Button variant="contained" onClick={() => router.push(userProductRoutes.list())}>
              Browse vehicles
            </Button>
          }
        />
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 300px" }, gap: 3 }}>
          <VehicleGrid
            products={pagedProducts}
            layout={layout}
            favoriteIds={favoriteIds}
            togglingFavoriteIds={togglingIds}
            onFavoriteToggle={(id) => void handleFavoriteToggle(id)}
            onProductClick={(id) => router.push(userProductRoutes.view(id))}
            emptyTitle="No favourites"
            emptyDescription="Your saved vehicles will appear here."
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />

          <Box
            sx={{
              p: 3,
              borderRadius: T.radius.lg,
              border: `1px solid ${T.color.border}`,
              bgcolor: T.color.surface,
              height: "fit-content",
              position: { lg: "sticky" },
              top: 88,
            }}
          >
            <Typography variant="overline" color="text.secondary" fontWeight={700}>
              Favourite summary
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 1 }}>
              {products.length}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              vehicle{products.length !== 1 ? "s" : ""} saved
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="body2">Combined listed value</Typography>
              <Typography variant="body2" fontWeight={700}>
                {formatProductPrice(totalValue)}
              </Typography>
            </Box>
            <Button
              fullWidth
              variant="contained"
              onClick={() => router.push(userProductRoutes.list())}
              sx={{ bgcolor: "#2563eb", textTransform: "none", fontWeight: 700 }}
            >
              Browse more vehicles
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
