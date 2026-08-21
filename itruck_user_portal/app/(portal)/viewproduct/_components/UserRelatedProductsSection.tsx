"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";

import {
  BuySellProduct,
  getBuySellRowId,
  postBuySellProductsByOwner,
} from "@/model/services/buysellapi";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";
import { VehicleCard } from "@/app/common/components/buysell/VehicleCard";

type UserRelatedProductsSectionProps = {
  sellerId: string;
  sellerName?: string;
  excludeProductId: string;
  isLoggedIn: boolean;
  /** When true, copy and actions target the listing owner (logged-in seller). */
  isOwnerView?: boolean;
  onAddVehicle?: () => void;
  onNotify?: (payload: { type: "success" | "error"; message: string }) => void;
  /** State id of the currently viewed product; auto-restricts to same-state listings. */
  currentStateId?: string | null;
  /** Category id of the currently viewed product; auto-restricts to same-category listings. */
  currentCategoryId?: string | null;
  /** Subcategory id of the currently viewed product; auto-restricts to same-subcategory listings. */
  currentSubcategoryId?: string | null;
};

function RelatedCardSkeleton() {
  return (
    <Box sx={{ borderRadius: T.radius.lg, border: `1px solid ${T.color.border}`, overflow: "hidden" }}>
      <Skeleton variant="rectangular" height={150} />
      <Box sx={{ p: 1.5 }}>
        <Skeleton width="80%" />
        <Skeleton width="50%" sx={{ mt: 1 }} />
      </Box>
    </Box>
  );
}

export function UserRelatedProductsSection({
  sellerId,
  sellerName,
  excludeProductId,
  isLoggedIn,
  isOwnerView = false,
  onAddVehicle,
  currentStateId,
  currentCategoryId,
  currentSubcategoryId,
}: UserRelatedProductsSectionProps) {
  const router = useRouter();
  const [products, setProducts] = useState<BuySellProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn || !sellerId) {
      setProducts([]);
      return;
    }
    setLoading(true);
    setError("");

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const data = await postBuySellProductsByOwner({
          ownerId: sellerId,
          excludeProductId,
          page: 1,
          limit: 12,
          countryId: "",
          stateId: currentStateId || undefined,
          categoryId: currentCategoryId || undefined,
          subcategoryId: currentSubcategoryId || undefined,
        });
        if (cancelled) return;
        setProducts(data.products ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load related listings");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [sellerId, excludeProductId, isLoggedIn, currentStateId, currentCategoryId, currentSubcategoryId]);

  if (!sellerId) return null;

  return (
    <Box
      sx={{
        mb: 2.5,
        p: { xs: 2, md: 2.5 },
        borderRadius: T.radius.lg,
        border: `1px solid ${T.color.border}`,
        bgcolor: T.color.surface,
        boxShadow: T.shadow.card,
      }}
    >
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 1, mb: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 17, mb: 0.5 }}>
            {isOwnerView ? "Related Vechile Details" : `More from ${sellerName ?? "this seller"}`}
          </Typography>
          <Typography sx={{ fontSize: 13, color: T.color.textSecondary, lineHeight: 1.6 }}>
            {isOwnerView
              ? "Manage your fleet — open another listing or list a new vehicle for sale."
              : "Browse other vehicles by this seller. Use View Product to open details, ♥ to save to favourites, or the chat icon to message the seller."}
          </Typography>
        </Box>
        {isOwnerView && onAddVehicle ? (
          <Button
            variant="contained"
            size="small"
            onClick={onAddVehicle}
            sx={{ bgcolor: INFO, textTransform: "none", fontWeight: 600, flexShrink: 0 }}
          >
            List another vehicle
          </Button>
        ) : null}
      </Box>

      {!isLoggedIn ? (
        <Alert severity="info" sx={{ borderRadius: T.radius.md }}>
          Please log in to see other listings from this seller.
        </Alert>
      ) : loading ? (
        <Grid container spacing={2}>
          {[1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <RelatedCardSkeleton />
            </Grid>
          ))}
        </Grid>
      ) : error ? (
        <Alert severity="warning">{error}</Alert>
      ) : products.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 3, bgcolor: T.color.surfaceMuted, borderRadius: T.radius.md }}>
          <StorefrontOutlinedIcon sx={{ fontSize: 36, color: T.color.textMuted, mb: 1 }} />
          <Typography sx={{ fontWeight: 600 }}>
            {isOwnerView ? "No other listings yet" : "No other listings"}
          </Typography>
          <Typography sx={{ fontSize: 13, color: T.color.textSecondary, mt: 0.5 }}>
            {isOwnerView
              ? "List another vehicle to grow your marketplace presence."
              : `${sellerName ?? "This seller"} has no other active vehicles right now.`}
          </Typography>
          {isOwnerView && onAddVehicle ? (
            <Button
              variant="outlined"
              size="small"
              onClick={onAddVehicle}
              sx={{ mt: 2, textTransform: "none", fontWeight: 600 }}
            >
              List your next vehicle
            </Button>
          ) : null}
        </Box>
      ) : (
        <>
          <Typography sx={{ fontSize: 12.5, color: T.color.textSecondary, mb: 1.5 }}>
            Showing {products.length} listing{products.length === 1 ? "" : "s"}
            {sellerName ? ` from ${sellerName}` : ""}.
          </Typography>
          <Grid container spacing={2}>
            {products.map((product) => {
              const productId = getBuySellRowId(product);
              return (
                <Grid key={productId} size={{ xs: 12, sm: 6, md: 4 }}>
                  <VehicleCard
                    product={product}
                    onClick={() => router.push(userProductRoutes.view(productId))}
                  />
                </Grid>
              );
            })}
          </Grid>
        </>
      )}
    </Box>
  );
}
