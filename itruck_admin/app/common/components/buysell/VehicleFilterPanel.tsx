"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import FilterListIcon from "@mui/icons-material/FilterList";
import CloseIcon from "@mui/icons-material/Close";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";
import { getCategories, type Category } from "@/model/services/category";
import { useCategorySubcategories } from "@/hooks/useCategorySubcategories";
import {
  EMPTY_FILTERS,
  type FilterState,
} from "@/app/admin/portal/buysell/_components/interface/buysell_interface";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "booking", label: "Booked" },
  { value: "purchased", label: "Purchased" },
  { value: "sold", label: "Sold" },
  { value: "draft", label: "Draft" },
  { value: "inactive", label: "Inactive" },
  { value: "rejected", label: "Rejected" },
];

type VehicleFilterPanelProps = {
  values: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onApply: () => void;
  onClear: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

function FilterFields({
  values,
  onChange,
  onApply,
  onClear,
}: Omit<VehicleFilterPanelProps, "mobileOpen" | "onMobileClose">) {
  const [categories, setCategories] = useState<Category[]>([]);
  const { subcategories } = useCategorySubcategories({
    categoryId: values.category_id || "",
  });

  useEffect(() => {
    getCategories({ activeOnly: true })
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography sx={{ fontWeight: 700, fontSize: 16, color: T.color.textPrimary }}>
        Filters
      </Typography>

      <TextField
        select
        size="small"
        label="Category"
        value={values.category_id}
        onChange={(e) =>
          onChange({ category_id: e.target.value, subcategory_id: "" })
        }
      >
        <MenuItem value="">All categories</MenuItem>
        {categories.map((c) => (
          <MenuItem key={c._id} value={c._id}>
            {c.category_name}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Subcategory"
        value={values.subcategory_id}
        disabled={!values.category_id}
        onChange={(e) => onChange({ subcategory_id: e.target.value })}
      >
        <MenuItem value="">All subcategories</MenuItem>
        {subcategories.map((s) => (
          <MenuItem key={s._id} value={s._id}>
            {s.sub_category_name}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Status"
        value={values.status}
        onChange={(e) => onChange({ status: e.target.value })}
      >
        {STATUS_OPTIONS.map((opt) => (
          <MenuItem key={opt.value || "all"} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </TextField>

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
        <TextField
          size="small"
          label="Min price"
          type="number"
          value={values.min_price}
          onChange={(e) => onChange({ min_price: e.target.value })}
        />
        <TextField
          size="small"
          label="Max price"
          type="number"
          value={values.max_price}
          onChange={(e) => onChange({ max_price: e.target.value })}
        />
      </Box>

      <TextField
        size="small"
        label="Search"
        value={values.search}
        onChange={(e) => onChange({ search: e.target.value })}
        placeholder="Description, address, listing ID…"
      />

      <Button variant="contained" onClick={onApply} sx={{ bgcolor: INFO }}>
        Apply Filters
      </Button>
      <Button variant="outlined" onClick={onClear}>
        Clear All
      </Button>
    </Box>
  );
}

export function VehicleFilterPanel(props: VehicleFilterPanelProps) {
  const { mobileOpen, onMobileClose, ...fieldProps } = props;

  return (
    <>
      <Box
        sx={{
          display: { xs: "none", lg: "block" },
          p: 2.5,
          borderRadius: T.radius.lg,
          border: `1px solid ${T.color.border}`,
          bgcolor: T.color.surface,
          position: "sticky",
          top: 88,
        }}
      >
        <FilterFields {...fieldProps} />
      </Box>

      <Drawer
        anchor="left"
        open={!!mobileOpen}
        onClose={onMobileClose}
        sx={{ display: { lg: "none" } }}
      >
        <Box sx={{ width: 300, p: 2.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Typography fontWeight={700}>Filters</Typography>
            <IconButton onClick={onMobileClose} aria-label="Close filters">
              <CloseIcon />
            </IconButton>
          </Box>
          <FilterFields {...fieldProps} />
        </Box>
      </Drawer>
    </>
  );
}

export function MobileFilterButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="outlined"
      startIcon={<FilterListIcon />}
      onClick={onClick}
      sx={{ display: { lg: "none" } }}
    >
      Filters
    </Button>
  );
}

export type SortOption = "newest" | "price_asc" | "price_desc" | "views";

export function SortDropdown({
  value,
  onChange,
}: {
  value: SortOption;
  onChange: (v: SortOption) => void;
}) {
  return (
    <TextField
      select
      size="small"
      label="Sort by"
      value={value}
      onChange={(e) => onChange(e.target.value as SortOption)}
      sx={{ minWidth: 180 }}
    >
      <MenuItem value="newest">Newest first</MenuItem>
      <MenuItem value="price_asc">Price: Low to High</MenuItem>
      <MenuItem value="price_desc">Price: High to Low</MenuItem>
      <MenuItem value="views">Most viewed</MenuItem>
    </TextField>
  );
}

export { EMPTY_FILTERS as EMPTY_VEHICLE_FILTERS, type FilterState as VehicleFilterValues };
