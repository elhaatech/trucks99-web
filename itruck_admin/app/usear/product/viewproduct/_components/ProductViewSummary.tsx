"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";
import { formatProductPrice } from "@/app/common/components/buysell/utils";
import { ProductStatusChip } from "@/app/admin/portal/buysell/_components/ProductStatusChip";
import type { BuySellProductStatus } from "@/model/services/buysellapi";

type ProductViewSummaryProps = {
  title: string;
  subtitle?: string;
  price: number;
  status?: BuySellProductStatus;
  location?: string;
  viewCount?: number;
  offerCount?: number;
  year?: string;
  wishlisted?: boolean;
  favoriteBusy?: boolean;
  onFavoriteToggle?: () => void;
  onShare?: () => void;
};

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <Box sx={{ textAlign: "center", minWidth: 64 }}>
      <Typography sx={{ fontSize: 11, color: T.color.textMuted, mb: 0.25 }}>{label}</Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: T.color.textPrimary }}>{value}</Typography>
    </Box>
  );
}

export function ProductViewSummary({
  title,
  subtitle,
  price,
  status,
  location,
  viewCount,
  offerCount = 0,
  year,
  wishlisted = false,
  favoriteBusy = false,
  onFavoriteToggle,
  onShare,
}: ProductViewSummaryProps) {
  return (
    <Box
      sx={{
        mb: 2.5,
        pb: 2.5,
        borderBottom: `1px solid ${T.color.border}`,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, mb: 0.5 }}>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: { xs: 22, md: 26 },
            color: T.color.textPrimary,
            lineHeight: 1.25,
          }}
        >
          {title}
        </Typography>
        {status ? <ProductStatusChip status={status} /> : null}
      </Box>

      {subtitle ? (
        <Typography sx={{ color: T.color.textSecondary, fontSize: 14, mb: 1.25 }}>{subtitle}</Typography>
      ) : null}

      <Typography
        sx={{
          fontWeight: 800,
          fontSize: { xs: 26, md: 30 },
          color: "#16a34a",
          letterSpacing: "-0.02em",
          mb: 1.25,
        }}
      >
        {formatProductPrice(price)}
      </Typography>

      {location ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1.5 }}>
          <LocationOnOutlinedIcon sx={{ fontSize: 18, color: INFO }} />
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: T.color.textSecondary }}>{location}</Typography>
        </Box>
      ) : null}

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: { xs: 2, sm: 3 },
          mb: 2,
          py: 1.25,
          px: 0.5,
        }}
      >
        <StatPill label="Views" value={viewCount != null ? viewCount.toLocaleString("en-IN") : "—"} />
        <StatPill label="Offers" value={offerCount} />
        <StatPill label="Year" value={year ?? "—"} />
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {onShare ? (
          <Button
            variant="outlined"
            size="small"
            startIcon={<ShareOutlinedIcon />}
            onClick={onShare}
            sx={{ textTransform: "none", fontWeight: 600, borderColor: T.color.border }}
          >
            Share
          </Button>
        ) : null}
        {onFavoriteToggle ? (
          <Button
            variant="outlined"
            size="small"
            disabled={favoriteBusy}
            startIcon={
              favoriteBusy ? (
                <CircularProgress size={14} />
              ) : wishlisted ? (
                <FavoriteIcon sx={{ color: T.color.danger }} />
              ) : (
                <FavoriteBorderIcon />
              )
            }
            onClick={onFavoriteToggle}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderColor: wishlisted ? T.color.danger : T.color.border,
              color: wishlisted ? T.color.danger : undefined,
            }}
          >
            {wishlisted ? "Wishlisted" : "Wishlist"}
          </Button>
        ) : null}
      </Box>
    </Box>
  );
}
