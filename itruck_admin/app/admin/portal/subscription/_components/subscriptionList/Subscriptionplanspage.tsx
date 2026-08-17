"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  Divider,
  Card,
  CardContent,
  CardActions,
  Grid,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { getSubscriptionAll } from "@/model/services/subscription";
import type {
  SubscriptionGrouped,
  SubscriptionItem,
} from "@/model/services/subscription";
import PayNowButton from "@/components/common/Paynowbutton";
import AdminAssignSubscriptionDialog from "@/components/common/Adminassignsubscriptiondialog";
import { User } from "@/model/services/user";

// ─── Props ────────────────────────────────────────────────────────────────────

type CurrentUser = {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  mobile?: string;
  role?: { name?: string };
};

type Props = {
  currentUser?: CurrentUser;
  targetUserId?: string;
};

// ─── Field label map ──────────────────────────────────────────────────────────

const fieldLabel: Record<string, string> = {
  load: "Load",
  truck: "Truck",
  product: "Product / Buy-Sell",
};

// ─── Single plan card ─────────────────────────────────────────────────────────

function PlanCard({
  item,
  isAdmin,
  currentUser,
  onAdminAssign,
}: {
  item: SubscriptionItem;
  isAdmin: boolean;
  currentUser: CurrentUser | undefined;
  onAdminAssign: (item: SubscriptionItem) => void;
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
        >
          <Typography variant="subtitle1" fontWeight={700}>
            {item.packageName}
          </Typography>
          <Chip
            label={item.status}
            size="small"
            color={item.status === "active" ? "success" : "default"}
            sx={{ textTransform: "capitalize" }}
          />
        </Box>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          {item.packageType}
        </Typography>

        <Typography variant="h5" fontWeight={800} color="primary" mt={1}>
          ₹{item.price.toLocaleString("en-IN")}
        </Typography>

        <Typography variant="caption" color="text.secondary">
          for {item.durationDays} days
        </Typography>

        {item.description && (
          <Typography variant="body2" mt={1.5} color="text.secondary">
            {item.description}
          </Typography>
        )}

        {item.features && item.features.length > 0 && (
          <Stack direction="row" flexWrap="wrap" gap={0.5} mt={1.5}>
            {item.features.map((f, i) => (
              <Chip key={i} label={f} size="small" variant="outlined" />
            ))}
          </Stack>
        )}
      </CardContent>

      <Divider />

      <CardActions sx={{ px: 2, py: 1.5, gap: 1 }}>
        <Box flex={1}>
          <PayNowButton
            item={item}
            currentUser={currentUser as User | null}
            fullWidth
            size="small"
          />
        </Box>

        {isAdmin && (
          <Tooltip title="Assign to a user (admin)">
            <IconButton
              size="small"
              color="secondary"
              onClick={() => onAdminAssign(item)}
              disabled={item.status === "inactive"}
            >
              <AdminPanelSettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </CardActions>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SubscriptionPlansPage({
  currentUser,
  targetUserId,
}: Props) {
  const [grouped, setGrouped] = useState<SubscriptionGrouped | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignItem, setAssignItem] = useState<SubscriptionItem | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [packageType, setPackageType] = useState("");

  const isAdmin =
    currentUser?.role?.name?.toLowerCase() === "admin" ||
    currentUser?.role?.name?.toLowerCase() === "superadmin";

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const docs = await getSubscriptionAll(packageType || undefined);

      console.log("subscription response =>", docs);

      // FIX: doc.subscriptions is an object { load: [...], truck: [...] }, not an array.
      // Iterate Object.entries() so we can use the field key directly.
      const merged: SubscriptionGrouped = {};

      docs.forEach((doc: any) => {
        const subscriptions = doc.subscriptions;
        if (!subscriptions || typeof subscriptions !== "object") return;

        Object.entries(subscriptions).forEach(
          ([fieldKey, itemsArray]: [string, any]) => {
            if (!Array.isArray(itemsArray)) return;

            const field = fieldKey.toLowerCase();
            if (!merged[field]) merged[field] = [];

            itemsArray.forEach((item: SubscriptionItem) => {
              merged[field].push(item);
            });
          },
        );
      });

      setGrouped(merged);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, [packageType, currentUser]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={200}
      >
        <CircularProgress />
      </Box>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!grouped || Object.keys(grouped).length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        No subscription plans available. Add one using the button above.
      </Alert>
    );
  }

  // ── Plans UI ──────────────────────────────────────────────────────────────
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" fontWeight={700} mb={2}>
        Available Plans
      </Typography>
      <Box sx={{ mb: 2, maxWidth: 300 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Package Type</InputLabel>

          <Select
            value={packageType}
            label="Package Type"
            onChange={(e) => setPackageType(e.target.value)}
          >
            <MenuItem value="">All Packages</MenuItem>
            <MenuItem value="match_load">Match Load</MenuItem>
            <MenuItem value="match_truck">Match Truck</MenuItem>
            <MenuItem value="match_buy_sell">Match Buy Sell</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {Object.entries(grouped).map(([field, items]) => (
        <Accordion
          key={field}
          defaultExpanded
          elevation={1}
          sx={{
            mb: 1.5,
            borderRadius: 2,
            "&:before": { display: "none" },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{ textTransform: "capitalize" }}
            >
              {fieldLabel[field] || field} Plans
            </Typography>
            <Chip
              label={`${items.length} plan${items.length !== 1 ? "s" : ""}`}
              size="small"
              sx={{ ml: 1.5 }}
            />
          </AccordionSummary>

          <AccordionDetails sx={{ pt: 0 }}>
            <Grid container spacing={2}>
              {items.map((item) => (
                <Grid
                  key={item.id}
                  size={{
                    xs: 12,
                    sm: 6,
                    md: 4,
                  }}
                >
                  {" "}
                  <PlanCard
                    item={item}
                    isAdmin={isAdmin}
                    currentUser={currentUser}
                    onAdminAssign={(i) => {
                      setAssignItem(i);
                      setAssignOpen(true);
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Admin assign dialog */}
      <AdminAssignSubscriptionDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        item={assignItem}
        prefillUserId={targetUserId || ""}
        onSuccess={() => setAssignOpen(false)}
      />
    </Box>
  );
}
