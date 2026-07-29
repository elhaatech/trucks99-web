"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CircularProgress from "@mui/material/CircularProgress";
import { useState } from "react";
import {
  type BuySellProduct,
  markBuySellProductSold,
} from "@/model/services/buysellapi";
import { ProductStatusChip } from "../../../_components/ProductStatusChip";

function extractId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "_id" in value) {
    const inner = (value as { _id?: unknown })._id;
    return inner ? String(inner) : null;
  }
  return String(value);
}

function formatCurrency(amount: number) {
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export type ProductLifecycleSectionProps = {
  product: BuySellProduct;
  productId: string;
  currentUserId: string | null;
  isOwner: boolean;
  onUpdated: () => void;
  onNotify: (payload: { type: "success" | "error"; message: string }) => void;
};

export function ProductLifecycleSection({
  product,
  productId,
  currentUserId,
  isOwner,
  onUpdated,
  onNotify,
}: ProductLifecycleSectionProps) {
  const [busy, setBusy] = useState(false);
  const status = (product.status ?? "").toLowerCase();
  const purchasedById = extractId(product.purchasedBy);
  const isPurchasedBuyer =
    !!currentUserId && !!purchasedById && currentUserId === purchasedById;
  const showMarkSold =
    status === "purchased" && (isOwner || isPurchasedBuyer);

  const handleMarkSold = async () => {
    setBusy(true);
    try {
      const res = await markBuySellProductSold(productId);
      onNotify({ type: "success", message: res.message });
      onUpdated();
    } catch (err) {
      onNotify({
        type: "error",
        message: err instanceof Error ? err.message : "Action failed",
      });
    } finally {
      setBusy(false);
    }
  };

  const hasPaymentInfo =
    product.advanceAmount != null ||
    product.bookedAt ||
    product.purchasedAt ||
    product.soldAt;

  if (
    !hasPaymentInfo &&
    !showMarkSold &&
    !["sold", "rejected", "booking"].includes(status)
  ) {
    return null;
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1,
            mb: hasPaymentInfo || showMarkSold ? 2 : 0,
          }}
        >
          <Typography variant="subtitle1" fontWeight={600}>
            Order status
          </Typography>
          <ProductStatusChip status={product.status} />
        </Box>

        {status === "sold" && (
          <Alert severity="info" sx={{ mb: 2 }}>
            This vehicle has been sold.
          </Alert>
        )}

        {status === "booking" && !isOwner && (
          <Alert severity="info" sx={{ mb: 2 }}>
            This vehicle is currently booked by another buyer.
          </Alert>
        )}

        {hasPaymentInfo && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 1.5,
              mb: showMarkSold ? 2 : 0,
              p: 1.5,
              borderRadius: 1,
              bgcolor: "grey.50",
              border: "1px solid",
              borderColor: "grey.200",
            }}
          >
            {product.advanceAmount != null && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Advance paid
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatCurrency(product.advanceAmount)}
                </Typography>
              </Box>
            )}
            {product.bookedAt && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Booked at
                </Typography>
                <Typography variant="body2">
                  {formatDate(product.bookedAt)}
                </Typography>
              </Box>
            )}
            {product.purchaseAmount != null && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Paid amount
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatCurrency(product.purchaseAmount)}
                </Typography>
              </Box>
            )}
            {product.soldAt && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Sold at
                </Typography>
                <Typography variant="body2">{formatDate(product.soldAt)}</Typography>
              </Box>
            )}
          </Box>
        )}

        {showMarkSold && (
          <Button
            variant="outlined"
            color="secondary"
            startIcon={
              busy ? (
                <CircularProgress size={16} />
              ) : (
                <LocalShippingIcon />
              )
            }
            disabled={busy}
            onClick={handleMarkSold}
          >
            Mark as sold
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
