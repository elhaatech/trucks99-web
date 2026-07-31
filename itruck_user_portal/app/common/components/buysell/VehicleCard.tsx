"use client";

import { memo } from "react";
import Image from "next/image";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import StarIcon from "@mui/icons-material/Star";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import { alpha } from "@mui/material/styles";
import { PRODUCT_THEME as T, INFO, SUCCESS, WARNING } from "@/lib/theme";
import { getBuySellImageUrl } from "@/lib/buysellUtils";
import { getBuySellRowId, type BuySellProduct } from "@/model/services/buysellapi";
import {
  formatProductPrice,
  getListingCardCategory,
  getListingCardTitle,
  getProductLocation,
  getSellerDisplayName,
  getSellerMobile,
} from "./utils";
import { MetaIconLine, PhoneMetaLine } from "./MetaIconLine";
import {
  getFeaturedStatus,
  resolveFeaturedListingUi,
} from "@/lib/featuredVehicleListingStatus";
import { ProductStatusChip } from "@/app/admin/portal/buysell/_components/ProductStatusChip";
import { VehicleSpecChips } from "./VehicleSpecChips";

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
};

export const VehicleCard = memo(function VehicleCard({
  product,
  isFavorite = false,
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
}: VehicleCardProps) {
  const productId = getBuySellRowId(product);
  const featuredStatus = showOwnerFeaturedControls ? getFeaturedStatus(product) : null;
  const featuredUi =
    showOwnerFeaturedControls ? resolveFeaturedListingUi(product) : null;
  const isFavorited =
    Boolean(isFavorite) || Boolean(product.is_favorite);
  /** Pay Now only for own listings that are not favorited and not actively featured. */
  const showFeaturePayNow =
    showOwnerFeaturedControls &&
    Boolean(onFeaturePayNow) &&
    !isFavorited &&
    featuredStatus !== "active" &&
    product.isFeatured !== true &&
    Boolean(featuredUi?.showPayNow);
  const imageUrl = getBuySellImageUrl(product.images?.[0]);
  const title = getListingCardTitle(product);
  const categoryLabel = getListingCardCategory(product);
  const location = getProductLocation(product);
  const sellerName = getSellerDisplayName(product);
  const sellerMobile = getSellerMobile(product);
  const isList = layout === "list";

  const handleClick = () => onClick?.(productId);
  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleClick();
  };
  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!favoriteLoading) onFavoriteToggle?.(productId);
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

  const iconBtnSx = {
    border: `1px solid ${T.color.border}`,
    borderRadius: T.radius.md,
    bgcolor: T.color.surface,
    "&:hover": { bgcolor: T.color.surfaceMuted },
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
        flexDirection: isList ? { xs: "column", sm: "row" } : "column",
        alignItems: isList ? { sm: "stretch" } : undefined,
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
          position: "relative",
          width: isList ? { xs: "100%", sm: 200, md: 220 } : "100%",
          height: isList ? { xs: 180, sm: "auto" } : 180,
          minHeight: isList ? { sm: 140 } : undefined,
          flexShrink: 0,
          bgcolor: alpha(INFO, 0.06),
          overflow: "hidden",
        }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes={
              isList
                ? "(max-width:600px) 100vw, 220px"
                : "(max-width:600px) 100vw, (max-width:1200px) 50vw, 25vw"
            }
            style={{ objectFit: "cover" }}
            unoptimized
          />
        ) : null}
        <Box sx={{ position: "absolute", top: 10, left: 10, display: "flex", flexDirection: "column", gap: 0.75, alignItems: "flex-start" }}>
          <ProductStatusChip status={product.status} />
          {featuredStatus === "active" ? (
            <Chip
              icon={<StarIcon sx={{ fontSize: "14px !important" }} />}
              label="Featured"
              size="small"
              sx={{
                fontWeight: 700,
                bgcolor: alpha(WARNING, 0.95),
                color: "#1a1a1a",
              }}
            />
          ) : null}
          {featuredStatus === "expired" ? (
            <Chip label="Expired" size="small" color="default" sx={{ fontWeight: 600 }} />
          ) : null}
        </Box>
        {onFavoriteToggle ? (
          <IconButton
            size="small"
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            disabled={favoriteLoading}
            onClick={handleFavorite}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              bgcolor: "rgba(255,255,255,0.92)",
              "&:hover": { bgcolor: "#fff" },
            }}
          >
            {isFavorite ? (
              <FavoriteIcon fontSize="small" sx={{ color: T.color.danger }} />
            ) : (
              <FavoriteBorderIcon fontSize="small" />
            )}
          </IconButton>
        ) : null}
      </Box>

      <Box
        sx={{
          flex: 1,
          p: 2,
          display: "flex",
          flexDirection: isList ? { xs: "column", sm: "row" } : "column",
          alignItems: isList ? { sm: "center" } : undefined,
          gap: isList ? { sm: 2 } : 0.75,
          minWidth: 0,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: isList ? 17 : 15,
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
          {categoryLabel ? (
            <Typography
              sx={{
                fontSize: 12.5,
                fontWeight: 600,
                color: T.color.textMuted,
                mt: 0.35,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {categoryLabel}
            </Typography>
          ) : null}
          <VehicleSpecChips product={product} dense={isList} />
          {location ? (
            <MetaIconLine
              icon={<LocationOnOutlinedIcon />}
              dense
              sx={{ mt: 0.85, color: T.color.textMuted }}
            >
              {location}
            </MetaIconLine>
          ) : null}
          <MetaIconLine
            icon={<PersonOutlineIcon />}
            dense
            sx={{ mt: 0.75 }}
          >
            <>
              Seller:{" "}
              <Box component="span" sx={{ fontWeight: 700, color: T.color.textPrimary }}>
                {sellerName}
              </Box>
            </>
          </MetaIconLine>
          <PhoneMetaLine
            icon={<PhoneOutlinedIcon />}
            mobile={sellerMobile}
            dense
            sx={{ mt: 0.35 }}
          />
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: isList ? { sm: "flex-end" } : "stretch",
            gap: 1,
            flexShrink: 0,
            mt: isList ? { xs: 1, sm: 0 } : 0,
            minWidth: isList ? 140 : undefined,
          }}
        >
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: isList ? 20 : 18,
              color: isList ? SUCCESS : INFO,
              pt: isList ? 0 : 1,
              textAlign: isList ? { sm: "right" } : "left",
            }}
          >
            {formatProductPrice(product.price)}
          </Typography>

          {/* Hide Pay Now when is_favorite / isFeatured / actively featured. */}
          {showFeaturePayNow ? (
            <Button
              size="small"
              variant="contained"
              onClick={handleFeaturePayNow}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                fontSize: 13,
                bgcolor: "#f97316",
                boxShadow: "none",
                width: isList ? "auto" : "100%",
                "&:hover": { bgcolor: "#ea580c", boxShadow: "none" },
              }}
            >
              {featuredUi?.payNowLabel || "Pay Now"}
            </Button>
          ) : null}

          {onClick && showViewAction ? (
            <Button
              size="small"
              variant={isList ? "outlined" : "contained"}
              startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 18 }} />}
              onClick={handleView}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                fontSize: 13,
                ...(isList
                  ? { borderColor: T.color.border, color: INFO, whiteSpace: "nowrap" }
                  : { bgcolor: INFO, boxShadow: "none", width: "100%" }),
              }}
            >
              {viewLabel}
            </Button>
          ) : null}

          {onEdit || onDelete ? (
            <Box
              sx={{
                display: "flex",
                gap: 1,
                justifyContent: isList ? "flex-end" : "center",
                width: "100%",
              }}
            >
              {onEdit ? (
                <IconButton
                  size="small"
                  aria-label="Edit listing"
                  onClick={handleEdit}
                  sx={iconBtnSx}
                >
                  <EditOutlinedIcon fontSize="small" sx={{ color: INFO }} />
                </IconButton>
              ) : null}
              {onDelete ? (
                <IconButton
                  size="small"
                  aria-label="Delete listing"
                  disabled={deleteLoading}
                  onClick={handleDelete}
                  sx={{ ...iconBtnSx, borderColor: "rgba(239,68,68,0.35)" }}
                >
                  <DeleteOutlineIcon fontSize="small" sx={{ color: T.color.danger }} />
                </IconButton>
              ) : null}
            </Box>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
});
