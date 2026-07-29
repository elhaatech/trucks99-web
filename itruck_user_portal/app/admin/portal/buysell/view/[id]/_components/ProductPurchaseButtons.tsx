"use client";

import { useCallback, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import {
  type BuySellProduct,
  addBuySellToCart,
  getBuySellCart,
} from "@/model/services/buysellapi";
import type { User } from "@/model/services/user";
import { isProductOwner } from "@/lib/buySellPermissions";
import { ProductStatusChip } from "../../../_components/ProductStatusChip";

export { isProductOwner };

/** Statuses where buyers can add to cart. */
const PURCHASABLE_STATUSES = new Set(["active", "pending"]);

function formatCurrency(amount: number) {
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

export type ProductPurchaseButtonsProps = {
  product: BuySellProduct;
  productId: string;
  currentUser: User | null;
  currentUserId: string | null;
  /** @deprecated pass product + user; kept for callers */
  isOwner?: boolean;
  variant?: "panel" | "header";
  onUpdated?: () => void;
  onNotify: (payload: { type: "success" | "error"; message: string }) => void;
  onCartChange?: () => void;
  /** When true, renders only action buttons without the purchase card wrapper. */
  embedded?: boolean;
};

export function ProductPurchaseButtons({
  product,
  productId,
  currentUser,
  currentUserId,
  isOwner: isOwnerProp,
  variant = "panel",
  onNotify,
  onCartChange,
  embedded = false,
}: ProductPurchaseButtonsProps) {
  const [busy, setBusy] = useState(false);
  const [inCart, setInCart] = useState(false);

  const status = (product.status ?? "").toLowerCase().trim();
  const isOwner =
    isOwnerProp ?? isProductOwner(product, currentUser, currentUserId);
  const price = Number(product.price) || 0;

  const refreshInCart = useCallback(async () => {
    if (!currentUserId && !currentUser?.id) {
      setInCart(false);
      return;
    }
    try {
      const res = await getBuySellCart();
      const ids = new Set(
        (res.items ?? []).map((item) =>
          String(item.product?.id ?? item.product?._id ?? item.productId),
        ),
      );
      setInCart(ids.has(String(productId)));
    } catch {
      setInCart(false);
    }
  }, [currentUser, currentUserId, productId]);

  useEffect(() => {
    void refreshInCart();
  }, [refreshInCart]);

  const canAddToCart = PURCHASABLE_STATUSES.has(status);
  const purchaseDisabled = isOwner;

  const handlePurchaseBlocked = () => {
    onNotify({
      type: "error",
      message:
        "You can't purchase your own listing. Use Buy filter to shop from other sellers.",
    });
  };

  const handleAddToCart = async () => {
    if (purchaseDisabled) {
      handlePurchaseBlocked();
      return;
    }
    if (!currentUserId && !currentUser?.id) {
      onNotify({ type: "error", message: "Please log in to add to cart." });
      return;
    }
    setBusy(true);
    try {
      const res = await addBuySellToCart(productId);
      setInCart(true);
      onNotify({ type: "success", message: res.message });
      onCartChange?.();
    } catch (err) {
      onNotify({
        type: "error",
        message: err instanceof Error ? err.message : "Could not add to cart",
      });
    } finally {
      setBusy(false);
    }
  };

  const spinner = busy ? (
    <CircularProgress size={18} color="inherit" />
  ) : undefined;

  const buttonSx =
    variant === "panel"
      ? { minWidth: { xs: "100%", sm: 180 }, py: 1.25, fontWeight: 700 }
      : undefined;

  const buttons = canAddToCart ? (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 1.5,
        alignItems: "stretch",
        width: "100%",
      }}
    >
      <Button
        variant="outlined"
        size="large"
        fullWidth={variant === "panel"}
        sx={buttonSx}
        disabled={busy || inCart || purchaseDisabled}
        startIcon={spinner ?? <ShoppingCartIcon />}
        onClick={handleAddToCart}
      >
        {inCart ? "Added to cart" : "Add to cart"}
      </Button>
    </Box>
  ) : null;

  if (variant === "header") {
    if (status === "sold" || status === "rejected") return null;
    if (!canAddToCart) return null;
    return buttons;
  }

  if (embedded) {
    if (status === "sold" || status === "rejected") return null;
    return (
      <Box>
        {isOwner && canAddToCart ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            This is your listing — cart actions are disabled for you.
          </Typography>
        ) : null}
        {status === "booking" && !isOwner ? (
          <Typography variant="body2" color="warning.main" fontWeight={600} sx={{ mb: 1.5 }}>
            This vehicle is already booked by another buyer.
          </Typography>
        ) : !canAddToCart && status !== "sold" && status !== "rejected" ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            This vehicle is not available right now (status: {status || "unknown"}).
          </Typography>
        ) : (
          buttons
        )}
      </Box>
    );
  }

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: "primary.light",
        bgcolor: (theme) =>
          theme.palette.mode === "light"
            ? "rgba(25, 118, 210, 0.06)"
            : "rgba(25, 118, 210, 0.12)",
        borderWidth: 2,
      }}
    >
      <CardContent>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1,
            mb: 2,
          }}
        >
          <Box>
            <Typography variant="h6" fontWeight={800}>
              Interested in this vehicle?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Listed at {formatCurrency(price)} · Save to your cart
            </Typography>
          </Box>
          <ProductStatusChip status={product.status} />
        </Box>

        {isOwner && canAddToCart ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            This is your listing — cart actions are disabled for you.
          </Typography>
        ) : null}

        {status === "booking" && !isOwner ? (
          <Typography variant="body2" color="warning.main" fontWeight={600}>
            This vehicle is already booked by another buyer.
          </Typography>
        ) : status === "sold" || status === "rejected" ? (
          <Typography variant="body2" color="text.secondary">
            This listing is no longer available.
          </Typography>
        ) : !canAddToCart ? (
          <Typography variant="body2" color="text.secondary">
            This vehicle is not available right now (status: {status || "unknown"}).
          </Typography>
        ) : (
          buttons
        )}
      </CardContent>
    </Card>
  );
}
