"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Link from "@mui/material/Link";
import StarIcon from "@mui/icons-material/Star";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";
import { contactTelHref, formatContactMobile } from "@/app/common/components/buysell/utils";

type ProductSellerInfoProps = {
  sellerName?: string;
  sellerMobile?: string | null;
  location?: string;
  rating?: number;
  reviewCount?: number;
};

export function ProductSellerInfo({
  sellerName,
  sellerMobile,
  location,
  rating = 4.5,
  reviewCount,
}: ProductSellerInfoProps) {
  if (!sellerName) return null;

  const phone = formatContactMobile(sellerMobile);
  const telHref = contactTelHref(phone);

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
        Seller Information
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Avatar sx={{ width: 52, height: 52, bgcolor: INFO, fontWeight: 700, fontSize: 20 }}>
          {sellerName.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 16 }}>{sellerName}</Typography>
          {location ? (
            <Typography sx={{ fontSize: 13, color: T.color.textSecondary, mt: 0.35 }}>
              {location}
            </Typography>
          ) : null}
          {phone && telHref ? (
            <Link
              href={telHref}
              underline="hover"
              sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mt: 0.5, fontSize: 13, fontWeight: 600, color: INFO }}
            >
              <PhoneOutlinedIcon sx={{ fontSize: 16 }} />
              {phone}
            </Link>
          ) : null}
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
