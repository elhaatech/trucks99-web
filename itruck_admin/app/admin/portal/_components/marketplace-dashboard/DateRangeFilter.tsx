"use client";

import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import type { DateFilterState } from "@/hooks/useMarketplaceDashboard";
import type { MarketplacePeriod } from "@/model/services/marketplaceDashboard";

const PERIOD_OPTIONS: { value: MarketplacePeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "last_6_months", label: "Last 6 Months" },
  { value: "this_year", label: "This Year" },
  { value: "custom", label: "Custom Range" },
];

const inputSx = {
  height: 40,
  px: 1.5,
  border: "1px solid",
  borderColor: "divider",
  borderRadius: "10px",
  fontSize: 13,
  fontFamily: "inherit",
  bgcolor: "background.paper",
  color: "text.primary",
};

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateFilterState;
  onChange: (next: DateFilterState) => void;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
      <Select
        size="small"
        value={value.period}
        onChange={(e) => {
          const period = e.target.value as MarketplacePeriod;
          if (period === "custom" && !value.dateFrom) {
            const to = new Date();
            const from = new Date();
            from.setDate(from.getDate() - 29);
            onChange({
              period,
              dateFrom: from.toISOString().slice(0, 10),
              dateTo: to.toISOString().slice(0, 10),
            });
            return;
          }
          onChange({ ...value, period });
        }}
        sx={{
          minWidth: 168,
          borderRadius: "10px",
          bgcolor: "background.paper",
          "& .MuiSelect-select": { py: 1, fontWeight: 600, fontSize: 13 },
        }}
      >
        {PERIOD_OPTIONS.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
      {value.period === "custom" ? (
        <>
          <Box
            component="input"
            type="date"
            value={value.dateFrom ?? ""}
            max={value.dateTo || undefined}
            onChange={(e) => onChange({ ...value, dateFrom: e.target.value || undefined })}
            sx={inputSx}
          />
          <Box
            component="input"
            type="date"
            value={value.dateTo ?? ""}
            min={value.dateFrom || undefined}
            onChange={(e) => onChange({ ...value, dateTo: e.target.value || undefined })}
            sx={inputSx}
          />
        </>
      ) : null}
    </Box>
  );
}
