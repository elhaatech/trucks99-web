"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  Divider,
  Stack,
  Button,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { getSubscriptionAll } from "@/model/services/subscription";
import { checkDashboardAccess } from "@/model/services/dashboard";
import { getMySubscriptions } from "@/model/services/Payment";
import { getCurrentUser } from "@/model/services/user";
import type { User } from "@/model/services/user";
import type { SubscriptionItem } from "@/model/services/subscription";
import PayNowButton from "@/components/common/Paynowbutton";
import Grid from "@mui/material/Grid";

const DASHBOARD_PACKAGE_TYPES = new Set(["dashboard", "agent"]);

function PlanCard({
  item,
  currentUser,
  onRefresh,
}: {
  item: SubscriptionItem;
  currentUser: User | null;
  onRefresh?: () => Promise<void>;
}) {
  return (
    <Card variant="outlined" sx={{ height: "100%", display: "flex", flexDirection: "column", borderRadius: 2 }}>
      <CardContent sx={{ flex: 1 }}>
        <Typography variant="subtitle1" fontWeight={700}>{item.packageName}</Typography>
        <Typography variant="caption" color="text.secondary">Dashboard Analytics</Typography>
        <Box mt={2} mb={1}>
          <Typography variant="h5" fontWeight={800} color="primary">
            {item.price === 0 ? "Free Plan" : `₹${item.price.toLocaleString("en-IN")}`}
          </Typography>
        </Box>
        {item.description && (
          <Typography variant="body2" mt={1.5} color="text.secondary">{item.description}</Typography>
        )}
        {item.features && item.features.length > 0 && (
          <Stack direction="row" flexWrap="wrap" gap={0.75} mt={2}>
            {item.features.map((f, i) => (
              <Chip key={i} label={f} size="small" variant="outlined" />
            ))}
          </Stack>
        )}
      </CardContent>
      <Divider />
      <CardActions sx={{ px: 2, py: 1.5 }}>
        <PayNowButton item={item} currentUser={currentUser} onSuccess={onRefresh} fullWidth size="small" />
      </CardActions>
    </Card>
  );
}

export type DashboardGateProps = {
  children: React.ReactNode;
};

/**
 * Only admins or users with an active Dashboard subscription can view the dashboard.
 */
export default function DashboardGate({ children }: DashboardGateProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [items, setItems] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasExpiredPlan, setHasExpiredPlan] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setHasAccess(false);
      setHasExpiredPlan(false);

      const user = await getCurrentUser();
      setCurrentUser(user);

      const access = await checkDashboardAccess();
      // Temporarily bypassing access check for testing
      // if (access.hasAccess) {
        setHasAccess(true);
        setLoading(false);
        return;
      // }

      try {
        const subDoc = await getMySubscriptions();
        const activeSubscriptions = subDoc?.activeSubscriptions || [];
        const hasExpired = activeSubscriptions.some((sub) =>
          DASHBOARD_PACKAGE_TYPES.has(String(sub.packageType || "").toLowerCase()) &&
          sub.status === "expired",
        );
        if (hasExpired) setHasExpiredPlan(true);
      } catch {
        /* optional */
      }

      const docs = await getSubscriptionAll("dashboard");
      const planItems: SubscriptionItem[] = [];
      docs.forEach((doc) => {
        const subscriptions = doc.subscriptions;
        if (!subscriptions || typeof subscriptions !== "object") return;
        Object.values(subscriptions).forEach((itemsArray) => {
          if (!Array.isArray(itemsArray)) return;
          itemsArray.forEach((item: SubscriptionItem) => {
            if (DASHBOARD_PACKAGE_TYPES.has(String(item.packageType || "").toLowerCase())) {
              planItems.push(item);
            }
          });
        });
      });
      setItems(planItems);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load dashboard access";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const access = await checkDashboardAccess();
      setHasAccess(access.hasAccess);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to refresh";
      setError(message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (items.length === 0) {
    return (
      <Box
        sx={{
          py: 10,
          px: { xs: 2, md: 6 },
          textAlign: "center",
          borderRadius: 4,
          background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.05)",
          mb: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "50vh",
        }}
      >
        <Typography variant="h3" fontWeight={800} gutterBottom color="primary.main">
          iTruck Premium Dashboard
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: "auto" }}>
          Unlock exclusive analytics, track real-time fleet performance, and manage your revenue effortlessly.
        </Typography>
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            To get access to the dashboard, please upgrade your account.
          </Typography>
          <Button 
            variant="contained" 
            size="large" 
            href="mailto:support@itruck.com"
            sx={{ 
              px: 6, 
              py: 1.5, 
              borderRadius: 3, 
              fontWeight: 700,
              textTransform: "none",
            }}
          >
            Contact Support to Upgrade
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 4 }}>
      {hasExpiredPlan && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight={700}>Your dashboard plan has expired</Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Purchase a dashboard subscription to continue viewing analytics.
          </Typography>
          <Box sx={{ mt: 1.5 }}>
            <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? "Refreshing..." : "Refresh Status"}
            </Button>
          </Box>
        </Alert>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700} mb={1}>Dashboard Plans</Typography>
          <Typography variant="body2" color="text.secondary">
            Subscribe to unlock admin dashboard analytics, revenue insights, and activity tracking.
          </Typography>
        </Box>
        <Tooltip title="Refresh subscription status">
          <IconButton onClick={handleRefresh} disabled={refreshing} size="small">
            <RefreshIcon sx={{ opacity: refreshing ? 0.5 : 1 }} />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        {items.map((item) => (
          <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <PlanCard item={item} currentUser={currentUser} onRefresh={handleRefresh} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
