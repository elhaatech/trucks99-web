"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import FilterListIcon from "@mui/icons-material/FilterList";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import { useRouter } from "next/navigation";

import { useCategorySubcategories } from "@/hooks/useCategorySubcategories";
import { getSubCategoryRowId } from "@/model/services/sub-category";
import { saveListState } from "@/lib/navigation";
import { routes } from "@/lib/routes";

export type SubcategoryFilterValue = {
  id: string;
  name: string;
} | null;

export type CategorySubcategoriesListProps = {
  categoryId: string;
  categoryName?: string;
  currentSubcategoryId?: string | null;
  currentSubcategoryName?: string;
  selectedFilter?: SubcategoryFilterValue;
  onFilterChange?: (filter: SubcategoryFilterValue) => void;
  linkToBrowse?: boolean;
  compact?: boolean;
};

export function CategorySubcategoriesList({
  categoryId,
  categoryName,
  currentSubcategoryId,
  currentSubcategoryName,
  selectedFilter,
  onFilterChange,
  linkToBrowse = false,
  compact = false,
}: CategorySubcategoriesListProps) {
  const router = useRouter();
  const {
    subcategories,
    loadingSubcategories,
    subcategoriesError,
    subcategoriesEmpty,
  } = useCategorySubcategories({ categoryId, activeOnly: true });

  if (!categoryId) return null;

  const handleSelect = (subcategoryId: string | null, subcategoryName?: string) => {
    if (onFilterChange) {
      if (!subcategoryId) {
        onFilterChange(null);
        return;
      }
      const next =
        selectedFilter?.id === subcategoryId
          ? null
          : { id: subcategoryId, name: subcategoryName ?? "Selected" };
      onFilterChange(next);
      return;
    }

    if (linkToBrowse && subcategoryId) {
      const listPath = routes.buysell.list();
      const filters = {
        search: "",
        status: "",
        category_id: categoryId,
        subcategory_id: subcategoryId,
        userid: "",
        min_price: "",
        max_price: "",
        usear_type: "buy" as const,
      };
      saveListState(listPath, { filters, appliedFilters: filters });
      router.push(listPath);
    }
  };

  const shellSx = compact
    ? { mb: 0 }
    : {
        mb: 0,
        p: { xs: 1.5, sm: 2 },
        bgcolor: "grey.50",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
      };

  if (loadingSubcategories) {
    return (
      <Box sx={shellSx}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.25 }}>
          <FilterListIcon sx={{ fontSize: 18, color: "text.secondary" }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Filter by subcategory
          </Typography>
        </Box>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" width={96} height={34} />
          ))}
        </Box>
      </Box>
    );
  }

  if (subcategoriesError) {
    return (
      <Box sx={shellSx}>
        <Alert severity="warning">
          Could not load subcategories. {subcategoriesError}
        </Alert>
      </Box>
    );
  }

  if (subcategoriesEmpty) {
    return (
      <Box sx={shellSx}>
        <Typography variant="body2" color="text.secondary">
          No subcategories found
          {categoryName ? ` under ${categoryName}` : ""}.
        </Typography>
      </Box>
    );
  }

  const showAllSelected = !selectedFilter?.id;

  return (
    <Box sx={shellSx}>
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          gap: 1,
          flexWrap: "wrap",
          mb: 1.25,
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FilterListIcon sx={{ fontSize: 18, color: "primary.main" }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Filter by subcategory
            </Typography>
          </Box>
          {!compact && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.35, ml: 3.25 }}>
              {categoryName
                ? `Under ${categoryName} — tap to filter seller listings below`
                : "Tap a subcategory to filter seller listings below"}
            </Typography>
          )}
        </Box>

        {selectedFilter?.id && onFilterChange ? (
          <Button
            size="small"
            onClick={() => onFilterChange(null)}
            sx={{ textTransform: "none", fontSize: 12, minWidth: "auto" }}
          >
            Clear filter
          </Button>
        ) : null}
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
        {onFilterChange ? (
          <Chip
            label="All types"
            size="medium"
            clickable
            color={showAllSelected ? "primary" : "default"}
            variant={showAllSelected ? "filled" : "outlined"}
            onClick={() => handleSelect(null)}
            sx={{ fontWeight: showAllSelected ? 600 : 400 }}
          />
        ) : null}

        {subcategories.map((sub) => {
          const subId = getSubCategoryRowId(sub);
          const isCurrent = currentSubcategoryId === subId;
          const isSelected = selectedFilter?.id === subId;
          const isClickable = !!onFilterChange || linkToBrowse;

          return (
            <Chip
              key={subId}
              label={
                isCurrent
                  ? `${sub.sub_category_name} · This listing`
                  : sub.sub_category_name
              }
              size="medium"
              clickable={isClickable}
              color={isSelected ? "primary" : isCurrent ? "secondary" : "default"}
              variant={isSelected || isCurrent ? "filled" : "outlined"}
              onClick={
                isClickable
                  ? () => handleSelect(subId, sub.sub_category_name)
                  : undefined
              }
              sx={{
                fontWeight: isSelected || isCurrent ? 600 : 400,
                maxWidth: "100%",
                height: "auto",
                "& .MuiChip-label": { whiteSpace: "normal", py: 0.75 },
              }}
            />
          );
        })}
      </Box>

      {currentSubcategoryName && !compact ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          This product is listed under{" "}
          <Box component="span" sx={{ fontWeight: 600 }}>
            {currentSubcategoryName}
          </Box>
          .
        </Typography>
      ) : null}

      {linkToBrowse ? (
        <Button
          size="small"
          startIcon={<StorefrontOutlinedIcon />}
          onClick={() => {
            const listPath = routes.buysell.list();
            const filters = {
              search: "",
              status: "",
              category_id: categoryId,
              subcategory_id: "",
              userid: "",
              min_price: "",
              max_price: "",
              usear_type: "buy" as const,
            };
            saveListState(listPath, { filters, appliedFilters: filters });
            router.push(listPath);
          }}
          sx={{ mt: 1.25, textTransform: "none", fontSize: 12 }}
        >
          Browse all in marketplace
        </Button>
      ) : null}
    </Box>
  );
}
