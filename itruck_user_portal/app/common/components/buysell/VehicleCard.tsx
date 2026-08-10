"use client";

import { memo, useState } from "react";
import Image from "next/image";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { alpha } from "@mui/material/styles";
import { PRODUCT_THEME as T, INFO, SUCCESS } from "@/lib/theme";
import { getBuySellImageUrl } from "@/lib/buysellUtils";
import { getBuySellRowId, type BuySellProduct } from "@/model/services/buysellapi";
import {
  formatProductPrice,
  getListingCardCategory,
  getListingCardTitle,
} from "./utils";
import { VehicleSpecChips } from "./VehicleSpecChips";
import {
  getFeaturedStatus,
  resolveFeaturedListingUi,
} from "@/lib/featuredVehicleListingStatus";

import truckimg from "../../../assets/defaulttruck.png";



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
  /** When true, collapse owner actions (Pay Now, Edit, Delete) into a 3-dot menu. */
  showOwnerActionsMenu?: boolean;
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
  badge,
  featuredMeta,
  showOwnerActionsMenu = false,
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
  const subtitle = categoryLabel;
  const isList = layout === "list";
  const [imgError, setImgError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);

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
    width: 36,
    height: 36,
    "&:hover": { bgcolor: T.color.surfaceMuted },
  };

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchor);
  const handleMenuOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget as HTMLElement);
  };
  const handleMenuClose = () => {
    setMenuAnchor(null);
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
          {!imageUrl || imgError ? (
            fallbackError ? (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: alpha(T.color.border, 0.35),
                  color: T.color.textMuted,
                }}
              >
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 17h4V5H2v12h3" />
                  <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
                  <circle cx="7.5" cy="17.5" r="2.5" />
                  <circle cx="16.5" cy="17.5" r="2.5" />
                </svg>
              </Box>
            ) : (
              <Image
                src={truckimg}
                alt="No vehicle photo available"
                fill
                sizes={
                  isList
                    ? "(max-width:600px) 100vw, 220px"
                    : "(max-width:600px) 100vw, (max-width:1200px) 50vw, 25vw"
                }
                style={{ objectFit: "cover" }}
                unoptimized
                onError={() => setFallbackError(true)}
              />
            )
          ) : (
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
              onError={() => setImgError(true)}
            />
          )}
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


          {onFavoriteToggle ? (
            <IconButton
              size="small"
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              disabled={favoriteLoading}
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
            p: 1.5,
            display: "flex",
            flexDirection: isList ? { xs: "column", sm: "row" } : "column",
            alignItems: isList ? { sm: "center" } : undefined,
            gap: isList ? { sm: 2 } : 1,
            minWidth: 0,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 0.5 }}>
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
              mt: isList ? { xs: 1, sm: 0 } : 0,
              minWidth: isList ? 140 : undefined,
            }}
          >
            <Typography
              sx={{
                fontWeight: 800,
                 fontSize: isList ? 20 : 16,
                 color: isList ? SUCCESS : INFO,
                textAlign: isList ? { sm: "right" } : "left",
              }}
            >
              {formatProductPrice(product.price)}
            </Typography>

            {showOwnerActionsMenu ? (
              <>
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
                      width: "100%",
                      minHeight: 32,
                      "&:hover": { bgcolor: INFO, boxShadow: "none" },
                    }}
                  >
                    {viewLabel}
                  </Button>
                ) : null}
                <Box sx={{ display: "flex", justifyContent: isList ? { sm: "flex-end" } : "flex-end" }}>
                  <IconButton
                    size="small"
                    aria-label="More actions"
                    onClick={handleMenuOpen}
                    sx={iconBtnSx}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Menu
                  anchorEl={menuAnchor}
                  open={menuOpen}
                  onClose={handleMenuClose}
                  onClick={handleMenuClose}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  {showFeaturePayNow ? (
                    <MenuItem onClick={handleFeaturePayNow}>
                      {featuredUi?.payNowLabel || "Feature Now"}
                    </MenuItem>
                  ) : null}
                  {onEdit ? (
                    <MenuItem onClick={handleEdit}>Edit</MenuItem>
                  ) : null}
                  {onDelete ? (
                    <MenuItem onClick={handleDelete}>Delete</MenuItem>
                  ) : null}
                </Menu>
              </>
            ) : (
              <>
                {/* Hide Pay Now when is_favorite / isFeatured / actively featured. */}
                {showFeaturePayNow ? (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleFeaturePayNow}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      fontSize: 12,
                      bgcolor: "#f97316",
                      boxShadow: "none",
                      width: isList ? "auto" : "100%",
                      minHeight: 32,
                      "&:hover": { bgcolor: "#ea580c", boxShadow: "none" },
                    }}
                  >
                    {featuredUi?.payNowLabel || "Feature Now"}
                  </Button>
                ) : null}

                {onClick && showViewAction ? (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 18 }} />}
                    onClick={handleView}
                    sx={{
                      textTransform: "none",
                      fontWeight: 600,
                      fontSize: 12,
                      minHeight: 32,
                      bgcolor: INFO,
                      boxShadow: "none",
                      ...(isList
                        ? { whiteSpace: "nowrap" }
                        : { width: "100%" }),
                      "&:hover": { bgcolor: INFO, boxShadow: "none" },
                    }}
                  >
                    {viewLabel}
                  </Button>
                ) : null}

                {onEdit || onDelete ? (
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1.5,
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
              </>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
});