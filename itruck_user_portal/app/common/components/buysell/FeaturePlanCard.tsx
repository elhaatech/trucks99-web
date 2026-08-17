"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import PayNowButton from "@/components/common/Paynowbutton";
import type { SubscriptionItem } from "@/model/services/subscription";
import type { User } from "@/model/services/user";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";

const DEFAULT_FEATURES = [
  "Top placement in search & browse",
  "Featured badge on your listing",
  "Higher visibility on dashboard",
  "More buyer inquiries",
];

type FeaturePlanCardProps = {
  plan: SubscriptionItem;
  currentUser: User | null;
  highlighted?: boolean;
  buySellProductId?: string | null;
  requestPending?: boolean;
  onPaymentSuccess?: (detail?: {
    message?: string;
    pendingApproval?: boolean;
    featuredActivated?: boolean;
  }) => void;
};

export function FeaturePlanCard({
  plan,
  currentUser,
  highlighted = false,
  buySellProductId,
  requestPending = false,
  onPaymentSuccess,
}: FeaturePlanCardProps) {
  const features =
    plan.features && plan.features.length > 0 ? plan.features : DEFAULT_FEATURES;
  const isFreePlan = Number(plan.price) === 0;

  return (
    <Box
      sx={{
        p: 3,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: T.radius.lg,
        border: `2px solid ${highlighted ? INFO : T.color.border}`,
        bgcolor: highlighted ? "rgba(37,99,235,0.04)" : T.color.surface,
        boxShadow: T.shadow.card,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 20 }}>{plan.packageName}</Typography>
        <Chip
          label={plan.status}
          size="small"
          color={plan.status === "active" ? "success" : "default"}
          sx={{ textTransform: "capitalize" }}
        />
      </Box>

      <Typography sx={{ fontSize: 28, fontWeight: 800, color: INFO, my: 1 }}>
        ₹{Number(plan.price).toLocaleString("en-IN")}
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 2, color: T.color.textSecondary }}>
        <CalendarTodayOutlinedIcon sx={{ fontSize: 16 }} />
        <Typography sx={{ fontSize: 14 }}>
          {isFreePlan
            ? "Featured after admin approval"
            : `${plan.durationDays} day${plan.durationDays !== 1 ? "s" : ""} featured visibility`}
        </Typography>
      </Box>

      {plan.description ? (
        <Typography sx={{ fontSize: 14, color: T.color.textSecondary, mb: 2 }}>
          {plan.description}
        </Typography>
      ) : null}

      <Box sx={{ flex: 1, mb: 2 }}>
        {features.map((feature) => (
          <Box key={feature} sx={{ display: "flex", gap: 1, mb: 1 }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 18, color: INFO, flexShrink: 0 }} />
            <Typography sx={{ fontSize: 14 }}>{feature}</Typography>
          </Box>
        ))}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {currentUser && buySellProductId ? (
        <PayNowButton
          item={plan}
          currentUser={currentUser}
          buySellProductId={buySellProductId}
          requestPending={requestPending}
          fullWidth
          variant={highlighted ? "contained" : "outlined"}
          onSuccess={(detail) => onPaymentSuccess?.(detail)}
        />
      ) : (
        <Button fullWidth variant="outlined" disabled sx={{ textTransform: "none", fontWeight: 600 }}>
          {!currentUser
            ? "Log in to pay"
            : "Open your listing to pay"}
        </Button>
      )}
    </Box>
  );
}
