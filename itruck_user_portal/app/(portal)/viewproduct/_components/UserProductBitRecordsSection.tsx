"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import {
  getBitRecords,
  updateBitRecordStatus,
  type ProductBitRecord,
  type BitRecordStatus,
} from "@/model/services/bitRecord";
import { OfferTable, type OfferRow } from "@/app/common/components/buysell/OfferTable";
import { ProductOfferListHeader } from "@/app/common/components/buysell/productOffers/ProductOfferListHeader";
import {
  ProductOfferListTabs,
  type ProductOfferListTabId,
} from "@/app/common/components/buysell/productOffers/ProductOfferListTabs";
import { ProductOfferDetailDialog } from "@/app/common/components/buysell/productOffers/ProductOfferDetailDialog";
import {
  toProductViewOfferRow,
  type ProductOfferVehicleContext,
} from "@/app/common/components/buysell/productOffers/productOfferMappers";
import {
  exportOffersToCsv,
  exportOffersToPdf,
} from "@/app/common/components/buysell/productOffers/exportProductOffers";
import { formatProductPrice } from "@/app/common/components/buysell/utils";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";

export type ProductOfferTab = ProductOfferListTabId;

type UserProductBitRecordsSectionProps = {
  productId: string;
  vehicle: ProductOfferVehicleContext;
  currentUserId?: string | null;
  isOwner: boolean;
  listedPrice?: number;
  highestBid?: number | null;
  activeTab?: ProductOfferTab;
  onTabChange?: (tab: ProductOfferTab) => void;
  onCountsChange?: (counts: { my: number; received: number }) => void;
  onMakeOffer?: () => void;
  onUpdated?: () => void;
  onNotify: (payload: { type: "success" | "error"; message: string }) => void;
  refreshToken?: number;
  authReady?: boolean;
  onLoginRequired?: () => void;
};

function scrollToProductOffersSection() {
  if (typeof document === "undefined") return;
  document.getElementById("product-offers-section")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function recordId(record: ProductBitRecord): string {
  return String(record.id ?? record._id ?? "");
}

async function fetchOffersForProduct(params: {
  productId: string;
  userId?: string;
  offerType: "my_offers" | "received_offers";
}): Promise<ProductBitRecord[]> {
  return getBitRecords<ProductBitRecord>({
    entityId: params.productId,
    userId: params.userId,
    offerType: params.offerType,
    type: "product",
  });
}

function NoAccessBlock() {
  return (
    <Box
      sx={{
        py: 4,
        px: 2,
        textAlign: "center",
        borderRadius: T.radius.md,
        border: `1px dashed ${T.color.border}`,
        bgcolor: "#f8fafc",
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 0.75 }}>
        Access restricted
      </Typography>
      <Typography sx={{ fontSize: 13, color: T.color.textSecondary, lineHeight: 1.6, mb: 0.5 }}>
        Only the listing owner can view received offers on this vehicle.
      </Typography>
      <Typography sx={{ fontSize: 12, color: T.color.textMuted }}>
        You can still send your own offer using Make an Offer.
      </Typography>
    </Box>
  );
}

export function UserProductBitRecordsSection({
  productId,
  vehicle,
  currentUserId,
  isOwner,
  listedPrice,
  activeTab: controlledTab,
  onTabChange,
  onCountsChange,
  onMakeOffer,
  onUpdated,
  onNotify,
  refreshToken = 0,
  authReady = true,
}: UserProductBitRecordsSectionProps) {
  const canViewAll = Boolean(currentUserId && isOwner);

  const vehicleContext = useMemo(
    (): ProductOfferVehicleContext => ({
      ...vehicle,
      productId,
      listedPrice: listedPrice ?? vehicle.listedPrice,
    }),
    [vehicle, productId, listedPrice],
  );

  const [internalTab, setInternalTab] = useState<ProductOfferTab>(isOwner ? "received" : "my");
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = onTabChange ?? setInternalTab;

  const [receivedOffers, setReceivedOffers] = useState<ProductBitRecord[]>([]);
  const [myOffers, setMyOffers] = useState<ProductBitRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [detailOffer, setDetailOffer] = useState<OfferRow | null>(null);

  const loadOffers = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError("");
    try {
      if (canViewAll && currentUserId) {
        const [received, mine] = await Promise.all([
          fetchOffersForProduct({
            productId,
            userId: currentUserId,
            offerType: "received_offers",
          }),
          fetchOffersForProduct({
            productId,
            userId: currentUserId,
            offerType: "my_offers",
          }),
        ]);
        setReceivedOffers(received);
        setMyOffers(mine);
        onCountsChange?.({ my: mine.length, received: received.length });
      } else {
        const mine = await fetchOffersForProduct({
          productId,
          userId: currentUserId || undefined,
          offerType: "my_offers",
        });
        setMyOffers(mine);
        setReceivedOffers([]);
        onCountsChange?.({ my: mine.length, received: 0 });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load offers");
    } finally {
      setLoading(false);
    }
  }, [productId, currentUserId, canViewAll, onCountsChange]);

  useEffect(() => {
    void loadOffers();
  }, [loadOffers, refreshToken]);

  const tableMode: "my" | "received" = activeTab === "received" ? "received" : "my";
  const sourceRecords = activeTab === "received" ? receivedOffers : myOffers;

  const tableRows = useMemo(
    () =>
      sourceRecords.map((r) => toProductViewOfferRow(r, tableMode, vehicleContext)),
    [sourceRecords, tableMode, vehicleContext],
  );

  const hasMyOffer = !isOwner && myOffers.length > 0;
  const primaryMyOffer = myOffers[0];

  const handleBuyerOfferClick = () => {
    if (hasMyOffer) {
      setActiveTab("my");
      scrollToProductOffersSection();
      return;
    }
    onMakeOffer?.();
  };

  const buyerOfferButtonLabel = hasMyOffer
    ? primaryMyOffer?.bit != null
      ? `View your offer · ${formatProductPrice(primaryMyOffer.bit)}`
      : "View your offer"
    : "Send offer";

  const handleStatusChange = async (record: OfferRow, status: BitRecordStatus) => {
    const id = recordId(record);
    if (!id) return;
    setBusyId(id);
    setError("");
    try {
      await updateBitRecordStatus({ type: "product", recordId: id, status });
      onNotify({
        type: "success",
        message: status === "accept" ? "Offer accepted." : "Offer rejected.",
      });
      await loadOffers();
      onUpdated?.();
    } catch (err) {
      onNotify({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update offer",
      });
    } finally {
      setBusyId(null);
    }
  };

  const headerTitle = activeTab === "received" ? "Received Offers" : "My Offers";
  const headerCount = activeTab === "received" ? receivedOffers.length : myOffers.length;
  const showExport = activeTab === "my" && tableRows.length > 0;

  const handleExportCsv = () => {
    exportOffersToCsv(
      tableRows,
      tableMode,
      `product-offers-${productId}-${tableMode}.csv`,
    );
  };

  const handleExportPdf = () => {
    exportOffersToPdf(tableRows, tableMode, `${headerTitle} — ${vehicleContext.title}`);
  };

  const cardSx = {
    mb: 2.5,
    p: { xs: 2, md: 2.5 },
    borderRadius: T.radius.lg,
    border: `1px solid ${T.color.border}`,
    bgcolor: T.color.surface,
    boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
    scrollMarginTop: 96,
  };

  if (!authReady) {
    return (
      <Box id="product-offers-section" sx={cardSx}>
        <Box sx={{ py: 3, display: "flex", justifyContent: "center", alignItems: "center", gap: 1 }}>
          <CircularProgress size={18} sx={{ color: INFO }} />
          <Typography sx={{ fontSize: 13, color: T.color.textMuted }}>Loading offers…</Typography>
        </Box>
      </Box>
    );
  }

  const tabDefs = canViewAll
    ? [
        { id: "my" as const, label: "My Offers", count: myOffers.length },
        { id: "received" as const, label: "Received Offers", count: receivedOffers.length },
      ]
    : [{ id: "my" as const, label: "My Offers", count: myOffers.length }];

  return (
    <Box id="product-offers-section" sx={cardSx}>
      <ProductOfferListHeader
        count={headerCount}
        title={headerTitle}
        showExport={showExport}
        exportDisabled={loading || tableRows.length === 0}
        onExportCsv={handleExportCsv}
        onExportPdf={handleExportPdf}
      />

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 1,
          mb: 1,
          flexWrap: "wrap",
        }}
      >
        {!isOwner && onMakeOffer ? (
          <Button
            variant={hasMyOffer ? "outlined" : "contained"}
            size="small"
            onClick={handleBuyerOfferClick}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              boxShadow: "none",
              ...(hasMyOffer ? { borderColor: INFO, color: INFO } : { bgcolor: INFO }),
            }}
          >
            {buyerOfferButtonLabel}
          </Button>
        ) : null}
      </Box>

      <ProductOfferListTabs
        tabs={tabDefs}
        activeTab={activeTab}
        onChange={setActiveTab}
        loading={loading}
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: T.radius.sm }} onClose={() => setError("")}>
          {error}
        </Alert>
      ) : null}

      {activeTab === "received" && !canViewAll ? (
        <NoAccessBlock />
      ) : loading ? (
        <Box sx={{ py: 5, display: "flex", justifyContent: "center", alignItems: "center", gap: 1 }}>
          <CircularProgress size={22} sx={{ color: INFO }} />
          <Typography sx={{ fontSize: 14, color: T.color.textMuted }}>Loading offers…</Typography>
        </Box>
      ) : (
        <>
          <OfferTable
            rows={tableRows}
            mode={tableMode}
            variant="reference"
            busyRecordId={busyId}
            onViewOffer={(row) => setDetailOffer(row)}
            onAccept={
              isOwner && activeTab === "received"
                ? (row) => void handleStatusChange(row, "accept")
                : undefined
            }
            onReject={
              isOwner && activeTab === "received"
                ? (row) => void handleStatusChange(row, "reject")
                : undefined
            }
          />

          {!isOwner && activeTab === "my" && !hasMyOffer && onMakeOffer ? (
            <Box sx={{ textAlign: "center", mt: 2 }}>
              <Button
                variant="contained"
                size="small"
                onClick={handleBuyerOfferClick}
                sx={{ bgcolor: INFO, textTransform: "none", fontWeight: 600 }}
              >
                Make an offer
              </Button>
            </Box>
          ) : null}
        </>
      )}
      <ProductOfferDetailDialog
        open={detailOffer != null}
        onClose={() => setDetailOffer(null)}
        offer={detailOffer}
        mode={tableMode}
      />
    </Box>
  );
}
