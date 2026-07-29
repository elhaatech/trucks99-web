"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import StarIcon from "@mui/icons-material/Star";
import { alpha } from "@mui/material/styles";
import { PRODUCT_THEME as T, INFO, WARNING } from "@/lib/theme";
import { getBuySellImageUrl } from "@/lib/buysellUtils";
import { getBuySellRowId, type BuySellProduct } from "@/model/services/buysellapi";
import {
  contactTelHref,
  formatProductPrice,
  getListingCardCategory,
  getListingCardTitle,
  getProductLocation,
  getSellerDisplayName,
  getSellerMobile,
} from "./utils";
import { VehicleSpecChips } from "./VehicleSpecChips";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import Link from "@mui/material/Link";

type FeaturedVehicleCardProps = {
  product: BuySellProduct;
  onViewDetails?: (productId: string) => void;
};

function formatExpiry(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function FeaturedVehicleCard({ product, onViewDetails }: FeaturedVehicleCardProps) {
  const productId = getBuySellRowId(product);
  const imageUrl = getBuySellImageUrl(product.images?.[0]);
  const title = getListingCardTitle(product);
  const categoryLabel = getListingCardCategory(product);
  const location = getProductLocation(product);
  const sellerName = getSellerDisplayName(product);
  const sellerMobile = getSellerMobile(product);
  const sellerTel = contactTelHref(sellerMobile);
  const expiry =
    product.featured?.featuredEndDate ||
    product.featured?.expiresAt ||
    product.placement?.featuredEndDate;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        bgcolor: T.color.surface,
        border: `1px solid ${T.color.border}`,
        borderRadius: T.radius.lg,
        overflow: "hidden",
        boxShadow: T.shadow.card,
        height: "100%",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        "&:hover": {
          boxShadow: T.shadow.cardHover,
          transform: "translateY(-2px)",
        },
      }}
    >
      <Box
        sx={{
          position: "relative",
          height: 200,
          bgcolor: alpha(INFO, 0.06),
          backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <Chip
          icon={<StarIcon sx={{ fontSize: 16 }} />}
          label="Featured"
          size="small"
          sx={{
            position: "absolute",
            top: 12,
            left: 12,
            fontWeight: 700,
            bgcolor: alpha(WARNING, 0.95),
            color: "#1a1a1a",
          }}
        />
      </Box>

      <Box sx={{ p: 2, flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography
          variant="subtitle1"
          fontWeight={800}
          sx={{ lineHeight: 1.3, textTransform: "uppercase", letterSpacing: "0.01em" }}
        >
          {title}
        </Typography>

        {categoryLabel ? (
          <Typography
            variant="body2"
            sx={{
              color: T.color.textMuted,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              fontSize: 12.5,
            }}
          >
            {categoryLabel}
          </Typography>
        ) : null}

        <VehicleSpecChips product={product} />

        <Typography variant="h6" fontWeight={800} color="primary.main">
          {formatProductPrice(product.price)}
        </Typography>

        {location ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <LocationOnOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">
              {location}
            </Typography>
          </Box>
        ) : null}

        <Typography variant="body2" color="text.secondary">
          Seller: <strong>{sellerName}</strong>
        </Typography>
        {sellerMobile ? (
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
            onClick={(e) => e.stopPropagation()}
          >
            <PhoneOutlinedIcon sx={{ fontSize: 15, color: "text.secondary" }} />
            {sellerTel ? (
              <Link href={sellerTel} underline="hover" sx={{ fontSize: 13, fontWeight: 600 }}>
                {sellerMobile}
              </Link>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {sellerMobile}
              </Typography>
            )}
          </Box>
        ) : null}

        <Typography variant="caption" color="text.secondary">
          Featured until {formatExpiry(expiry)}
        </Typography>

        <Box sx={{ mt: "auto", pt: 1 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => onViewDetails?.(productId)}
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
          >
            View Details
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
