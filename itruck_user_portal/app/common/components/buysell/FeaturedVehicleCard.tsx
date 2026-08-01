"use client";

import { memo } from "react";
import Image from "next/image";
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
  formatProductPrice,
  getListingCardCategory,
  getListingCardTitle,
  getProductLocation,
  getSellerDisplayName,
  getSellerMobile,
} from "./utils";
import { VehicleSpecChips } from "./VehicleSpecChips";
import { MetaIconLine, PhoneMetaLine } from "./MetaIconLine";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";

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

export const FeaturedVehicleCard = memo(function FeaturedVehicleCard({
  product,
  onViewDetails,
}: FeaturedVehicleCardProps) {
  const productId = getBuySellRowId(product);
  const imageUrl = getBuySellImageUrl(product.images?.[0]);
  const title = getListingCardTitle(product);
  const categoryLabel = getListingCardCategory(product);
  const location = getProductLocation(product);
  const sellerName = getSellerDisplayName(product);
  const sellerMobile = getSellerMobile(product);
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
          overflow: "hidden",
        }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width:600px) 100vw, (max-width:1200px) 50vw, 25vw"
            style={{ objectFit: "cover" }}
            unoptimized
          />
        ) : (
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundImage: `linear-gradient(135deg, ${alpha(INFO, 0.12)} 0%, ${alpha(INFO, 0.04)} 100%)`,
            }}
          >
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: alpha(INFO, 0.55),
              }}
            >
              No photo
            </Typography>
          </Box>
        )}
        <Chip
          icon={<StarIcon sx={{ fontSize: 16 }} />}
          label="Featured"
          size="small"
          sx={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 1,
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
          <MetaIconLine icon={<LocationOnOutlinedIcon />}>{location}</MetaIconLine>
        ) : null}

        <Typography variant="body2" color="text.secondary">
          Seller: <strong>{sellerName}</strong>
        </Typography>
        <PhoneMetaLine icon={<PhoneOutlinedIcon />} mobile={sellerMobile} />

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
});
