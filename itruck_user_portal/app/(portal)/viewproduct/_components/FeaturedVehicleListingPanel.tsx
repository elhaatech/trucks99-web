"use client";

import { useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import type { BuySellProduct } from "@/model/services/buysellapi";
import type { SubscriptionItem } from "@/model/services/subscription";
import { FeaturedVehiclePromoCard } from "@/app/common/components/buysell/FeaturedVehiclePromoCard";
import {
  formatFeaturedListingDate,
  resolveFeaturedListingUi,
} from "@/lib/featuredVehicleListingStatus";
import { PRODUCT_THEME as T } from "@/lib/theme";

type FeaturedVehicleListingPanelProps = {
  product: BuySellProduct;
  compact?: boolean;
  onPayNow: () => void;
  optimisticPlan?: SubscriptionItem | null;
};

export function FeaturedVehicleListingPanel({
  product,
  compact = false,
  onPayNow,
  optimisticPlan = null,
}: FeaturedVehicleListingPanelProps) {
  const ui = useMemo(
    () => resolveFeaturedListingUi(product, { optimisticPlan }),
    [product, optimisticPlan],
  );

  if (ui.state === "active") {
    return (
      <Box
        sx={{
          p: compact ? 1.75 : 2.5,
          borderRadius: T.radius.lg,
          border: `1px solid rgba(22,163,74,0.35)`,
          bgcolor: "#f0fdf4",
        }}
      >
        <Alert severity="success" sx={{ mb: compact ? 1.25 : 1.5, borderRadius: T.radius.md }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 0.5 }}>
            {ui.packageName ? `${ui.packageName} is active` : "Featured plan is active"}
          </Typography>
          <Typography sx={{ fontSize: 13, lineHeight: 1.55 }}>
            Your listing is featured on TRUCKS99
            {ui.endDate ? (
              <>
                {" "}
                until <strong>{formatFeaturedListingDate(ui.endDate)}</strong>
              </>
            ) : null}
            .
            {ui.daysRemaining != null ? (
              <>
                {" "}
                {ui.daysRemaining === 0
                  ? "Expires today."
                  : `${ui.daysRemaining} day${ui.daysRemaining === 1 ? "" : "s"} remaining.`}
              </>
            ) : null}
          </Typography>
          {ui.startDate ? (
            <Typography sx={{ fontSize: 12, color: T.color.textSecondary, mt: 0.75 }}>
              Started {formatFeaturedListingDate(ui.startDate)}
            </Typography>
          ) : null}
        </Alert>
        <Typography sx={{ fontSize: 12.5, color: T.color.textSecondary, lineHeight: 1.5 }}>
          Pay Now is hidden while your plan is active. After expiry you can renew from this page.
        </Typography>
      </Box>
    );
  }

  if (ui.state === "expired" || ui.state === "cancelled") {
    return (
      <Box>
        <Alert
          severity={ui.state === "expired" ? "warning" : "info"}
          sx={{ mb: compact ? 1.25 : 1.5, borderRadius: T.radius.md }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 0.5 }}>
            {ui.state === "expired" ? "Featured visibility has ended" : "Featured plan was cancelled"}
          </Typography>
          <Typography sx={{ fontSize: 13, lineHeight: 1.55 }}>
            {ui.state === "expired" ? (
              <>
                {ui.packageName ? (
                  <>
                    <strong>{ui.packageName}</strong> ended
                  </>
                ) : (
                  "Your featured plan ended"
                )}
                {ui.endDate ? (
                  <>
                    {" "}
                    on <strong>{formatFeaturedListingDate(ui.endDate)}</strong>
                  </>
                ) : null}
                .
                {ui.expiredDaysAgo != null && ui.expiredDaysAgo > 0 ? (
                  <>
                    {" "}
                    That was {ui.expiredDaysAgo} day{ui.expiredDaysAgo === 1 ? "" : "s"} ago.
                  </>
                ) : ui.expiredDaysAgo === 0 ? (
                  <> It expired today.</>
                ) : null}{" "}
                Renew below to show this vehicle in Featured Vehicles again.
              </>
            ) : (
              "You can purchase a new featured plan below whenever you are ready."
            )}
          </Typography>
        </Alert>
        <FeaturedVehiclePromoCard
          compact={compact}
          onPayNow={onPayNow}
          showPayNow
          payNowLabel={ui.payNowLabel}
        />
      </Box>
    );
  }

  return (
    <FeaturedVehiclePromoCard
      compact={compact}
      onPayNow={onPayNow}
      showPayNow={ui.showPayNow}
      payNowLabel={ui.payNowLabel}
    />
  );
}
