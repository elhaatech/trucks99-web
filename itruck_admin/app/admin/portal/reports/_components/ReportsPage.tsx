"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import RefreshIcon from "@mui/icons-material/Refresh";
import { alpha, useTheme } from "@mui/material/styles";

import { ModulePageLayout } from "@/components/common";
import { AppCard } from "@/components/ui";
import { routes } from "@/lib/routes";
import { useNotification } from "@/hooks/useNotification";
import { useFilters } from "@/hooks/useFilters";
import {
  getOverview,
  getLoadTruckMatching,
  getLoadStatusSummary,
  getTruckStatusSummary,
  getTruckBodyUtilization,
  getLoadFulfillmentTime,
  getRoutePopularity,
  getNoOfferLoads,
  getIdleTrucks,
  getPricingComparison,
  getTopUsers,
  getCancellationSummary,
  getDailyActivity,
  getMaterialDemand,
  getVehicleTypeDemand,
} from "@/model/services/report";
import type {
  OverviewSummary,
  LoadTruckMatchingReport,
  LoadStatusSummary,
  TruckStatusSummary,
  TruckBodyUtilizationReport,
  FulfillmentTimeReport,
  RoutePopularityReport,
  NoOfferLoadsReport,
  IdleTrucksReport,
  PricingComparisonReport,
  TopUsersReport,
  CancellationSummary,
  DailyActivityReport,
  MaterialDemandReport,
  VehicleTypeDemandReport,
} from "@/model/services/report";

import {
  OverviewPanel,
  DailyActivityPanel,
  LoadStatusPanel,
  TruckStatusPanel,
  TruckBodyPanel,
  FulfillmentPanel,
  RoutesPanel,
  NoOfferPanel,
  IdleTrucksPanel,
  PricingPanel,
  TopUsersPanel,
  CancellationsPanel,
  MaterialDemandPanel,
  VehicleDemandPanel,
  LoadTruckMatchingPanel,
} from "./Reportpanels";

import { ReportFilters } from "./ReportFilters";
import type { ReportFilterState, ReportTab } from "../interface/reportTypes";
import { EMPTY_REPORT_FILTERS, REPORT_TABS, toApiFilters } from "../interface/reportTypes";

const GROUP_ORDER = ["Overview", "Loads", "Trucks", "Analytics"] as const;

export function ReportsPage() {
  const theme = useTheme();
  const { notify } = useNotification();
  const { filters, setFiltersPatch, resetFilters } = useFilters(EMPTY_REPORT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<ReportFilterState>(EMPTY_REPORT_FILTERS);
  const [activeTab, setActiveTab] = useState<ReportTab>("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [overview,       setOverview]       = useState<OverviewSummary | null>(null);
  const [dailyActivity,  setDailyActivity]  = useState<DailyActivityReport | null>(null);
  const [loadStatus,     setLoadStatus]     = useState<LoadStatusSummary | null>(null);
  const [truckStatus,    setTruckStatus]    = useState<TruckStatusSummary | null>(null);
  const [truckBody,      setTruckBody]      = useState<TruckBodyUtilizationReport | null>(null);
  const [fulfillment,    setFulfillment]    = useState<FulfillmentTimeReport | null>(null);
  const [routeReport,    setRouteReport]    = useState<RoutePopularityReport | null>(null);
  const [noOffer,        setNoOffer]        = useState<NoOfferLoadsReport | null>(null);
  const [idleTrucks,     setIdleTrucks]     = useState<IdleTrucksReport | null>(null);
  const [pricing,        setPricing]        = useState<PricingComparisonReport | null>(null);
  const [topUsers,       setTopUsers]       = useState<TopUsersReport | null>(null);
  const [cancellations,  setCancellations]  = useState<CancellationSummary | null>(null);
  const [materialDemand, setMaterialDemand] = useState<MaterialDemandReport | null>(null);
  const [vehicleDemand,  setVehicleDemand]  = useState<VehicleTypeDemandReport | null>(null);
  const [loadTruckMatch, setLoadTruckMatch] = useState<LoadTruckMatchingReport | null>(null);

  const apiFilters = useMemo(() => toApiFilters(appliedFilters), [appliedFilters]);

  const loadAllReports = useCallback(
    async (af = apiFilters) => {
      setLoading(true);
      setError("");
      try {
        const [
          ovRes, daRes, lsRes, tsRes, tbRes,
          ffRes, rpRes, noRes, itRes, pcRes,
          tuRes, csRes, mdRes, vdRes, ltmRes,
        ] = await Promise.allSettled([
          getOverview(af),
          getDailyActivity(af),
          getLoadStatusSummary(af),
          getTruckStatusSummary(af),
          getTruckBodyUtilization(af),
          getLoadFulfillmentTime(af),
          getRoutePopularity(af),
          getNoOfferLoads(af),
          getIdleTrucks(af),
          getPricingComparison(af),
          getTopUsers(af),
          getCancellationSummary(af),
          getMaterialDemand(af),
          getVehicleTypeDemand(af),
          getLoadTruckMatching(af),
        ]);

        if (ovRes.status  === "fulfilled") setOverview(ovRes.value.summary);
        if (daRes.status  === "fulfilled") setDailyActivity(daRes.value);
        if (lsRes.status  === "fulfilled") setLoadStatus(lsRes.value);
        if (tsRes.status  === "fulfilled") setTruckStatus(tsRes.value);
        if (tbRes.status  === "fulfilled") setTruckBody(tbRes.value);
        if (ffRes.status  === "fulfilled") setFulfillment(ffRes.value);
        if (rpRes.status  === "fulfilled") setRouteReport(rpRes.value);
        if (noRes.status  === "fulfilled") setNoOffer(noRes.value);
        if (itRes.status  === "fulfilled") setIdleTrucks(itRes.value);
        if (pcRes.status  === "fulfilled") setPricing(pcRes.value);
        if (tuRes.status  === "fulfilled") setTopUsers(tuRes.value);
        if (csRes.status  === "fulfilled") setCancellations(csRes.value);
        if (mdRes.status  === "fulfilled") setMaterialDemand(mdRes.value);
        if (vdRes.status  === "fulfilled") setVehicleDemand(vdRes.value);
        if (ltmRes.status === "fulfilled") setLoadTruckMatch(ltmRes.value);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load reports";
        setError(msg);
        notify({ type: "error", message: msg });
      } finally {
        setLoading(false);
      }
    },
    [apiFilters, notify]
  );

  useEffect(() => {
    void loadAllReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = useCallback(() => {
    const next = { ...filters };
    setAppliedFilters(next);
    void loadAllReports(toApiFilters(next));
  }, [filters, loadAllReports]);

  const handleClear = useCallback(() => {
    resetFilters();
    setAppliedFilters(EMPTY_REPORT_FILTERS);
    void loadAllReports({});
  }, [loadAllReports, resetFilters]);

  const tabsByGroup = useMemo(() => {
    const map = new Map<string, typeof REPORT_TABS>();
    for (const t of REPORT_TABS) {
      if (!map.has(t.group)) map.set(t.group, []);
      map.get(t.group)!.push(t);
    }
    return map;
  }, []);

  const activeTabMeta = REPORT_TABS.find((t) => t.id === activeTab);

  return (
    <ModulePageLayout
      title="Reports & Analytics"
      subtitle="Platform-wide analytics for loads, trucks, pricing and more."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Reports" },
      ]}
      error={error}
      onErrorClose={() => setError("")}
      action={
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          disabled={loading}
          onClick={() => void loadAllReports(apiFilters)}
        >
          Refresh
        </Button>
      }
    >
      <ReportFilters
        filters={filters}
        onChange={(patch) => setFiltersPatch(patch)}
        onSearch={handleSearch}
        onClear={handleClear}
      />

      <AppCard padding={0} sx={{ mt: 3, overflow: "hidden" }}>
        <Box sx={{ px: { xs: 1.5, sm: 2.5 }, pt: 2, pb: 1 }}>
          {GROUP_ORDER.map((group, groupIdx) => {
            const groupTabs = tabsByGroup.get(group) ?? [];
            const hasActive = groupTabs.some((t) => t.id === activeTab);
            return (
              <Box
                key={group}
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                  alignItems: { xs: "stretch", md: "center" },
                  gap: { xs: 0.5, md: 1 },
                  pb: groupIdx < GROUP_ORDER.length - 1 ? 1.5 : 0,
                  mb: groupIdx < GROUP_ORDER.length - 1 ? 1.5 : 0,
                  borderBottom: groupIdx < GROUP_ORDER.length - 1 ? "1px solid" : "none",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="overline"
                  color={hasActive ? "primary.main" : "text.secondary"}
                  sx={{
                    minWidth: { md: 88 },
                    fontWeight: 700,
                    letterSpacing: 1,
                    flexShrink: 0,
                    pt: { xs: 0, md: 0.75 },
                  }}
                >
                  {group}
                </Typography>
                <Tabs
                  value={hasActive ? activeTab : false}
                  onChange={(_, v: ReportTab) => setActiveTab(v)}
                  variant="scrollable"
                  scrollButtons="auto"
                  allowScrollButtonsMobile
                  sx={{
                    minHeight: 40,
                    flex: 1,
                    "& .MuiTab-root": {
                      minHeight: 36,
                      py: 0.75,
                      px: 1.5,
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      textTransform: "none",
                      borderRadius: "8px",
                      mr: 0.5,
                      color: "text.secondary",
                      transition: `background-color ${theme.tokens.transition.fast}, color ${theme.tokens.transition.fast}`,
                      "&.Mui-selected": {
                        color: "primary.main",
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                      },
                    },
                    "& .MuiTabs-indicator": { display: "none" },
                    "& .MuiTabs-flexContainer": { gap: 0.25 },
                  }}
                >
                  {groupTabs.map((t) => (
                    <Tab key={t.id} value={t.id} label={t.label} />
                  ))}
                </Tabs>
              </Box>
            );
          })}
        </Box>
      </AppCard>

      <Box sx={{ mt: 2.5, pb: 4 }}>
        {activeTabMeta ? (
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={700} letterSpacing="-0.01em">
              {activeTabMeta.label}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {activeTabMeta.group} report
            </Typography>
          </Box>
        ) : null}

        {loading ? (
          <AppCard>
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          </AppCard>
        ) : (
          <>
            {activeTab === "overview"         && <OverviewPanel          data={overview}       apiFilters={apiFilters} />}
            {activeTab === "daily-activity"   && <DailyActivityPanel     data={dailyActivity}  />}
            {activeTab === "load-status"      && <LoadStatusPanel        data={loadStatus}     />}
            {activeTab === "truck-status"     && <TruckStatusPanel       data={truckStatus}    />}
            {activeTab === "truck-body"       && <TruckBodyPanel         data={truckBody}      apiFilters={apiFilters} />}
            {activeTab === "fulfillment"      && <FulfillmentPanel       data={fulfillment}    />}
            {activeTab === "routes"           && <RoutesPanel            data={routeReport}      />}
            {activeTab === "no-offer"         && <NoOfferPanel           data={noOffer}        apiFilters={apiFilters} />}
            {activeTab === "idle-trucks"      && <IdleTrucksPanel        data={idleTrucks}     apiFilters={apiFilters} />}
            {activeTab === "pricing"          && <PricingPanel           data={pricing}        />}
            {activeTab === "top-users"        && <TopUsersPanel          data={topUsers}       />}
            {activeTab === "cancellations"    && <CancellationsPanel     data={cancellations}  apiFilters={apiFilters} />}
            {activeTab === "material-demand"  && <MaterialDemandPanel    data={materialDemand} />}
            {activeTab === "vehicle-demand"   && <VehicleDemandPanel     data={vehicleDemand}  />}
            {activeTab === "load-truck-match" && <LoadTruckMatchingPanel data={loadTruckMatch} />}
          </>
        )}
      </Box>
    </ModulePageLayout>
  );
}
