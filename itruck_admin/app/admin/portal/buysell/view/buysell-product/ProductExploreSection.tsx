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
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";

import { CategorySubcategoriesList, type SubcategoryFilterValue } from "@/components/common";
import { StateFilterDropdown } from "@/app/common/components/buysell/StateFilterDropdown";
import {
  BuySellProduct,
  postBuySellProductsByOwner,
  getBuySellRowId,
} from "@/model/services/buysellapi";
import { getBuySellImageUrl } from "@/lib/buysellUtils";
import { formatCreatedDate } from "@/lib/dateUtils";
import { routes } from "@/lib/routes";
import { PRODUCT_THEME as T } from "./theme";

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
  stateFilter: string;
  onStateFilterChange: (state: string) => void;
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

function SellerProductCard({
  product,
  onNavigate,
}: {
  product: BuySellProduct;
  onNavigate: (productId: string) => void;
}) {
  const image = product.images?.[0];
  const productId = getBuySellRowId(product);

  const subcategoryName =
    typeof product.subcategory_id === "object" && product.subcategory_id
      ? product.subcategory_id.sub_category_name
      : null;

  const locationLabel = [product.city_info?.name, product.state_info?.name]
    .filter(Boolean)
    .join(", ");

  const postedDate = product.createdAt
    ? formatCreatedDate(product.createdAt)
    : "—";

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => onNavigate(productId)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onNavigate(productId);
        }
      }}
      sx={{
        bgcolor: T.color.surface,
        border: `1px solid ${T.color.border}`,
        borderRadius: T.radius.md,
        overflow: "hidden",
        cursor: "pointer",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        "&:hover": {
          boxShadow: T.shadow.cardHover,
          transform: "translateY(-2px)",
        },
        "&:focus-visible": {
          outline: `2px solid ${T.color.trustNavy}`,
          outlineOffset: 2,
        },
      }}
    >
      <Box sx={{ position: "relative" }}>
        {image ? (
          <Box
            component="img"
            src={getBuySellImageUrl(image)}
            alt={product.description || "Product"}
            sx={{
              width: "100%",
              height: { xs: 140, sm: 160 },
              objectFit: "cover",
              display: "block",
              bgcolor: T.color.surfaceMuted,
            }}
          />
        ) : (
          <Box
            sx={{
              width: "100%",
              height: { xs: 140, sm: 160 },
              bgcolor: T.color.surfaceMuted,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography sx={{ fontSize: 12, color: T.color.textMuted }}>
              No photo
            </Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ p: 1.5, flexGrow: 1, display: "flex", flexDirection: "column", gap: 0.75 }}>
        <Typography
          sx={{
            fontFamily: T.font.body,
            fontSize: 14,
            fontWeight: 600,
            color: T.color.textPrimary,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            lineHeight: 1.35,
          }}
        >
          {product.description || "Untitled listing"}
        </Typography>

        <Typography
          sx={{
            fontFamily: T.font.display,
            fontSize: 17,
            fontWeight: 700,
            color: T.color.trustNavy,
          }}
        >
          ₹{Number(product.price ?? 0).toLocaleString("en-IN")}
        </Typography>

        {subcategoryName && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <CategoryOutlinedIcon sx={{ fontSize: 14, color: T.color.textMuted }} />
            <Typography sx={{ fontSize: 12, color: T.color.textSecondary }} noWrap>
              {subcategoryName}
            </Typography>
          </Box>
        )}

        {locationLabel && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <LocationOnOutlinedIcon sx={{ fontSize: 14, color: T.color.textMuted }} />
            <Typography sx={{ fontSize: 12, color: T.color.textSecondary }} noWrap>
              {locationLabel}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: "auto", pt: 0.5 }}>
          <CalendarTodayOutlinedIcon sx={{ fontSize: 14, color: T.color.textMuted }} />
          <Typography sx={{ fontSize: 12, color: T.color.textMuted }}>
            {postedDate}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

function SellerProductsGrid({
  products,
  subcategoryFilter,
  stateFilter,
  sellerName,
  onNavigate,
}: {
  products: BuySellProduct[];
  subcategoryFilter: SubcategoryFilterValue;
  stateFilter: string;
  sellerName?: string;
  onNavigate: (id: string) => void;
}) {
  const filtered = products.filter((product) => {
    if (subcategoryFilter?.id) {
      const subId =
        typeof product.subcategory_id === "object" && product.subcategory_id
          ? product.subcategory_id._id
          : String(product.subcategory_id ?? "");
      if (subId !== subcategoryFilter.id) return false;
    }
    if (stateFilter) {
      if (product.state_info?.name !== stateFilter) return false;
    }
    return true;
  });

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

  if ((subcategoryFilter?.id || stateFilter) && filtered.length === 0) {
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
          No listings
          {subcategoryFilter?.name ? ` in ${subcategoryFilter.name}` : ""}
          {stateFilter ? ` in ${stateFilter}` : ""}
        </Typography>
        <Typography sx={{ fontSize: 13, color: T.color.textSecondary }}>
          Try clearing a filter above to see more listings from this seller.
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
        {stateFilter ? ` in ${stateFilter}` : ""}
        {sellerName ? ` from ${sellerName}` : ""}.
      </Typography>
      <Grid container spacing={2}>
        {filtered.map((product) => (
          <Grid key={getBuySellRowId(product)} size={{ xs: 12, sm: 6, md: 4 }}>
            <SellerProductCard product={product} onNavigate={onNavigate} />
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
  stateFilter,
  onStateFilterChange,
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
          to narrow by subcategory or state.
        </Typography>
      </Box>

      <Box sx={{ mb: 2, display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, alignItems: { sm: "flex-start" } }}>
        {categoryId ? (
          <Box sx={{ flex: 1, minWidth: 0 }}>
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

        <Box sx={{ width: { xs: "100%", sm: 260 }, flexShrink: 0 }}>
          <StateFilterDropdown
            label="State"
            value={stateFilter}
            onChange={onStateFilterChange}
            placeholder="All states"
          />
        </Box>
      </Box>

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
          stateFilter={stateFilter}
          sellerName={sellerName}
          onNavigate={(productId) =>
            router.push(getViewRoute?.(productId) ?? routes.buysell.view(productId))
          }
        />
      )}
    </Box>
  );
}
