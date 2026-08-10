"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";

import {
  BuySellProduct,
  getBuySellRowId,
  postBuySellProductsByOwner,
} from "@/model/services/buysellapi";
import { addFavorite, removeFavorite } from "@/model/services/favoriteapi";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";
import { VehicleCard } from "@/app/common/components/buysell/VehicleCard";

type UserRelatedProductsSectionProps = {
  sellerId: string;
  sellerName?: string;
  excludeProductId: string;
  isLoggedIn: boolean;
  /** When true, copy and actions target the listing owner (logged-in seller). */
  isOwnerView?: boolean;
  onAddVehicle?: () => void;
  onNotify?: (payload: { type: "success" | "error"; message: string }) => void;
};

function RelatedCardSkeleton() {
  return (
    <Box sx={{ borderRadius: T.radius.lg, border: `1px solid ${T.color.border}`, overflow: "hidden" }}>
      <Skeleton variant="rectangular" height={150} />
      <Box sx={{ p: 1.5 }}>
        <Skeleton width="80%" />
        <Skeleton width="50%" sx={{ mt: 1 }} />
      </Box>
    </Box>
  );
}

export function UserRelatedProductsSection({
  sellerId,
  sellerName,
  excludeProductId,
  isLoggedIn,
  isOwnerView = false,
  onAddVehicle,
  onNotify,
}: UserRelatedProductsSectionProps) {
  const router = useRouter();
  const [products, setProducts] = useState<BuySellProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isLoggedIn || !sellerId) {
      setProducts([]);
      return;
    }
    setLoading(true);
    setError("");
    postBuySellProductsByOwner({ ownerId: sellerId, excludeProductId, limit: 12 })
      .then((data) => {
        const items = data.products ?? [];
        setProducts(items);
        setFavoriteIds(
          new Set(items.filter((p) => p.is_favorite).map((p) => getBuySellRowId(p))),
        );
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load related listings"),
      )
      .finally(() => setLoading(false));
  }, [sellerId, excludeProductId, isLoggedIn]);

  const handleFavorite = useCallback(
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
          onNotify?.({ type: "success", message: "Removed from favourites." });
        } else {
          await addFavorite("buySell", productId);
          onNotify?.({ type: "success", message: "Added to favourites." });
        }
      } catch (err) {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          isFav ? next.add(productId) : next.delete(productId);
          return next;
        });
        onNotify?.({
          type: "error",
          message: err instanceof Error ? err.message : "Favourite update failed",
        });
      } finally {
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      }
    },
    [favoriteIds, onNotify],
  );

  if (!sellerId) return null;

  return (
    <Box
      sx={{
        mb: 2.5,
        p: { xs: 2, md: 2.5 },
        borderRadius: T.radius.lg,
        border: `1px solid ${T.color.border}`,
        bgcolor: T.color.surface,
        boxShadow: T.shadow.card,
      }}
    >
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 1, mb: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 17, mb: 0.5 }}>
            {isOwnerView ? "Your other listings" : `More from ${sellerName ?? "this seller"}`}
          </Typography>
          <Typography sx={{ fontSize: 13, color: T.color.textSecondary, lineHeight: 1.6 }}>
            {isOwnerView
              ? "Manage your fleet — open another listing or list a new vehicle for sale."
              : "Browse other vehicles by this seller. Use View Product to open details, ♥ to save to favourites, or the chat icon to message the seller."}
          </Typography>
        </Box>
        {isOwnerView && onAddVehicle ? (
          <Button
            variant="contained"
            size="small"
            onClick={onAddVehicle}
            sx={{ bgcolor: INFO, textTransform: "none", fontWeight: 600, flexShrink: 0 }}
          >
            List another vehicle
          </Button>
        ) : null}
      </Box>

      {!isLoggedIn ? (
        <Alert severity="info" sx={{ borderRadius: T.radius.md }}>
          Please log in to see other listings from this seller.
        </Alert>
      ) : loading ? (
        <Grid container spacing={2}>
          {[1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <RelatedCardSkeleton />
            </Grid>
          ))}
        </Grid>
      ) : error ? (
        <Alert severity="warning">{error}</Alert>
      ) : products.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 3, bgcolor: T.color.surfaceMuted, borderRadius: T.radius.md }}>
          <StorefrontOutlinedIcon sx={{ fontSize: 36, color: T.color.textMuted, mb: 1 }} />
          <Typography sx={{ fontWeight: 600 }}>
            {isOwnerView ? "No other listings yet" : "No other listings"}
          </Typography>
          <Typography sx={{ fontSize: 13, color: T.color.textSecondary, mt: 0.5 }}>
            {isOwnerView
              ? "List another vehicle to grow your marketplace presence."
              : `${sellerName ?? "This seller"} has no other active vehicles right now.`}
          </Typography>
          {isOwnerView && onAddVehicle ? (
            <Button
              variant="outlined"
              size="small"
              onClick={onAddVehicle}
              sx={{ mt: 2, textTransform: "none", fontWeight: 600 }}
            >
              List your next vehicle
            </Button>
          ) : null}
        </Box>
      ) : (
        <Grid container spacing={2}>
          {products.map((product) => {
            const productId = getBuySellRowId(product);
            return (
              <Grid key={productId} size={{ xs: 12, sm: 6, md: 4 }}>
                <VehicleCard
                  product={product}
                  isFavorite={favoriteIds.has(productId)}
                  favoriteLoading={togglingIds.has(productId)}
                  onFavoriteToggle={() => void handleFavorite(productId)}
                  onClick={() => router.push(userProductRoutes.view(productId))}
                />
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
