"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Grid from "@mui/material/Grid";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";
import { userProductRoutes } from "@/lib/userProductRoutes";
import {
  getFeaturedVehiclePlans,
  isFeaturedVehiclePlan,
  type SubscriptionItem,
} from "@/model/services/subscription";
import { getMySubscriptions } from "@/model/services/Payment";
import { useMarketplaceAuth } from "@/components/marketplace/MarketplaceAuthProvider";
import { FeaturePlanCard, FeaturedVehiclePromoCard } from "@/app/common/components/buysell";
import { VehicleGridSkeleton } from "@/app/common/components/buysell/LoadingSkeleton";
import { BuySellErrorState } from "@/app/common/components/buysell/ErrorState";

type Step = "promo" | "plans" | "activated";

export default function FeaturedVehiclePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser } = useMarketplaceAuth();
  const buySellProductId = useMemo(
    () => searchParams.get("productId")?.trim() || "",
    [searchParams],
  );
  const [step, setStep] = useState<Step>("promo");
  const [plans, setPlans] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activePlan, setActivePlan] = useState<SubscriptionItem | null>(null);
  const [activatedPlan, setActivatedPlan] = useState<SubscriptionItem | null>(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [catalogPlans, mySubs] = await Promise.all([
        getFeaturedVehiclePlans(),
        getMySubscriptions().catch(() => ({ userId: "", activeSubscriptions: [] })),
      ]);

      setPlans(catalogPlans);

      const activeFeatured = (mySubs.activeSubscriptions ?? []).find(
        (sub) =>
          sub.status === "active" &&
          isFeaturedVehiclePlan({
            id: sub.subscriptionItemId,
            packageName: sub.packageName,
            packageType: sub.packageType,
            fieldName: sub.fieldName,
            price: sub.price,
            durationDays: sub.durationDays,
            status: "active",
          }),
      );

      if (activeFeatured) {
        setActivePlan({
          id: activeFeatured.subscriptionItemId,
          packageName: activeFeatured.packageName,
          packageType: activeFeatured.packageType,
          fieldName: activeFeatured.fieldName,
          price: activeFeatured.price,
          durationDays: activeFeatured.durationDays,
          status: "active",
        });
      } else {
        setActivePlan(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load featured plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const bestValueId = useMemo(() => {
    if (plans.length === 0) return null;
    return plans.reduce((best, plan) =>
      plan.durationDays / Math.max(plan.price, 1) >
      best.durationDays / Math.max(best.price, 1)
        ? plan
        : best,
    ).id;
  }, [plans]);

  const handlePaymentSuccess = (
    plan: SubscriptionItem,
    detail?: { message?: string },
  ) => {
    setActivatedPlan(plan);
    setStep("activated");
    void loadPlans();
    if (detail?.message) setError("");
  };

  const canPayForOwnListing = Boolean(currentUser) && Boolean(buySellProductId);

  return (
    <Box>
      {!currentUser && step !== "activated" ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          Please log in to feature a vehicle you posted for sale.
        </Alert>
      ) : null}

      {activePlan && step !== "activated" ? (
        <Alert severity="success" sx={{ mb: 3 }}>
          You have an active <strong>{activePlan.packageName}</strong> plan (
          {activePlan.durationDays} days). Select a listing from Sell Vehicle to apply the boost.
        </Alert>
      ) : null}

      {step === "promo" && (
        <Box sx={{ width: "100%", maxWidth: 560, mx: "auto", py: 2 }}>
          <FeaturedVehiclePromoCard
            showPayNow={canPayForOwnListing}
            onPayNow={() => setStep("plans")}
          />
          {!currentUser ? (
            <Button
              variant="contained"
              onClick={() => router.push("/")}
              sx={{ mt: 2, bgcolor: INFO }}
            >
              Log in
            </Button>
          ) : !buySellProductId ? (
            <Button
              sx={{ mt: 2 }}
              variant="contained"
              onClick={() => router.push(userProductRoutes.sellVehicle())}
            >
              Go to my listings
            </Button>
          ) : null}
          <Button sx={{ mt: 2 }} onClick={() => router.push(userProductRoutes.dashboard())}>
            Back to dashboard
          </Button>
        </Box>
      )}

      {step === "plans" && (
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 24, mb: 0.5 }}>
            Choose a Featured Plan
          </Typography>
          <Typography sx={{ color: T.color.textSecondary, mb: 3 }}>
            Plans loaded from your subscription catalog — only &quot;Feature Your Vehicle&quot;
            packages are shown.
          </Typography>

          {!buySellProductId ? (
            <Alert severity="warning" sx={{ mb: 3 }}>
              Open a listing from My Listings or Sell Vehicle and choose &quot;Feature&quot; so
              your payment is linked to that vehicle. You can still purchase a plan here, but it
              will not feature a listing until you pay from a product page.
            </Alert>
          ) : null}

          {loading ? (
            <VehicleGridSkeleton count={2} />
          ) : error ? (
            <BuySellErrorState message={error} onRetry={() => void loadPlans()} />
          ) : plans.length === 0 ? (
            <Alert severity="info">
              No &quot;Feature Your Vehicle&quot; plans are available right now. Please contact
              support or try again later.
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {plans.map((plan) => (
                <Grid key={plan.id} size={{ xs: 12, md: plans.length === 1 ? 12 : 6 }}>
                  <FeaturePlanCard
                    plan={plan}
                    currentUser={currentUser}
                    highlighted={plan.id === bestValueId}
                    buySellProductId={buySellProductId || undefined}
                    onPaymentSuccess={(detail) => handlePaymentSuccess(plan, detail)}
                  />
                </Grid>
              ))}
            </Grid>
          )}

          <Button sx={{ mt: 3 }} onClick={() => setStep("promo")}>
            Back
          </Button>
        </Box>
      )}

      {step === "activated" && (
        <Box sx={{ width: "100%", textAlign: "center", py: 4 }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 64, color: "#16a34a", mb: 2 }} />
          <Typography sx={{ fontWeight: 800, fontSize: 24, mb: 1 }}>
            Payment Successful
          </Typography>
          <Typography sx={{ color: T.color.textSecondary, mb: 1 }}>
            {buySellProductId
              ? "Payment successful. Your vehicle is now featured."
              : `${activatedPlan?.packageName ?? "Feature Your Vehicle"} is now active for ${activatedPlan?.durationDays ?? "—"} days.`}
          </Typography>
          <Typography sx={{ color: T.color.textSecondary, mb: 3 }}>
            {buySellProductId
              ? "Your listing will appear in Featured Vehicles on the dashboard."
              : "Open a listing and feature it from the product page to apply this plan to a vehicle."}
          </Typography>
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
            <Button
              variant="contained"
              onClick={() => router.push(userProductRoutes.sellVehicle())}
              sx={{ bgcolor: INFO }}
            >
              Go to Sell Vehicle
            </Button>
            <Button variant="outlined" onClick={() => router.push(userProductRoutes.dashboard())}>
              Dashboard
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
