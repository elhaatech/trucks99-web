"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import StarIcon from "@mui/icons-material/Star";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";
import { MetaIconLine, PhoneMetaLine } from "@/app/common/components/buysell/MetaIconLine";
import { getBuySellImageUrl, handleBuySellImageError } from "@/lib/buysellUtils";

type ProductSellerInfoProps = {
  sellerName?: string;
  sellerMobile?: string | null;
  sellerProfileImage?: string | null;
  location?: string;
  rating?: number;
  reviewCount?: number;
};

export function ProductSellerInfo({
  sellerName,
  sellerMobile,
  sellerProfileImage,
  location,
  rating = 4.5,
  reviewCount,
}: ProductSellerInfoProps) {
  if (!sellerName) return null;

  const avatarSrc = getBuySellImageUrl(sellerProfileImage);

  return (
    <Box
      sx={{
        mb: 2.5,
        p: 2.5,
        borderRadius: T.radius.lg,
        border: `1px solid ${T.color.border}`,
        bgcolor: T.color.surface,
        boxShadow: T.shadow.card,
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: 16, mb: 1.5, color: T.color.textPrimary }}>
        Seller Information and Related Vechile Details
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Avatar
          src={avatarSrc || undefined}
          slotProps={{ img: { onError: handleBuySellImageError } }}
          sx={{ width: 52, height: 52, bgcolor: INFO, fontWeight: 700, fontSize: 20 }}
        >
          {sellerName.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 16 }}>{sellerName}</Typography>
          {location ? (
            <MetaIconLine icon={<LocationOnOutlinedIcon />} sx={{ mt: 0.5 }}>
              {location}
            </MetaIconLine>
          ) : null}
          <PhoneMetaLine icon={<PhoneOutlinedIcon />} mobile={sellerMobile} sx={{ mt: 0.5 }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.35, mt: 0.75, color: "#f59e0b" }}>
            <StarIcon sx={{ fontSize: 17 }} />
            <Typography sx={{ fontWeight: 700, fontSize: 14, color: T.color.textPrimary }}>
              {rating.toFixed(1)}
            </Typography>
            {reviewCount != null ? (
              <Typography sx={{ fontSize: 13, color: T.color.textMuted }}>
                ({reviewCount.toLocaleString("en-IN")} Reviews)
              </Typography>
            ) : null}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}