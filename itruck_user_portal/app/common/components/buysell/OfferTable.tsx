"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { getFirstBuySellImageUrl } from "@/lib/buysellUtils";
import { formatProductPrice, getProductTitle } from "./utils";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";
import { BuySellImage } from "@/components/common/BuySellImage";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import { PhoneMetaLine } from "./MetaIconLine";
import type { ProductBitRecord } from "@/model/services/bitRecord";
import type { BuySellProduct } from "@/model/services/buysellapi";
import {
  formatOfferDate,
  isOfferPending,
  offerStatusLabel,
  offerStatusTextColor,
} from "./productOffers/productOfferMappers";

export type OfferRow = ProductBitRecord & {
  product?: BuySellProduct | null;
  productTitle?: string;
  counterpartyName?: string;
  counterpartyMobile?: string | null;
};

function statusLabel(status?: string): string {
  return offerStatusLabel(status);
}

type OfferTableProps = {
  rows: OfferRow[];
  mode: "my" | "received";
  variant?: "default" | "reference";
  onViewProduct?: (productId: string) => void;
  onViewOffer?: (row: OfferRow) => void;
  onAccept?: (row: OfferRow) => void;
  onReject?: (row: OfferRow) => void;
  busyRecordId?: string | null;
};

const EMPTY_COPY: Record<"my" | "received", { title: string; body: string }> = {
  my: {
    title: "No offers sent yet",
    body: "When you make an offer on a vehicle, it will appear here with the seller name, your offer amount, and status.",
  },
  received: {
    title: "No offers received yet",
    body: "When a buyer makes an offer on one of your listings, it will show here. You can accept or reject from the product page.",
  },
};

const linkActionSx = {
  minWidth: "auto",
  p: 0,
  fontSize: 13,
  fontWeight: 600,
  textTransform: "none" as const,
  color: INFO,
  "&:hover": { bgcolor: "transparent", textDecoration: "underline" },
};

export function OfferTable({
  rows,
  mode,
  variant = "default",
  onViewProduct,
  onViewOffer,
  onAccept,
  onReject,
  busyRecordId,
}: OfferTableProps) {
  if (rows.length === 0) {
    const copy = EMPTY_COPY[mode];
    return (
      <Box
        sx={{
          p: 4,
          textAlign: "center",
          borderRadius: T.radius.lg,
          border: `1px dashed ${T.color.border}`,
          bgcolor: T.color.surfaceMuted,
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: 16, mb: 1, color: T.color.textPrimary }}>
          {copy.title}
        </Typography>
        <Typography sx={{ fontSize: 14, color: T.color.textSecondary, maxWidth: 420, mx: "auto", lineHeight: 1.6 }}>
          {copy.body}
        </Typography>
      </Box>
    );
  }

  const listPriceHeader = mode === "my" ? "Seller Price" : "My Price";
  const offerHeader = mode === "my" ? "My Offer" : "Offer Price";
  const partyHeader = mode === "my" ? "Seller" : "Buyer";
  const isReference = variant === "reference";

  return (
    <TableContainer
      sx={{
        borderRadius: T.radius.md,
        border: `1px solid ${T.color.border}`,
        overflowX: "auto",
        bgcolor: T.color.surface,
      }}
    >
      <Table size="medium" sx={{ minWidth: 720 }}>
        <TableHead sx={{ bgcolor: "#f8fafc" }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, fontSize: 13, color: T.color.textSecondary, py: 1.5 }}>
              Vehicle
            </TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: 13, color: T.color.textSecondary }}>
              {partyHeader}
            </TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: 13, color: T.color.textSecondary }}>
              {offerHeader}
            </TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: 13, color: T.color.textSecondary }}>
              {isReference ? listPriceHeader : "Listed Price"}
            </TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: 13, color: T.color.textSecondary }}>
              Status
            </TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: 13, color: T.color.textSecondary }}>
              Date
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: 13, color: T.color.textSecondary }}>
              Action
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const productId =
              row.productId ||
              row.product?._id ||
              row.product?.id ||
              (row as ProductBitRecord).product_info?._id ||
              (row as ProductBitRecord).product_info?.id ||
              "";
            const product = row.product ?? (row as ProductBitRecord).product_info ?? null;
            const image = getFirstBuySellImageUrl(product?.images);
            const title =
              row.productTitle ||
              (product ? getProductTitle(product as BuySellProduct) : "") ||
              product?.description ||
              product?.bsNumber ||
              "Vehicle";
            const listedPrice = row.product?.price;
            const recordId = row._id || row.id || "";
            const pending = isOfferPending(row.status);
            const loadingRow = busyRecordId === recordId;

            return (
              <TableRow
                key={recordId}
                hover
                sx={{ "&:last-child td": { borderBottom: 0 } }}
              >
                <TableCell sx={{ py: 1.75 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 40,
                        borderRadius: 1,
                        overflow: "hidden",
                        bgcolor: T.color.border,
                        flexShrink: 0,
                      }}
                    >
                      <BuySellImage src={image} alt={title} />
                    </Box>
                    <Typography fontWeight={600} fontSize={14} sx={{ color: T.color.textPrimary }}>
                      {title}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ fontSize: 14 }}>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                      {row.counterpartyName || row.userName || "—"}
                    </Typography>
                    <PhoneMetaLine
                      icon={<PhoneOutlinedIcon />}
                      mobile={row.counterpartyMobile}
                      dense
                      sx={{ mt: 0.35 }}
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography fontWeight={600} fontSize={14} sx={{ color: T.color.textPrimary }}>
                    {formatProductPrice(row.bit)}
                  </Typography>
                </TableCell>
                <TableCell>
                  {listedPrice != null ? (
                    <Typography fontWeight={500} fontSize={14}>
                      {formatProductPrice(listedPrice)}
                    </Typography>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  {isReference ? (
                    <Typography
                      fontWeight={600}
                      fontSize={13}
                      sx={{ color: offerStatusTextColor(row.status) }}
                    >
                      {statusLabel(row.status)}
                    </Typography>
                  ) : (
                    <Typography component="span" sx={{ fontSize: 13 }}>
                      {/* legacy chip path removed — use reference on product page; keep text for default */}
                      <Box
                        component="span"
                        sx={{
                          fontWeight: 600,
                          color: offerStatusTextColor(row.status),
                        }}
                      >
                        {statusLabel(row.status)}
                      </Box>
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ fontSize: 14, color: T.color.textSecondary, whiteSpace: "nowrap" }}>
                  {isReference
                    ? formatOfferDate(row.createdAt)
                    : row.createdAt
                      ? new Date(row.createdAt).toLocaleDateString("en-IN")
                      : "—"}
                </TableCell>
                <TableCell align="right">
                  {isReference ? (
                    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, alignItems: "center" }}>
                      {mode === "received" && pending && onAccept && onReject ? (
                        <>
                          <Button
                            size="small"
                            disabled={loadingRow}
                            onClick={() => onAccept(row)}
                            sx={linkActionSx}
                          >
                            {loadingRow ? <CircularProgress size={14} /> : "Accept"}
                          </Button>
                          <Button
                            size="small"
                            disabled={loadingRow}
                            onClick={() => onReject(row)}
                            sx={{ ...linkActionSx, color: INFO }}
                          >
                            Reject
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="small"
                          onClick={() =>
                            onViewOffer ? onViewOffer(row) : productId && onViewProduct?.(productId)
                          }
                          sx={linkActionSx}
                        >
                          View
                        </Button>
                      )}
                    </Box>
                  ) : productId && onViewProduct ? (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => onViewProduct(productId)}
                      sx={{ textTransform: "none", fontWeight: 600 }}
                    >
                      View Product
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
