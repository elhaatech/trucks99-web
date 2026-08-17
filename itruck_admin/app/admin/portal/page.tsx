"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Line, Legend, AreaChart, Area
} from "recharts";
import { useRouter } from "next/navigation";
import { routes } from "@/lib/routes";
import { formatCurrency } from "@/model/services/dashboard";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { AdvertisementSlot } from "@/components/common";
import { StatCard } from "@/components/ui/StatCard";
import { PageContainer, AppCard } from "@/components/ui";
import { StatCardSkeleton } from "@/components/ui/Skeleton";
import { DASHBOARD_ACCENTS, NEUTRAL } from "@/lib/theme";
import { alpha, useTheme } from "@mui/material/styles";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import ShowChartOutlinedIcon from "@mui/icons-material/ShowChartOutlined";

function PanelCard({ title, action, children }: { title?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <AppCard hover={false} padding={3}>
      {(title || action) && (
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
          {title ? (
            <Typography variant="h6" fontWeight={700} letterSpacing="-0.01em">
              {title}
            </Typography>
          ) : null}
          {action}
        </Box>
      )}
      {children}
    </AppCard>
  );
}

function ToggleGroup({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Box sx={{ display: "flex", gap: 0.5, bgcolor: "action.hover", p: 0.5, borderRadius: "10px" }}>
      {options.map((o) => (
        <Box
          key={o.value}
          onClick={() => onChange(o.value)}
          sx={{
            fontSize: 13,
            px: 2,
            py: 0.75,
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 600,
            background: value === o.value ? "background.paper" : "transparent",
            color: value === o.value ? "primary.main" : "text.secondary",
            boxShadow: value === o.value ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
            transition: "all 0.2s ease",
            "&:hover": { color: "primary.main" },
          }}
        >
          {o.label}
        </Box>
      ))}
    </Box>
  );
}

function ProgressBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.secondary", minWidth: 88 }}>
        {label}
      </Typography>
      <Box sx={{ flex: 1, height: 8, borderRadius: "99px", bgcolor: "action.hover", overflow: "hidden" }}>
        <Box sx={{ height: "100%", borderRadius: "99px", background: color, width: `${pct}%`, transition: "width 1s ease-out" }} />
      </Box>
      <Typography sx={{ fontSize: 13, fontWeight: 700, minWidth: 32, textAlign: "right" }}>{value}</Typography>
    </Box>
  );
}

function UserRow({ initials, name, role, status, avatarBg, avatarColor }: {
  initials: string; name: string; role: string;
  status: "active" | "inactive"; avatarBg: string; avatarColor: string;
}) {
  return (
    <Box sx={{
      display: "flex", alignItems: "center", gap: 2, py: 1.75,
      borderBottom: "1px solid", borderColor: "divider",
      "&:last-child": { borderBottom: "none", pb: 0 },
      "&:first-of-type": { pt: 0 },
    }}>
      <Box sx={{
        width: 42, height: 42, borderRadius: "50%", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0,
        background: avatarBg, color: avatarColor,
      }}>
        {initials}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: "text.primary" }} noWrap>{name}</Typography>
        <Typography sx={{ fontSize: 12, color: "text.secondary" }} noWrap>{role}</Typography>
      </Box>
      <Box sx={{
        fontSize: 11, px: 1.5, py: 0.5, borderRadius: "99px", fontWeight: 700, textTransform: "capitalize",
        background: status === "active" ? DASHBOARD_ACCENTS.green.bg : DASHBOARD_ACCENTS.red.bg,
        color: status === "active" ? DASHBOARD_ACCENTS.green.text : DASHBOARD_ACCENTS.red.text,
      }}>
        {status}
      </Box>
    </Box>
  );
}

function DashboardContent() {
  const theme = useTheme();
  const d = useAdminDashboard("weekly");
  const router = useRouter();
  const o = d.overview;

  const avatarPalette = [
    { bg: DASHBOARD_ACCENTS.blue.bg, color: DASHBOARD_ACCENTS.blue.text },
    { bg: DASHBOARD_ACCENTS.purple.bg, color: DASHBOARD_ACCENTS.purple.text },
    { bg: DASHBOARD_ACCENTS.teal.bg, color: DASHBOARD_ACCENTS.teal.text },
    { bg: DASHBOARD_ACCENTS.amber.bg, color: DASHBOARD_ACCENTS.amber.text },
  ];

  const loadStatusTotal = o
    ? o.statusCounts.loads.pending + o.statusCounts.loads.accepted +
      o.statusCounts.loads.delivered + o.statusCounts.loads.cancelled
    : 1;

  const growthBadge = (change: number) => ({
    trend: { value: `${change >= 0 ? "+" : ""}${change}%`, up: change >= 0 },
  });

  const txBarData = o
    ? [
        { name: "Load", value: o.transactionSummary.loadTransactions },
        { name: "Truck", value: o.transactionSummary.truckTransactions },
        { name: "Buy/Sell", value: o.transactionSummary.sellTransactions },
      ]
    : [];

  const tooltipStyle = {
    borderRadius: 12,
    border: "none",
    boxShadow: theme.tokens.shadow.lg,
    fontSize: 13,
  };

  return (
    <PageContainer>
      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: 1.2 }}>
            Overview
          </Typography>
          <Typography variant="h4" fontWeight={800} color="text.primary" sx={{ mt: 0.25 }}>
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Real-time insights and analytics for your operations
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <ToggleGroup
            value={d.period ?? "weekly"}
            onChange={(v) => d.setPeriod(v as "daily" | "weekly" | "monthly" | "yearly")}
            options={[
              { value: "daily", label: "Daily" },
              { value: "weekly", label: "Weekly" },
              { value: "monthly", label: "Monthly" },
              { value: "yearly", label: "Yearly" },
            ]}
          />
          <IconButton
            onClick={() => d.refresh()}
            disabled={d.loading}
            aria-label="Refresh dashboard"
            sx={{
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              boxShadow: theme.tokens.shadow.sm,
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {d.error && <Alert severity="error" sx={{ mb: 2.5 }}>{d.error}</Alert>}
      {o?.alerts?.lowActivity && (
        <Alert severity="warning" sx={{ mb: 2.5 }}>
          Low activity detected — no bookings or transactions in the selected period.
        </Alert>
      )}

      <AdvertisementSlot />

      {d.loading && !o ? (
        <StatCardSkeleton count={4} />
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 2.5, mb: 3 }}>
          <StatCard
            title="Total Revenue"
            value={o ? formatCurrency(o.weeklyIncome) : "—"}
            subtitle="Income from all sources"
            icon={<TrendingUpIcon />}
            accent="warning"
            onClick={undefined}
            {...(o ? growthBadge(o.revenueSummary.netProfit >= 0 ? 10 : -5) : {})}
          />
          <StatCard
            title="Active Loads"
            value={o?.weeklyBookings.loadsBooked ?? "—"}
            subtitle={`${o?.weeklyBookings.trucksBooked ?? 0} active trucks`}
            icon={<LocalShippingOutlinedIcon />}
            accent="info"
            onClick={() => router.push(routes.load.list())}
          />
          <StatCard
            title="Network Users"
            value={o?.totalCounts.totalUsers ?? "—"}
            subtitle="Registered users on platform"
            icon={<PeopleOutlineIcon />}
            accent="success"
            onClick={() => router.push(routes.user.list())}
          />
          <StatCard
            title="Net Profit"
            value={o ? formatCurrency(o.revenueSummary.netProfit) : "—"}
            subtitle="After operating expenses"
            icon={<ShowChartOutlinedIcon />}
            accent="primary"
            {...(o ? growthBadge(o.weeklyGrowth?.newLoads?.change ?? 0) : {})}
          />
        </Box>
      )}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" }, gap: 2.5, mb: 3 }}>
        <PanelCard title="Revenue Growth Trend">
          <Box sx={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.revenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={DASHBOARD_ACCENTS.teal.main} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={DASHBOARD_ACCENTS.teal.main} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={NEUTRAL[200]} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: NEUTRAL[500] }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 12, fill: NEUTRAL[500] }} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip formatter={(v) => formatCurrency(Number(v) || 0)} contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: 20 }} />
                <Area type="monotone" dataKey="income" stroke={DASHBOARD_ACCENTS.teal.main} strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" name="Income" />
                <Line type="monotone" dataKey="expense" stroke={DASHBOARD_ACCENTS.red.text} strokeWidth={2} dot={false} name="Expense" />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </PanelCard>

        <PanelCard title="Load Performance">
          <Box sx={{ mt: 1 }}>
            {o ? (
              <>
                <ProgressBar label="In Transit" value={o.statusCounts.loads.accepted} max={loadStatusTotal} color={DASHBOARD_ACCENTS.purple.main} />
                <ProgressBar label="Pending" value={o.statusCounts.loads.pending} max={loadStatusTotal} color={DASHBOARD_ACCENTS.amber.main} />
                <ProgressBar label="Delivered" value={o.statusCounts.loads.delivered} max={loadStatusTotal} color={DASHBOARD_ACCENTS.teal.main} />
                <ProgressBar label="Cancelled" value={o.statusCounts.loads.cancelled} max={loadStatusTotal} color={DASHBOARD_ACCENTS.red.text} />
              </>
            ) : (
              <Typography color="text.secondary">Loading data...</Typography>
            )}
          </Box>
        </PanelCard>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2.5, mb: 3 }}>
        <PanelCard title="Transaction Distribution">
          <Box sx={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={txBarData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={NEUTRAL[200]} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 13, fill: NEUTRAL[500] }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 13, fill: NEUTRAL[500] }} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip formatter={(v) => formatCurrency(Number(v) || 0)} cursor={{ fill: alpha(NEUTRAL[900], 0.02) }} contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill={DASHBOARD_ACCENTS.blue.main} radius={[8, 8, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </PanelCard>

        <PanelCard title="Recent Users">
          <Box sx={{ mt: 0.5 }}>
            {d.recentUsers.length === 0 ? (
              <Typography sx={{ fontSize: 14, color: "text.disabled", py: 4, textAlign: "center" }}>
                {d.loading ? "Loading users…" : "No recent users found"}
              </Typography>
            ) : (
              d.recentUsers.map((u, i) => {
                const name = u.name ?? "Unknown";
                const initials = name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
                const pal = avatarPalette[i % avatarPalette.length];
                return (
                  <UserRow
                    key={i}
                    initials={initials}
                    name={name}
                    role={u.role ?? "—"}
                    status={(u.status as "active" | "inactive") ?? "active"}
                    avatarBg={pal.bg}
                    avatarColor={pal.color}
                  />
                );
              })
            )}
          </Box>
        </PanelCard>
      </Box>

      {o?.topStatistics && (
        <PanelCard title="Platform Highlights">
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 2 }}>
            {[
              { label: "Most Booked Truck", value: o.topStatistics.mostBookedTruck?.truckNumber ?? "—", sub: `${o.topStatistics.mostBookedTruck?.bookingCount ?? 0} bookings`, accent: DASHBOARD_ACCENTS.blue },
              { label: "Most Viewed Item", value: o.topStatistics.mostViewedMarketItem?.bsNumber ?? "—", sub: `${o.topStatistics.mostViewedMarketItem?.viewCount ?? 0} views`, accent: DASHBOARD_ACCENTS.purple },
              { label: "Top Seller", value: o.topStatistics.mostActiveSeller?.name ?? "—", sub: `${o.topStatistics.mostActiveSeller?.transactionCount ?? 0} deals`, accent: DASHBOARD_ACCENTS.teal },
              { label: "Top Fleet Owner", value: o.topStatistics.mostActiveTruckOwner?.name ?? "—", sub: `${o.topStatistics.mostActiveTruckOwner?.transactionCount ?? 0} fleets`, accent: DASHBOARD_ACCENTS.amber },
            ].map((item) => (
              <Box
                key={item.label}
                sx={{
                  p: 2.5,
                  borderRadius: "12px",
                  bgcolor: alpha(item.accent.main, 0.04),
                  border: "1px solid",
                  borderColor: alpha(item.accent.main, 0.12),
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  "&:hover": { transform: "translateY(-2px)", boxShadow: theme.tokens.shadow.card },
                }}
              >
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5, mb: 1 }}>
                  {item.label}
                </Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 800, color: "text.primary", mb: 0.5 }}>
                  {item.value}
                </Typography>
                <Typography sx={{ fontSize: 13, color: "text.disabled", fontWeight: 500 }}>
                  {item.sub}
                </Typography>
              </Box>
            ))}
          </Box>
        </PanelCard>
      )}
    </PageContainer>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
