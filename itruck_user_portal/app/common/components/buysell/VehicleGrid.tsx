"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { EmptyState } from "@/components/ui/EmptyState";
import SearchOffOutlinedIcon from "@mui/icons-material/SearchOffOutlined";
import { getBuySellRowId, type BuySellProduct } from "@/model/services/buysellapi";
import { VehicleCard } from "./VehicleCard";
import { VehicleGridSkeleton } from "./LoadingSkeleton";
import { PRODUCT_THEME as T } from "@/lib/theme";

type VehicleGridProps = {
  products: BuySellProduct[];
  loading?: boolean;
  layout?: "grid" | "list";
  favoriteIds?: Set<string>;
  togglingFavoriteIds?: Set<string>;
  onFavoriteToggle?: (productId: string) => void;
  onProductClick?: (productId: string) => void;
  onEdit?: (productId: string) => void;
  onDelete?: (productId: string) => void;
  deletingIds?: Set<string>;
  emptyTitle?: string;
  emptyDescription?: string;
  showOwnerFeaturedControls?: boolean;
  onFeaturePayNow?: (productId: string) => void;
};

const PAGE_SIZE = 12;

export function VehicleGrid({
  products,
  loading = false,
  layout = "grid",
  favoriteIds,
  togglingFavoriteIds,
  onFavoriteToggle,
  onProductClick,
  onEdit,
  onDelete,
  deletingIds,
  emptyTitle = "No vehicles found",
  emptyDescription = "Try adjusting your filters or search query.",
  showOwnerFeaturedControls = false,
  onFeaturePayNow,
}: VehicleGridProps) {
  if (loading) {
    return <VehicleGridSkeleton count={6} />;
  }

  if (products.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={<SearchOffOutlinedIcon sx={{ fontSize: 36 }} />}
      />
    );
  }

  const isList = layout === "list";

  return (
    <Box>
      <Box
        sx={{
          display: isList ? "flex" : "grid",
          flexDirection: isList ? "column" : undefined,
          gridTemplateColumns: isList
            ? undefined
            : { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" },
          gap: 2.5,
        }}
      >
        {products.map((product) => {
          const id = String(getBuySellRowId(product));
          return (
            <VehicleCard
              key={id}
              product={product}
              layout={layout}
              isFavorite={favoriteIds?.has(id)}
              favoriteLoading={togglingFavoriteIds?.has(id)}
              onFavoriteToggle={onFavoriteToggle}
              onClick={onProductClick}
              onEdit={onEdit}
              onDelete={onDelete}
              deleteLoading={deletingIds?.has(id)}
              showOwnerFeaturedControls={showOwnerFeaturedControls}
              onFeaturePayNow={onFeaturePayNow}
            />
          );
        })}
      </Box>

    </Box>
  );
}

export function VehicleListHeader({
  count,
  title,
  loading = false,
}: {
  count: number;
  title?: string;
  /** When true, hide the count line so LCP can paint the title immediately. */
  loading?: boolean;
}) {
  return (
    <Box sx={{ mb: 2 }}>
      {title ? (
        <Typography
          component="h1"
          sx={{ fontWeight: 800, fontSize: 22, color: T.color.textPrimary, mb: 0.5 }}
        >
          {title}
        </Typography>
      ) : null}
      {loading ? (
        <Typography sx={{ color: T.color.textSecondary, fontSize: 14 }}>
          Loading vehicles…
        </Typography>
      ) : (
        <Typography sx={{ color: T.color.textSecondary, fontSize: 14 }}>
          {count.toLocaleString("en-IN")} vehicle{count !== 1 ? "s" : ""} found
        </Typography>
      )}
    </Box>
  );
}

export { PAGE_SIZE as VEHICLE_PAGE_SIZE };

export function paginateProducts<T>(items: T[], page: number, pageSize = PAGE_SIZE): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function getTotalPages(count: number, pageSize = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(count / pageSize));
}
