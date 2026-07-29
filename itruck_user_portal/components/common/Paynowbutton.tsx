"use client";

import React, { useState } from "react";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Box,
  Typography,
  Chip,
  Divider,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import PaymentIcon from "@mui/icons-material/Payment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import type { SubscriptionItem } from "@/model/services/subscription";
import type { User } from "@/model/services/user";
import {
  createPaymentOrder,
  loadRazorpayScript,
  openRazorpayCheckout,
  verifyPayment,
  failPayment,
} from "@/model/services/Payment";
import {
  isFeaturedVehiclePlan,
} from "@/model/services/subscription";
import { activateBuySellFeaturedVehicle } from "@/model/services/buysellapi";
import { getLoadAll, getTruckAll } from "@/model/api";

// ─── Props ────────────────────────────────────────────────────────────────────

type PayNowButtonProps = {
  item: SubscriptionItem;
  currentUser?: User | null;
  /** Buy & Sell product id when purchasing "Feature Your Vehicle" for a listing. */
  buySellProductId?: string | null;
  onSuccess?: (detail?: { featuredActivated?: boolean; message?: string }) => void;
  variant?: "contained" | "outlined" | "text";
  size?: "small" | "medium" | "large";
  fullWidth?: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PayNowButton({
  item,
  currentUser,
  buySellProductId,
  onSuccess,
  variant = "contained",
  size = "medium",
  fullWidth = false,
}: PayNowButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successDetailMessage, setSuccessDetailMessage] = useState<string | null>(
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [autoPay, setAutoPay] = useState(false);

  // Calculate expiry date for display
  const getExpiryDate = () => {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + item.durationDays);
    return expiryDate.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handlePayClick = () => {
    // Show confirmation popup before proceeding with payment
    setConfirmOpen(true);
  };

  const handleConfirmPay = async () => {
    setConfirmOpen(false);
    setError(null);
    setLoading(true);

    try {
      // 1. Load Razorpay SDK
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) {
        setError(
          "Failed to load payment gateway. Check your internet connection.",
        );
        setLoading(false);
        return;
      }

      // 2. Create order on backend
      const order = await createPaymentOrder({
        amount: item.price,
        subscriptionItemId: item.id,
        fieldName: item.fieldName,
        packageName: item.packageName,
        durationDays: item.durationDays,
        ...(buySellProductId ? { productId: buySellProductId } : {}),
      });

      setLoading(false); // stop spinner before Razorpay modal opens

      // 3. Open Razorpay checkout modal
      openRazorpayCheckout({
        keyId: order.keyId,
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        packageName: item.packageName,
        description:
          item.description || `${item.packageName} — ${item.fieldName}`,

        onSuccess: async (razorpayResponse) => {
          setLoading(true);
          try {
            const isFeaturedPlan = isFeaturedVehiclePlan(item);
            const verifyResult = await verifyPayment({
              razorpay_order_id: razorpayResponse.razorpay_order_id,
              razorpay_payment_id: razorpayResponse.razorpay_payment_id,
              razorpay_signature: razorpayResponse.razorpay_signature,
              subscriptionItemId: item.id,
              fieldName: item.fieldName,
              packageName: item.packageName,
              packageType: item.packageType,
              durationDays: item.durationDays,
              price: item.price,
              autoPay: autoPay,
              ...(buySellProductId ? { productId: buySellProductId } : {}),
            });

            let featuredActivated = Boolean(verifyResult.featuredVehicle);
            let userMessage = verifyResult.message;

            if (
              isFeaturedPlan &&
              buySellProductId &&
              !verifyResult.featuredVehicle
            ) {
              const activateResult = await activateBuySellFeaturedVehicle({
                productId: buySellProductId,
                orderId: verifyResult.orderId,
                paymentId: verifyResult.paymentId,
                subscriptionItemId: item.id,
                packageName: item.packageName,
              });
              featuredActivated = true;
              userMessage = activateResult.message;
            }

            if (isFeaturedPlan && buySellProductId && featuredActivated) {
              userMessage =
                userMessage ||
                "Payment successful. Your vehicle is now featured.";
            }

            await getLoadAll();
            await getTruckAll();
            setSuccessDetailMessage(userMessage);
            setSuccessOpen(true);
            onSuccess?.({
              featuredActivated: isFeaturedPlan && Boolean(buySellProductId),
              message: userMessage,
            });
          } catch (err: any) {
            setError(
              err?.message || "Payment verification failed. Contact support.",
            );
          } finally {
            setLoading(false);
          }
        },

        onFailure: async (err) => {
          const errorMessage =
            typeof err === "string" ? err : "Payment was cancelled or failed.";
          setError(errorMessage);
          try {
            await failPayment({
              orderId: order.orderId,
              errorDetails: errorMessage,
            });
          } catch (failErr) {
            console.error("Failed to update transaction status:", failErr);
          }
        },
      });
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {item.price === 0 ? (
        <Button
          variant="outlined"
          fullWidth={fullWidth}
          size={size}
          disabled
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          Free Plan
        </Button>
      ) : (
        <Button
          variant={variant}
          size={size}
          fullWidth={fullWidth}
          startIcon={
            loading ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <PaymentIcon />
            )
          }
          onClick={handlePayClick}
          disabled={loading || item.status === "inactive"}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          {loading
            ? "Processing…"
            : `Pay ₹${item.price.toLocaleString("en-IN")}`}
        </Button>
      )}

      {/* ── Auto-Pay Confirmation Dialog ── */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
          },
        }}
      >
        <Box
          sx={{
            background: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
            color: "#fff",
            px: 3,
            py: 2.5,
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <AutorenewIcon sx={{ fontSize: 28 }} />
            <Typography variant="h6" fontWeight={700}>
              Confirm Subscription Payment
            </Typography>
          </Box>
        </Box>

        <DialogContent sx={{ pt: 3, pb: 1 }}>
          <Box
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              p: 2.5,
              mb: 2.5,
              bgcolor: "grey.50",
            }}
          >
            <Typography variant="subtitle1" fontWeight={700} mb={1}>
              {item.packageName}
            </Typography>

            <Box display="flex" flexWrap="wrap" gap={1} mb={1.5}>
              <Chip
                label={
                  item.packageType === "match_load"
                    ? "Load Matching"
                    : item.packageType === "match_truck"
                      ? "Truck Matching"
                      : item.packageType === "agent"
                        ? "Agent Package"
                        : item.packageType
                }
                size="small"
                color="primary"
                variant="outlined"
              />
              <Chip
                icon={<CalendarTodayIcon />}
                label={`${item.durationDays} days`}
                size="small"
                variant="outlined"
              />
            </Box>

            <Divider sx={{ my: 1.5 }} />

            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="body2" color="text.secondary">
                Amount to pay
              </Typography>
              <Typography variant="h5" fontWeight={800} color="primary">
                ₹{item.price.toLocaleString("en-IN")}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1.5,
              p: 2,
              bgcolor: "warning.50",
              border: "1px solid",
              borderColor: "warning.200",
              borderRadius: 2,
              mb: 1,
            }}
          >
            <WarningAmberIcon
              sx={{ color: "warning.main", mt: 0.25, fontSize: 22 }}
            />
            <Box>
              <Typography
                variant="body2"
                fontWeight={600}
                color="warning.dark"
                mb={0.5}
              >
                Auto-Pay Notice
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your subscription will be active for{" "}
                <strong>{item.durationDays} days</strong> starting from today.
                It will expire on <strong>{getExpiryDate()}</strong>.
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                Once the duration is completed, your plan will automatically
                switch to the
                <strong> Free Plan</strong> unless you renew or enable Auto-Pay.
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              px: 2,
              py: 1.5,
              border: "1px solid",
              borderColor: "primary.200",
              bgcolor: "primary.50",
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={autoPay}
                  onChange={(e) => setAutoPay(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Typography
                  variant="body2"
                  fontWeight={600}
                  color="primary.dark"
                >
                  Enable Auto-Pay (Automatic Renewal)
                </Typography>
              }
              sx={{ m: 0 }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setConfirmOpen(false)}
            variant="outlined"
            color="inherit"
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmPay}
            variant="contained"
            startIcon={<PaymentIcon />}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              px: 3,
            }}
          >
            Confirm & Pay ₹{item.price.toLocaleString("en-IN")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Success Confirmation Dialog ── */}
      <Dialog
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        PaperProps={{
          sx: { borderRadius: 3, overflow: "hidden" },
        }}
      >
        <Box
          sx={{
            background: "linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)",
            color: "#fff",
            px: 3,
            py: 2.5,
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <CheckCircleIcon sx={{ fontSize: 28 }} />
            <Typography variant="h6" fontWeight={700}>
              Payment Successful
            </Typography>
          </Box>
        </Box>

        <DialogContent sx={{ pt: 3 }}>
          <DialogContentText component="div">
            {successDetailMessage ? (
              <Typography variant="body1" sx={{ mb: 1 }}>
                {successDetailMessage}
              </Typography>
            ) : (
              <Typography variant="body1">
                <strong>{item.packageName}</strong> has been activated for{" "}
                <strong>{item.durationDays} days</strong>.
              </Typography>
            )}
            {!successDetailMessage?.includes("featured") ? (
              <>
                <Typography variant="body2" color="text.secondary" mt={1}>
                  Plan expires on: <strong>{getExpiryDate()}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary" mt={0.5}>
                  You can now use {item.fieldName} features included in this plan.
                </Typography>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary" mt={1}>
                Featured until: <strong>{getExpiryDate()}</strong>
              </Typography>
            )}
            <Box
              sx={{
                mt: 2,
                p: 1.5,
                bgcolor: "info.50",
                borderRadius: 1.5,
                border: "1px solid",
                borderColor: "info.200",
              }}
            >
              <Typography variant="caption" color="info.dark">
                {autoPay ? (
                  <>
                    💡 You have enabled <strong>Auto-Pay</strong>. This plan
                    will automatically renew on expiry.
                  </>
                ) : (
                  <>
                    💡 Your plan will automatically switch to the Free Plan
                    after the duration period ends. You will be notified before
                    expiry.
                  </>
                )}
              </Typography>
            </Box>
          </DialogContentText>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setSuccessOpen(false)}
            variant="contained"
            color="success"
            sx={{ textTransform: "none", borderRadius: 2, px: 3 }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
