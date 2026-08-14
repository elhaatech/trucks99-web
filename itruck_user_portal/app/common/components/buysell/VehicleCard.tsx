"use client";

import { memo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { alpha } from "@mui/material/styles";
import { PRODUCT_THEME as T, INFO, SUCCESS } from "@/lib/theme";
import { getFirstBuySellImageUrl } from "@/lib/buysellUtils";
import { BuySellImage } from "@/components/common/BuySellImage";
import { getBuySellRowId, type BuySellProduct } from "@/model/services/buysellapi";
import {
  formatProductPrice,
  getListingCardCategory,
  getListingCardTitle,
} from "./utils";
import { VehicleSpecChips } from "./VehicleSpecChips";
import { getFeaturedStatus, resolveFeaturedListingUi } from "@/lib/featuredVehicleListingStatus";
import { useMarketplaceFavoritesOptional } from "@/components/marketplace/MarketplaceFavoritesProvider";

type VehicleCardProps = {
  product: BuySellProduct;
  isFavorite?: boolean;
  favoriteLoading?: boolean;
  onFavoriteToggle?: (productId: string) => void;
  onClick?: (productId: string) => void;
  layout?: "grid" | "list";
  showViewAction?: boolean;
  viewLabel?: string;
  onEdit?: (productId: string) => void;
  onDelete?: (productId: string) => void;
  deleteLoading?: boolean;
  /** When true, show featured badge / Pay Now for the logged-in seller's own listing. */
  showOwnerFeaturedControls?: boolean;
  onFeaturePayNow?: (productId: string) => void;
  /** Optional badge shown top-right (e.g. "Featured", "Expired"). */
  badge?: { label: string; color?: string };
  /** Featured metadata for the featured-vehicles page. */
  featuredMeta?: {
    status?: string;
    expiryDate?: string | null;
    packageName?: string | null;
    remainingDays?: number | null;
  };
};

export const VehicleCard = memo(function VehicleCard({
  product,
  isFavorite,
  favoriteLoading = false,
  onFavoriteToggle,
  onClick,
  layout = "grid",
  showViewAction = true,
  viewLabel = "View Product",
  onEdit,
  onDelete,
  deleteLoading = false,
  showOwnerFeaturedControls = false,
  onFeaturePayNow,
  badge,
  featuredMeta,
}: VehicleCardProps) {
  const favorites = useMarketplaceFavoritesOptional();
  const productId = getBuySellRowId(product);
  const featuredStatus = showOwnerFeaturedControls ? getFeaturedStatus(product) : null;
  const featuredUi =
    showOwnerFeaturedControls ? resolveFeaturedListingUi(product) : null;
  const isFavorited = favorites
    ? favorites.favoriteIds.has(productId)
    : Boolean(isFavorite) || Boolean(product.is_favorite);
  const isFavoriteBusy = favorites
    ? favorites.togglingIds.has(productId)
    : favoriteLoading;
  /** Pay Now only for own listings that are not favorited and not actively featured. */
  const showFeaturePayNow =
    showOwnerFeaturedControls &&
    Boolean(onFeaturePayNow) &&
    !isFavorited &&
    featuredStatus !== "active" &&
    product.isFeatured !== true &&
    Boolean(featuredUi?.showPayNow);
  const imageUrl = getFirstBuySellImageUrl(product.images);
  const title = getListingCardTitle(product);
  const categoryLabel = getListingCardCategory(product);
  const subtitle = categoryLabel;
  const isList = layout === "list";

  const handleClick = () => onClick?.(productId);
  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleClick();
  };
  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFavoriteBusy) return;
    if (onFavoriteToggle) {
      onFavoriteToggle(productId);
      return;
    }
    void favorites?.toggleFavorite(productId);
  };
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(productId);
  };
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(productId);
  };
  const handleFeaturePayNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFeaturePayNow?.(productId);
  };

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: T.color.surface,
        border: `1px solid ${T.color.border}`,
        borderRadius: T.radius.lg,
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        boxShadow: T.shadow.card,
        transition: "box-shadow 0.22s ease, transform 0.22s ease, border-color 0.22s ease",
        "&:hover": onClick
          ? {
              boxShadow: T.shadow.cardHover,
              transform: isList ? "none" : "translateY(-3px)",
              borderColor: alpha(INFO, 0.35),
            }
          : undefined,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: isList ? { xs: "column", sm: "row" } : "column",
          alignItems: isList ? { sm: "stretch" } : undefined,
          flex: 1,
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: isList ? { xs: "100%", sm: 200, md: 220 } : "100%",
            height: isList ? { xs: 180, sm: 160 } : 140,
            flexShrink: 0,
            bgcolor: alpha(INFO, 0.06),
            overflow: "hidden",
            aspectRatio: "16/10",
          }}
        >
          <BuySellImage
            src={imageUrl}
            alt={title}
            fill
          />
          <Box sx={{ position: "absolute", top: 2, right: 2, zIndex: 1 }}>
             {featuredStatus === "expired" || featuredMeta?.status === "Expired" ? (
               <Box
                 sx={{
                   display: "inline-flex",
                   alignItems: "center",
                   px: 0.75,
                   py: 0.25,
                   borderRadius: 1,
                   bgcolor: "rgba(220, 38, 38, 0.9)",
                   color: "#fff",
                   fontWeight: 700,
                   fontSize: 10,
                   letterSpacing: "0.04em",
                   textTransform: "uppercase",
                   lineHeight: 1.4,
                 }}
               >
                 {featuredMeta?.status === "Expired" ? "Expired" : "Expired"}
               </Box>
             ) : null}
             {badge && featuredStatus !== "expired" && featuredMeta?.status !== "Expired" ? (
               <Box
                 sx={{
                   display: "inline-flex",
                   alignItems: "center",
                   px: 0.75,
                   py: 0.25,
                   borderRadius: 1,
                   bgcolor: badge.color ? alpha(badge.color, 0.9) : alpha(INFO, 0.9),
                   color: "#fff",
                   fontWeight: 600,
                   fontSize: 10,
                   letterSpacing: "0.03em",
                   textTransform: "uppercase",
                   lineHeight: 1.4,
                 }}
               >
                 {badge.label}
               </Box>
             ) : null}
          </Box>


          <IconButton
              size="small"
              aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
              disabled={isFavoriteBusy}
              onClick={handleFavorite}
              sx={{
                position: "absolute",
                top: 10,
                right: 10,
                bgcolor: "rgba(255,255,255,0.94)",
                border: `1px solid ${alpha(T.color.border, 0.85)}`,
                boxShadow: "0 6px 18px rgba(15, 23, 42, 0.12)",
                "&:hover": { bgcolor: "#fff" },
              }}
            >
              {isFavorited ? (
                <FavoriteIcon fontSize="small" sx={{ color: T.color.danger }} />
              ) : (
                <FavoriteBorderIcon fontSize="small" />
              )}
            </IconButton>
        </Box>

        <Box
          sx={{
            flex: 1,
            p: 1.5,
            display: "flex",
            flexDirection: isList ? { xs: "column", sm: "row" } : "column",
            alignItems: isList ? { sm: "center" } : undefined,
            gap: isList ? { sm: 2 } : 1,
            minWidth: 0,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 0.5, overflow: "hidden" }}>
            <Typography
              sx={{
                 fontWeight: 800,
                 fontSize: isList ? 17 : 14,
                 color: T.color.textPrimary,
                lineHeight: 1.3,
                letterSpacing: "0.01em",
                textTransform: "uppercase",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {title}
            </Typography>
            {subtitle ? (
              <Typography
                sx={{
                   fontSize: 12,
                   fontWeight: 600,
                   color: T.color.textSecondary,
                   letterSpacing: "0.03em",
                   textTransform: "uppercase",
                   display: "-webkit-box",
                   WebkitLineClamp: 1,
                   WebkitBoxOrient: "vertical",
                   overflow: "hidden",
                }}
              >
                {subtitle}
              </Typography>
            ) : null}

            <VehicleSpecChips product={product} dense />
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: isList ? { sm: "flex-end" } : "stretch",
              gap: 1,
              flexShrink: 0,
              mt: isList ? { xs: 1, sm: 0 } : "auto",
              minWidth: isList ? 140 : undefined,
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 1,
                width: "100%",
              }}
            >
              <Typography
                sx={{
                  fontWeight: 800,
                   fontSize: isList ? 20 : 16,
                   color: isList ? SUCCESS : INFO,
                  textAlign: "left",
                }}
              >
                {formatProductPrice(product.price)}
              </Typography>

              {(onEdit || onDelete) ? (
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  {onEdit ? (
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={handleEdit}
                        aria-label="Edit"
                        sx={{
                          color: T.color.textPrimary,
                          "&:hover": { color: INFO, bgcolor: alpha(INFO, 0.04) },
                        }}
                      >
                        <EditOutlinedIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                  {onDelete ? (
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={handleDelete}
                        disabled={deleteLoading}
                        aria-label="Delete"
                        sx={{
                          color: T.color.danger,
                          "&:hover": { color: T.color.danger, bgcolor: "rgba(239,68,68,0.04)" },
                        }}
                      >
                        <DeleteOutlineIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </Box>
              ) : null}
            </Box>

            {onClick && showViewAction ? (
              <Button
                size="small"
                variant="contained"
                onClick={handleView}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: 12,
                  bgcolor: INFO,
                  boxShadow: "none",
                  width: isList ? "auto" : "100%",
                  minHeight: 32,
                  "&:hover": { bgcolor: INFO, boxShadow: "none" },
                }}
              >
                {viewLabel}
              </Button>
            ) : null}

            {showFeaturePayNow ? (
              <Button
                size="small"
                variant="outlined"
                onClick={handleFeaturePayNow}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: 12,
                  borderColor: "#f97316",
                  color: "#f97316",
                  width: isList ? "auto" : "100%",
                  minHeight: 32,
                  "&:hover": { borderColor: "#ea580c", color: "#ea580c", bgcolor: "rgba(249, 115, 22, 0.04)" },
                }}
              >
                {featuredUi?.payNowLabel || "Feature Now"}
              </Button>
            ) : null}
          </Box>
        </Box>
      </Box>
    </Box>
  );
});