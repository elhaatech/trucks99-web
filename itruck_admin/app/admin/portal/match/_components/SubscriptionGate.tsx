"use client";

import React, { useEffect, useState, useCallback } from "react";
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
import { getMySubscriptions } from "@/model/services/Payment";
import { getCurrentUser } from "@/model/services/user";
import type { User } from "@/model/services/user";
import type { SubscriptionItem } from "@/model/services/subscription";
import AdminAssignSubscriptionDialog from "@/components/common/Adminassignsubscriptiondialog";
import Grid from "@mui/material/Grid";
import PayNowButton from "@/components/common/Paynowbutton";

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({
  item,
  isAdmin,
  currentUser,
  onAdminAssign,
  onRefresh,
}: {
  item: SubscriptionItem;
  isAdmin: boolean;
  currentUser: User | null;
  onAdminAssign: (item: SubscriptionItem) => void;
  onRefresh?: () => Promise<void>;
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 2,
        opacity: item.status === "inactive" ? 0.55 : 1,
        transition: "box-shadow 0.2s",
        "&:hover": { boxShadow: item.status === "inactive" ? undefined : 3 },
      }}
    >
      <CardContent sx={{ flex: 1 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
          mb={1}
        >
          <Box flex={1}>
            <Typography variant="subtitle1" fontWeight={700}>
              {item.packageName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {item.packageType === "match_truck"
                ? "Truck Matching"
                : item.packageType === "match_load"
                  ? "Load Matching"
                  : item.packageType === "agent"
                    ? "Agent Package"
                    : item.packageType}
            </Typography>
          </Box>
        </Box>

        <Box mt={2} mb={1}>
          <Typography variant="h5" fontWeight={800} color="primary">
            {item.price === 0
              ? "Free Plan"
              : `₹${item.price.toLocaleString("en-IN")}`}
          </Typography>
        </Box>

        {item.description && (
          <Typography variant="body2" mt={1.5} color="text.secondary">
            {item.description}
          </Typography>
        )}

        {item.features && item.features.length > 0 && (
          <Box mt={2}>
            <Typography
              variant="caption"
              fontWeight={600}
              display="block"
              mb={1}
            >
              Features:
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              {item.features.map((f, i) => (
                <Chip
                  key={i}
                  label={f}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: "0.75rem" }}
                />
              ))}
            </Stack>
          </Box>
        )}
      </CardContent>

      <Divider />

      <CardActions sx={{ px: 2, py: 1.5, gap: 1 }}>
        <Box flex={1}>
          <PayNowButton
            item={item}
            currentUser={currentUser}
            onSuccess={onRefresh}
            fullWidth
            size="small"
          />
        </Box>
      </CardActions>
    </Card>
  );
}

// ─── Subscription gate ────────────────────────────────────────────────────

export type SubscriptionGateProps = {
  /** "load" or "truck" — controls which package types grant access and what plans to show */
  matchType: "load" | "truck";
  /** Rendered when user has access */
  children: React.ReactNode;
};

/**
 * Checks if the current user has an active subscription that grants access.
 *
 * FLOW:
 * 1. Fetch current user
 * 2. Fetch fresh subscription data via getMySubscriptions()
 * 3. Check if user has active subscription matching access type
 * 4. If yes → render children (match results)
 * 5. If no → show subscription plans for purchase
 *
 * - status "active" = has access
 * - status "expired" = show alert + plans for renewal
 * - packageType "agent" grants access to BOTH match_load and match_truck
 * - packageType "match_load" grants access to match_load only
 * - packageType "match_truck" grants access to match_truck only
 *
 * NOTE: Uses status from getMySubscriptions() response directly (no separate expiry check)
 */
export default function SubscriptionGate({
  matchType,
  children,
}: SubscriptionGateProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [items, setItems] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasExpiredPlan, setHasExpiredPlan] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [assignItem, setAssignItem] = useState<SubscriptionItem | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin =
    currentUser?.role?.name?.toLowerCase() === "admin" ||
    currentUser?.role?.name?.toLowerCase() === "superadmin";

  const isAgent = currentUser?.role?.name?.toLowerCase() === "agent";

  // ── Main data fetch function ────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setHasAccess(false);
      setHasExpiredPlan(false);

      // ── STEP 1: Fetch current user ──────────────────────────────────────
      console.log("[SubscriptionGate] Step 1: Fetching current user...");
      const user = await getCurrentUser();
      setCurrentUser(user);

      const roleIsAdmin =
        user?.role?.name?.toLowerCase() === "admin" ||
        user?.role?.name?.toLowerCase() === "superadmin";

      const roleIsAgent = user?.role?.name?.toLowerCase() === "agent";

      // Admins have full access
      if (roleIsAdmin) {
        console.log("[SubscriptionGate] User is admin, granting full access");
        setHasAccess(true);
        setLoading(false);
        return;
      }

      // ── STEP 2: Fetch active subscriptions (real-time) ──────────────────
      console.log(
        "[SubscriptionGate] Step 2: Fetching active subscriptions...",
      );
      let userHasAccess = false;
      try {
        const subDoc = await getMySubscriptions();
        const activeSubscriptions = subDoc?.activeSubscriptions || [];

        console.log(
          "[SubscriptionGate] Found subscriptions:",
          activeSubscriptions.length,
        );

        // Check for active subscription matching the access type
        userHasAccess = activeSubscriptions.some((sub) => {
          const matchesType =
            sub.packageType === "agent" ||
            sub.packageType ===
              (matchType === "load" ? "match_load" : "match_truck");
          if (!matchesType) return false;

          // Use status from API response directly
          const hasActiveStatus = sub.status === "active";
          console.log(
            `[SubscriptionGate] Sub "${sub.packageName}" - type match: ${matchesType}, active: ${hasActiveStatus}`,
          );
          return hasActiveStatus;
        });

        // Check if they have an expired plan (for alert)
        const hasExpired = activeSubscriptions.some((sub) => {
          const matchesType =
            sub.packageType === "agent" ||
            sub.packageType ===
              (matchType === "load" ? "match_load" : "match_truck");
          return matchesType && sub.status === "expired";
        });

        if (hasExpired) {
          console.log("[SubscriptionGate] User has expired plan");
          setHasExpiredPlan(true);
        }
      } catch (err) {
        console.warn(
          "[SubscriptionGate] Failed to fetch my subscriptions:",
          err,
        );
      }

      // If user has access, done fetching
      if (userHasAccess) {
        console.log(
          "[SubscriptionGate] User has active access, showing children",
        );
        setHasAccess(true);
        setLoading(false);
        return;
      }

      // ── STEP 3: No access — fetch subscription plans ──────────────────
      console.log(
        "[SubscriptionGate] Step 3: User has no access, fetching plans...",
      );
      const packageTypeToFetch = roleIsAgent
        ? "agent"
        : matchType === "load"
          ? "match_load"
          : "match_truck";

      const docs = await getSubscriptionAll(packageTypeToFetch);

      const planItems: SubscriptionItem[] = [];
      docs.forEach((doc: any) => {
        const subscriptions = doc.subscriptions;
        if (!subscriptions || typeof subscriptions !== "object") return;
        Object.values(subscriptions).forEach((itemsArray: any) => {
          if (!Array.isArray(itemsArray)) return;
          itemsArray.forEach((item: SubscriptionItem) => {
            if (roleIsAgent) {
              if (item.packageType?.toLowerCase() === "agent") {
                planItems.push(item);
              }
            } else {
              const targetType =
                matchType === "load" ? "match_load" : "match_truck";
              if (item.packageType?.toLowerCase() === targetType) {
                planItems.push(item);
              }
            }
          });
        });
      });

      console.log(
        "[SubscriptionGate] Found",
        planItems.length,
        "subscription plans",
      );
      setItems(planItems);
    } catch (err: any) {
      console.error("[SubscriptionGate] Error:", err);
      setError(err?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [matchType]);

  // ── Handle refresh (re-fetch subscriptions) ────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      console.log("[SubscriptionGate] Manual refresh triggered...");
      const subDoc = await getMySubscriptions();
      const activeSubscriptions = subDoc?.activeSubscriptions || [];

      // Re-check access
      let userHasAccess = false;
      userHasAccess = activeSubscriptions.some((sub) => {
        const matchesType =
          sub.packageType === "agent" ||
          sub.packageType ===
            (matchType === "load" ? "match_load" : "match_truck");
        if (!matchesType) return false;
        return sub.status === "active";
      });

      // Re-check expired
      const hasExpired = activeSubscriptions.some((sub) => {
        const matchesType =
          sub.packageType === "agent" ||
          sub.packageType ===
            (matchType === "load" ? "match_load" : "match_truck");
        return matchesType && sub.status === "expired";
      });

      setHasAccess(userHasAccess);
      setHasExpiredPlan(hasExpired);
      console.log(
        "[SubscriptionGate] Refresh complete - hasAccess:",
        userHasAccess,
      );
    } catch (err: any) {
      console.warn("[SubscriptionGate] Refresh failed:", err?.message);
      setError(err?.message || "Failed to refresh subscription status");
    } finally {
      setRefreshing(false);
    }
  }, [matchType]);

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={300}
      >
        <CircularProgress />
      </Box>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  // ── Has access → render children (match results) ───────────────────────────
  if (hasAccess) {
    return <>{children}</>;
  }

  // ── No access → show plans ─────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        No {matchType === "load" ? "load" : "truck"} matching subscription plans
        available. Please contact support.
      </Alert>
    );
  }

  return (
    <Box sx={{ mb: 4 }}>
      {/* ── Expired Plan Alert ── */}
      {hasExpiredPlan && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            Your plan has expired!
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Kindly buy premium to continue using{" "}
            {matchType === "load" ? "Load" : "Truck"} Matching features.
          </Typography>
          <Box sx={{ mt: 1.5 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={refreshing}
              sx={{ textTransform: "none" }}
            >
              {refreshing ? "Refreshing..." : "Refresh Status"}
            </Button>
          </Box>
        </Alert>
      )}

      {/* ── Plans Header ── */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box flex={1}>
          <Typography variant="h5" fontWeight={700} mb={1}>
            {matchType === "load" ? "Load" : "Truck"} Matching Plans
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {matchType === "load"
              ? "Subscribe to find and match loads with available trucks"
              : "Subscribe to find and match trucks with available loads"}
          </Typography>
        </Box>
        {/* ── Refresh Button ── */}
        <Tooltip title="Refresh subscription status">
          <IconButton
            onClick={handleRefresh}
            disabled={refreshing}
            size="small"
            sx={{ ml: 2 }}
          >
            <RefreshIcon sx={{ opacity: refreshing ? 0.5 : 1 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── Plans Grid ── */}
      <Grid container spacing={3}>
        {items.map((item) => (
          <Grid
            key={item.id}
            size={{
              xs: 12,
              sm: 6,
              md: 4,
            }}
          >
            <PlanCard
              item={item}
              isAdmin={isAdmin}
              currentUser={currentUser}
              onRefresh={handleRefresh}
              onAdminAssign={(i) => {
                setAssignItem(i);
                setAssignOpen(true);
              }}
            />
          </Grid>
        ))}
      </Grid>

      {/* ── Admin Assign Dialog ── */}
      <AdminAssignSubscriptionDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        item={assignItem}
        prefillUserId={""}
        onSuccess={() => setAssignOpen(false)}
      />
    </Box>
  );
}