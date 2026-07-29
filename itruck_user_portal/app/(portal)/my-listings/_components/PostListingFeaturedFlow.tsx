"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import StarOutlineIcon from "@mui/icons-material/StarOutline";
import { FeaturedVehiclePromoCard } from "@/app/common/components/buysell";
import { FeaturedVehiclePlansDialog } from "@/app/(portal)/viewproduct/_components/FeaturedVehiclePlansDialog";
import type { User } from "@/model/services/user";
import type { SubscriptionItem } from "@/model/services/subscription";
import { PRODUCT_THEME as T } from "@/lib/theme";

export type NewListingFeaturedPrompt = {
  productId: string;
  title: string;
};

type PostListingFeaturedFlowProps = {
  listing: NewListingFeaturedPrompt | null;
  onDismiss: () => void;
  currentUser: User | null;
  onPaymentSuccess?: (plan: SubscriptionItem, detail?: { message?: string }) => void;
  onViewListing?: (productId: string) => void;
};

export function PostListingFeaturedFlow({
  listing,
  onDismiss,
  currentUser,
  onPaymentSuccess,
  onViewListing,
}: PostListingFeaturedFlowProps) {
  const [plansOpen, setPlansOpen] = useState(false);

  useEffect(() => {
    if (!listing) setPlansOpen(false);
  }, [listing]);

  const handleClosePrompt = () => {
    setPlansOpen(false);
    onDismiss();
  };

  const openPlans = () => {
    if (!currentUser) return;
    setPlansOpen(true);
  };

  return (
    <>
      <Dialog
        open={Boolean(listing) && !plansOpen}
        onClose={handleClosePrompt}
        fullWidth
        maxWidth="sm"
        aria-labelledby="post-listing-featured-title"
      >
        <DialogTitle
          id="post-listing-featured-title"
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            pr: 1,
            pb: 1,
          }}
        >
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: "rgba(22, 163, 74, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <CheckCircleOutlineIcon sx={{ color: "#16a34a", fontSize: 26 }} />
            </Box>
            <Box>
              <Typography component="span" sx={{ fontWeight: 800, fontSize: 18, display: "block" }}>
                You&apos;re live on TRUCK99
              </Typography>
              {listing?.title ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.45 }}>
                  {listing.title}
                </Typography>
              ) : null}
            </Box>
          </Box>
          <IconButton onClick={handleClosePrompt} aria-label="Close" size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ pt: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 1.5,
            }}
          >
            <StarOutlineIcon sx={{ color: "#f97316", fontSize: 20 }} />
            <Typography sx={{ fontWeight: 700, fontSize: 15, color: T.color.textPrimary }}>
              Optional: get more visibility
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: T.color.textSecondary, mb: 2, lineHeight: 1.55 }}>
            Featured listings appear on the dashboard and featured page so buyers find your vehicle faster.
          </Typography>
          <FeaturedVehiclePromoCard
            compact
            payNowLabel={currentUser ? "Choose featured plan" : "Log in to feature"}
            onPayNow={openPlans}
          />
          {!currentUser ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Sign in is required to purchase a featured plan.
            </Typography>
          ) : null}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, flexWrap: "wrap", gap: 1, justifyContent: "space-between" }}>
          <Button
            onClick={handleClosePrompt}
            sx={{ textTransform: "none", color: T.color.textSecondary }}
          >
            Maybe later
          </Button>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {listing && onViewListing ? (
              <Button
                variant="outlined"
                onClick={() => onViewListing(listing.productId)}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                View listing
              </Button>
            ) : null}
            {currentUser ? (
              <Button
                variant="contained"
                onClick={openPlans}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                Feature this vehicle
              </Button>
            ) : null}
          </Box>
        </DialogActions>
      </Dialog>

      <FeaturedVehiclePlansDialog
        open={plansOpen && Boolean(listing)}
        onClose={() => setPlansOpen(false)}
        currentUser={currentUser}
        productTitle={listing?.title}
        buySellProductId={listing?.productId ?? null}
        onPaymentSuccess={(plan, detail) => {
          onPaymentSuccess?.(plan, detail);
          handleClosePrompt();
        }}
      />
    </>
  );
}
