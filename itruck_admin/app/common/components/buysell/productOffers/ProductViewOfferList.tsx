"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Avatar from "@mui/material/Avatar";
import { getFirstBuySellImageUrl } from "@/lib/buysellUtils";
import { formatProductPrice, getProductTitle } from "../utils";
import { PRODUCT_THEME as T, INFO, RADIUS } from "@/lib/theme";
import type { ProductBitRecord } from "@/model/services/bitRecord";
import type { BuySellProduct } from "@/model/services/buysellapi";
import type { OfferRow } from "../OfferTable";
import {
  formatOfferDate,
  isOfferPending,
  offerStatusLabel,
  offerStatusTextColor,
} from "./productOfferMappers";

type ProductViewOfferListProps = {
  rows: OfferRow[];
  mode: "my" | "received";
  hideVehicleColumn?: boolean;
  vehicleTitle?: string;
  vehicleImage?: string;
  busyRecordId?: string | null;
  onViewOffer: (row: OfferRow) => void;
  onAccept?: (row: OfferRow) => void;
  onReject?: (row: OfferRow) => void;
  emptyTitle?: string;
  emptyBody?: string;
  emptyAction?: ReactNode;
};

const thSx = {
  fontWeight: 700,
  fontSize: 13,
  color: "#64748b",
  py: 1.75,
  px: 2,
  borderBottom: `1px solid ${T.color.border}`,
  bgcolor: "#f8fafc",
  whiteSpace: "nowrap" as const,
};

const tdSx = {
  py: 2,
  px: 2,
  fontSize: 14,
  color: "#0f172a",
  borderBottom: `1px solid #f1f5f9`,
  verticalAlign: "middle" as const,
};

export function ProductViewOfferList({
  rows,
  mode,
  hideVehicleColumn = true,
  vehicleTitle,
  vehicleImage,
  busyRecordId,
  onViewOffer,
  onAccept,
  onReject,
  emptyTitle,
  emptyBody,
  emptyAction,
}: ProductViewOfferListProps) {
  if (rows.length === 0) {
    return (
      <Box
        sx={{
          py: 5,
          px: 3,
          textAlign: "center",
          borderRadius: `${RADIUS.md}px`,
          border: `1px dashed #cbd5e1`,
          bgcolor: "#f8fafc",
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: 17, color: "#0f172a", mb: 1 }}>
          {emptyTitle ?? (mode === "my" ? "No offers sent yet" : "No offers received yet")}
        </Typography>
        <Typography
          sx={{
            fontSize: 14,
            color: T.color.textSecondary,
            maxWidth: 400,
            mx: "auto",
            lineHeight: 1.65,
            mb: emptyAction ? 2 : 0,
          }}
        >
          {emptyBody ??
            (mode === "my"
              ? "Submit your price for this vehicle. The seller will review and respond."
              : "When buyers make offers, they will appear here for you to accept or reject.")}
        </Typography>
        {emptyAction}
      </Box>
    );
  }

  const partyHeader = mode === "my" ? "Seller" : "Buyer";
  const offerHeader = mode === "my" ? "My Offer" : "Offer Price";
  const listHeader = mode === "my" ? "Seller Price" : "My Price";

  return (
    <>
      {/* Desktop / tablet table */}
      <Box
        sx={{
          display: { xs: "none", md: "block" },
          border: `1px solid ${T.color.border}`,
          borderRadius: `${RADIUS.md}px`,
          overflow: "hidden",
          bgcolor: T.color.surface,
        }}
      >
        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
          <Box component="thead">
            <Box component="tr">
              {!hideVehicleColumn ? (
                <Box component="th" sx={thSx}>
                  Vehicle
                </Box>
              ) : null}
              <Box component="th" sx={thSx}>
                {partyHeader}
              </Box>
              <Box component="th" sx={thSx}>
                {offerHeader}
              </Box>
              <Box component="th" sx={thSx}>
                {listHeader}
              </Box>
              <Box component="th" sx={thSx}>
                Status
              </Box>
              <Box component="th" sx={thSx}>
                Date
              </Box>
              <Box component="th" sx={{ ...thSx, textAlign: "right" }}>
                Action
              </Box>
            </Box>
          </Box>
          <Box component="tbody">
            {rows.map((row) => (
              <OfferTableRow
                key={row._id || row.id || ""}
                row={row}
                mode={mode}
                hideVehicleColumn={hideVehicleColumn}
                vehicleTitle={vehicleTitle}
                vehicleImage={vehicleImage}
                busyRecordId={busyRecordId}
                onViewOffer={onViewOffer}
                onAccept={onAccept}
                onReject={onReject}
                tdSx={tdSx}
              />
            ))}
          </Box>
        </Box>
      </Box>

      {/* Mobile cards */}
      <Box sx={{ display: { xs: "flex", md: "none" }, flexDirection: "column", gap: 1.5 }}>
        {rows.map((row) => (
          <OfferMobileCard
            key={row._id || row.id || ""}
            row={row}
            mode={mode}
            vehicleTitle={vehicleTitle}
            vehicleImage={vehicleImage}
            busyRecordId={busyRecordId}
            onViewOffer={onViewOffer}
            onAccept={onAccept}
            onReject={onReject}
          />
        ))}
      </Box>
    </>
  );
}

function OfferTableRow({
  row,
  mode,
  hideVehicleColumn,
  vehicleTitle,
  vehicleImage,
  busyRecordId,
  onViewOffer,
  onAccept,
  onReject,
  tdSx,
}: {
  row: OfferRow;
  mode: "my" | "received";
  hideVehicleColumn?: boolean;
  vehicleTitle?: string;
  vehicleImage?: string;
  busyRecordId?: string | null;
  onViewOffer: (row: OfferRow) => void;
  onAccept?: (row: OfferRow) => void;
  onReject?: (row: OfferRow) => void;
  tdSx: object;
}) {
  const product = row.product ?? (row as ProductBitRecord).product_info ?? null;
  const image = getFirstBuySellImageUrl(vehicleImage ? [vehicleImage] : product?.images);
  const title =
    vehicleTitle ||
    row.productTitle ||
    (product ? getProductTitle(product as BuySellProduct) : "") ||
    "Vehicle";
  const recordId = row._id || row.id || "";
  const pending = isOfferPending(row.status);
  const loadingRow = busyRecordId === recordId;

  return (
    <Box component="tr" sx={{ "&:hover": { bgcolor: "#fafbfc" } }}>
      {!hideVehicleColumn ? (
        <Box component="td" sx={tdSx}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Avatar
              variant="rounded"
              src={image}
              sx={{ width: 44, height: 38, borderRadius: 1, bgcolor: "#e2e8f0" }}
            />
            <Typography fontWeight={600} fontSize={14}>
              {title}
            </Typography>
          </Box>
        </Box>
      ) : null}
      <Box component="td" sx={tdSx}>
        {row.counterpartyName || row.userName || "—"}
      </Box>
      <Box component="td" sx={tdSx}>
        <Typography fontWeight={700}>{formatProductPrice(row.bit)}</Typography>
      </Box>
      <Box component="td" sx={tdSx}>
        {row.product?.price != null ? formatProductPrice(row.product.price) : "—"}
      </Box>
      <Box component="td" sx={tdSx}>
        <Typography fontWeight={700} fontSize={13} sx={{ color: offerStatusTextColor(row.status) }}>
          {offerStatusLabel(row.status)}
        </Typography>
      </Box>
      <Box component="td" sx={{ ...tdSx, color: "#64748b" }}>
        {formatOfferDate(row.createdAt)}
      </Box>
      <Box component="td" sx={{ ...tdSx, textAlign: "right" }}>
        <ActionLinks
          row={row}
          mode={mode}
          pending={pending}
          loadingRow={loadingRow}
          onViewOffer={onViewOffer}
          onAccept={onAccept}
          onReject={onReject}
        />
      </Box>
    </Box>
  );
}

function OfferMobileCard({
  row,
  mode,
  vehicleTitle,
  vehicleImage,
  busyRecordId,
  onViewOffer,
  onAccept,
  onReject,
}: {
  row: OfferRow;
  mode: "my" | "received";
  vehicleTitle?: string;
  vehicleImage?: string;
  busyRecordId?: string | null;
  onViewOffer: (row: OfferRow) => void;
  onAccept?: (row: OfferRow) => void;
  onReject?: (row: OfferRow) => void;
}) {
  const recordId = row._id || row.id || "";
  const pending = isOfferPending(row.status);
  const loadingRow = busyRecordId === recordId;
  const image = getFirstBuySellImageUrl(vehicleImage ? [vehicleImage] : row.product?.images);

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: `${RADIUS.md}px`,
        border: `1px solid ${T.color.border}`,
        bgcolor: T.color.surface,
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
      }}
    >
      <Box sx={{ display: "flex", gap: 1.5, mb: 1.5 }}>
        <Avatar
          variant="rounded"
          src={image}
          sx={{ width: 48, height: 40, borderRadius: 1 }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={700} fontSize={14} noWrap>
            {vehicleTitle || row.productTitle || "Vehicle"}
          </Typography>
          <Typography fontSize={13} color="text.secondary">
            {mode === "my" ? "Seller" : "Buyer"}: {row.counterpartyName || row.userName || "—"}
          </Typography>
        </Box>
        <Typography fontWeight={800} fontSize={16} color={INFO}>
          {formatProductPrice(row.bit)}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Typography fontWeight={700} fontSize={13} sx={{ color: offerStatusTextColor(row.status) }}>
          {offerStatusLabel(row.status)}
        </Typography>
        <Typography fontSize={12} color="text.secondary">
          {formatOfferDate(row.createdAt)}
        </Typography>
      </Box>
      <ActionLinks
        row={row}
        mode={mode}
        pending={pending}
        loadingRow={loadingRow}
        onViewOffer={onViewOffer}
        onAccept={onAccept}
        onReject={onReject}
        align="flex-start"
      />
    </Box>
  );
}

function ActionLinks({
  row,
  mode,
  pending,
  loadingRow,
  onViewOffer,
  onAccept,
  onReject,
  align = "flex-end",
}: {
  row: OfferRow;
  mode: "my" | "received";
  pending: boolean;
  loadingRow: boolean;
  onViewOffer: (row: OfferRow) => void;
  onAccept?: (row: OfferRow) => void;
  onReject?: (row: OfferRow) => void;
  align?: "flex-end" | "flex-start";
}) {
  const linkSx = {
    minWidth: "auto",
    p: 0,
    fontSize: 14,
    fontWeight: 700,
    textTransform: "none" as const,
    color: INFO,
    "&:hover": { bgcolor: "transparent", textDecoration: "underline" },
  };

  return (
    <Box sx={{ display: "flex", justifyContent: align, gap: 2, alignItems: "center" }}>
      {mode === "received" && pending && onAccept && onReject ? (
        <>
          <Button size="small" disabled={loadingRow} onClick={() => onAccept(row)} sx={linkSx}>
            {loadingRow ? <CircularProgress size={14} /> : "Accept"}
          </Button>
          <Button size="small" disabled={loadingRow} onClick={() => onReject(row)} sx={linkSx}>
            Reject
          </Button>
        </>
      ) : (
        <Button size="small" onClick={() => onViewOffer(row)} sx={linkSx}>
          View
        </Button>
      )}
    </Box>
  );
}
