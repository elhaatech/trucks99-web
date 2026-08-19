"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui";
import { ProductStatusChip } from "@/app/admin/portal/buysell/_components/ProductStatusChip";
import { DASHBOARD_ACCENTS } from "@/lib/theme";
import { routes } from "@/lib/routes";
import type { RecentActivityResponse } from "@/model/services/marketplaceDashboard";
import { PanelCard, SectionError, formatDateTime } from "./shared";

const TYPE_ACCENT: Record<string, { bg: string; text: string }> = {
  created: DASHBOARD_ACCENTS.blue,
  approved: DASHBOARD_ACCENTS.teal,
  rejected: DASHBOARD_ACCENTS.red,
  sold: DASHBOARD_ACCENTS.purple,
  booking: DASHBOARD_ACCENTS.amber,
  purchased: DASHBOARD_ACCENTS.green,
  featured: DASHBOARD_ACCENTS.amber,
  offer: DASHBOARD_ACCENTS.blue,
  status_changed: DASHBOARD_ACCENTS.purple,
};

export function RecentActivity({
  data,
  loading,
  error,
}: {
  data: RecentActivityResponse | null;
  loading: boolean;
  error: string | null;
}) {
  const router = useRouter();
  const items = data?.items ?? [];

  return (
    <PanelCard title="Recent Product Activity">
      {loading && !data ? (
        <Box>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={44} sx={{ mb: 1 }} />
          ))}
        </Box>
      ) : error ? (
        <SectionError message={error} />
      ) : items.length === 0 ? (
        <EmptyState compact title="No recent product activity" description="New listings, approvals, offers, and sales will show up here." />
      ) : (
        <Box>
          {items.map((item) => {
            const accent = TYPE_ACCENT[item.type] || DASHBOARD_ACCENTS.blue;
            return (
              <Box
                key={item.id}
                onClick={() => item.productId && router.push(routes.buysell.view(item.productId))}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  py: 1.5,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  cursor: item.productId ? "pointer" : "default",
                  "&:last-child": { borderBottom: "none", pb: 0 },
                  "&:first-of-type": { pt: 0 },
                  "&:hover": item.productId ? { bgcolor: "action.hover", mx: -1, px: 1, borderRadius: "10px" } : undefined,
                }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: accent.main,
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600 }} noWrap>
                    {item.action}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "text.secondary" }} noWrap>
                    {item.sellerName || "—"} · {formatDateTime(item.date)}
                  </Typography>
                </Box>
                <ProductStatusChip status={item.status} />
              </Box>
            );
          })}
        </Box>
      )}
    </PanelCard>
  );
}
