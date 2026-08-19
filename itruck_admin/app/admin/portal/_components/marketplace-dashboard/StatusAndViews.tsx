"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { alpha, useTheme } from "@mui/material/styles";
import { CHART_COLORS, DASHBOARD_ACCENTS, NEUTRAL } from "@/lib/theme";
import { EmptyState } from "@/components/ui";
import { formatCount, type ProductStatusResponse, type ProductViewsRange, type ProductViewsResponse } from "@/model/services/marketplaceDashboard";
import { PanelCard, SectionError, ToggleGroup } from "./shared";

const VIEWS_OPTIONS: { value: ProductViewsRange; label: string }[] = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "3m", label: "3 Months" },
  { value: "6m", label: "6 Months" },
  { value: "1y", label: "1 Year" },
];

function ChartSkeleton({ height = 280 }: { height?: number }) {
  return <Skeleton variant="rounded" height={height} sx={{ borderRadius: "12px" }} />;
}

export function StatusAndViews({
  status,
  statusLoading,
  statusError,
  views,
  viewsLoading,
  viewsError,
  viewsRange,
  onViewsRangeChange,
}: {
  status: ProductStatusResponse | null;
  statusLoading: boolean;
  statusError: string | null;
  views: ProductViewsResponse | null;
  viewsLoading: boolean;
  viewsError: string | null;
  viewsRange: ProductViewsRange;
  onViewsRangeChange: (range: ProductViewsRange) => void;
}) {
  const theme = useTheme();
  const tooltipStyle = {
    borderRadius: 12,
    border: "none",
    boxShadow: theme.tokens.shadow.lg,
    fontSize: 13,
  };

  const pieData = (status?.statuses ?? []).filter((row) => row.count > 0);
  const viewsTrend = views?.trend ?? [];
  const hasViews = viewsTrend.some((row) => row.views > 0);

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2.5, mb: 3 }}>
      <PanelCard title="Product Status">
        {statusLoading && !status ? (
          <ChartSkeleton />
        ) : statusError ? (
          <SectionError message={statusError} />
        ) : pieData.length === 0 ? (
          <EmptyState compact title="No product status data" description="Products will appear here once listings are created." />
        ) : (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ width: { xs: "100%", sm: 240 }, height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={62}
                    outerRadius={92}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={entry.key} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCount(Number(value) || 0)}
                    contentStyle={tooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Box sx={{ flex: 1, minWidth: 180 }}>
              {pieData.map((row, i) => {
                const color = CHART_COLORS[i % CHART_COLORS.length];
                const pct = status && status.total > 0 ? Math.round((row.count / status.total) * 100) : 0;
                return (
                  <Box key={row.key} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.75 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
                    <Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{row.label}</Typography>
                    <Typography sx={{ fontSize: 13, color: "text.secondary" }}>{pct}%</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, minWidth: 42, textAlign: "right" }}>
                      {formatCount(row.count)}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </PanelCard>

      <PanelCard
        title="Product Views"
        action={<ToggleGroup value={viewsRange} onChange={(v) => onViewsRangeChange(v as ProductViewsRange)} options={VIEWS_OPTIONS} />}
      >
        {viewsLoading && !views ? (
          <ChartSkeleton />
        ) : viewsError ? (
          <SectionError message={viewsError} />
        ) : !hasViews ? (
          <EmptyState compact title="No views in this range" description="Views are counted when a buyer opens a product details page." />
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {formatCount(views?.totalViews)} views in selected range
            </Typography>
            <Box sx={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={viewsTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={DASHBOARD_ACCENTS.purple.main} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={DASHBOARD_ACCENTS.purple.main} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={NEUTRAL[200]} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: NEUTRAL[500] }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => {
                      const d = new Date(`${v}T00:00:00`);
                      return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                    }}
                  />
                  <YAxis tick={{ fontSize: 12, fill: NEUTRAL[500] }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    formatter={(v) => [formatCount(Number(v) || 0), "Views"]}
                    contentStyle={tooltipStyle}
                    cursor={{ stroke: alpha(DASHBOARD_ACCENTS.purple.main, 0.4) }}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke={DASHBOARD_ACCENTS.purple.main}
                    strokeWidth={3}
                    fill="url(#colorViews)"
                    name="Views"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </>
        )}
      </PanelCard>
    </Box>
  );
}
