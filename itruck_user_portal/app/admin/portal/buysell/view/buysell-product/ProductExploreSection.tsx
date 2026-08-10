"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";

import { CategorySubcategoriesList, type SubcategoryFilterValue } from "@/components/common";
import {
  BuySellProduct,
  postBuySellProductsByOwner,
  getBuySellRowId,
} from "@/model/services/buysellapi";
import { routes } from "@/lib/routes";
import { PRODUCT_THEME as T } from "./theme";
import { VehicleCard } from "@/app/common/components/buysell/VehicleCard";

type ProductExploreSectionProps = {
  categoryId: string;
  categoryName?: string;
  currentSubcategoryId?: string;
  currentSubcategoryName?: string;
  sellerId: string;
  sellerName?: string;
  excludeProductId: string;
  isLoggedIn: boolean;
  subcategoryFilter: SubcategoryFilterValue;
  onSubcategoryFilterChange: (filter: SubcategoryFilterValue) => void;
  /** Override product detail route (defaults to admin portal view). */
  getViewRoute?: (productId: string) => string;
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
      </Box>
    </Box>
  );
}

function SellerProductsGrid({
  products,
  subcategoryFilter,
  sellerName,
  onNavigate,
}: {
  products: BuySellProduct[];
  subcategoryFilter: SubcategoryFilterValue;
  sellerName?: string;
  onNavigate: (id: string) => void;
}) {
  const filtered = subcategoryFilter?.id
    ? products.filter((product) => {
        const subId =
          typeof product.subcategory_id === "object" && product.subcategory_id
            ? product.subcategory_id._id
            : String(product.subcategory_id ?? "");
        return subId === subcategoryFilter.id;
      })
    : products;

  if (products.length === 0) {
    return (
      <Box
        sx={{
          textAlign: "center",
          py: 3,
          px: 2,
          bgcolor: T.color.surfaceMuted,
          borderRadius: T.radius.md,
          border: `1px dashed ${T.color.border}`,
        }}
      >
        <StorefrontOutlinedIcon sx={{ fontSize: 36, color: T.color.textMuted, mb: 1 }} />
        <Typography sx={{ fontWeight: 600, color: T.color.textPrimary, mb: 0.5 }}>
          No other listings yet
        </Typography>
        <Typography sx={{ fontSize: 13, color: T.color.textSecondary }}>
          {sellerName
            ? `${sellerName} has no other active products.`
            : "This seller has no other active products."}
        </Typography>
      </Box>
    );
  }

  if (subcategoryFilter?.id && filtered.length === 0) {
    return (
      <Box
        sx={{
          textAlign: "center",
          py: 3,
          px: 2,
          bgcolor: T.color.surfaceMuted,
          borderRadius: T.radius.md,
          border: `1px dashed ${T.color.border}`,
        }}
      >
        <Typography sx={{ fontWeight: 600, color: T.color.textPrimary, mb: 0.5 }}>
          No listings in {subcategoryFilter.name}
        </Typography>
        <Typography sx={{ fontSize: 13, color: T.color.textSecondary }}>
          Try &quot;All types&quot; above to see every listing from this seller.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Typography sx={{ fontSize: 12.5, color: T.color.textSecondary, mb: 1.5 }}>
        Showing {filtered.length} of {products.length} listing
        {products.length === 1 ? "" : "s"}
        {subcategoryFilter?.name ? ` in ${subcategoryFilter.name}` : ""}
        {sellerName ? ` from ${sellerName}` : ""}.
      </Typography>
      <Grid container spacing={2}>
        {filtered.map((product) => (
          <Grid key={getBuySellRowId(product)} size={{ xs: 12, sm: 6, md: 4 }}>
            <VehicleCard
              product={product}
              onClick={onNavigate}
              showViewAction
              viewLabel="View Details"
            />
          </Grid>
        ))}
      </Grid>
    </>
  );
}

export function ProductExploreSection({
  categoryId,
  categoryName,
  currentSubcategoryId,
  currentSubcategoryName,
  sellerId,
  sellerName,
  excludeProductId,
  isLoggedIn,
  subcategoryFilter,
  onSubcategoryFilterChange,
  getViewRoute,
}: ProductExploreSectionProps) {
  const router = useRouter();
  const [products, setProducts] = useState<BuySellProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn || !sellerId) {
      setProducts([]);
      setError("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    postBuySellProductsByOwner({
      ownerId: sellerId,
      excludeProductId,
      page: 1,
      limit: 12,
    })
      .then((data) => {
        if (!cancelled) setProducts(data.products ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setProducts([]);
          setError(
            err instanceof Error ? err.message : "Could not load seller listings",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sellerId, excludeProductId, isLoggedIn]);

  const sectionTitle = sellerName ? `More from ${sellerName}` : "More from this seller";

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
      <Box sx={{ mb: 2 }}>
        <Typography
          sx={{
            fontFamily: T.font.display,
            fontWeight: 700,
            fontSize: { xs: 17, md: 18 },
            color: T.color.textPrimary,
          }}
        >
          {sectionTitle}
        </Typography>
        <Typography
          sx={{
            fontFamily: T.font.body,
            fontSize: 13,
            color: T.color.textSecondary,
            mt: 0.5,
            lineHeight: 1.5,
          }}
        >
          Explore other active listings from the same seller. Use the filters below
          to narrow by subcategory.
        </Typography>
      </Box>

      {categoryId ? (
        <Box sx={{ mb: 2 }}>
          <CategorySubcategoriesList
            compact
            categoryId={categoryId}
            categoryName={categoryName}
            currentSubcategoryId={currentSubcategoryId}
            currentSubcategoryName={currentSubcategoryName}
            selectedFilter={subcategoryFilter}
            onFilterChange={onSubcategoryFilterChange}
          />
        </Box>
      ) : null}

      {!isLoggedIn ? (
        <Alert
          severity="info"
          icon={<LoginOutlinedIcon fontSize="inherit" />}
          sx={{ borderRadius: T.radius.md }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.25 }}>
            Sign in to see more listings
          </Typography>
          <Typography sx={{ fontSize: 12.5 }}>
            Log in to view other products posted by this seller.
          </Typography>
        </Alert>
      ) : loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 3 }).map((_, idx) => (
            <Grid key={idx} size={{ xs: 12, sm: 6, md: 4 }}>
              <SellerProductCardSkeleton />
            </Grid>
          ))}
        </Grid>
      ) : error ? (
        <Alert severity="warning" sx={{ borderRadius: T.radius.md }}>
          {error}
        </Alert>
      ) : (
        <SellerProductsGrid
          products={products}
          subcategoryFilter={subcategoryFilter}
          sellerName={sellerName}
          onNavigate={(productId) =>
            router.push(getViewRoute?.(productId) ?? routes.buysell.view(productId))
          }
        />
      )}
    </Box>
  );
}
