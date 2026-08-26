"use client";

import { useCallback, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import { alpha, useTheme } from "@mui/material/styles";
import { ModulePageLayout, BackButton } from "@/components/common";
import { AppCard } from "@/components/ui/AppCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCardSkeleton } from "@/components/ui/Skeleton";
import { routes } from "@/lib/routes";
import { useAppNavigate } from "@/lib/navigation";
import { useNotification } from "@/hooks/useNotification";
import {
  getBuySellCart,
  getBuySellRowId,
  removeBuySellFromCart,
  type BuySellCartItem,
} from "@/model/services/buysellapi";
import { getFirstBuySellImageUrl } from "@/lib/buysellUtils";
import { ProductStatusChip } from "../_components/ProductStatusChip";

export default function BuySellCartPage() {
  const theme = useTheme();
  const navigate = useAppNavigate();
  const { notify } = useNotification();
  const [items, setItems] = useState<BuySellCartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCart = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBuySellCart();
      setItems(res.items ?? []);
    } catch (err) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to load cart",
      });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void loadCart();
  }, [loadCart]);

  const handleRemove = async (productId: string) => {
    try {
      await removeBuySellFromCart(productId);
      notify({ type: "success", message: "Removed from cart." });
      await loadCart();
    } catch (err) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : "Remove failed",
      });
    }
  };

  const totalValue = items.reduce((sum, item) => sum + (Number(item.product.price) || 0), 0);

  return (
    <ModulePageLayout
      title="My Cart"
      subtitle="Vehicles you've saved while browsing buy & sell listings."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Buy & Sell", href: routes.buysell.list() },
        { label: "Cart" },
      ]}
      action={<BackButton fallback={routes.buysell.list()} label="Browse listings" variant="outlined" />}
    >
      {loading ? (
        <StatCardSkeleton count={2} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Your cart is empty"
          description="Browse buy & sell listings and add vehicles to your cart."
          icon={<ShoppingCartOutlinedIcon sx={{ fontSize: 36 }} />}
          action={
            <Button variant="contained" onClick={() => navigate(routes.buysell.list())}>
              Browse listings
            </Button>
          }
        />
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 320px" }, gap: 3 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {items.map((item) => {
              const product = item.product;
              const productId = getBuySellRowId(product);
              const price = Number(product.price) || 0;
              const imageUrl = getFirstBuySellImageUrl(product.images);

              return (
                <AppCard key={item._id || productId} hover={false} padding={0}>
                  <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" } }}>
                    <Box
                      sx={{
                        width: { xs: "100%", sm: 160 },
                        height: { xs: 160, sm: "auto" },
                        minHeight: { sm: 140 },
                        bgcolor: alpha(theme.palette.text.primary, 0.04),
                        backgroundImage: `url(${imageUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        borderRadius: { xs: "12px 12px 0 0", sm: "12px 0 0 12px" },
                        flexShrink: 0,
                      }}
                    />
                    <Box sx={{ flex: 1, p: 2.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={700}>
                            {product.description || product.bsNumber || "Vehicle"}
                          </Typography>
                  
                          {product.vehicleId ? (
                            <Typography variant="body2" color="text.secondary">
                              Vehicle ID: {product.vehicleId}
                            </Typography>
                          ) : null}
                        </Box>
                        <IconButton
                          color="error"
                          size="small"
                          aria-label="Remove from cart"
                          onClick={() => handleRemove(productId)}
                          sx={{ bgcolor: alpha(theme.palette.error.main, 0.06) }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Box>

                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                        <Typography variant="h6" fontWeight={800} color="primary.main">
                          ₹{price.toLocaleString("en-IN")}
                        </Typography>
                        <ProductStatusChip status={product.status} />
                      </Box>

                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: "auto" }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<VisibilityOutlinedIcon />}
                          onClick={() => navigate(routes.buysell.view(productId))}
                        >
                          View listing
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                </AppCard>
              );
            })}
          </Box>

          <AppCard hover={false} sx={{ height: "fit-content", position: { lg: "sticky" }, top: { lg: 88 } }}>
            <Typography variant="overline" color="text.secondary" fontWeight={700}>
              Cart Summary
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 1 }}>
              ₹{totalValue.toLocaleString("en-IN")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {items.length} item{items.length !== 1 ? "s" : ""} saved
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="text.disabled" sx={{ display: "block", lineHeight: 1.5 }}>
              Open a listing to review details or contact the seller.
            </Typography>
          </AppCard>
        </Box>
      )}
    </ModulePageLayout>
  );
}
