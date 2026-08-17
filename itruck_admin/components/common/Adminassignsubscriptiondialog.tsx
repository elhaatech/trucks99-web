"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Typography,
  Box,
  Divider,
  Chip,
} from "@mui/material";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import type { SubscriptionItem } from "@/model/services/subscription";
import { adminAssignSubscription } from "@/model/services/Payment";

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onClose: () => void;
  item: SubscriptionItem | null;
  prefillUserId?: string;
  onSuccess?: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminAssignSubscriptionDialog({
  open,
  onClose,
  item,
  prefillUserId = "",
  onSuccess,
}: Props) {
  const [userId, setUserId] = useState(prefillUserId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleClose = () => {
    setError(null);
    setSuccess(false);
    setUserId(prefillUserId);
    onClose();
  };

  const handleAssign = async () => {
    if (!item) return;
    if (!userId.trim()) {
      setError("User ID is required");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await adminAssignSubscription({
        userId: userId.trim(),
        subscriptionItemId: item.id,
        fieldName: item.fieldName,
        packageName: item.packageName,
        packageType: item.packageType,
        durationDays: item.durationDays,
        price: item.price,
      });
      setSuccess(true);
      onSuccess?.();
    } catch (err: any) {
      setError(err?.message || "Failed to assign subscription");
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <AdminPanelSettingsIcon color="primary" />
          Assign Subscription
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Plan summary card */}
        <Box
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 2,
            bgcolor: "action.hover",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="subtitle1" fontWeight={700}>
            {item.packageName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {item.fieldName} · {item.packageType}
          </Typography>
          <Box display="flex" gap={1} mt={1} flexWrap="wrap">
            <Chip
              label={`₹${item.price.toLocaleString("en-IN")}`}
              size="small"
              color="primary"
            />
            <Chip label={`${item.durationDays} days`} size="small" />
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {success ? (
          <Alert severity="success">
            Subscription assigned successfully to user <strong>{userId}</strong>.
          </Alert>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            <TextField
              label="User ID (MongoDB _id or UUID)"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              fullWidth
              size="small"
              disabled={loading || !!prefillUserId}
              helperText="Paste the user's MongoDB _id or UUID"
            />
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          sx={{ textTransform: "none" }}
        >
          {success ? "Close" : "Cancel"}
        </Button>
        {!success && (
          <Button
            variant="contained"
            onClick={handleAssign}
            disabled={loading}
            startIcon={
              loading ? <CircularProgress size={16} color="inherit" /> : null
            }
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            {loading ? "Assigning…" : "Assign"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}