"use client";

import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import CloseIcon from "@mui/icons-material/Close";
import { formatProductPrice } from "../utils";
import {
  formatOfferDate,
  offerStatusLabel,
  offerStatusTextColor,
} from "./productOfferMappers";
import type { OfferRow } from "../OfferTable";
import { PRODUCT_THEME as T, INFO, RADIUS, SHADOW } from "@/lib/theme";

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
  const partyLabel = mode === "my" ? "Seller" : "Buyer";
  const partyName = offer.counterpartyName || offer.userName || "—";
  const offerFieldLabel = mode === "my" ? "My offer" : "Offer price";
  const listFieldLabel = mode === "my" ? "Seller price" : "My price";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      scroll="body"
      PaperProps={{
        sx: {
          borderRadius: `${RADIUS.lg}px`,
          boxShadow: SHADOW.modal,
          mx: 2,
          overflow: "visible",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 3,
          pt: 2.5,
          pb: 0,
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: 22, color: "#0f172a", letterSpacing: "-0.02em" }}>
          Offer details
        </Typography>
        <IconButton
          onClick={onClose}
          aria-label="Close"
          sx={{
            color: "#64748b",
            "&:hover": { bgcolor: "#f1f5f9" },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: 3, pt: 2, pb: 3 }}>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: 15,
            color: "#0f172a",
            lineHeight: 1.45,
            mb: 2.5,
            textTransform: "uppercase",
            letterSpacing: "0.03em",
          }}
        >
          {offer.productTitle || "Vehicle"}
        </Typography>

        <Stack spacing={2.25}>
          <DetailField label={partyLabel} value={partyName} />
          <DetailField
            label={offerFieldLabel}
            value={formatProductPrice(offer.bit)}
            highlight
          />
          {listed != null ? (
            <DetailField label={listFieldLabel} value={formatProductPrice(listed)} />
          ) : null}
          <DetailField
            label="Status"
            value={offerStatusLabel(offer.status)}
            valueColor={offerStatusTextColor(offer.status)}
          />
          <DetailField label="Date" value={formatOfferDate(offer.createdAt)} />
        </Stack>

        {offer.bitReason?.trim() ? (
          <Box
            sx={{
              mt: 2.5,
              pt: 2,
              borderTop: `1px solid ${T.color.border}`,
            }}
          >
            <Typography sx={{ fontSize: 13, color: T.color.textMuted, mb: 0.75 }}>
              Message
            </Typography>
            <Typography sx={{ fontSize: 14, color: T.color.textSecondary, lineHeight: 1.6 }}>
              {offer.bitReason.trim()}
            </Typography>
          </Box>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DetailField({
  label,
  value,
  highlight = false,
  valueColor,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  valueColor?: string;
}) {
  return (
    <Box>
      <Typography
        sx={{
          fontSize: 13,
          color: "#94a3b8",
          fontWeight: 500,
          mb: 0.35,
          lineHeight: 1.3,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: highlight ? 22 : 16,
          fontWeight: highlight ? 800 : 700,
          color: valueColor ?? (highlight ? INFO : "#0f172a"),
          lineHeight: 1.25,
          letterSpacing: highlight ? "-0.02em" : undefined,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
