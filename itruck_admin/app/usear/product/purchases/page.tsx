"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import { EmptyState, Skeleton } from "@/components/ui";
import { FilterCard, FilterFieldItem, FilterSelectInput } from "@/components/common";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { PRODUCT_THEME as T } from "@/lib/theme";
import {
  getBuySellPurchaseList,
  getBuySellRowId,
  type BuySellProduct,
} from "@/model/services/buysellapi";
import { addFavorite, removeFavorite } from "@/model/services/favoriteapi";
import { seedFavoriteIds } from "@/lib/buySellListUtils";
import { useNotification } from "@/hooks/useNotification";
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
];

export default function UserPurchasesPage() {
  const router = useRouter();
  const { notify } = useNotification();
  const [tab, setTab] = useState<TabValue>("purchased");
  const [statusFilter, setStatusFilter] = useState("all");
  const [purchased, setPurchased] = useState<BuySellProduct[]>([]);
  const [nonPurchased, setNonPurchased] = useState<BuySellProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const load = useCallback(
    async (status: string) => {
      setLoading(true);
      try {
        const res = await getBuySellPurchaseList({ status });
        setPurchased(res.purchasedProducts ?? []);
        setNonPurchased(res.nonPurchasedProducts ?? []);
        setFavoriteIds(
          seedFavoriteIds([
            ...(res.purchasedProducts ?? []),
            ...(res.nonPurchasedProducts ?? []),
          ]),
        );
      } catch (err) {
        notify({
          type: "error",
          message: err instanceof Error ? err.message : "Failed to load purchases",
        });
      } finally {
        setLoading(false);
      }
    },
    [notify],
  );

  useEffect(() => {
    void load(statusFilter);
  }, [load, statusFilter]);

  const activeList = useMemo(
    () => (tab === "purchased" ? purchased : nonPurchased),
    [tab, purchased, nonPurchased],
  );

  const handleFavoriteToggle = useCallback(
    async (productId: string) => {
      const isFav = favoriteIds.has(productId);
      setTogglingIds((prev) => new Set(prev).add(productId));
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        isFav ? next.delete(productId) : next.add(productId);
        return next;
      });
      try {
        if (isFav) await removeFavorite("buySell", productId);
        else await addFavorite("buySell", productId);
      } catch (err) {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          isFav ? next.add(productId) : next.delete(productId);
          return next;
        });
        notify({
          type: "error",
          message: err instanceof Error ? err.message : "Failed to update favourite",
        });
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

  return (
    <Box>
      <Typography sx={{ fontWeight: 800, fontSize: 24, mb: 0.5 }}>My Purchases</Typography>
      <Typography sx={{ color: T.color.textSecondary, mb: 3 }}>
        Products you&apos;ve bought and products still available to buy.
      </Typography>

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
              options={STATUS_OPTIONS}
              disabled={loading}
            />
          </FilterFieldItem>
        </Box>
      </FilterCard>

      <Tabs value={tab} onChange={(_, v: TabValue) => setTab(v)} sx={{ mb: 3 }}>
        <Tab value="purchased" label={`Purchased (${purchased.length})`} />
        <Tab value="nonPurchased" label={`Available (${nonPurchased.length})`} />
      </Tabs>

      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Skeleton variant="rounded" height={280} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      ) : activeList.length === 0 ? (
        <EmptyState
          title={tab === "purchased" ? "No purchases yet" : "No available products"}
          description={
            tab === "purchased"
              ? "Products you buy will appear here."
              : "Browse listings to find vehicles to purchase."
          }
          icon={
            tab === "purchased" ? (
              <ShoppingBagOutlinedIcon sx={{ fontSize: 36 }} />
            ) : (
              <StorefrontOutlinedIcon sx={{ fontSize: 36 }} />
            )
          }
        />
      ) : (
        <Grid container spacing={2}>
          {activeList.map((product) => {
            const id = getBuySellRowId(product);
            return (
              <Grid key={id} size={{ xs: 12, sm: 6, md: 4 }}>
                <VehicleCard
                  product={product}
                  isFavorite={favoriteIds.has(id)}
                  favoriteLoading={togglingIds.has(id)}
                  onFavoriteToggle={handleFavoriteToggle}
                  onClick={() => router.push(userProductRoutes.view(id))}
                />
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
