"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import StarIcon from "@mui/icons-material/Star";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";

const DEFAULT_BENEFITS = [
  "Top position in listings",
  "More total views",
  "Priority support",
  "Featured badge on listings",
];

const COMPACT_BENEFITS = ["Top position in listings", "Featured badge on listings"];

type FeaturedVehiclePromoCardProps = {
  onPayNow: () => void;
  compact?: boolean;
  /** When false, hides Pay Now (e.g. active featured plan). */
  showPayNow?: boolean;
  payNowLabel?: string;
};

export function FeaturedVehiclePromoCard({
  onPayNow,
  compact = false,
  showPayNow = true,
  payNowLabel = "Make as Featured",
}: FeaturedVehiclePromoCardProps) {
  const benefits = compact ? COMPACT_BENEFITS : DEFAULT_BENEFITS;

  return (
    <Box
      sx={{
        p: compact ? 1.75 : 2.5,
        borderRadius: T.radius.lg,
        border: `1px solid ${compact ? "rgba(249,115,22,0.25)" : T.color.border}`,
        bgcolor: compact ? "linear-gradient(180deg, #fffbf7 0%, #ffffff 100%)" : T.color.surface,
        boxShadow: compact ? "none" : T.shadow.card,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25, mb: compact ? 1.25 : 1.5 }}>
        <Box
          sx={{
            width: compact ? 36 : 40,
            height: compact ? 36 : 40,
            borderRadius: compact ? 1.25 : "50%",
            bgcolor: compact ? "rgba(249,115,22,0.12)" : "rgba(37,99,235,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <StarIcon sx={{ fontSize: compact ? 20 : 18, color: compact ? "#f97316" : INFO }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: compact ? 15 : 18, color: T.color.textPrimary, lineHeight: 1.3 }}>
            Featured Vehicle
          </Typography>
          <Typography
            sx={{
              fontSize: compact ? 12.5 : 14,
              color: T.color.textSecondary,
              mt: 0.35,
              lineHeight: 1.45,
            }}
          >
            {compact
              ? "Boost visibility and sell faster."
              : "Feature your vehicle to get more visibility and sell faster."}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ mb: compact ? 1.5 : 2.5 }}>
        {benefits.map((benefit) => (
          <Box key={benefit} sx={{ display: "flex", gap: 0.75, mb: 0.75, alignItems: "center" }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 16, color: "#16a34a", flexShrink: 0 }} />
            <Typography sx={{ fontSize: compact ? 12 : 13.5, color: T.color.textSecondary, lineHeight: 1.4 }}>
              {benefit}
            </Typography>
          </Box>
        ))}
      </Box>

      {!compact ? (
        <Box sx={{ display: "flex", justifyContent: "center", mb: 2.5 }}>
          <Box
            sx={{
              width: 96,
              height: 96,
              clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
              bgcolor: "rgba(251, 146, 60, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <StarIcon sx={{ fontSize: 40, color: "#f97316" }} />
          </Box>
        </Box>
      ) : null}

      {showPayNow ? (
        <Button
          fullWidth
          variant="contained"
          size={compact ? "medium" : "large"}
          onClick={onPayNow}
          sx={{
            bgcolor: INFO,
            textTransform: "none",
            fontWeight: 700,
            fontSize: compact ? 14 : 15,
            py: compact ? 1 : 1.25,
            boxShadow: "none",
            "&:hover": { bgcolor: "#1d4ed8", boxShadow: "none" },
          }}
        >
          {payNowLabel}
        </Button>
      ) : null}
    </Box>
  );
}
