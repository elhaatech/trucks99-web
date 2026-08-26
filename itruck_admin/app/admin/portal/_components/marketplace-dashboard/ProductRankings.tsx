"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TablePagination from "@mui/material/TablePagination";
import { useRouter } from "next/navigation";
import { EmptyState, TableSkeleton } from "@/components/ui";
import { ProductStatusChip } from "@/app/admin/portal/buysell/_components/ProductStatusChip";
import { resolveVehicleImageSrc } from "@/lib/buysellUtils";
import { routes } from "@/lib/routes";
import {
  formatCount,
  formatPrice,
  type MarketplacePeriod,
  type PaginatedProducts,
} from "@/model/services/marketplaceDashboard";
import { PanelCard, SectionError, ToggleGroup, formatShortDate } from "./shared";

const PERFORMING_OPTIONS: { value: MarketplacePeriod | "all"; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "all", label: "All Time" },
];

function ProductThumb({ src, name }: { src?: string | null; name: string }) {
  const url = resolveVehicleImageSrc(src);
  return (
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: "10px",
        overflow: "hidden",
        flexShrink: 0,
        bgcolor: "action.hover",
        backgroundImage: `url(${url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 700,
        color: "text.secondary",
      }}
    >
      {url ? null : name.slice(0, 2).toUpperCase()}
    </Box>
  );
}

function ProductTable({
  data,
  loading,
  error,
  emptyTitle,
  showEngagement,
  page,
  onPageChange,
}: {
  data: PaginatedProducts | null;
  loading: boolean;
  error: string | null;
  emptyTitle: string;
  showEngagement?: boolean;
  page?: number;
  onPageChange?: (page: number) => void;
}) {
  const router = useRouter();
  const items = data?.items ?? [];

  if (loading && !data) return <TableSkeleton rows={5} columns={showEngagement ? 7 : 6} />;
  if (error) return <SectionError message={error} />;
  if (items.length === 0) {
    return <EmptyState compact title={emptyTitle} description="Product engagement will show here once buyers view listings." />;
  }

  return (
    <>
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>Vehicle ID</TableCell>
              <TableCell>Brand</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="right">Views</TableCell>
              {showEngagement ? <TableCell align="right">Offers</TableCell> : null}
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((row) => (
              <TableRow
                key={row.id}
                hover
                sx={{ cursor: "pointer" }}
                onClick={() => router.push(routes.buysell.view(row.id))}
              >
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 180 }}>
                    <ProductThumb src={row.image} name={row.name} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700 }} noWrap>
                        {row.name}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: "text.secondary" }} noWrap>
                        {row.sellerName || "Seller"} · {row.category || "—"}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
                        {formatShortDate(row.createdAt)}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, fontFamily: "monospace" }}>
                    {row.vehicleId || "—"}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography sx={{ fontSize: 13 }}>{row.brand || "—"}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{formatPrice(row.price)}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography sx={{ fontSize: 13, fontWeight: 800 }}>{formatCount(row.views)}</Typography>
                </TableCell>
                {showEngagement ? (
                  <TableCell align="right">
                    <Typography sx={{ fontSize: 13 }}>{formatCount(row.offers ?? 0)}</Typography>
                    <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                      {formatCount(row.favorites ?? 0)} fav
                    </Typography>
                  </TableCell>
                ) : null}
                <TableCell>
                  <ProductStatusChip status={row.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      {onPageChange && data && data.pagination.totalPages > 1 ? (
        <TablePagination
          component="div"
          count={data.pagination.total}
          page={Math.max(0, (page ?? data.pagination.page) - 1)}
          onPageChange={(_, next) => onPageChange(next + 1)}
          rowsPerPage={data.pagination.limit}
          rowsPerPageOptions={[data.pagination.limit]}
        />
      ) : null}
    </>
  );
}

export function ProductRankings({
  mostViewed,
  mostViewedLoading,
  mostViewedError,
  viewedPage,
  onViewedPageChange,
  topPerforming,
  topLoading,
  topError,
  performingPeriod,
  onPerformingPeriodChange,
}: {
  mostViewed: PaginatedProducts | null;
  mostViewedLoading: boolean;
  mostViewedError: string | null;
  viewedPage: number;
  onViewedPageChange: (page: number) => void;
  topPerforming: PaginatedProducts | null;
  topLoading: boolean;
  topError: string | null;
  performingPeriod: MarketplacePeriod | "all";
  onPerformingPeriodChange: (period: MarketplacePeriod | "all") => void;
}) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2.5, mb: 3 }}>
      <PanelCard title="Most Viewed Products">
        <ProductTable
          data={mostViewed}
          loading={mostViewedLoading}
          error={mostViewedError}
          emptyTitle="No viewed products yet"
          page={viewedPage}
          onPageChange={onViewedPageChange}
        />
      </PanelCard>
      <PanelCard
        title="Top Performing Products"
        action={
          <ToggleGroup
            value={performingPeriod}
            onChange={(v) => onPerformingPeriodChange(v as MarketplacePeriod | "all")}
            options={PERFORMING_OPTIONS}
          />
        }
      >
        <ProductTable
          data={topPerforming}
          loading={topLoading}
          error={topError}
          emptyTitle="No performing products yet"
          showEngagement
        />
      </PanelCard>
    </Box>
  );
}
