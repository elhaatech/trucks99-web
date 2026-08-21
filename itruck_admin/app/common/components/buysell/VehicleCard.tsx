"use client";

import { useMemo } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import LocalGasStationOutlinedIcon from "@mui/icons-material/LocalGasStationOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { alpha } from "@mui/material/styles";
import { PRODUCT_THEME as T, INFO, SUCCESS } from "@/lib/theme";
import { ProductStatusChip } from "@/app/admin/portal/buysell/_components/ProductStatusChip";
import { getBuySellImageUrl } from "@/lib/buysellUtils";
import { getBuySellRowId, type BuySellProduct } from "@/model/services/buysellapi";
import {
  formatProductPrice,
  formatVehicleIdDisplay,
  getProductBsNumber,
  getProductLocation,
  getProductSubtitle,
  getProductTitle,
  getProductVehicleId,
} from "./utils";


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
};

export function VehicleSpecifications({ product }: { product: BuySellProduct }) {
  const specs = useMemo(() => {
    let year = "";
    let fuelType = "";
    let kmDriven = "";
    let owners = "";

    product.specifications?.forEach((spec) => {
      const name = spec.specification_info?.specification_name?.toLowerCase() || "";
      const raw =
        spec.specification_value_info?.specification_value_name || spec.specification_value;
      const value = raw == null || raw === "" ? "" : String(raw);
      if (!value || /^[a-fA-F0-9]{24}$/.test(value)) return;

      if (name.includes("year") || name.includes("make year")) year = value;
      else if (name.includes("fuel")) fuelType = value;
      else if (name.includes("km") || name.includes("driven") || name.includes("kilometers")) kmDriven = value;
      else if (name.includes("owner")) owners = value;
    });

    const highlights = product.listing_highlights;
    if (!fuelType && highlights?.fuelType) fuelType = String(highlights.fuelType);
    if (!owners && highlights?.owners) owners = String(highlights.owners);
    if (!year && highlights?.makeYear) year = String(highlights.makeYear);
    if (!kmDriven && highlights?.mileage) kmDriven = String(highlights.mileage);

    const city = product.city_info?.name;
    const state = product.state_info?.name;
    const location = [city, state].filter(Boolean).join(", ");

    if (kmDriven) {
      const num = parseInt(kmDriven.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(num)) {
        kmDriven = `${num.toLocaleString("en-IN")} KM`;
      }
    }

    return { year, fuelType, kmDriven, owners, location };
  }, [product]);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 2,
        mt: 2,
      }}
    >
      {specs.year ? (
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, minWidth: 0 }}>
          <CalendarTodayOutlinedIcon sx={{ fontSize: 18, color: T.color.textSecondary, mt: "2px" }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 11, color: T.color.textSecondary, lineHeight: 1 }}>Year</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: T.color.textPrimary, mt: 0.3 }} noWrap>{specs.year}</Typography>
          </Box>
        </Box>
      ) : null}

      {specs.fuelType ? (
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, minWidth: 0 }}>
          <LocalGasStationOutlinedIcon sx={{ fontSize: 18, color: T.color.textSecondary, mt: "2px" }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 11, color: T.color.textSecondary, lineHeight: 1 }}>Fuel Type</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: T.color.textPrimary, mt: 0.3 }} noWrap>{specs.fuelType}</Typography>
          </Box>
        </Box>
      ) : null}

      {specs.owners ? (
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, minWidth: 0 }}>
          <PersonOutlineOutlinedIcon sx={{ fontSize: 18, color: T.color.textSecondary, mt: "2px" }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 11, color: T.color.textSecondary, lineHeight: 1 }}>No. of Owners</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: T.color.textPrimary, mt: 0.3 }} noWrap>{specs.owners}</Typography>
          </Box>
        </Box>
      ) : null}

      {specs.kmDriven ? (
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, minWidth: 0 }}>
          <SpeedOutlinedIcon sx={{ fontSize: 18, color: T.color.textSecondary, mt: "2px" }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 11, color: T.color.textSecondary, lineHeight: 1 }}>KM Driven</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: T.color.textPrimary, mt: 0.3 }} noWrap>{specs.kmDriven}</Typography>
          </Box>
        </Box>
      ) : null}

      {specs.location ? (
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, minWidth: 0 }}>
          <LocationOnOutlinedIcon sx={{ fontSize: 18, color: T.color.textSecondary, mt: "2px" }} />
          <Box sx={{ minWidth: 0, width: "100%" }}>
            <Typography sx={{ fontSize: 11, color: T.color.textSecondary, lineHeight: 1 }}>Location</Typography>
            <Tooltip title={specs.location} arrow placement="top">
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: T.color.textPrimary, mt: 0.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {specs.location}
              </Typography>
            </Tooltip>
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}

export function VehicleCard({
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
}: VehicleCardProps) {
  const productId = getBuySellRowId(product);
  const imageUrl = getBuySellImageUrl(product.images?.[0]);
  const title = getProductTitle(product);
  const subtitle = getProductSubtitle(product);
  const location = getProductLocation(product);
  const bsNumberLabel = getProductBsNumber(product);
  const vehicleIdLabel = getProductVehicleId(product);
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
        border: `1px solid ${alpha(T.color.border, 0.6)}`,
        borderRadius: "16px",
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        boxShadow: "0px 2px 12px rgba(0, 0, 0, 0.04)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": onClick
          ? {
              boxShadow: "0px 12px 24px rgba(0, 0, 0, 0.08)",
              transform: isList ? "none" : "translateY(-4px)",
              borderColor: alpha(INFO, 0.3),
            }
          : undefined,
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: isList ? { xs: "100%", sm: 240, md: 280 } : "100%",
          height: isList ? { xs: 200, sm: "auto" } : 200,
          aspectRatio: isList ? undefined : "4/3",
          flexShrink: 0,
          bgcolor: alpha(INFO, 0.04),
          backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 40%)",
            opacity: 0,
            transition: "opacity 0.3s ease",
          },
          "*:hover > &::after": {
            opacity: 1,
          },
        }}
      >
        <Box sx={{ position: "absolute", top: 12, left: 12, zIndex: 2 }}>
          <ProductStatusChip status={product.status} />
        </Box>
        {onFavoriteToggle ? (
          <IconButton
            size="small"
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            disabled={favoriteLoading}
            onClick={handleFavorite}
            sx={{
              position: "absolute",
              top: 12,
              right: 12,
              bgcolor: "rgba(255,255,255,0.95)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              zIndex: 2,
              "&:hover": { bgcolor: "#fff", transform: "scale(1.05)" },
              transition: "transform 0.2s ease",
            }}
          >
            {isFavorite ? (
              <FavoriteIcon fontSize="small" sx={{ color: "#ef4444" }} />
            ) : (
              <FavoriteBorderIcon fontSize="small" sx={{ color: T.color.textSecondary }} />
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
              fontSize: isList ? 18 : 16,
              color: T.color.textPrimary,
              lineHeight: 1.4,
              letterSpacing: "-0.01em",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {title}
          </Typography>
          {subtitle ? (
            <Typography sx={{ fontSize: 13, color: T.color.textSecondary, mt: 0.35 }}>
              {subtitle}
            </Typography>
          ) : null}
          {bsNumberLabel ? (
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
                color: T.color.textMuted,
                mt: 0.35,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {bsNumberLabel}
            </Typography>
          ) : null}
          {vehicleIdLabel ? (
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
                color: T.color.textMuted,
                mt: 0.35,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatVehicleIdDisplay(vehicleIdLabel)}
            </Typography>
          ) : null}
          <VehicleSpecifications product={product} />
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
              fontSize: isList ? 22 : 20,
              color: T.color.textPrimary,
              pt: isList ? 0 : 0.5,
              textAlign: isList ? { sm: "right" } : "left",
              letterSpacing: "-0.02em",
            }}
          >
            {formatProductPrice(product.price)}
          </Typography>

          {onClick && showViewAction ? (
            <Button
              size="small"
              variant={isList ? "outlined" : "contained"}
              onClick={handleView}
              sx={{
                mt: 1,
                textTransform: "none",
                fontWeight: 700,
                fontSize: 13,
                borderRadius: "8px",
                py: 0.8,
                ...(isList
                  ? { borderColor: T.color.border, color: T.color.textPrimary, whiteSpace: "nowrap" }
                  : {
                      bgcolor: T.color.textPrimary,
                      color: "#fff",
                      boxShadow: "none",
                      width: "100%",
                      "&:hover": { bgcolor: "#000", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
                    }),
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
}
