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
import { PRODUCT_THEME as T, INFO, WARNING, SUCCESS, ERROR } from "@/lib/theme";
import { getBuySellImageUrl } from "@/lib/buysellUtils";
import { resolveFeaturedListingUi } from "@/lib/featuredVehicleListingStatus";
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
    product.featured?.expiresAt ||
    product.featured?.featuredEndDate ||
    product.placement?.featuredEndDate;

  const startDate = product.featured?.featuredAt;
  const packageName = product.featured?.packageName || product.placement?.packageName;
  const featuredUi = resolveFeaturedListingUi(product);
  const expiryStatus =
    product.featured?.expiryStatus ??
    (featuredUi.state === "expired"
      ? "Expired"
      : featuredUi.state === "cancelled"
        ? "Cancelled"
        : featuredUi.state === "active"
          ? "Active"
          : undefined);
  const remainingDays = product.featured?.remainingDays ?? featuredUi.daysRemaining ?? undefined;

  const isExpired = expiryStatus === "Expired";
  const isExpiringSoon = expiryStatus === "Expiring Soon";
  const isActive = expiryStatus === "Active";

  let statusColor = SUCCESS;
  if (isExpired) statusColor = ERROR;
  else if (isExpiringSoon) statusColor = WARNING;

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
          label={expiryStatus || "Featured"}
          size="small"
          sx={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 1,
            fontWeight: 700,
            bgcolor: statusColor,
            color: "#fff",
            boxShadow: "0px 2px 8px rgba(0,0,0,0.2)",
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

        {packageName && (
          <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ mt: 1 }}>
            Package: {packageName}
          </Typography>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Started: {formatExpiry(startDate)}
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={isExpiringSoon ? 700 : 400} sx={{ color: isExpiringSoon ? WARNING : isExpired ? ERROR : "text.secondary" }}>
            Expires: {formatExpiry(expiry)}
          </Typography>
        </Box>
        
        {remainingDays !== undefined && (
          <Typography variant="caption" color="text.secondary" sx={{ color: isExpiringSoon ? WARNING : "inherit", fontWeight: isExpiringSoon ? 700 : 400 }}>
            {remainingDays > 0 ? `${remainingDays} days remaining` : 'Expired'}
          </Typography>
        )}

        <Box sx={{ mt: "auto", pt: 1, display: "flex", gap: 1 }}>
          {isExpired && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => onViewDetails?.(productId)}
              sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, flex: 1 }}
            >
              Renew Featured
            </Button>
          )}
          <Button
            variant="contained"
            onClick={() => onViewDetails?.(productId)}
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, flex: isExpired ? 1 : undefined, width: isExpired ? undefined : "100%" }}
          >
            View Details
          </Button>
        </Box>
      </Box>
    </Box>
  );
});
