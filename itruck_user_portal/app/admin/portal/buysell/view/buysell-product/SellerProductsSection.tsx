"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";

import {
  BuySellProduct,
  postBuySellProductsByOwner,
  getBuySellRowId,
} from "@/model/services/buysellapi";
import { routes } from "@/lib/routes";
import { PRODUCT_THEME as T } from "./theme";
import { VehicleCard } from "@/app/common/components/buysell/VehicleCard";

type SellerProductsSectionProps = {
  ownerId: string;
  excludeProductId: string;
  enabled?: boolean;
  /** When set, only show seller products in this subcategory. */
  subcategoryFilterId?: string | null;
};

function SellerProductCardSkeleton() {
  return (
    <Box
      sx={{
        bgcolor: T.color.surface,
        border: `1px solid ${T.color.border}`,
        borderRadius: T.radius.md,
        overflow: "hidden",
      }}
    >
      <Skeleton variant="rectangular" height={160} />
      <Box sx={{ p: 1.5 }}>
        <Skeleton width="70%" height={18} />
        <Skeleton width="40%" height={22} sx={{ mt: 1 }} />
        <Skeleton width="90%" height={14} sx={{ mt: 1 }} />
        <Skeleton width="60%" height={14} sx={{ mt: 0.75 }} />
        <Skeleton width="50%" height={14} sx={{ mt: 0.75 }} />
      </Box>
    </Box>
  );
}

export function SellerProductsSection({
  ownerId,
  excludeProductId,
  enabled = true,
  subcategoryFilterId = null,
}: SellerProductsSectionProps) {
  const router = useRouter();
  const [products, setProducts] = useState<BuySellProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled || !ownerId) {
      setProducts([]);
      setError("");
      setLoaded(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    setProducts([]);

    postBuySellProductsByOwner({
      ownerId,
      excludeProductId,
      page: 1,
      limit: 12,
    })
      .then((data) => {
        if (cancelled) return;
        setProducts(data.products ?? []);
        setLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load seller products",
        );
        setProducts([]);
        setLoaded(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ownerId, excludeProductId, enabled]);

  if (!enabled) return null;

  if (loading) {
    return (
      <Box sx={{ mb: 2.5 }}>
        <Typography
          sx={{
            fontFamily: T.font.display,
            fontWeight: 700,
            fontSize: 16,
            color: T.color.textPrimary,
            mb: 1.5,
          }}
        >
          More Products from this Seller
        </Typography>
        <Grid container spacing={2}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <Grid key={idx} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <SellerProductCardSkeleton />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mb: 2.5 }}>
        <Typography
          sx={{
            fontFamily: T.font.display,
            fontWeight: 700,
            fontSize: 16,
            color: T.color.textPrimary,
            mb: 1.5,
          }}
        >
          More Products from this Seller
        </Typography>
        <Alert severity="warning" sx={{ borderRadius: T.radius.md }}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (loaded && products.length === 0) {
    return (
      <Box
        sx={{
          mb: 2.5,
          bgcolor: T.color.surface,
          border: `1px solid ${T.color.border}`,
          borderRadius: T.radius.lg,
          p: { xs: 2, md: 2.5 },
          boxShadow: T.shadow.card,
        }}
      >
        <Typography
          sx={{
            fontFamily: T.font.display,
            fontWeight: 700,
            fontSize: 16,
            color: T.color.textPrimary,
            mb: 0.75,
          }}
        >
          More Products from this Seller
        </Typography>
        <Typography
          sx={{
            fontFamily: T.font.body,
            fontSize: 14,
            color: T.color.textSecondary,
          }}
        >
          No other products available.
        </Typography>
      </Box>
    );
  }

  if (products.length === 0) return null;

  const filteredProducts = subcategoryFilterId
    ? products.filter((product) => {
        const subId =
          typeof product.subcategory_id === "object" && product.subcategory_id
            ? product.subcategory_id._id
            : String(product.subcategory_id ?? "");
        return subId === subcategoryFilterId;
      })
    : products;

  if (subcategoryFilterId && filteredProducts.length === 0) {
    return (
      <Box
        sx={{
          mb: 2.5,
          bgcolor: T.color.surface,
          border: `1px solid ${T.color.border}`,
          borderRadius: T.radius.lg,
          p: { xs: 2, md: 2.5 },
          boxShadow: T.shadow.card,
        }}
      >
        <Typography
          sx={{
            fontFamily: T.font.display,
            fontWeight: 700,
            fontSize: 16,
            color: T.color.textPrimary,
            mb: 0.75,
          }}
        >
          More Products from this Seller
        </Typography>
        <Typography
          sx={{
            fontFamily: T.font.body,
            fontSize: 14,
            color: T.color.textSecondary,
          }}
        >
          No other products in this subcategory.
        </Typography>
      </Box>
    );
  }

  const handleNavigate = (productId: string) => {
    router.push(routes.buysell.view(productId));
  };

  return (
    <Box
      sx={{
        mb: 2.5,
        bgcolor: T.color.surface,
        border: `1px solid ${T.color.border}`,
        borderRadius: T.radius.lg,
        p: { xs: 2, md: 2.5 },
        boxShadow: T.shadow.card,
      }}
    >
      <Typography
        sx={{
          fontFamily: T.font.display,
          fontWeight: 700,
          fontSize: 16,
          color: T.color.textPrimary,
          mb: 1.5,
        }}
      >
        More Products from this Seller
      </Typography>

      <Grid container spacing={2}>
        {filteredProducts.map((product) => (
          <Grid
            key={getBuySellRowId(product)}
            size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
          >
            <VehicleCard
              product={product}
              onClick={handleNavigate}
              showViewAction
              viewLabel="View Listing"
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
