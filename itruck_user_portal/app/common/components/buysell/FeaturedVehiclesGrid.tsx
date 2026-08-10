"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import SearchOffOutlinedIcon from "@mui/icons-material/SearchOffOutlined";
import { getBuySellRowId, type BuySellProduct } from "@/model/services/buysellapi";
import { VehicleCard } from "./VehicleCard";
import { BuySellErrorState } from "./ErrorState";
import { VehicleGridSkeleton } from "./LoadingSkeleton";

type FeaturedVehiclesGridProps = {
  products: BuySellProduct[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  onViewDetails: (productId: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  browseAllHref?: string;
  onBrowseAll?: () => void;
};

export function FeaturedVehiclesGrid({
  products,
  loading = false,
  error = "",
  onRetry,
  onViewDetails,
  emptyTitle = "No featured vehicles",
  emptyDescription = "There are no active featured listings right now. Check back soon or browse all vehicles.",
  onBrowseAll,
}: FeaturedVehiclesGridProps) {
  if (loading) {
    return <VehicleGridSkeleton count={4} />;
  }

  if (error) {
    return (
      <BuySellErrorState
        message={error}
        onRetry={onRetry ? () => void onRetry() : undefined}
      />
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={<SearchOffOutlinedIcon sx={{ fontSize: 36 }} />}
        action={
          onBrowseAll ? (
            <Button variant="contained" onClick={onBrowseAll}>
              Browse all vehicles
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "minmax(0, 1fr)",
          sm: "repeat(2, minmax(0, 1fr))",
          lg: "repeat(3, minmax(0, 1fr))",
          xl: "repeat(4, minmax(0, 1fr))",
        },
        gap: 2.5,
      }}
    >
      {products.map((product) => (
        <VehicleCard
          key={getBuySellRowId(product)}
          product={product}
          onClick={onViewDetails}
          showViewAction
          viewLabel="View Details"
          badge={{ label: "Featured", color: "#f97316" }}
        />
      ))}
    </Box>
  );
}
