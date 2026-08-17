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
  getTruckStatusSummary,
  getTruckBodyUtilization,
  getIdleTrucks,
} from "@/model/services/report";
import type {
  TruckStatusSummary,
  TruckBodyUtilizationReport,
  IdleTrucksReport,
} from "@/model/services/report";

import { ReportFilters } from "../_components/ReportFilters";
import { EMPTY_REPORT_FILTERS, toApiFilters } from "../interface/reportTypes";
import type { ReportFilterState } from "../interface/reportTypes";

import { TruckStatusPanel, TruckBodyPanel, IdleTrucksPanel } from "../_components/Reportpanels";

type TruckTab = "truck-status" | "truck-body" | "idle-trucks";

const TRUCK_TABS: { id: TruckTab; label: string }[] = [
  { id: "truck-status", label: "Truck Status"      },
  { id: "truck-body",   label: "Body Utilization"  },
  { id: "idle-trucks",  label: "Idle Trucks"       },
];

const TruckReportPage = () => {
  const { notify } = useNotification();
  const { filters, setFiltersPatch, resetFilters } = useFilters(EMPTY_REPORT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<ReportFilterState>(EMPTY_REPORT_FILTERS);
  const [activeTab, setActiveTab] = useState<TruckTab>("truck-status");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const [truckStatus, setTruckStatus] = useState<TruckStatusSummary | null>(null);
  const [truckBody,   setTruckBody]   = useState<TruckBodyUtilizationReport | null>(null);
  const [idleTrucks,  setIdleTrucks]  = useState<IdleTrucksReport | null>(null);

  const apiFilters = useMemo(() => toApiFilters(appliedFilters), [appliedFilters]);

  const load = useCallback(async (af = apiFilters) => {
    setLoading(true);
    setError("");
    try {
      const [tsRes, tbRes, itRes] = await Promise.allSettled([
        getTruckStatusSummary(af),
        getTruckBodyUtilization(af),
        getIdleTrucks(af),
      ]);
      if (tsRes.status === "fulfilled") setTruckStatus(tsRes.value);
      if (tbRes.status === "fulfilled") setTruckBody(tbRes.value);
      if (itRes.status === "fulfilled") setIdleTrucks(itRes.value);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load truck reports";
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
      title="Truck Report"
      subtitle="Status, body utilization, and idle truck analytics."
      breadcrumbs={[
        { label: "Dashboard", href: appRoutes.dashboard() },
        { label: "Reports", href: appRoutes.reports.list() },
        { label: "Truck" },
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
          onChange={(_, v: TruckTab) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {TRUCK_TABS.map((t) => (
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
            {activeTab === "truck-status" && <TruckStatusPanel data={truckStatus} />}
            {activeTab === "truck-body"   && <TruckBodyPanel   data={truckBody}   apiFilters={apiFilters} />}
            {activeTab === "idle-trucks"  && <IdleTrucksPanel  data={idleTrucks}  apiFilters={apiFilters} />}
          </>
        )}
      </Box>
    </ModulePageLayout>
  );
}
export default TruckReportPage;