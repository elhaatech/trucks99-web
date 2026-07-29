"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Alert from "@mui/material/Alert";
import { Spinner } from "@/components/ui";
import { OfferTable, type OfferRow } from "@/app/common/components/buysell";
import { getProductTitle } from "@/app/common/components/buysell/utils";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";
import { listProductOffers, type ProductBitRecord } from "@/model/services/bitRecord";
import { useMarketplaceAuth } from "@/components/marketplace/MarketplaceAuthProvider";
import { useNotification } from "@/hooks/useNotification";
import type { BuySellProduct } from "@/model/services/buysellapi";

type TabValue = "my" | "received";

const TAB_HELP: Record<TabValue, { title: string; body: string }> = {
  my: {
    title: "Offers you sent to sellers",
    body: "These are price offers you placed on vehicles listed by others. Track whether each offer is pending, accepted, or rejected. Tap View Product to open the listing.",
  },
  received: {
    title: "Offers buyers sent on your listings",
    body: "These are offers from buyers interested in vehicles you posted. Review the offer amount, compare it with your listed price, and open the product to accept or reject pending offers.",
  },
};

function toOfferRow(record: ProductBitRecord, mode: TabValue): OfferRow {
  const product = (record.product_info ?? null) as BuySellProduct | null;
  const productId = record.productId || product?._id || product?.id || "";

  return {
    ...record,
    product,
    productId,
    productTitle: product ? getProductTitle(product) : undefined,
    counterpartyName:
      mode === "my"
        ? product?.created_by || "Seller"
        : record.userName || "Buyer",
  };
}

function OffersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notify } = useNotification();
  const { userId, authReady, isLoggedIn } = useMarketplaceAuth();
  const initialTab = searchParams.get("tab") === "received" ? "received" : "my";
  const [tab, setTab] = useState<TabValue>(initialTab);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<OfferRow[]>([]);

  const loadOffers = useCallback(async () => {
    if (!authReady) return;
    if (!isLoggedIn || !userId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const offerType = tab === "my" ? "my_offers" : "received_offers";
      const records = await listProductOffers({
        offerType,
        userId,
      });
      setRows(records.map((r) => toOfferRow(r, tab)));
    } catch (err) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to load offers",
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tab, notify, authReady, isLoggedIn, userId]);

  useEffect(() => {
    if (!authReady) return;
    if (!isLoggedIn) {
      router.replace(userProductRoutes.login(userProductRoutes.offers()));
      return;
    }
    void loadOffers();
  }, [authReady, isLoggedIn, loadOffers, router]);

  const help = TAB_HELP[tab];

  return (
    <Box>
      <Typography sx={{ fontWeight: 800, fontSize: 24, mb: 0.5, color: T.color.textPrimary }}>
        Offers
      </Typography>
      <Typography sx={{ color: T.color.textSecondary, mb: 2, lineHeight: 1.6 }}>
        Manage price offers — what you sent as a buyer and what you received as a seller.
      </Typography>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          mb: 2,
          borderBottom: `1px solid ${T.color.border}`,
          "& .MuiTab-root": { textTransform: "none", fontWeight: 600, fontSize: 14 },
          "& .Mui-selected": { color: INFO },
        }}
      >
        <Tab value="my" label="My Offers (Sent)" />
        <Tab value="received" label="Received Offers" />
      </Tabs>

      <Alert severity="info" sx={{ mb: 3, borderRadius: T.radius.md }}>
        <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 0.5 }}>{help.title}</Typography>
        <Typography sx={{ fontSize: 13, lineHeight: 1.6 }}>{help.body}</Typography>
      </Alert>

      {loading || !authReady ? (
        <Spinner label="Loading offers…" />
      ) : (
        <OfferTable
          rows={rows}
          mode={tab}
          onViewProduct={(productId) => router.push(userProductRoutes.view(productId))}
        />
      )}
    </Box>
  );
}

export default function UserProductOffersPage() {
  return (
    <Suspense fallback={<Spinner label="Loading offers…" />}>
      <OffersPageContent />
    </Suspense>
  );
}
