"use client";

import { useCallback, useState } from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import CircularProgress from "@mui/material/CircularProgress";

import {
  getBuySellSummary,
  getBuySellDailyActivity,
  getBuySellTypeSummary,
  getBuySellStatusSummary,
  getBuySellCategoryPosted,
  getBuySellCategorySold,
  downloadReport,
  type BuySellSummaryReport,
  type BuySellDailyActivityReport,
  type BuySellTypeSummaryReport,
  type BuySellStatusSummaryReport,
  type BuySellCategoryPostedReport,
  type BuySellCategorySoldReport,
  type DownloadType,
} from "@/model/services/report";

import {
  EMPTY_BUYSELL_FILTERS,
  BUYSELL_TABS,
  toBuySellApiFilters,
  type BuySellFilterState,
  type BuySellTab,
} from "./_components/Buyselltypes";

import { BuySellFilters } from "./_components/Buysellfilters";
import {
  BuySellSummaryPanel,
  BuySellDailyActivityPanel,
  BuySellTypeSummaryPanel,
  BuySellStatusSummaryPanel,
  BuySellCategoryPostedPanel,
  BuySellCategorySoldPanel,
} from "./_components/Buysellpanels";
import { ModulePageLayout } from "@/components/common";
import { routes } from "@/lib/routes";

// ─── Report state type ────────────────────────────────────────────────────────

type ReportState = {
  summary:         BuySellSummaryReport | null;
  dailyActivity:   BuySellDailyActivityReport | null;
  typeSummary:     BuySellTypeSummaryReport | null;
  statusSummary:   BuySellStatusSummaryReport | null;
  categoryPosted:  BuySellCategoryPostedReport | null;
  categorySold:    BuySellCategorySoldReport | null;
};

const EMPTY_REPORT: ReportState = {
  summary:        null,
  dailyActivity:  null,
  typeSummary:    null,
  statusSummary:  null,
  categoryPosted: null,
  categorySold:   null,
};

// ─── Page component ───────────────────────────────────────────────────────────

export default function BuySellReportPage() {
  const [filters,     setFilters]     = useState<BuySellFilterState>(EMPTY_BUYSELL_FILTERS);
  const [activeTab,   setActiveTab]   = useState<BuySellTab>("summary");
  const [report,      setReport]      = useState<ReportState>(EMPTY_REPORT);
  const [loading,     setLoading]     = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // ── Fetch all reports in parallel ──────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiFilters = toBuySellApiFilters(filters);
      const [summary, dailyActivity, typeSummary, statusSummary, categoryPosted, categorySold] =
        await Promise.all([
          getBuySellSummary(apiFilters),
          getBuySellDailyActivity(apiFilters),
          getBuySellTypeSummary(apiFilters),
          getBuySellStatusSummary(apiFilters),
          getBuySellCategoryPosted(apiFilters),
          getBuySellCategorySold(apiFilters),
        ]);
      setReport({ summary, dailyActivity, typeSummary, statusSummary, categoryPosted, categorySold });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load report.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // ── Clear ──────────────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    setFilters(EMPTY_BUYSELL_FILTERS);
    setReport(EMPTY_REPORT);
    setError(null);
  }, []);

  // ── Download ───────────────────────────────────────────────────────────────
  const handleDownload = useCallback(async (type: DownloadType) => {
    setDownloading(true);
    try {
      await downloadReport(type, toBuySellApiFilters(filters));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setDownloading(false);
    }
  }, [filters]);

  // ── Render active panel ────────────────────────────────────────────────────
  function renderPanel() {
    if (loading) {
      return (
        <Box sx={{ py: 10, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      );
    }

    switch (activeTab) {
      case "summary":
        return <BuySellSummaryPanel data={report.summary} />;
      case "daily-activity":
        return <BuySellDailyActivityPanel data={report.dailyActivity} />;
      case "type-summary":
        return <BuySellTypeSummaryPanel data={report.typeSummary} />;
      case "status-summary":
        return <BuySellStatusSummaryPanel data={report.statusSummary} />;
      case "category-posted":
        return <BuySellCategoryPostedPanel data={report.categoryPosted} />;
      case "category-sold":
        return <BuySellCategorySoldPanel data={report.categorySold} />;
      default:
        return null;
    }
  }

  return (
    <ModulePageLayout
      title="Buy / Sell Reports"
      subtitle="Marketplace activity, listings, and sales analytics."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Reports", href: routes.reports.list() },
        { label: "Buy / Sell" },
      ]}
      error={error ?? undefined}
      onErrorClose={() => setError(null)}
    >
      {/* ── Filters ── */}
      <BuySellFilters
        filters={filters}
        activeTab={activeTab}
        onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
        onSearch={handleSearch}
        onClear={handleClear}
        onDownload={handleDownload}
        downloading={downloading}
      />

      <Box sx={{ mt: 3, borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={activeTab}
          onChange={(_, v: BuySellTab) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {BUYSELL_TABS.map((t) => (
            <Tab key={t.id} value={t.id} label={t.label} sx={{ fontWeight: 600 }} />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ mt: 3 }}>{renderPanel()}</Box>
    </ModulePageLayout>
  );
}