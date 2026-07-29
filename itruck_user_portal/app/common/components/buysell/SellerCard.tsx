"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import VerifiedIcon from "@mui/icons-material/Verified";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import StarOutlineIcon from "@mui/icons-material/StarOutline";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";
import type { BuySellOwnerProductsOwner } from "@/model/services/buysellapi";
import { getBuySellImageUrl } from "@/lib/buysellUtils";

type SellerCardProps = {
  owner: BuySellOwnerProductsOwner;
  location?: string;
  totalListings?: number;
  activeListings?: number;
  soldVehicles?: number;
  onViewProfile?: () => void;
  onViewListings?: () => void;
};

export function SellerCard({
  owner,
  location,
  totalListings = 0,
  activeListings = 0,
  soldVehicles = 0,
  onViewProfile,
  onViewListings,
}: SellerCardProps) {
  const avatarSrc = owner.profileImage ? getBuySellImageUrl(owner.profileImage) : undefined;

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: T.radius.lg,
        border: `1px solid ${T.color.border}`,
        bgcolor: T.color.surface,
        boxShadow: T.shadow.card,
      }}
    >
      <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
        <Avatar src={avatarSrc} sx={{ width: 64, height: 64, bgcolor: INFO }}>
          {(owner.name ?? "S").charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
            <Typography sx={{ fontWeight: 800, fontSize: 18 }}>
              {owner.name || "Seller"}
            </Typography>
            <VerifiedIcon sx={{ fontSize: 18, color: INFO }} />
          </Box>
          {location ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5, color: T.color.textSecondary }}>
              <LocationOnOutlinedIcon sx={{ fontSize: 16 }} />
              <Typography sx={{ fontSize: 13 }}>{location}</Typography>
            </Box>
          ) : null}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5, color: T.color.textMuted }}>
            <StarOutlineIcon sx={{ fontSize: 16 }} />
            <Typography sx={{ fontSize: 13 }}>Verified dealer</Typography>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 1.5,
          mt: 2.5,
          p: 1.5,
          borderRadius: T.radius.md,
          bgcolor: T.color.surfaceMuted,
        }}
      >
        {[
          { label: "Total", value: totalListings },
          { label: "Active", value: activeListings },
          { label: "Sold", value: soldVehicles },
        ].map((stat) => (
          <Box key={stat.label} sx={{ textAlign: "center" }}>
            <Typography sx={{ fontWeight: 800, fontSize: 20, color: INFO }}>
              {stat.value}
            </Typography>
            <Typography sx={{ fontSize: 12, color: T.color.textMuted }}>{stat.label}</Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: "flex", gap: 1.5, mt: 2.5, flexWrap: "wrap" }}>
        {onViewProfile ? (
          <Button variant="contained" onClick={onViewProfile} sx={{ bgcolor: INFO }}>
            View Profile
          </Button>
        ) : null}
        {onViewListings ? (
          <Button variant="outlined" onClick={onViewListings}>
            View Listings
          </Button>
        ) : null}
      </Box>
    </Box>
  );
}
