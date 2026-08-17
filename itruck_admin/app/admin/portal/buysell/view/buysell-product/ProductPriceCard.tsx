"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { PRODUCT_THEME as T } from "./theme";

interface ProductPriceCardProps {
  price: number;
  /** Only rendered if provided — no invented figures. */
  bookingAmount?: number;
  deliveryCharge?: number;
  sticky?: boolean;
  /** Slot for your real action buttons (e.g. <ProductPurchaseButtons />, Share, Wishlist). */
  children?: React.ReactNode;
}

function formatINR(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function PriceRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.6 }}>
      <Typography sx={{ fontFamily: T.font.body, fontSize: 13.5, color: muted ? T.color.textMuted : T.color.textSecondary }}>
        {label}
      </Typography>
      <Typography sx={{ fontFamily: T.font.body, fontSize: 13.5, fontWeight: 600, color: T.color.textPrimary }}>
        {value}
      </Typography>
    </Box>
  );
}

/**
 * Price / purchase summary card. Business logic (Buy Now, Book, Add to Cart)
 * should be passed in as `children` using your existing components — this
 * only renders the price breakdown and provides the card chrome.
 */
export function ProductPriceCard({
  price,
  bookingAmount,
  deliveryCharge,
  sticky = true,
  children,
}: ProductPriceCardProps) {
  const total = price + (deliveryCharge ?? 0);

  return (
    <Box
      sx={{
        bgcolor: T.color.surface,
        border: `1px solid ${T.color.border}`,
        borderRadius: T.radius.md,
        p: 2.5,
        boxShadow: T.shadow.elevated,
        ...(sticky ? { position: "sticky", top: 88 } : {}),
      }}
    >
      <Typography sx={{ fontFamily: T.font.body, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: T.color.textMuted, mb: 0.5 }}>
        Price Details
      </Typography>

      <Typography
        sx={{
          fontFamily: T.font.display,
          fontWeight: 800,
          fontSize: 32,
          color: T.color.textPrimary,
          lineHeight: 1.1,
          mb: 1.5,
        }}
      >
        {formatINR(price)}
      </Typography>

      <Box sx={{ borderTop: `1px dashed ${T.color.border}`, pt: 1 }}>
        {bookingAmount != null && <PriceRow label="Booking amount" value={formatINR(bookingAmount)} />}
        {deliveryCharge != null && <PriceRow label="Delivery / service charge" value={formatINR(deliveryCharge)} />}
        {(bookingAmount != null || deliveryCharge != null) && (
          <Box sx={{ borderTop: `1px solid ${T.color.border}`, mt: 0.75, pt: 0.75, display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ fontFamily: T.font.body, fontSize: 14, fontWeight: 700, color: T.color.textPrimary }}>
              Total payable
            </Typography>
            <Typography sx={{ fontFamily: T.font.body, fontSize: 14, fontWeight: 700, color: T.color.accentGreenDark }}>
              {formatINR(total)}
            </Typography>
          </Box>
        )}
      </Box>

      {children && <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>{children}</Box>}
    </Box>
  );
}
