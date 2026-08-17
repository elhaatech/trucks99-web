"use client";

import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import { FilterCard, FilterFieldItem, FilterTextInput } from "@/components/common";
import type { ReportFilterState } from "../interface/reportTypes";

export interface ReportFiltersProps {
  filters: ReportFilterState;
  onChange: (patch: Partial<ReportFilterState>) => void;
  onSearch: () => void;
  onClear: () => void;
}

export function ReportFilters({ filters, onChange, onSearch, onClear }: ReportFiltersProps) {
  const isClean =
    !filters.dateFrom &&
    !filters.dateTo &&
    !filters.origin &&
    !filters.destination &&
    !filters.truckType &&
    !filters.vehicleType;

  return (
    <FilterCard
      title="Report filters"
      subtitle="Filter all reports by date range, route, or vehicle details."
      onSearch={onSearch}
      onClear={onClear}
      clearDisabled={isClean}
    >
      {/* ── Date From ── native input avoids FilterTextInput type-forwarding issues */}
      <FilterFieldItem>
        <Box sx={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
          <label
            htmlFor="report-date-from"
            style={{ fontSize: "0.75rem", color: "var(--mui-palette-text-secondary, #666)", fontWeight: 500 }}
          >
            Date From
          </label>
          <input
            id="report-date-from"
            type="date"
            value={filters.dateFrom ?? ""}
            max={filters.dateTo || undefined}
            onChange={(e) => onChange({ dateFrom: e.target.value || undefined })}
            style={{
              height: 40,
              padding: "0 12px",
              border: "1px solid rgba(0,0,0,0.23)",
              borderRadius: 4,
              fontSize: "0.875rem",
              fontFamily: "inherit",
              background: "transparent",
              color: "inherit",
              width: "100%",
              boxSizing: "border-box",
              cursor: "pointer",
            }}
          />
        </Box>
      </FilterFieldItem>

      {/* ── Date To ── */}
      <FilterFieldItem>
        <Box sx={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
          <label
            htmlFor="report-date-to"
            style={{ fontSize: "0.75rem", color: "var(--mui-palette-text-secondary, #666)", fontWeight: 500 }}
          >
            Date To
          </label>
          <input
            id="report-date-to"
            type="date"
            value={filters.dateTo ?? ""}
            min={filters.dateFrom || undefined}
            onChange={(e) => onChange({ dateTo: e.target.value || undefined })}
            style={{
              height: 40,
              padding: "0 12px",
              border: "1px solid rgba(0,0,0,0.23)",
              borderRadius: 4,
              fontSize: "0.875rem",
              fontFamily: "inherit",
              background: "transparent",
              color: "inherit",
              width: "100%",
              boxSizing: "border-box",
              cursor: "pointer",
            }}
          />
        </Box>
      </FilterFieldItem>

      {/* <FilterFieldItem>
        <FilterTextInput
          label="Origin"
          value={filters.origin}
          onChange={(v) => onChange({ origin: v })}
          placeholder="e.g. Chennai"
        />
      </FilterFieldItem>

      <FilterFieldItem>
        <FilterTextInput
          label="Destination"
          value={filters.destination}
          onChange={(v) => onChange({ destination: v })}
          placeholder="e.g. Mumbai"
        />
      </FilterFieldItem>

      <FilterFieldItem>
        <FilterTextInput
          label="Truck Type"
          value={filters.truckType}
          onChange={(v) => onChange({ truckType: v })}
          placeholder="e.g. 20ft"
        />
      </FilterFieldItem>

      <FilterFieldItem>
        <FilterTextInput
          label="Vehicle Type"
          value={filters.vehicleType}
          onChange={(v) => onChange({ vehicleType: v })}
          placeholder="e.g. open body"
        />
      </FilterFieldItem> */}
    </FilterCard>
  );
}