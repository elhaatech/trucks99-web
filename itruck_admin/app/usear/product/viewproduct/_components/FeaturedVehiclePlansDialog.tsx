"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Alert from "@mui/material/Alert";
import CloseIcon from "@mui/icons-material/Close";
import { FeaturePlanCard } from "@/app/common/components/buysell/FeaturePlanCard";
import { VehicleGridSkeleton } from "@/app/common/components/buysell/LoadingSkeleton";
import { BuySellErrorState } from "@/app/common/components/buysell/ErrorState";
import { getFeaturedVehiclePlans, type SubscriptionItem } from "@/model/services/subscription";
import type { User } from "@/model/services/user";
import { PRODUCT_THEME as T } from "@/lib/theme";

type FeaturedVehiclePlansDialogProps = {
  open: boolean;
  onClose: () => void;
  currentUser: User | null;
  productTitle?: string;
  /** Buy & Sell listing id (Mongo _id or uuid) to link after payment. */
  buySellProductId?: string | null;
  onPaymentSuccess?: (plan: SubscriptionItem, detail?: { message?: string }) => void;
};

export function FeaturedVehiclePlansDialog({
  open,
  onClose,
  currentUser,
  productTitle,
  buySellProductId,
  onPaymentSuccess,
}: FeaturedVehiclePlansDialogProps) {
  const [plans, setPlans] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setPlans(await getFeaturedVehiclePlans());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load featured plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void loadPlans();
  }, [open, loadPlans]);

  const bestValueId = useMemo(() => {
    if (plans.length === 0) return null;
    return plans.reduce((best, plan) =>
      plan.durationDays / Math.max(plan.price, 1) >
      best.durationDays / Math.max(best.price, 1)
        ? plan
        : best,
    ).id;
  }, [plans]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", pr: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 22 }}>Choose a Featured Plan</Typography>
          <Typography sx={{ color: T.color.textSecondary, fontSize: 14, mt: 0.5 }}>
            {productTitle
              ? `Boost visibility for ${productTitle}`
              : "Select a plan to feature your vehicle on TRUCKS99"}
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {!currentUser ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            Please log in to purchase a featured plan for your listing.
          </Alert>
        ) : null}

        {loading ? (
          <VehicleGridSkeleton count={2} />
        ) : error ? (
          <BuySellErrorState message={error} onRetry={() => void loadPlans()} />
        ) : plans.length === 0 ? (
          <Alert severity="info">
            No featured vehicle plans are available right now. Please try again later or contact support.
          </Alert>
        ) : (
          <Grid container spacing={2.5}>
            {plans.map((plan) => (
              <Grid key={plan.id} size={{ xs: 12, md: plans.length === 1 ? 12 : 6 }}>
                <FeaturePlanCard
                  plan={plan}
                  currentUser={currentUser}
                  highlighted={plan.id === bestValueId}
                  buySellProductId={buySellProductId}
                  onPaymentSuccess={(detail) => {
                    onPaymentSuccess?.(plan, detail);
                    onClose();
                  }}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
}
