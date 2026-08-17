"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import {
  BuySellProduct,
  getBuySellRowId,
  postBuySellProductsByOwner,
} from "@/model/services/buysellapi";
import { getBuySellImageUrl } from "@/lib/buysellUtils";
import { addFavorite, removeFavorite } from "@/model/services/favoriteapi";
import {
  formatProductPrice,
  getProductLocation,
  getProductSubtitle,
  getProductTitle,
} from "@/app/common/components/buysell/utils";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { PRODUCT_THEME as T, INFO, SUCCESS } from "@/lib/theme";
import { ProductStatusChip } from "@/app/admin/portal/buysell/_components/ProductStatusChip";

type UserRelatedProductsSectionProps = {
  sellerId: string;
  sellerName?: string;
  excludeProductId: string;
  isLoggedIn: boolean;
  currentUserId?: string | null;
  onChatProduct?: (productId: string) => void;
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

function RelatedProductCard({
  product,
  isFavorite,
  favoriteLoading,
  onView,
  onChat,
  onFavoriteToggle,
}: {
  product: BuySellProduct;
  isFavorite?: boolean;
  favoriteLoading?: boolean;
  onView: () => void;
  onChat: () => void;
  onFavoriteToggle: () => void;
}) {
  const imageUrl = getBuySellImageUrl(product.images?.[0]);
  const title = getProductTitle(product);
  const subtitle = getProductSubtitle(product);
  const location = getProductLocation(product);

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: T.radius.lg,
        border: `1px solid ${T.color.border}`,
        bgcolor: T.color.surface,
        overflow: "hidden",
        boxShadow: T.shadow.card,
        transition: "box-shadow 0.2s ease",
        "&:hover": { boxShadow: T.shadow.cardHover },
      }}
    >
      <Box sx={{ position: "relative" }}>
        <Box
          sx={{
            height: 150,
            bgcolor: T.color.surfaceMuted,
            backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <Box sx={{ position: "absolute", top: 8, left: 8 }}>
          <ProductStatusChip status={product.status} />
        </Box>
        <IconButton
          size="small"
          aria-label={isFavorite ? "Remove from favourites" : "Add to favourites"}
          disabled={favoriteLoading}
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteToggle();
          }}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            bgcolor: "rgba(255,255,255,0.95)",
            "&:hover": { bgcolor: "#fff" },
          }}
        >
          {isFavorite ? (
            <FavoriteIcon fontSize="small" sx={{ color: T.color.danger }} />
          ) : (
            <FavoriteBorderIcon fontSize="small" />
          )}
        </IconButton>
      </Box>

      <Box sx={{ p: 1.75, flex: 1, display: "flex", flexDirection: "column", gap: 0.75 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 14, lineHeight: 1.35 }} noWrap>
          {title}
        </Typography>
        {subtitle ? (
          <Typography sx={{ fontSize: 12.5, color: T.color.textSecondary }} noWrap>
            {subtitle}
          </Typography>
        ) : null}
        {location ? (
          <Typography sx={{ fontSize: 12, color: T.color.textMuted }} noWrap>
            {location}
          </Typography>
        ) : null}
        <Typography sx={{ fontWeight: 800, fontSize: 17, color: SUCCESS, mt: 0.5 }}>
          {formatProductPrice(product.price)}
        </Typography>

        <Box sx={{ display: "flex", gap: 1, mt: "auto", pt: 1.25 }}>
          <IconButton
            size="small"
            aria-label="Chat with seller about this vehicle"
            onClick={onChat}
            sx={{
              border: `1px solid ${T.color.border}`,
              borderRadius: T.radius.md,
            }}
          >
            <ChatBubbleOutlineIcon fontSize="small" sx={{ color: INFO }} />
          </IconButton>
          <Button
            fullWidth
            variant="contained"
            size="small"
            startIcon={<VisibilityOutlinedIcon />}
            onClick={onView}
            sx={{
              bgcolor: INFO,
              textTransform: "none",
              fontWeight: 600,
              fontSize: 13,
              boxShadow: "none",
            }}
          >
            View Product
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

export function UserRelatedProductsSection({
  sellerId,
  sellerName,
  excludeProductId,
  isLoggedIn,
  onChatProduct,
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
      <Typography sx={{ fontWeight: 700, fontSize: 17, mb: 0.5 }}>
        More from {sellerName ?? "this seller"}
      </Typography>
      <Typography sx={{ fontSize: 13, color: T.color.textSecondary, mb: 2, lineHeight: 1.6 }}>
        Browse other vehicles by this seller. Use <strong>View Product</strong> to open details,{" "}
        <strong>♥</strong> to save to favourites, or the chat icon to message the seller.
      </Typography>

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
          <Typography sx={{ fontWeight: 600 }}>No other listings</Typography>
          <Typography sx={{ fontSize: 13, color: T.color.textSecondary, mt: 0.5 }}>
            {sellerName ?? "This seller"} has no other active vehicles right now.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {products.map((product) => {
            const productId = getBuySellRowId(product);
            return (
              <Grid key={productId} size={{ xs: 12, sm: 6, md: 4 }}>
                <RelatedProductCard
                  product={product}
                  isFavorite={favoriteIds.has(productId)}
                  favoriteLoading={togglingIds.has(productId)}
                  onView={() => router.push(userProductRoutes.view(productId))}
                  onChat={() => onChatProduct?.(productId)}
                  onFavoriteToggle={() => void handleFavorite(productId)}
                />
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
