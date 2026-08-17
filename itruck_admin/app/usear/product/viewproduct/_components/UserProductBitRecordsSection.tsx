"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import type { OfferRow } from "@/app/common/components/buysell/OfferTable";
import { ProductOfferListHeader } from "@/app/common/components/buysell/productOffers/ProductOfferListHeader";
import {
  ProductOfferListTabs,
  type ProductOfferListTabId,
} from "@/app/common/components/buysell/productOffers/ProductOfferListTabs";
import { ProductOfferDetailDialog } from "@/app/common/components/buysell/productOffers/ProductOfferDetailDialog";
import { ProductViewOfferList } from "@/app/common/components/buysell/productOffers/ProductViewOfferList";
import {
  toProductViewOfferRow,
  offerStatusLabel,
  offerStatusTextColor,
  type ProductOfferVehicleContext,
} from "@/app/common/components/buysell/productOffers/productOfferMappers";
import {
  exportOffersToCsv,
  exportOffersToPdf,
} from "@/app/common/components/buysell/productOffers/exportProductOffers";
import { formatProductPrice } from "@/app/common/components/buysell/utils";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { PRODUCT_THEME as T, INFO, RADIUS, SHADOW } from "@/lib/theme";

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
        py: 4.5,
        px: 2,
        textAlign: "center",
        borderRadius: `${RADIUS.md}px`,
        border: `1px dashed #cbd5e1`,
        bgcolor: "#f8fafc",
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: 16, color: "#0f172a", mb: 0.75 }}>
        Received offers are private
      </Typography>
      <Typography sx={{ fontSize: 14, color: T.color.textSecondary, lineHeight: 1.65, maxWidth: 360, mx: "auto" }}>
        Only the listing owner can see offers from buyers. You can still place your own offer on this vehicle.
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
  const router = useRouter();
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

  const openMyOfferDetail = () => {
    if (!primaryMyOffer) return;
    const row = toProductViewOfferRow(primaryMyOffer, "my", vehicleContext);
    setActiveTab("my");
    setDetailOffer(row);
  };

  const handleBuyerOfferClick = () => {
    if (hasMyOffer) {
      openMyOfferDetail();
      return;
    }
    onMakeOffer?.();
  };

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
  const showExport = tableRows.length > 0 && (isOwner || activeTab === "my");

  const handleExportCsv = () => {
    exportOffersToCsv(tableRows, tableMode, `product-offers-${productId}-${tableMode}.csv`);
  };

  const handleExportPdf = () => {
    exportOffersToPdf(tableRows, tableMode, `${headerTitle} — ${vehicleContext.title}`);
  };

  const cardSx = {
    mb: 2.5,
    p: { xs: 2, sm: 2.5, md: 3 },
    borderRadius: `${RADIUS.lg}px`,
    border: `1px solid #e2e8f0`,
    bgcolor: T.color.surface,
    boxShadow: SHADOW.card,
    scrollMarginTop: 96,
  };

  const buyerTrailingAction =
    !isOwner && onMakeOffer ? (
      <Button
        variant={hasMyOffer ? "outlined" : "contained"}
        size="medium"
        onClick={handleBuyerOfferClick}
        sx={{
          textTransform: "none",
          fontWeight: 700,
          fontSize: 14,
          px: 2,
          boxShadow: hasMyOffer ? "none" : "0 2px 8px rgba(37,99,235,0.25)",
          ...(hasMyOffer
            ? { borderColor: INFO, color: INFO }
            : { bgcolor: INFO, "&:hover": { bgcolor: "#1d4ed8" } }),
        }}
      >
        {hasMyOffer ? "View your offer" : "Make an offer"}
      </Button>
    ) : null;

  if (!authReady) {
    return (
      <Box id="product-offers-section" sx={cardSx}>
        <Box sx={{ py: 4, display: "flex", justifyContent: "center", alignItems: "center", gap: 1.5 }}>
          <CircularProgress size={22} sx={{ color: INFO }} />
          <Typography sx={{ fontSize: 14, color: T.color.textMuted }}>Loading offers…</Typography>
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

  const emptyAction =
    !isOwner && activeTab === "my" && !hasMyOffer && onMakeOffer ? (
      <Button
        variant="contained"
        onClick={handleBuyerOfferClick}
        sx={{
          mt: 0.5,
          bgcolor: INFO,
          textTransform: "none",
          fontWeight: 700,
          px: 3,
          boxShadow: "none",
        }}
      >
        Make an offer
      </Button>
    ) : undefined;

  return (
    <Box id="product-offers-section" sx={cardSx}>
      <ProductOfferListHeader
        count={headerCount}
        title={headerTitle}
        showExport={showExport}
        exportDisabled={loading}
        onExportCsv={handleExportCsv}
        onExportPdf={handleExportPdf}
        trailingAction={buyerTrailingAction}
      />

      <ProductOfferListTabs tabs={tabDefs} activeTab={activeTab} onChange={setActiveTab} loading={loading} />

      {hasMyOffer && activeTab === "my" && primaryMyOffer ? (
        <Box
          sx={{
            mb: 2,
            p: 2,
            borderRadius: `${RADIUS.md}px`,
            border: "1px solid rgba(37,99,235,0.2)",
            bgcolor: "rgba(37,99,235,0.04)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: T.color.textMuted, mb: 0.25 }}>
              Your active offer on this vehicle
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 22, color: INFO, letterSpacing: "-0.02em" }}>
              {formatProductPrice(primaryMyOffer.bit)}
            </Typography>
            <Typography
              sx={{ fontSize: 13, fontWeight: 700, color: offerStatusTextColor(primaryMyOffer.status), mt: 0.25 }}
            >
              {offerStatusLabel(primaryMyOffer.status)}
            </Typography>
          </Box>
          <Button
            variant="text"
            onClick={openMyOfferDetail}
            sx={{ textTransform: "none", fontWeight: 700, color: INFO }}
          >
            View details
          </Button>
        </Box>
      ) : null}

      {error ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: `${RADIUS.sm}px` }} onClose={() => setError("")}>
          {error}
        </Alert>
      ) : null}

      {activeTab === "received" && !canViewAll ? (
        <NoAccessBlock />
      ) : loading ? (
        <Box sx={{ py: 6, display: "flex", justifyContent: "center", alignItems: "center", gap: 1.5 }}>
          <CircularProgress size={24} sx={{ color: INFO }} />
          <Typography sx={{ fontSize: 14, color: T.color.textMuted }}>Loading offers…</Typography>
        </Box>
      ) : (
        <>
          <ProductViewOfferList
            rows={tableRows}
            mode={tableMode}
            hideVehicleColumn
            vehicleTitle={vehicleContext.title}
            vehicleImage={vehicleContext.imageUrl}
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
            emptyAction={emptyAction}
          />

          <Box sx={{ textAlign: "center", mt: 3, pt: 2, borderTop: `1px solid ${T.color.border}` }}>
            <Button
              variant="text"
              onClick={() => router.push(userProductRoutes.offers(activeTab))}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                fontSize: 15,
                color: INFO,
                "&:hover": { bgcolor: "rgba(37,99,235,0.06)" },
              }}
            >
              View All Offers
            </Button>
          </Box>
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
