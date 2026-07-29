"use client";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import CloseIcon from "@mui/icons-material/Close";
import { formatProductPrice } from "../utils";
import {
  formatOfferDate,
  offerStatusLabel,
  offerStatusTextColor,
} from "./productOfferMappers";
import type { OfferRow } from "../OfferTable";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";

type ProductOfferDetailDialogProps = {
  open: boolean;
  onClose: () => void;
  offer: OfferRow | null;
  mode: "my" | "received";
};

export function ProductOfferDetailDialog({
  open,
  onClose,
  offer,
  mode,
}: ProductOfferDetailDialogProps) {
  if (!offer) return null;

  const listed = offer.product?.price;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontWeight: 800,
          pb: 1,
        }}
      >
        Offer details
        <IconButton onClick={onClose} aria-label="Close" size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 16, mb: 2 }}>
          {offer.productTitle || "Vehicle"}
        </Typography>

        <Box sx={{ display: "grid", gap: 1.5 }}>
          <Row label={mode === "my" ? "Seller" : "Buyer"} value={offer.counterpartyName || offer.userName || "—"} />
          <Row
            label={mode === "my" ? "My offer" : "Offer price"}
            value={formatProductPrice(offer.bit)}
            valueSx={{ fontWeight: 800, color: INFO, fontSize: 18 }}
          />
          <Row
            label={mode === "my" ? "Seller price" : "My price"}
            value={listed != null ? formatProductPrice(listed) : "—"}
          />
          <Box>
            <Typography sx={{ fontSize: 12, color: T.color.textMuted, mb: 0.5 }}>Status</Typography>
            <Typography sx={{ fontWeight: 700, color: offerStatusTextColor(offer.status) }}>
              {offerStatusLabel(offer.status)}
            </Typography>
          </Box>
          <Row label="Date" value={formatOfferDate(offer.createdAt)} />
          {offer.bitReason ? (
            <Box>
              <Typography sx={{ fontSize: 12, color: T.color.textMuted, mb: 0.5 }}>Message</Typography>
              <Typography sx={{ fontSize: 14, color: T.color.textSecondary, fontStyle: "italic" }}>
                &ldquo;{offer.bitReason}&rdquo;
              </Typography>
            </Box>
          ) : null}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  valueSx,
}: {
  label: string;
  value: string;
  valueSx?: object;
}) {
  return (
    <Box>
      <Typography sx={{ fontSize: 12, color: T.color.textMuted, mb: 0.25 }}>{label}</Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 600, ...valueSx }}>{value}</Typography>
    </Box>
  );
}
