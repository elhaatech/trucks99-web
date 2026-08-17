"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import SellIcon from "@mui/icons-material/Sell";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { formatCreatedDate } from "@/lib/dateUtils";
import CancelIcon from "@mui/icons-material/Cancel";
import CategoryIcon from "@mui/icons-material/Category";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import GavelIcon from "@mui/icons-material/Gavel";

import type {
  BuySellSummaryReport,
  BuySellStatusSummaryReport,
  BuySellTypeSummaryReport,
  BuySellDailyActivityReport,
  BuySellCategoryPostedReport,
  BuySellCategorySoldReport,
} from "@/model/services/report";

// ─── Shared helpers ───────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <Box sx={{ py: 8, textAlign: "center" }}>
      <Typography color="text.secondary">{label}</Typography>
    </Box>
  );
}

function StatCard({
  label,
  value,
  icon,
  color = "primary.main",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 2,
            bgcolor: `${color}18`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

function CardRow({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 2,
        "& > *": { flex: "1 1 200px", minWidth: 0 },
      }}
    >
      {children}
    </Box>
  );
}

/** Formats a number as ₹ with Indian comma grouping. */
function fmt(n: number | string | null | undefined): string {
  if (n == null || n === "" || n === 0) return "—";
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return "—";
  return `₹${num.toLocaleString("en-IN")}`;
}

// ─── 1. Summary Panel ─────────────────────────────────────────────────────────

export function BuySellSummaryPanel({ data }: { data: BuySellSummaryReport | null }) {
  if (!data) return <EmptyState label="No summary data available. Click Search to load." />;

  const { summary, recentListings } = data;

  return (
    <Stack spacing={3}>
      {/* ── KPI cards ── */}
      <CardRow>
        <StatCard
          label="Total Listings"
          value={summary.total}
          icon={<TrendingUpIcon fontSize="small" />}
          color="primary.main"
        />
        <StatCard
          label="Buy Listings"
          value={summary.byType.buy}
          icon={<ShoppingCartIcon fontSize="small" />}
          color="info.main"
        />
        <StatCard
          label="Sell Listings"
          value={summary.byType.sell}
          icon={<SellIcon fontSize="small" />}
          color="warning.main"
        />
        <StatCard
          label="Active"
          value={summary.byStatus.active}
          icon={<CheckCircleIcon fontSize="small" />}
          color="success.main"
        />
        <StatCard
          label="Inactive"
          value={summary.byStatus.inactive}
          icon={<CancelIcon fontSize="small" />}
          color="error.main"
        />
      </CardRow>

      {/* ── Recent listings table ── */}
      <Box>
        <Typography variant="subtitle1" fontWeight={600} mb={1.5}>
          Recent Listings
        </Typography>
        {recentListings.length === 0 ? (
          <EmptyState label="No recent listings." />
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Subcategory</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Price</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Bids</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Highest Bid</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Address</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Pincode</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Posted By</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentListings.map((row) => {
                  const isActive = row.status === "Active";
                  const categoryName    = row.category_id?.category_name    ?? "—";
                  const subcategoryName = row.subcategory_id?.sub_category_name ?? "—";
                  return (
                    <TableRow key={row._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {categoryName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {subcategoryName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row.status}
                          size="small"
                          color={isActive ? "success" : "default"}
                          variant="filled"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {fmt(row.price)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={row.bid_count ?? 0}
                          size="small"
                          icon={<GavelIcon style={{ fontSize: 12 }} />}
                          color={row.bid_count > 0 ? "primary" : "default"}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight={500}
                          color={row.highest_bid ? "success.main" : "text.secondary"}
                        >
                          {fmt(row.highest_bid)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{row.address ?? "—"}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {row.pincode ?? "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {row.created_by ?? "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {formatCreatedDate(row.createdAt)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Stack>
  );
}

// ─── 2. Daily Activity Panel ──────────────────────────────────────────────────

export function BuySellDailyActivityPanel({ data }: { data: BuySellDailyActivityReport | null }) {
  if (!data) return <EmptyState label="No daily activity data available. Click Search to load." />;

  const { summary, rows } = data;

  return (
    <Stack spacing={3}>
      <CardRow>
        <StatCard
          label="Total Created"
          value={summary.totalCreated}
          icon={<TrendingUpIcon fontSize="small" />}
          color="primary.main"
        />
        <StatCard
          label="Total Buy"
          value={summary.totalBuy}
          icon={<ShoppingCartIcon fontSize="small" />}
          color="info.main"
        />
        <StatCard
          label="Total Sell"
          value={summary.totalSell}
          icon={<SellIcon fontSize="small" />}
          color="warning.main"
        />
      </CardRow>

      {rows.length === 0 ? (
        <EmptyState label="No daily activity in this range." />
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Created</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Buy</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Sell</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Active</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.date} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {new Date(row.date).toLocaleDateString("en-IN")}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{row.created}</TableCell>
                  <TableCell align="right">
                    <Chip label={row.buyCount} size="small" color="info" variant="outlined" />
                  </TableCell>
                  <TableCell align="right">
                    <Chip label={row.sellCount} size="small" color="warning" variant="outlined" />
                  </TableCell>
                  <TableCell align="right">
                    <Chip label={row.active} size="small" color="success" variant="outlined" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}

// ─── 3. Type Summary Panel ────────────────────────────────────────────────────

export function BuySellTypeSummaryPanel({ data }: { data: BuySellTypeSummaryReport | null }) {
  if (!data) return <EmptyState label="No type summary data available. Click Search to load." />;

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: "grey.50" }}>
            <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>Total</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>Active</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>Inactive</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>Active Rate</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.rows.map((row) => {
            const rate = row.total > 0 ? ((row.activeCount / row.total) * 100).toFixed(1) : "0.0";
            return (
              <TableRow key={row.user_type} hover>
                <TableCell>
                  <Chip
                    label={(row.user_type ?? "—").toUpperCase()}
                    size="small"
                    color={row.user_type === "buy" ? "info" : "warning"}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={600}>{row.total}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="success.main" fontWeight={500}>{row.activeCount}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="text.secondary">{row.inactiveCount}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
                    <Box sx={{ width: 60, height: 6, borderRadius: 3, bgcolor: "grey.200", overflow: "hidden" }}>
                      <Box sx={{ width: `${rate}%`, height: "100%", bgcolor: "success.main", borderRadius: 3 }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary">{rate}%</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ─── 4. Status Summary Panel ──────────────────────────────────────────────────

export function BuySellStatusSummaryPanel({ data }: { data: BuySellStatusSummaryReport | null }) {
  if (!data) return <EmptyState label="No status summary data available. Click Search to load." />;

  const { summary, rows } = data;

  return (
    <Stack spacing={3}>
      <StatCard
        label="Total Listings"
        value={summary.total}
        icon={<TrendingUpIcon fontSize="small" />}
        color="primary.main"
      />

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.50" }}>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Count</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Share</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const pct = summary.total > 0 ? ((row.count / summary.total) * 100).toFixed(1) : "0.0";
              const isActive = row.status === "Active";
              return (
                <TableRow key={row.status} hover>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {isActive ? (
                        <CheckCircleIcon fontSize="small" color="success" />
                      ) : (
                        <CancelIcon fontSize="small" color="disabled" />
                      )}
                      <Typography variant="body2" fontWeight={500} sx={{ textTransform: "capitalize" }}>
                        {row.status}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600}>{row.count}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
                      <Box sx={{ width: 80, height: 6, borderRadius: 3, bgcolor: "grey.200", overflow: "hidden" }}>
                        <Box sx={{ width: `${pct}%`, height: "100%", bgcolor: isActive ? "success.main" : "grey.400", borderRadius: 3 }} />
                      </Box>
                      <Typography variant="caption" color="text.secondary">{pct}%</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}

// ─── 5. Category-wise Posted Panel ───────────────────────────────────────────

export function BuySellCategoryPostedPanel({ data }: { data: BuySellCategoryPostedReport | null }) {
  if (!data) return <EmptyState label="No category data available. Click Search to load." />;

  const { summary, rows } = data;

  return (
    <Stack spacing={3}>
      <CardRow>
        <StatCard
          label="Total Posted for Sale"
          value={summary.totalPosted}
          icon={<SellIcon fontSize="small" />}
          color="warning.main"
        />
        <StatCard
          label="Active Listings"
          value={summary.totalActive}
          icon={<CheckCircleIcon fontSize="small" />}
          color="success.main"
        />
        <StatCard
          label="Inactive Listings"
          value={summary.totalInactive}
          icon={<CancelIcon fontSize="small" />}
          color="error.main"
        />
        <StatCard
          label="Categories"
          value={summary.categories}
          icon={<CategoryIcon fontSize="small" />}
          color="primary.main"
        />
      </CardRow>

      {rows.length === 0 ? (
        <EmptyState label="No vehicles posted for sale in this range." />
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Subcategory</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Posted</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Active</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Inactive</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Avg Price</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Min</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Max</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={`${row.categoryId}-${row.subcategoryId}-${idx}`} hover>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <CategoryIcon fontSize="small" sx={{ color: "warning.main", flexShrink: 0 }} />
                      <Typography variant="body2" fontWeight={500}>{row.categoryName}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{row.subcategoryName}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={700}>{row.totalPosted}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Chip label={row.activeCount} size="small" color="success" variant="outlined" />
                  </TableCell>
                  <TableCell align="right">
                    <Chip label={row.inactiveCount} size="small" color="default" variant="outlined" />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={500}>{fmt(row.avgPrice)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption" color="text.secondary">{fmt(row.minPrice)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption" color="text.secondary">{fmt(row.maxPrice)}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}

// ─── 6. Category-wise Sold Panel ─────────────────────────────────────────────

export function BuySellCategorySoldPanel({ data }: { data: BuySellCategorySoldReport | null }) {
  if (!data) return <EmptyState label="No sold data available. Click Search to load." />;

  const { summary, rows } = data;

  return (
    <Stack spacing={3}>
      <CardRow>
        <StatCard
          label="Total Vehicles Sold"
          value={summary.totalSold}
          icon={<LocalOfferIcon fontSize="small" />}
          color="success.main"
        />
        <StatCard
          label="Categories"
          value={summary.categories}
          icon={<CategoryIcon fontSize="small" />}
          color="primary.main"
        />
      </CardRow>

      {rows.length === 0 ? (
        <EmptyState label="No vehicles sold in this range." />
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Subcategory</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Sold</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Avg Price</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Min</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Max</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={`${row.categoryId}-${row.subcategoryId}-${idx}`} hover>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <CategoryIcon fontSize="small" sx={{ color: "success.main", flexShrink: 0 }} />
                      <Typography variant="body2" fontWeight={500}>{row.categoryName}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{row.subcategoryName}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={700} color="success.main">
                      {row.totalSold}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={500}>{fmt(row.avgPrice)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption" color="text.secondary">{fmt(row.minPrice)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption" color="text.secondary">{fmt(row.maxPrice)}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}