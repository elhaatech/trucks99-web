"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import DownloadIcon from "@mui/icons-material/Download";
import { alpha, useTheme } from "@mui/material/styles";

import { ViewPageSection } from "@/components/common";
import { StatCard } from "@/components/ui";
import type { StatCardProps } from "@/components/ui";
import { useNotification } from "@/hooks/useNotification";
import { downloadReport } from "@/model/services/report";
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
  DownloadType,
} from "@/model/services/report";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function fmt(n: number) {
  return new Intl.NumberFormat("en-IN").format(n);
}

export function fmtCurr(n: number) {
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}`;
}

const STATUS_COLORS: Record<string, string> = {
  pending:        "#f59e0b",
  assigned:       "#3b82f6",
  accepted:       "#8b5cf6",
  delivered:      "#10b981",
  cancelled:      "#ef4444",
  rejected:       "#ef4444",
  available:      "#10b981",
  inactive:       "#6b7280",
  "half body":    "#f59e0b",
  "empty body":   "#6b7280",
  "return truck": "#8b5cf6",
  "full load":    "#10b981",
};

function colorToAccent(color?: string): StatCardProps["accent"] {
  if (!color) return "primary";
  if (color.includes("f59e0b")) return "warning";
  if (color.includes("3b82f6")) return "info";
  if (color.includes("10b981")) return "success";
  if (color.includes("ef4444")) return "warning";
  if (color.includes("8b5cf6")) return "secondary";
  if (color.includes("6b7280")) return "secondary";
  return "primary";
}

function StatGrid({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(2, minmax(0, 1fr))",
          sm: "repeat(3, minmax(0, 1fr))",
          md: "repeat(4, minmax(0, 1fr))",
          lg: "repeat(6, minmax(0, 1fr))",
        },
        gap: 2,
      }}
    >
      {children}
    </Box>
  );
}

// ─── KPI Card (StatCard wrapper) ──────────────────────────────────────────────

export function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <StatCard
      title={label}
      value={value}
      subtitle={sub}
      accent={colorToAccent(color)}
    />
  );
}

// ─── Simple Table ─────────────────────────────────────────────────────────────

export function SimpleTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number | React.ReactNode)[][];
}) {
  const theme = useTheme();
  return (
    <TableContainer
      sx={{
        mt: 1,
        borderRadius: "10px",
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
            {headers.map((h) => (
              <TableCell
                key={h}
                sx={{
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  color: "text.secondary",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={headers.length} align="center" sx={{ py: 5, color: "text.secondary" }}>
                No data available
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, i) => (
              <TableRow
                key={i}
                hover
                sx={{
                  "&:nth-of-type(even)": { bgcolor: alpha(theme.palette.background.default, 0.5) },
                  "&:last-child td": { borderBottom: 0 },
                }}
              >
                {row.map((cell, j) => (
                  <TableCell key={j} sx={{ fontSize: "0.875rem" }}>
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ─── Download Button ──────────────────────────────────────────────────────────

export function DownloadBtn({
  label,
  type,
  filters,
}: {
  label: string;
  type: DownloadType;
  filters: object;
}) {
  const { notify } = useNotification();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await downloadReport(type, filters as never);
      notify({ type: "success", message: `${label} downloaded.` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Failed to download ${label}`;
      notify({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="small"
      variant="outlined"
      startIcon={loading ? <CircularProgress size={14} /> : <DownloadIcon />}
      disabled={loading}
      onClick={handleClick}
      sx={{ mr: 1, mb: 1 }}
    >
      {label}
    </Button>
  );
}

function ReportSection({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <ViewPageSection
      title={title}
      action={actions ? <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end" }}>{actions}</Box> : undefined}
    >
      {children}
    </ViewPageSection>
  );
}

// ─── Overview Panel ───────────────────────────────────────────────────────────

export function OverviewPanel({ data, apiFilters }: { data: OverviewSummary | null; apiFilters: object }) {
  if (!data) return null;
  const { loads, trucks, pricing } = data;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <ReportSection
        title="Load KPIs"
        actions={
          <>
            <DownloadBtn label="All Loads"  type="all-loads"       filters={apiFilters} />
            <DownloadBtn label="Pending"    type="pending-loads"   filters={apiFilters} />
            <DownloadBtn label="Assigned"   type="assigned-loads"  filters={apiFilters} />
            <DownloadBtn label="Delivered"  type="delivered-loads" filters={apiFilters} />
            <DownloadBtn label="Cancelled"  type="cancelled-loads" filters={apiFilters} />
          </>
        }
      >
        <StatGrid>
          {[
            { label: "Total Loads", value: fmt(loads.total) },
            { label: "Pending",     value: fmt(loads.pending),   color: "#f59e0b" },
            { label: "Assigned",    value: fmt(loads.assigned),  color: "#3b82f6" },
            { label: "Delivered",   value: fmt(loads.delivered), color: "#10b981" },
            { label: "Cancelled",   value: fmt(loads.cancelled), color: "#ef4444" },
            { label: "Match Rate",  value: loads.matchRate },
          ].map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </StatGrid>
      </ReportSection>

      <ReportSection
        title="Truck KPIs"
        actions={
          <>
            <DownloadBtn label="All Trucks"       type="all-trucks"         filters={apiFilters} />
            <DownloadBtn label="Available Trucks" type="available-trucks"   filters={apiFilters} />
            <DownloadBtn label="Half Body"        type="half-body-loads"    filters={apiFilters} />
            <DownloadBtn label="Return Truck"     type="return-truck-loads" filters={apiFilters} />
          </>
        }
      >
        <StatGrid>
          {[
            { label: "Total Trucks",       value: fmt(trucks.total)                                 },
            { label: "Available",          value: fmt(trucks.available),        color: "#10b981"    },
            { label: "Half Body Loads",    value: fmt(trucks.halfBodyLoads),    color: "#f59e0b"    },
            { label: "Return Truck Loads", value: fmt(trucks.returnTruckLoads), color: "#8b5cf6"    },
            { label: "Empty Body Loads",   value: fmt(trucks.emptyBodyLoads),   color: "#6b7280"    },
          ].map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </StatGrid>
      </ReportSection>

      <ReportSection title="Revenue">
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
            gap: 2,
          }}
        >
          <KpiCard label="Total Revenue"    value={fmtCurr(pricing.totalRevenue)}    color="#10b981" />
          <KpiCard label="Avg Price / Load" value={fmtCurr(pricing.avgPricePerLoad)} />
        </Box>
      </ReportSection>
    </Box>
  );
}

// ─── Daily Activity Panel ─────────────────────────────────────────────────────

export function DailyActivityPanel({ data }: { data: DailyActivityReport | null }) {
  if (!data) return null;
  const { summary, rows } = data;
  return (
    <Box>
      <StatGrid>
        {[
          { label: "Total Created",   value: fmt(summary.totalCreated)                        },
          { label: "Total Delivered", value: fmt(summary.totalDelivered), color: "#10b981"    },
          { label: "Total Cancelled", value: fmt(summary.totalCancelled), color: "#ef4444"    },
          { label: "Total Revenue",   value: fmtCurr(summary.totalRevenue), color: "#10b981"  },
        ].map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </StatGrid>
      <ReportSection title="Daily Breakdown">
        <SimpleTable
          headers={["Date", "Created", "Assigned", "Accepted", "Delivered", "Cancelled", "Revenue"]}
          rows={rows.map((r) => [
            r.date, r.created, r.assigned, r.accepted,
            r.delivered, r.cancelled, fmtCurr(r.totalRevenue),
          ])}
        />
      </ReportSection>
    </Box>
  );
}

// ─── Load Status Panel ────────────────────────────────────────────────────────

export function LoadStatusPanel({ data }: { data: LoadStatusSummary | null }) {
  if (!data) return null;
  return (
    <Box>
      <Box sx={{ maxWidth: 240, mb: 2 }}>
        <KpiCard label="Total Loads" value={fmt(data.summary.total)} />
      </Box>
      <ReportSection title="By Status">
        <SimpleTable
          headers={["Status", "Count", "Share"]}
          rows={data.rows.map((r) => [
            <Chip key={r.status} label={r.status} size="small"
              sx={{ bgcolor: STATUS_COLORS[r.status] ?? "#6b7280", color: "#fff", fontWeight: 600 }} />,
            fmt(r.count),
            data.summary.total ? `${((r.count / data.summary.total) * 100).toFixed(1)}%` : "—",
          ])}
        />
      </ReportSection>
    </Box>
  );
}

// ─── Truck Status Panel ───────────────────────────────────────────────────────

export function TruckStatusPanel({ data }: { data: TruckStatusSummary | null }) {
  if (!data) return null;
  return (
    <Box>
      <Box sx={{ maxWidth: 240, mb: 2 }}>
        <KpiCard label="Total Trucks" value={fmt(data.summary.total)} />
      </Box>
      <ReportSection title="By Status">
        <SimpleTable
          headers={["Status", "Count", "Share"]}
          rows={data.rows.map((r) => [
            <Chip key={r.status} label={r.status || "unknown"} size="small"
              sx={{ bgcolor: STATUS_COLORS[r.status] ?? "#6b7280", color: "#fff", fontWeight: 600 }} />,
            fmt(r.count),
            data.summary.total ? `${((r.count / data.summary.total) * 100).toFixed(1)}%` : "—",
          ])}
        />
      </ReportSection>
    </Box>
  );
}

// ─── Truck Body Panel ─────────────────────────────────────────────────────────

export function TruckBodyPanel({ data, apiFilters }: { data: TruckBodyUtilizationReport | null; apiFilters: object }) {
  if (!data) return null;
  const total = data.rows.reduce((s, r) => s + r.count, 0);
  return (
    <ReportSection
      title="Truck Body Utilization"
      actions={
        <>
          <DownloadBtn label="Half Body Loads"    type="half-body-loads"    filters={apiFilters} />
          <DownloadBtn label="Return Truck Loads" type="return-truck-loads" filters={apiFilters} />
        </>
      }
    >
      <SimpleTable
        headers={["Truck Body Type", "Count", "Share"]}
        rows={data.rows.map((r) => [
          r.truckBodyType,
          fmt(r.count),
          total ? `${((r.count / total) * 100).toFixed(1)}%` : "—",
        ])}
      />
    </ReportSection>
  );
}

// ─── Fulfillment Panel ────────────────────────────────────────────────────────

export function FulfillmentPanel({ data }: { data: FulfillmentTimeReport | null }) {
  if (!data) return null;
  return (
    <ReportSection title="Fulfillment Time by Route">
      <SimpleTable
        headers={["Route", "Loads", "Avg (hrs)", "Min (hrs)", "Max (hrs)"]}
        rows={data.rows.map((r) => [r.route, r.count, r.avgFulfillmentHours, r.minHours, r.maxHours])}
      />
    </ReportSection>
  );
}

// ─── Routes Panel ─────────────────────────────────────────────────────────────

export function RoutesPanel({ data }: { data: RoutePopularityReport | null }) {
  if (!data) return null;
  return (
    <ReportSection title="Route Popularity">
      <SimpleTable
        headers={["Route", "Total Loads", "Avg Price", "Delivered", "Cancelled"]}
        rows={data.rows.map((r) => [
          r.route, fmt(r.totalLoads), fmtCurr(r.avgPrice), r.deliveredCount, r.cancelledCount,
        ])}
      />
    </ReportSection>
  );
}

// ─── No Offer Panel ───────────────────────────────────────────────────────────

export function NoOfferPanel({ data, apiFilters }: { data: NoOfferLoadsReport | null; apiFilters: object }) {
  if (!data) return null;
  return (
    <ReportSection
      title="Loads Without Offers"
      actions={<DownloadBtn label="Pending Loads CSV" type="pending-loads" filters={apiFilters} />}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Total unassigned: <strong>{fmt(data.total)}</strong>
      </Typography>
      <SimpleTable
        headers={["Load #", "Route", "Truck Type", "Body Type", "Price", "Weight", "Pending (hrs)"]}
        rows={data.rows.map((r) => [
          r.loadNumber ?? r.loadId,
          r.route,
          r.truckType ?? "—",
          r.truckBodyType ?? "—",
          r.price != null ? fmtCurr(r.price) : "—",
          r.weight ?? "—",
          r.hoursPending,
        ])}
      />
    </ReportSection>
  );
}

// ─── Idle Trucks Panel ────────────────────────────────────────────────────────

export function IdleTrucksPanel({ data, apiFilters }: { data: IdleTrucksReport | null; apiFilters: object }) {
  if (!data) return null;
  return (
    <ReportSection
      title="Idle Trucks"
      actions={<DownloadBtn label="Available Trucks CSV" type="available-trucks" filters={apiFilters} />}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Total idle: <strong>{fmt(data.total)}</strong>
      </Typography>
      <SimpleTable
        headers={["Reg. Number", "Truck Type", "Capacity", "Body Type", "Location", "Idle (hrs)"]}
        rows={data.rows.map((r) => [
          r.registrationNumber,
          r.truckType,
          r.capacity,
          r.truckBodyType ?? "—",
          r.currentLocation ?? "—",
          r.idleHours,
        ])}
      />
    </ReportSection>
  );
}

// ─── Pricing Panel ────────────────────────────────────────────────────────────

export function PricingPanel({ data }: { data: PricingComparisonReport | null }) {
  if (!data) return null;
  return (
    <ReportSection title="Pricing Comparison">
      <SimpleTable
        headers={["Body Type", "Avg Price", "Min", "Max", "Loads", "Discount vs Full"]}
        rows={data.rows.map((r) => [
          r.truckBodyType, fmtCurr(r.avgPrice), fmtCurr(r.minPrice),
          fmtCurr(r.maxPrice), fmt(r.count), r.discountVsFullLoad,
        ])}
      />
    </ReportSection>
  );
}

// ─── Top Users Panel ──────────────────────────────────────────────────────────

export function TopUsersPanel({ data }: { data: TopUsersReport | null }) {
  if (!data) return null;
  return (
    <ReportSection title="Top Users">
      <SimpleTable
        headers={["Name", "Company", "Mobile", "Loads Posted", "Total Value", "Delivered", "Cancelled"]}
        rows={data.rows.map((r) => [
          r.name, r.company ?? "—", r.mobile ?? "—",
          fmt(r.loadsPosted), fmtCurr(r.totalValue), r.deliveredCount, r.cancelledCount,
        ])}
      />
    </ReportSection>
  );
}

// ─── Cancellations Panel ──────────────────────────────────────────────────────

export function CancellationsPanel({ data, apiFilters }: { data: CancellationSummary | null; apiFilters: object }) {
  if (!data) return null;
  return (
    <Box>
      <Box sx={{ maxWidth: 280, mb: 2 }}>
        <KpiCard label="Total Cancellations" value={fmt(data.summary.totalCancellations)} color="#ef4444" />
      </Box>
      <ReportSection
        title="By Reason"
        actions={<DownloadBtn label="Cancelled Loads CSV" type="cancelled-loads" filters={apiFilters} />}
      >
        <SimpleTable
          headers={["Reason", "Count"]}
          rows={data.byReason.map((r) => [r.reason, r.count])}
        />
      </ReportSection>
      <ReportSection title="By Day">
        <SimpleTable
          headers={["Date", "Cancellations"]}
          rows={data.byDay.map((r) => [r.date, r.count])}
        />
      </ReportSection>
    </Box>
  );
}

// ─── Material Demand Panel ────────────────────────────────────────────────────

export function MaterialDemandPanel({ data }: { data: MaterialDemandReport | null }) {
  if (!data) return null;
  return (
    <ReportSection title="Material Demand">
      <SimpleTable
        headers={["Material", "Loads", "Avg Price", "Delivered"]}
        rows={data.rows.map((r) => [r.material, fmt(r.count), fmtCurr(r.avgPrice), r.deliveredCount])}
      />
    </ReportSection>
  );
}

// ─── Vehicle Demand Panel ─────────────────────────────────────────────────────

export function VehicleDemandPanel({ data }: { data: VehicleTypeDemandReport | null }) {
  if (!data) return null;
  return (
    <ReportSection title="Vehicle Type Demand">
      <SimpleTable
        headers={["Vehicle Type", "Loads", "Avg Price", "Delivered", "Cancelled"]}
        rows={data.rows.map((r) => [
          r.vehicleType, fmt(r.count), fmtCurr(r.avgPrice), r.deliveredCount, r.cancelledCount,
        ])}
      />
    </ReportSection>
  );
}

// ─── Load Truck Matching Panel ────────────────────────────────────────────────

export function LoadTruckMatchingPanel({ data }: { data: LoadTruckMatchingReport | null }) {
  if (!data) return null;
  const { summary, rows } = data;
  return (
    <Box>
      <StatGrid>
        {[
          { label: "Total Loads",   value: fmt(summary.totalLoads)   },
          { label: "Matched Loads", value: fmt(summary.totalMatched), color: "#10b981" },
          { label: "Match Rate",    value: summary.matchRate         },
        ].map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </StatGrid>
      <ReportSection title="Daily Matching">
        <SimpleTable
          headers={["Date", "Loads Created", "Trucks Available", "Matched"]}
          rows={rows.map((r) => [r.date, r.loadsCreated, r.trucksAvailable, r.matchedLoads])}
        />
      </ReportSection>
    </Box>
  );
}
