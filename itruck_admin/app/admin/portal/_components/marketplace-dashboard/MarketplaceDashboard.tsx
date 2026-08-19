"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useTheme } from "@mui/material/styles";
import { PageContainer } from "@/components/ui";
import { useMarketplaceDashboard } from "@/hooks/useMarketplaceDashboard";
import { DateRangeFilter } from "./DateRangeFilter";
import { SummaryCards } from "./SummaryCards";
import { StatusAndViews } from "./StatusAndViews";
import { ProductRankings } from "./ProductRankings";
import { CategoryAndUsers } from "./CategoryAndUsers";
import { RecentActivity } from "./RecentActivity";

export function MarketplaceDashboard() {
  const theme = useTheme();
  const d = useMarketplaceDashboard();

  return (
    <PageContainer>
      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: 1.2 }}>
            Marketplace
          </Typography>
          <Typography variant="h4" fontWeight={800} color="text.primary" sx={{ mt: 0.25 }}>
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Buy & sell product performance, approvals, views, and user engagement
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <DateRangeFilter value={d.filter} onChange={d.setDateFilter} />
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

      {d.summary.error ? (
        <Alert severity="error" sx={{ mb: 2.5 }}>
          {d.summary.error}
        </Alert>
      ) : null}

      <SummaryCards data={d.summary.data} loading={d.summary.loading} />

      <StatusAndViews
        status={d.productStatus.data}
        statusLoading={d.productStatus.loading}
        statusError={d.productStatus.error}
        views={d.productViews.data}
        viewsLoading={d.productViews.loading}
        viewsError={d.productViews.error}
        viewsRange={d.viewsRange}
        onViewsRangeChange={d.setViewsRange}
      />

      <ProductRankings
        mostViewed={d.mostViewed.data}
        mostViewedLoading={d.mostViewed.loading}
        mostViewedError={d.mostViewed.error}
        viewedPage={d.viewedPage}
        onViewedPageChange={d.setViewedPage}
        topPerforming={d.topPerforming.data}
        topLoading={d.topPerforming.loading}
        topError={d.topPerforming.error}
        performingPeriod={d.performingPeriod}
        onPerformingPeriodChange={d.setPerformingPeriod}
      />

      <CategoryAndUsers
        categories={d.categories.data}
        categoriesLoading={d.categories.loading}
        categoriesError={d.categories.error}
        users={d.userAnalytics.data}
        usersLoading={d.userAnalytics.loading}
        usersError={d.userAnalytics.error}
      />

      <RecentActivity
        data={d.recentActivity.data}
        loading={d.recentActivity.loading}
        error={d.recentActivity.error}
      />
    </PageContainer>
  );
}
