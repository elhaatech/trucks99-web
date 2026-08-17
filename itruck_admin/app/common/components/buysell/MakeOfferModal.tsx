"use client";

import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { getBuySellImageUrl } from "@/lib/buysellUtils";
import { createBitRecord } from "@/model/services/bitRecord";
import type { BuySellProduct } from "@/model/services/buysellapi";
import { formatProductPrice, getProductTitle } from "./utils";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";

type MakeOfferModalProps = {
  open: boolean;
  onClose: () => void;
  product: BuySellProduct;
  productId: string;
  onSuccess?: () => void;
  onNotify: (payload: { type: "success" | "error"; message: string }) => void;
};

export function MakeOfferModal({
  open,
  onClose,
  product,
  productId,
  onSuccess,
  onNotify,
}: MakeOfferModalProps) {
  const [offerPrice, setOfferPrice] = useState(String(product.price ?? ""));
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const bit = Number(offerPrice);
    if (!Number.isFinite(bit) || bit <= 0) {
      onNotify({ type: "error", message: "Enter a valid offer price." });
      return;
    }

    setSubmitting(true);
    try {
      await createBitRecord({
        type: "product",
        productId,
        bit,
        bitReason: message.trim() || undefined,
        status: "pending",
      });
      onNotify({ type: "success", message: "Offer sent successfully." });
      onSuccess?.();
      onClose();
      setMessage("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send offer";
      if (/already submitted an offer/i.test(message)) {
        onNotify({ type: "error", message });
        onSuccess?.();
      } else {
        onNotify({ type: "error", message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const imageUrl = getBuySellImageUrl(product.images?.[0]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
        Make an Offer
        <IconButton onClick={onClose} aria-label="Close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 3,
            minHeight: 280,
          }}
        >
          <Box
            sx={{
              p: 2.5,
              borderRadius: T.radius.lg,
              bgcolor: T.color.surfaceMuted,
              border: `1px solid ${T.color.border}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <Box
              sx={{
                width: "100%",
                maxWidth: 280,
                aspectRatio: "4 / 3",
                borderRadius: T.radius.md,
                bgcolor: T.color.border,
                backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                mb: 2,
              }}
            />
            <Typography fontWeight={700} fontSize={18}>
              {getProductTitle(product)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Listed at {formatProductPrice(product.price)}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="Your Offer Price (₹)"
              type="number"
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
            />
            <TextField
              fullWidth
              multiline
              minRows={4}
              label="Message to Seller (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell the seller why you're interested…"
            />
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleSubmit}
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}
              sx={{ mt: "auto", bgcolor: INFO, textTransform: "none", fontWeight: 700, py: 1.35 }}
            >
              Send Offer
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
