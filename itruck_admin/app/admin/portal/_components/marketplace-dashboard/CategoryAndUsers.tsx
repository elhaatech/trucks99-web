"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import Skeleton from "@mui/material/Skeleton";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import AddBoxOutlinedIcon from "@mui/icons-material/AddBoxOutlined";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import HowToRegOutlinedIcon from "@mui/icons-material/HowToRegOutlined";
import { alpha } from "@mui/material/styles";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui";
import { DASHBOARD_ACCENTS } from "@/lib/theme";
import { routes } from "@/lib/routes";
import {
  formatCount,
  type CategoryAnalyticsResponse,
  type UserAnalyticsResponse,
} from "@/model/services/marketplaceDashboard";
import { PanelCard, SectionError } from "./shared";

export function CategoryAndUsers({
  categories,
  categoriesLoading,
  categoriesError,
  users,
  usersLoading,
  usersError,
}: {
  categories: CategoryAnalyticsResponse | null;
  categoriesLoading: boolean;
  categoriesError: string | null;
  users: UserAnalyticsResponse | null;
  usersLoading: boolean;
  usersError: string | null;
}) {
  const router = useRouter();
  const items = categories?.items ?? [];
  const maxProducts = Math.max(1, ...items.map((row) => row.productCount));

  const userMetrics = [
    { label: "Registered users", value: users?.totalUsers ?? 0, icon: <PeopleOutlineIcon fontSize="small" />, accent: DASHBOARD_ACCENTS.blue },
    { label: "New users", value: users?.newUsers ?? 0, icon: <PersonAddAltOutlinedIcon fontSize="small" />, accent: DASHBOARD_ACCENTS.purple },
    { label: "Active users", value: users?.activeUsers ?? 0, icon: <HowToRegOutlinedIcon fontSize="small" />, accent: DASHBOARD_ACCENTS.teal },
    { label: "Viewed products", value: users?.usersWhoViewedProducts ?? 0, icon: <VisibilityOutlinedIcon fontSize="small" />, accent: DASHBOARD_ACCENTS.amber },
    { label: "Added favorites", value: users?.usersWhoFavorited ?? 0, icon: <FavoriteBorderOutlinedIcon fontSize="small" />, accent: DASHBOARD_ACCENTS.red },
    { label: "Contacted sellers", value: users?.usersWhoContactedSellers ?? 0, icon: <ChatBubbleOutlineOutlinedIcon fontSize="small" />, accent: DASHBOARD_ACCENTS.blue },
    { label: "Created listings", value: users?.usersWhoCreatedListings ?? 0, icon: <AddBoxOutlinedIcon fontSize="small" />, accent: DASHBOARD_ACCENTS.green },
  ];

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2.5, mb: 3 }}>
      <PanelCard title="Top Product Categories">
        {categoriesLoading && !categories ? (
          <Box>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height={36} sx={{ mb: 1.5 }} />
            ))}
          </Box>
        ) : categoriesError ? (
          <SectionError message={categoriesError} />
        ) : items.length === 0 ? (
          <EmptyState compact title="No category data" description="Categories appear after products are listed." />
        ) : (
          <Box>
            {items.map((row) => (
              <Box
                key={row.id || row.name}
                onClick={() => {
                  if (!row.id) return;
                  router.push(`${routes.buysell.list()}?category_id=${encodeURIComponent(row.id)}`);
                }}
                sx={{
                  mb: 2,
                  cursor: row.id ? "pointer" : "default",
                  "&:last-child": { mb: 0 },
                  "&:hover .cat-name": { color: "primary.main" },
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mb: 0.75 }}>
                  <Typography className="cat-name" sx={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.4 }}>
                    {row.name}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "text.secondary", whiteSpace: "nowrap" }}>
                    {formatCount(row.productCount)} products · {formatCount(row.views)} views · {formatCount(row.soldCount)} sold
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.round((row.productCount / maxProducts) * 100)}
                  sx={{
                    height: 8,
                    borderRadius: 99,
                    bgcolor: "action.hover",
                    "& .MuiLinearProgress-bar": { borderRadius: 99 },
                  }}
                />
              </Box>
            ))}
          </Box>
        )}
      </PanelCard>

      <PanelCard title="User Activity">
        {usersLoading && !users ? (
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={72} />
            ))}
          </Box>
        ) : usersError ? (
          <SectionError message={usersError} />
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
            {userMetrics.map((metric) => (
              <Box
                key={metric.label}
                sx={{
                  p: 1.75,
                  borderRadius: "12px",
                  bgcolor: alpha(metric.accent.main, 0.06),
                  border: "1px solid",
                  borderColor: alpha(metric.accent.main, 0.12),
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: metric.accent.text, mb: 0.75 }}>
                  {metric.icon}
                  <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>
                    {metric.label}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>
                  {formatCount(metric.value)}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </PanelCard>
    </Box>
  );
}
