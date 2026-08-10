"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";

import {
  BackButton,
  FilterCard,
  FilterFieldItem,
  FilterSelectInput,
  ModulePageLayout,
} from "@/components/common";
import { EmptyState, Skeleton } from "@/components/ui";
import { routes } from "@/lib/routes";
import { useAppNavigate } from "@/lib/navigation";
import { useNotification } from "@/hooks/useNotification";
import {
  BuySellProduct,
  getBuySellPurchaseList,
  getBuySellRowId,
} from "@/model/services/buysellapi";
import { addFavorite, removeFavorite } from "@/model/services/favoriteapi";
import { VehicleCard } from "@/app/common/components/buysell/VehicleCard";

type TabValue = "purchased" | "nonPurchased";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "booking", label: "Booking" },
  { value: "purchased", label: "Purchased" },
  { value: "sold", label: "Sold" },
  { value: "rejected", label: "Rejected" },
  { value: "inactive", label: "Inactive" },
  { value: "draft", label: "Draft" },
] as const;

export function PurchasedProductsListPage() {
  const navigate = useAppNavigate();
  const { notify } = useNotification();

  const [tab, setTab] = useState<TabValue>("purchased");
  const [statusFilter, setStatusFilter] = useState("all");
  const [purchased, setPurchased] = useState<BuySellProduct[]>([]);
  const [nonPurchased, setNonPurchased] = useState<BuySellProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const statusOptions = useMemo(
    () => STATUS_OPTIONS.map((option) => ({ ...option })),
    [],
  );

  const load = useCallback(
    async (status: string) => {
      setLoading(true);
      setError("");
      try {
        const res = await getBuySellPurchaseList({ status });
        setPurchased(res.purchasedProducts ?? []);
        setNonPurchased(res.nonPurchasedProducts ?? []);

        const allFavIds = [
          ...(res.purchasedProducts ?? []),
          ...(res.nonPurchasedProducts ?? []),
        ]
          .filter((p) => p.is_favorite)
          .map((p) => getBuySellRowId(p));
        setFavoriteIds(new Set(allFavIds));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load products";
        setError(msg);
        notify({ type: "error", message: msg });
      } finally {
        setLoading(false);
      }
    },
    [notify],
  );

  useEffect(() => {
    void load(statusFilter);
  }, [load, statusFilter]);

  const handleToggleFavorite = useCallback(
    async (productId: string) => {
      const isFav = favoriteIds.has(productId);

      setTogglingIds((prev) => new Set(prev).add(productId));
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        isFav ? next.delete(productId) : next.add(productId);
        return next;
      });

      try {
        if (isFav) {
          await removeFavorite("buySell", productId);
        } else {
          await addFavorite("buySell", productId);
        }
      } catch (err) {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          isFav ? next.add(productId) : next.delete(productId);
          return next;
        });
        const msg = err instanceof Error ? err.message : "Failed to update favourite";
        notify({ type: "error", message: msg });
      } finally {
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      }
    },
    [favoriteIds, notify],
  );

  const activeList = tab === "purchased" ? purchased : nonPurchased;

  return (
    <ModulePageLayout
      title="My Purchases"
      subtitle="Products you've bought and products still available to buy."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Buy / Sell", href: routes.buysell.list() },
        { label: "My Purchases" },
      ]}
      backButton={<BackButton fallback={routes.buysell.list()} label="Back to listings" />}
      error={error}
      onErrorClose={() => setError("")}
      showAds={false}
    >
      <FilterCard
        title="Filter purchases"
        subtitle="Narrow results by listing status."
        onClear={() => setStatusFilter("all")}
        clearDisabled={statusFilter === "all" || loading}
      >
        <Box sx={{ maxWidth: 280 }}>
          <FilterFieldItem>
            <FilterSelectInput
              label="Status"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value || "all")}
              options={statusOptions}
              disabled={loading}
            />
          </FilterFieldItem>
        </Box>
      </FilterCard>

      <Tabs
        value={tab}
        onChange={(_, v: TabValue) => setTab(v)}
        sx={{ mb: 3 }}
      >
        <Tab value="purchased" label={`Purchased (${purchased.length})`} />
        <Tab value="nonPurchased" label={`Available (${nonPurchased.length})`} />
      </Tabs>

      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <Skeleton variant="rounded" height={280} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      ) : activeList.length === 0 ? (
        <EmptyState
          title={
            tab === "purchased"
              ? "No purchases yet"
              : "No available products"
          }
          description={
            tab === "purchased"
              ? "Products you buy will appear here for quick access."
              : "Check back later or browse the main listings."
          }
          icon={
            tab === "purchased" ? (
              <ShoppingBagOutlinedIcon />
            ) : (
              <StorefrontOutlinedIcon />
            )
          }
          action={
            <BackButton fallback={routes.buysell.list()} label="Browse listings" />
          }
        />
      ) : (
        <Grid container spacing={2}>
          {activeList.map((product) => {
            const id = getBuySellRowId(product);
            return (
              <Grid key={id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <VehicleCard
                  product={product}
                  isFavorite={favoriteIds.has(id)}
                  favoriteLoading={togglingIds.has(id)}
                  onFavoriteToggle={() => void handleToggleFavorite(id)}
                  onClick={() => navigate(routes.buysell.view(id))}
                  badge={tab === "purchased" ? { label: "Purchased", color: "#16a34a" } : undefined}
                />
              </Grid>
            );
          })}
        </Grid>
      )}
    </ModulePageLayout>
  );
}
