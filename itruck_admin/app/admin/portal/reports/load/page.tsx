"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import RefreshIcon from "@mui/icons-material/Refresh";

import { ModulePageLayout } from "@/components/common";
import { routes as appRoutes } from "@/lib/routes";
import { useNotification } from "@/hooks/useNotification";
import { useFilters } from "@/hooks/useFilters";
import {
  getLoadStatusSummary,
  getNoOfferLoads,
  getCancellationSummary,
  getLoadFulfillmentTime,
  getRoutePopularity,
} from "@/model/services/report";
import type {
  LoadStatusSummary,
  NoOfferLoadsReport,
  CancellationSummary,
  FulfillmentTimeReport,
  RoutePopularityReport,
} from "@/model/services/report";

import { ReportFilters } from "../_components/ReportFilters";
import { EMPTY_REPORT_FILTERS, toApiFilters } from "../interface/reportTypes";
import type { ReportFilterState } from "../interface/reportTypes";

import {
  LoadStatusPanel,
  NoOfferPanel,
  CancellationsPanel,
  FulfillmentPanel,
  RoutesPanel,
} from "../_components/Reportpanels";

type LoadTab = "load-status" | "no-offer" | "cancellations" | "fulfillment" | "routes";

const LOAD_TABS: { id: LoadTab; label: string }[] = [
  { id: "load-status",   label: "Load Status"      },
  { id: "no-offer",      label: "No-Offer Loads"   },
  { id: "cancellations", label: "Cancellations"    },
  { id: "fulfillment",   label: "Fulfillment Time" },
  { id: "routes",        label: "Route Popularity" },
];

const LoadReportPage = () => {
  const { notify } = useNotification();
  const { filters, setFiltersPatch, resetFilters } = useFilters(EMPTY_REPORT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<ReportFilterState>(EMPTY_REPORT_FILTERS);
  const [activeTab, setActiveTab] = useState<LoadTab>("load-status");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const [loadStatus,    setLoadStatus]    = useState<LoadStatusSummary | null>(null);
  const [noOffer,       setNoOffer]       = useState<NoOfferLoadsReport | null>(null);
  const [cancellations, setCancellations] = useState<CancellationSummary | null>(null);
  const [fulfillment,   setFulfillment]   = useState<FulfillmentTimeReport | null>(null);
  const [routes,        setRoutes]        = useState<RoutePopularityReport | null>(null);

  const apiFilters = useMemo(() => toApiFilters(appliedFilters), [appliedFilters]);

  const load = useCallback(async (af = apiFilters) => {
    setLoading(true);
    setError("");
    try {
      const [lsRes, noRes, csRes, ffRes, rpRes] = await Promise.allSettled([
        getLoadStatusSummary(af),
        getNoOfferLoads(af),
        getCancellationSummary(af),
        getLoadFulfillmentTime(af),
        getRoutePopularity(af),
      ]);
      if (lsRes.status === "fulfilled") setLoadStatus(lsRes.value);
      if (noRes.status === "fulfilled") setNoOffer(noRes.value);
      if (csRes.status === "fulfilled") setCancellations(csRes.value);
      if (ffRes.status === "fulfilled") setFulfillment(ffRes.value);
      if (rpRes.status === "fulfilled") setRoutes(rpRes.value);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load load reports";
      setError(msg);
      notify({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  }, [apiFilters, notify]);

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handleSearch = useCallback(() => {
    const next = { ...filters };
    setAppliedFilters(next);
    void load(toApiFilters(next));
  }, [filters, load]);

  const handleClear = useCallback(() => {
    resetFilters();
    setAppliedFilters(EMPTY_REPORT_FILTERS);
    void load({});
  }, [load, resetFilters]);

  return (
    <ModulePageLayout
      title="Load Report"
      subtitle="Load status, cancellations, fulfillment times, and route analytics."
      breadcrumbs={[
        { label: "Dashboard", href: appRoutes.dashboard() },
        { label: "Reports", href: appRoutes.reports.list() },
        { label: "Load" },
      ]}
      action={
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          disabled={loading}
          onClick={() => void load(apiFilters)}
        >
          Refresh
        </Button>
      }
      error={error}
      onErrorClose={() => setError("")}
    >
      <ReportFilters
        filters={filters}
        onChange={(patch) => setFiltersPatch(patch)}
        onSearch={handleSearch}
        onClear={handleClear}
      />

      <Box sx={{ borderBottom: 1, borderColor: "divider", mt: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v: LoadTab) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {LOAD_TABS.map((t) => (
            <Tab key={t.id} value={t.id} label={t.label} sx={{ fontSize: "0.8rem" }} />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ pt: 3, pb: 6 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {activeTab === "load-status"   && <LoadStatusPanel    data={loadStatus}    />}
            {activeTab === "no-offer"      && <NoOfferPanel       data={noOffer}       apiFilters={apiFilters} />}
            {activeTab === "cancellations" && <CancellationsPanel data={cancellations} apiFilters={apiFilters} />}
            {activeTab === "fulfillment"   && <FulfillmentPanel   data={fulfillment}   />}
            {activeTab === "routes"        && <RoutesPanel        data={routes}        />}
          </>
        )}
      </Box>
    </ModulePageLayout>
  );
}
export default LoadReportPage;