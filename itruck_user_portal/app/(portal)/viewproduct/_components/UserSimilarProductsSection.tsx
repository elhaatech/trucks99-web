"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";

import {
  BuySellProduct,
  getBuySellRowId,
  postBuySellSimilarProducts,
} from "@/model/services/buysellapi";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { PRODUCT_THEME as T } from "@/lib/theme";
import { VehicleCard } from "@/app/common/components/buysell/VehicleCard";

type UserSimilarProductsSectionProps = {
  excludeProductId: string;
  isLoggedIn: boolean;
  currentStateId?: string | null;
  currentCategoryId?: string | null;
  currentSubcategoryId?: string | null;
  currentCategoryName?: string | null;
  currentSubcategoryName?: string | null;
  currentStateName?: string | null;
};

export function UserSimilarProductsSection({
  excludeProductId,
  isLoggedIn,
  currentStateId,
  currentCategoryId,
  currentSubcategoryId,
  currentCategoryName,
  currentSubcategoryName,
  currentStateName,
}: UserSimilarProductsSectionProps) {
  const router = useRouter();
  const [products, setProducts] = useState<BuySellProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn || !currentStateId || !currentCategoryId || !currentSubcategoryId) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    postBuySellSimilarProducts({
      excludeProductId,
      page: 1,
      limit: 12,
      stateId: currentStateId,
      categoryId: currentCategoryId,
      subcategoryId: currentSubcategoryId,
    })
      .then((data) => {
        if (!cancelled) setProducts(data.products ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load similar listings");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [excludeProductId, isLoggedIn, currentStateId, currentCategoryId, currentSubcategoryId]);

  if (!currentStateId || !currentCategoryId || !currentSubcategoryId) return null;

  return (
    <Box sx={{ mb: 2.5, p: { xs: 2, md: 2.5 }, borderRadius: T.radius.lg, border: `1px solid ${T.color.border}`, bgcolor: T.color.surface, boxShadow: T.shadow.card }}>
      <Typography sx={{ fontWeight: 700, fontSize: 17, mb: 0.5 }}>Similar Vehicles Nearby</Typography>
      <Typography sx={{ fontSize: 13, color: T.color.textSecondary, textTransform: "uppercase", mb: 2 }}>
        {`${currentCategoryName?.trim() || "N/A"} - ${currentSubcategoryName?.trim() || "N/A"} - ${currentStateName?.trim() || "N/A"}`}
      </Typography>
      {!isLoggedIn ? <Alert severity="info">Please log in to see similar vehicles.</Alert> : loading ? (
        <Grid container spacing={2}>{[1, 2, 3].map((item) => <Grid key={item} size={{ xs: 12, sm: 6, md: 4 }}><Skeleton variant="rectangular" height={200} /></Grid>)}</Grid>
      ) : error ? <Alert severity="warning">{error}</Alert> : products.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 3, bgcolor: T.color.surfaceMuted, borderRadius: T.radius.md }}>
          <StorefrontOutlinedIcon sx={{ fontSize: 36, color: T.color.textMuted, mb: 1 }} />
          <Typography sx={{ fontWeight: 600 }}>No similar vehicles found</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>{products.map((product) => { const productId = getBuySellRowId(product); return <Grid key={productId} size={{ xs: 12, sm: 6, md: 4 }}><VehicleCard product={product} onClick={() => router.push(userProductRoutes.view(productId))} /></Grid>; })}</Grid>
      )}
    </Box>
  );
}