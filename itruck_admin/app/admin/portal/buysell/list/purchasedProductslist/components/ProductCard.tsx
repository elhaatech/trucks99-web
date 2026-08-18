"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";

import type { BuySellProduct } from "@/model/services/buysellapi";
import { getBuySellImageUrl } from "@/lib/buysellUtils";

const STATUS_COLOR: Record<string, "success" | "warning" | "default" | "info"> =
  {
    active: "success",
    pending: "warning",
    draft: "default",
    inactive: "default",
  };

export type ProductCardProps = {
  product: BuySellProduct;
  onClick?: (product: BuySellProduct) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (product: BuySellProduct) => void;
  favoriteDisabled?: boolean;
  /** Optional badge shown top-left, e.g. "Purchased" */
  badge?: string;
  badgeColor?: "success" | "info" | "warning";
};

export function ProductCard({
  product,
  onClick,
  isFavorite,
  onToggleFavorite,
  favoriteDisabled,
  badge,
  badgeColor = "success",
}: ProductCardProps) {
  const image = product.images?.[0];
  const statusColor = STATUS_COLOR[product.status] ?? "default";

  const locationLabel = [product.city_info?.name, product.state_info?.name]
    .filter(Boolean)
    .join(", ");

  return (
    <Card
      onClick={() => onClick?.(product)}
      sx={{
        position: "relative",
        cursor: onClick ? "pointer" : "default",
        borderRadius: 3,
        overflow: "hidden",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow 0.2s, transform 0.2s",
        "&:hover": onClick
          ? { boxShadow: 6, transform: "translateY(-2px)" }
          : undefined,
      }}
    >
      {badge && (
        <Chip
          label={badge}
          color={badgeColor}
          size="small"
          sx={{
            position: "absolute",
            top: 10,
            left: 10,
            zIndex: 1,
            fontWeight: 600,
          }}
        />
      )}

      {onToggleFavorite && (
        <IconButton
          size="small"
          disabled={favoriteDisabled}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product);
          }}
          sx={{
            position: "absolute",
            top: 6,
            right: 6,
            zIndex: 1,
            bgcolor: "rgba(255,255,255,0.85)",
            "&:hover": { bgcolor: "rgba(255,255,255,1)" },
          }}
        >
          {isFavorite ? (
            <FavoriteIcon fontSize="small" sx={{ color: "error.main" }} />
          ) : (
            <FavoriteBorderIcon fontSize="small" />
          )}
        </IconButton>
      )}

      {image ? (
        <CardMedia
          component="img"
          image={getBuySellImageUrl(image)}
          sx={{ height: 160, objectFit: "cover" }}
        />
      ) : (
        <CardMedia
          component="div"
          sx={{
            height: 160,
            bgcolor: "grey.100",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            No image
          </Typography>
        </CardMedia>
      )}

      <CardContent
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          gap: 0.75,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 1,
          }}
        >
          <Typography variant="subtitle2" color="text.secondary" noWrap>
            {product.bsNumber || "—"}
          </Typography>
          {product.vehicleId ? (
            <Typography variant="subtitle2" color="text.secondary" noWrap>
              Vehicle ID: {product.vehicleId}
            </Typography>
          ) : null}
          <Chip
            label={product.status}
            color={statusColor}
            size="small"
            sx={{ textTransform: "capitalize" }}
          />
        </Box>

        <Typography
          variant="h6"
          sx={{ fontWeight: 700, color: "primary.main", lineHeight: 1.2 }}
        >
          ₹{Number(product.price ?? 0).toLocaleString("en-IN")}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {product.description || "No description provided."}
        </Typography>

        {locationLabel && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              mt: "auto",
              pt: 1,
            }}
          >
            <LocationOnOutlinedIcon fontSize="small" color="disabled" />
            <Typography variant="caption" color="text.secondary" noWrap>
              {locationLabel}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
