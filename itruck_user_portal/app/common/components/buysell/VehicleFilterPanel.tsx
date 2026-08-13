// "use client";

// import Box from "@mui/material/Box";
// import Button from "@mui/material/Button";
// import Typography from "@mui/material/Typography";
// import TextField from "@mui/material/TextField";
// import Drawer from "@mui/material/Drawer";
// import IconButton from "@mui/material/IconButton";
// import FilterListIcon from "@mui/icons-material/FilterList";
// import CloseIcon from "@mui/icons-material/Close";
// import { SearchableSelect, type SelectOption } from "@/components/common/SearchableSelect";
// import { PRODUCT_THEME as T, INFO, LAYOUT } from "@/lib/theme";
// import { useCategorySubcategories } from "@/hooks/useCategorySubcategories";
// import { CityFilterDropdown } from "./CityFilterDropdown";
// import {
//   EMPTY_FILTERS,
//   type FilterState,
// } from "@/app/admin/portal/buysell/_components/interface/buysell_interface";

// const STATUS_OPTIONS: SelectOption[] = [
//   { value: "", label: "All statuses" },
//   { value: "active", label: "Active" },
//   { value: "draft", label: "Draft" },
//   { value: "pending", label: "Pending" },
//   { value: "inactive", label: "Inactive" },
// ];

// type VehicleFilterPanelProps = {
//   values: FilterState;
//   onChange: (patch: Partial<FilterState>) => void;
//   onApply: () => void;
//   onClear: () => void;
//   mobileOpen?: boolean;
//   onMobileClose?: () => void;
//   applyLoading?: boolean;
// };

// function FilterFields({
//   values,
//   onChange,
//   onApply,
//   onClear,
//   applyLoading = false,
// }: Omit<VehicleFilterPanelProps, "mobileOpen" | "onMobileClose">) {
//   const { categoryOptions, subcategoryOptions } = useCategorySubcategories({
//     categoryId: values.category_id || "",
//   });

//   const numberFieldSx = {
//     "& input": {
//       paddingRight: 3,
//       "-webkit-appearance": "none",
//       "-moz-appearance": "textfield",
//       "&::-webkit-inner-spin-button": {
//         "-webkit-appearance": "none",
//       },
//       "&::-webkit-outer-spin-button": {
//         "-webkit-appearance": "none",
//       },
//     },
//   };

//   return (
//     <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
//       <Typography sx={{ fontWeight: 700, fontSize: 16, color: T.color.textPrimary }}>
//         Filters
//       </Typography>

//       <SearchableSelect
//         label="Category"
//         value={values.category_id}
//         onChange={(v) => onChange({ category_id: v, subcategory_id: "" })}
//         options={categoryOptions}
//         placeholder="All categories"
//       />

//       <SearchableSelect
//         label="Subcategory"
//         value={values.subcategory_id}
//         disabled={!values.category_id}
//         onChange={(v) => onChange({ subcategory_id: v })}
//         options={subcategoryOptions}
//         placeholder="All subcategories"
//       />

//       <CityFilterDropdown
//         label="City"
//         value={values.city_id}
//         onChange={(v) => onChange({ city_id: v })}
//         placeholder="All cities"
//       />

//       <SearchableSelect
//         label="Status"
//         value={values.status}
//         onChange={(v) => onChange({ status: v })}
//         options={STATUS_OPTIONS}
//         placeholder="All statuses"
//       />

//       <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
//         <TextField
//           size="small"
//           label="Min price"
//           type="number"
//           value={values.min_price}
//           onChange={(e) => onChange({ min_price: e.target.value })}
//           InputProps={{ sx: numberFieldSx }}
//         />
//         <TextField
//           size="small"
//           label="Max price"
//           type="number"
//           value={values.max_price}
//           onChange={(e) => onChange({ max_price: e.target.value })}
//           InputProps={{ sx: numberFieldSx }}
//         />
//       </Box>

//      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
//   <TextField
//     size="small"
//     label="Max owners"
//     type="number"
//     value={values.no_of_owners_max}
//     onChange={(e) => onChange({ no_of_owners_max: e.target.value })}
//     InputProps={{ sx: numberFieldSx }}
//   />
//   <TextField
//     size="small"
//     label="Max KM"
//     type="number"
//     value={values.km_max}
//     onChange={(e) => onChange({ km_max: e.target.value })}
//     InputProps={{ sx: numberFieldSx }}
//   />
// </Box>
//       <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
//         <TextField
//           size="small"
//           label="Min year"
//           type="number"
//           value={values.make_year_min}
//           onChange={(e) => onChange({ make_year_min: e.target.value })}
//           InputProps={{ sx: numberFieldSx }}
//         />
//         <TextField
//           size="small"
//           label="Max year"
//           type="number"
//           value={values.make_year_max}
//           onChange={(e) => onChange({ make_year_max: e.target.value })}
//           InputProps={{ sx: numberFieldSx }}
//         />
//       </Box>

     

//       <Button
//         variant="contained"
//         onClick={onApply}
//         disabled={applyLoading}
//         sx={{ bgcolor: INFO }}
//       >
//         {applyLoading ? "Applying…" : "Apply Filters"}
//       </Button>
//       <Button variant="outlined" onClick={onClear} disabled={applyLoading}>
//         Clear All
//       </Button>
//     </Box>
//   );
// }

// export function VehicleFilterPanel(props: VehicleFilterPanelProps) {
//   const { mobileOpen, onMobileClose, applyLoading, ...fieldProps } = props;

//   return (
//     <>
//       <Box
//         sx={{
//           display: { xs: "none", lg: "block" },
//           p: 2.5,
//           borderRadius: T.radius.lg,
//           border: `1px solid ${T.color.border}`,
//           bgcolor: T.color.surface,
//           position: "sticky",
//           top: LAYOUT.navbarHeight,
//           alignSelf: "start",
//           overflow: "hidden",
//         }}
//       >
//         <FilterFields {...fieldProps} applyLoading={applyLoading} />
//       </Box>

//       {/* Keep drawer mounted but only mount FilterFields when open to avoid duplicate category fetches */}
//       <Drawer
//         anchor="left"
//         open={!!mobileOpen}
//         onClose={onMobileClose}
//         sx={{ display: { lg: "none" } }}
//         keepMounted={false}
//       >
//         <Box sx={{ width: 300, p: 2.5 }}>
//           <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
//             <Typography fontWeight={700}>Filters</Typography>
//             <IconButton onClick={onMobileClose} aria-label="Close filters">
//               <CloseIcon />
//             </IconButton>
//           </Box>
//           {mobileOpen ? <FilterFields {...fieldProps} applyLoading={applyLoading} /> : null}
//         </Box>
//       </Drawer>
//     </>
//   );
// }

// export function MobileFilterButton({ onClick }: { onClick: () => void }) {
//   return (
//     <Button
//       variant="outlined"
//       startIcon={<FilterListIcon />}
//       onClick={onClick}
//       sx={{ display: { lg: "none" } }}
//     >
//       Filters
//     </Button>
//   );
// }

// export type SortOption = "newest" | "price_asc" | "price_desc" | "views";

// export function SortDropdown({
//   value,
//   onChange,
// }: {
//   value: SortOption;
//   onChange: (v: SortOption) => void;
// }) {
//   const sortOptions: SelectOption[] = [
//     { value: "newest", label: "Newest first" },
//     { value: "price_asc", label: "Price: Low to High" },
//     { value: "price_desc", label: "Price: High to Low" },
//     { value: "views", label: "Most viewed" },
//   ];

//   return (
//     <SearchableSelect
//       label="Sort by"
//       value={value}
//       onChange={(v) => onChange(v as SortOption)}
//       options={sortOptions}
//       sx={{ minWidth: 180 }}
//     />
//   );
// }

// export { EMPTY_FILTERS as EMPTY_VEHICLE_FILTERS, type FilterState as VehicleFilterValues };


"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import FilterListIcon from "@mui/icons-material/FilterList";
import CloseIcon from "@mui/icons-material/Close";
import { SearchableSelect, type SelectOption } from "@/components/common/SearchableSelect";
import { PRODUCT_THEME as T, INFO, LAYOUT } from "@/lib/theme";
import { useCategorySubcategories } from "@/hooks/useCategorySubcategories";
import { CityFilterDropdown } from "./CityFilterDropdown";
import {
  EMPTY_FILTERS,
  type FilterState,
} from "@/app/admin/portal/buysell/_components/interface/buysell_interface";

const STATUS_OPTIONS: SelectOption[] = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "inactive", label: "Inactive" },
];

type VehicleFilterPanelProps = {
  values: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onApply: () => void;
  onClear: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  applyLoading?: boolean;
};

function FilterFields({
  values,
  onChange,
  onApply,
  onClear,
  applyLoading = false,
}: Omit<VehicleFilterPanelProps, "mobileOpen" | "onMobileClose">) {
  const { categoryOptions, subcategoryOptions } = useCategorySubcategories({
    categoryId: values.category_id || "",
  });

  // NOTE: MUI's sx/CSS-in-JS needs camelCase, not kebab-case.
  // "-webkit-appearance" -> WebkitAppearance, "-moz-appearance" -> MozAppearance
  const numberFieldSx = {
    "& input": {
      paddingRight: 3,
      WebkitAppearance: "none",
      MozAppearance: "textfield",
      "&::-webkit-inner-spin-button": {
        WebkitAppearance: "none",
      },
      "&::-webkit-outer-spin-button": {
        WebkitAppearance: "none",
      },
    },
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography sx={{ fontWeight: 700, fontSize: 16, color: T.color.textPrimary }}>
        Filters
      </Typography>

      <SearchableSelect
        label="Category"
        value={values.category_id}
        onChange={(v) => onChange({ category_id: v, subcategory_id: "" })}
        options={categoryOptions}
        placeholder="All categories"
      />

      <SearchableSelect
        label="Subcategory"
        value={values.subcategory_id}
        disabled={!values.category_id}
        onChange={(v) => onChange({ subcategory_id: v })}
        options={subcategoryOptions}
        placeholder="All subcategories"
      />

      <CityFilterDropdown
        label="City"
        value={values.city_id}
        onChange={(v) => onChange({ city_id: v })}
        placeholder="All cities"
      />

      <SearchableSelect
        label="Status"
        value={values.status}
        onChange={(v) => onChange({ status: v })}
        options={STATUS_OPTIONS}
        placeholder="All statuses"
      />

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
        <TextField
          size="small"
          label="Min price"
          type="number"
          value={values.min_price}
          onChange={(e) => onChange({ min_price: e.target.value })}
          slotProps={{ input: { sx: numberFieldSx } }}
        />
        <TextField
          size="small"
          label="Max price"
          type="number"
          value={values.max_price}
          onChange={(e) => onChange({ max_price: e.target.value })}
          slotProps={{ input: { sx: numberFieldSx } }}
        />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
        <TextField
          size="small"
          label="Max owners"
          type="number"
          value={values.no_of_owners_max}
          onChange={(e) => onChange({ no_of_owners_max: e.target.value })}
          slotProps={{ input: { sx: numberFieldSx } }}
        />
        <TextField
          size="small"
          label="Max KM"
          type="number"
          value={values.km_max}
          onChange={(e) => onChange({ km_max: e.target.value })}
          slotProps={{ input: { sx: numberFieldSx } }}
        />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
        <TextField
          size="small"
          label="Min year"
          type="number"
          value={values.make_year_min}
          onChange={(e) => onChange({ make_year_min: e.target.value })}
          slotProps={{ input: { sx: numberFieldSx } }}
        />
        <TextField
          size="small"
          label="Max year"
          type="number"
          value={values.make_year_max}
          onChange={(e) => onChange({ make_year_max: e.target.value })}
          slotProps={{ input: { sx: numberFieldSx } }}
        />
      </Box>

      <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
        <Button
          variant="contained"
          size="small"
          onClick={onApply}
          disabled={applyLoading}
          sx={{
            bgcolor: INFO,
            flex: 1,
            whiteSpace: "nowrap",
            textTransform: "none",
            fontSize: 13,
            fontWeight: 600,
            px: 1,
            py: 0.75,
          }}
        >
          {applyLoading ? "Applying…" : "Apply Filters"}
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={onClear}
          disabled={applyLoading}
          sx={{
            flex: 1,
            whiteSpace: "nowrap",
            textTransform: "none",
            fontSize: 13,
            fontWeight: 600,
            px: 1,
            py: 0.75,
          }}
        >
          Clear All
        </Button>
      </Box>
    </Box>
  );
}

export function VehicleFilterPanel(props: VehicleFilterPanelProps) {
  const { mobileOpen, onMobileClose, applyLoading, ...fieldProps } = props;

  return (
    <>
      <Box
        sx={{
          display: { xs: "none", lg: "block" },
          p: 2.5,
          borderRadius: T.radius.lg,
          border: `1px solid ${T.color.border}`,
          bgcolor: T.color.surface,
          // The parent page now owns the scroll container for this pane
          // (see UserProductListContent / SellVehiclePage), so this panel
          // just sits at the top of it instead of double-stickying.
          alignSelf: "start",
        }}
      >
        <FilterFields {...fieldProps} applyLoading={applyLoading} />
      </Box>

      {/* Keep drawer mounted but only mount FilterFields when open to avoid duplicate category fetches */}
      <Drawer
        anchor="left"
        open={!!mobileOpen}
        onClose={onMobileClose}
        sx={{ display: { lg: "none" } }}
        keepMounted={false}
      >
        <Box sx={{ width: 300, p: 2.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Typography fontWeight={700}>Filters</Typography>
            <IconButton onClick={onMobileClose} aria-label="Close filters">
              <CloseIcon />
            </IconButton>
          </Box>
          {mobileOpen ? <FilterFields {...fieldProps} applyLoading={applyLoading} /> : null}
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
  const sortOptions: SelectOption[] = [
    { value: "newest", label: "Newest first" },
    { value: "price_asc", label: "Price: Low to High" },
    { value: "price_desc", label: "Price: High to Low" },
    { value: "views", label: "Most viewed" },
  ];

  return (
    <SearchableSelect
      label="Sort by"
      value={value}
      onChange={(v) => onChange(v as SortOption)}
      options={sortOptions}
      sx={{ minWidth: 180 }}
    />
  );
}

export { EMPTY_FILTERS as EMPTY_VEHICLE_FILTERS, type FilterState as VehicleFilterValues };
