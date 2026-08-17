"use client";

import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import DownloadIcon from "@mui/icons-material/Download";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import Menu from "@mui/material/Menu";
import ListItemText from "@mui/material/ListItemText";
import { useState, useRef } from "react";

import {
  FilterCard,
  FilterFieldItem,
  FilterTextInput,
  FilterSelectInput,
} from "@/components/common";
import type { BuySellFilterState, BuySellTab } from "./Buyselltypes";
import type { DownloadType } from "@/model/services/report";

export interface BuySellFiltersProps {
  filters:     BuySellFilterState;
  activeTab:   BuySellTab;
  onChange:    (patch: Partial<BuySellFilterState>) => void;
  onSearch:    () => void;
  onClear:     () => void;
  onDownload:  (type: DownloadType) => void;
  downloading: boolean;
}

// ── Per-tab download config ────────────────────────────────────────────────────
// primary  → the main "Download Excel" button action
// extras   → additional options in the split-button dropdown
type DownloadOption = { type: DownloadType; label: string };

const TAB_DOWNLOADS: Record<
  BuySellTab,
  { primary: DownloadOption; extras: DownloadOption[] }
> = {
  "summary": {
    primary: { type: "all-buysell",    label: "All Listings"    },
    extras:  [
      { type: "buy-listings",     label: "Buy Listings"     },
      { type: "sell-listings",    label: "Sell Listings"    },
      { type: "active-buysell",   label: "Active Only"      },
      { type: "inactive-buysell", label: "Inactive Only"    },
    ],
  },
  "daily-activity": {
    primary: { type: "all-buysell",  label: "All Listings"  },
    extras:  [
      { type: "buy-listings",  label: "Buy Listings"  },
      { type: "sell-listings", label: "Sell Listings" },
    ],
  },
  "type-summary": {
    primary: { type: "all-buysell",  label: "All Listings"  },
    extras:  [
      { type: "buy-listings",  label: "Buy Listings"  },
      { type: "sell-listings", label: "Sell Listings" },
    ],
  },
  "status-summary": {
    primary: { type: "active-buysell",   label: "Active Listings"   },
    extras:  [
      { type: "inactive-buysell", label: "Inactive Listings" },
      { type: "all-buysell",      label: "All Listings"      },
    ],
  },
  "category-posted": {
    primary: { type: "buysell-category-posted", label: "Category Posted" },
    extras:  [
      { type: "sell-listings", label: "All Sell Listings" },
      { type: "all-buysell",   label: "All Listings"      },
    ],
  },
  "category-sold": {
    primary: { type: "buysell-category-sold", label: "Category Sold" },
    extras:  [
      { type: "inactive-buysell", label: "Inactive Listings" },
      { type: "all-buysell",      label: "All Listings"      },
    ],
  },
};

// ── Split Download Button ──────────────────────────────────────────────────────
function DownloadButton({
  primary,
  extras,
  downloading,
  onDownload,
}: {
  primary:     DownloadOption;
  extras:      DownloadOption[];
  downloading: boolean;
  onDownload:  (type: DownloadType) => void;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef       = useRef<HTMLDivElement>(null);

  return (
    <Stack direction="row" ref={anchorRef} sx={{ display: "inline-flex" }}>
      {/* Primary action */}
      <Button
        variant="contained"
        size="small"
        startIcon={<DownloadIcon fontSize="small" />}
        disabled={downloading}
        onClick={() => onDownload(primary.type)}
        sx={{
          textTransform: "none",
          fontWeight:    600,
          borderTopRightRadius:    extras.length ? 0 : undefined,
          borderBottomRightRadius: extras.length ? 0 : undefined,
          pr: extras.length ? 1.5 : undefined,
        }}
      >
        {downloading ? "Downloading…" : primary.label}
      </Button>

      {/* Dropdown arrow for extras */}
      {extras.length > 0 && (
        <>
          <Divider orientation="vertical" flexItem sx={{ bgcolor: "primary.dark" }} />
          <Button
            variant="contained"
            size="small"
            disabled={downloading}
            onClick={() => setOpen(true)}
            sx={{
              textTransform:          "none",
              minWidth:               28,
              px:                     0.5,
              borderTopLeftRadius:    0,
              borderBottomLeftRadius: 0,
            }}
          >
            <ArrowDropDownIcon fontSize="small" />
          </Button>

          <Menu
            open={open}
            anchorEl={anchorRef.current}
            onClose={() => setOpen(false)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top",    horizontal: "right" }}
          >
            {extras.map((opt) => (
              <MenuItem
                key={opt.type}
                onClick={() => { setOpen(false); onDownload(opt.type); }}
                dense
              >
                <DownloadIcon fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />
                <ListItemText primary={opt.label} />
              </MenuItem>
            ))}
          </Menu>
        </>
      )}
    </Stack>
  );
}

// ── Main filter component ──────────────────────────────────────────────────────
export function BuySellFilters({
  filters,
  activeTab,
  onChange,
  onSearch,
  onClear,
  onDownload,
  downloading,
}: BuySellFiltersProps) {
  const isClean =
    !filters.dateFrom  &&
    !filters.dateTo    &&
    !filters.user_type &&
    !filters.status    &&
    !filters.search;

  const { primary, extras } = TAB_DOWNLOADS[activeTab] ?? TAB_DOWNLOADS["summary"];

  return (
    <FilterCard
      title="Buy / Sell Filters"
      subtitle="Filter listings by date range, type, status, or keyword."
      onSearch={onSearch}
      onClear={onClear}
      clearDisabled={isClean}
    >
      {/* ── Date From ── */}
      <FilterFieldItem>
        <FilterTextInput
          label="Date From"
          type="date"
          value={filters.dateFrom}
          onChange={(v) => onChange({ dateFrom: v })}
          placeholder="YYYY-MM-DD"
        />
      </FilterFieldItem>

      {/* ── Date To ── */}
      <FilterFieldItem>
        <FilterTextInput
          label="Date To"
          type="date"
          value={filters.dateTo}
          onChange={(v) => onChange({ dateTo: v })}
          placeholder="YYYY-MM-DD"
        />
      </FilterFieldItem>

      {/* ── Type ── */}
      {/* <FilterFieldItem>
        <FilterSelectInput
          label="Type"
          value={filters.user_type}
          onChange={(v) => onChange({ user_type: v })}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="buy">Buy</MenuItem>
          <MenuItem value="sell">Sell</MenuItem>
        </FilterSelectInput>
      </FilterFieldItem> */}

      {/* ── Status ── */}
      {/* <FilterFieldItem>
        <FilterSelectInput
          label="Status"
          value={filters.status}
          onChange={(v) => onChange({ status: v })}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="Active">Active</MenuItem>
          <MenuItem value="Inactive">Inactive</MenuItem>
        </FilterSelectInput>
      </FilterFieldItem> */}

      {/* ── Search ── */}
      <FilterFieldItem>
        <FilterTextInput
          label="Search"
          value={filters.search}
          onChange={(v) => onChange({ search: v })}
          placeholder="Address, pincode…"
        />
      </FilterFieldItem>

      {/* ── Download (split button — right-aligned) ── */}
      {/* <FilterFieldItem sx={{ alignSelf: "flex-end", ml: "auto" }}> */}
        <DownloadButton
          primary={primary}
          extras={extras}
          downloading={downloading}
          onDownload={onDownload}
        />
      {/* </FilterFieldItem> */}
    </FilterCard>
  );
}