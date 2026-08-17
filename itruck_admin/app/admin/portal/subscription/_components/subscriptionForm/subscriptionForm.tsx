"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

import { PRIMARY } from "@/lib/theme";
import { routes } from "@/lib/routes";
import {
  createSubscription,
  updateSubscriptionItems,
  getSubscriptionAll,
  type SubscriptionItemInput,
  type Subscription,
} from "@/model/services/subscription";
import { getCurrentUser } from "@/model/api";
import { useNotification } from "@/hooks/useNotification";

// ── Types ──────────────────────────────────────────────────────────────────

interface SubscriptionEntry {
  packageName: string;
  packageType: string;
  fieldName: string;
  price: number | "";
  durationDays: number | "";
  status: "active" | "inactive";
}

export interface SubscriptionFormProps {
  mode: "create" | "edit";
  editId?: string;
  onSuccess?: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

const PACKAGE_TYPE_OPTIONS = [
  { label: "Match Load", value: "match_load" },
  { label: "Match Truck", value: "match_truck" },
  { label: "Agent", value: "Agent" },
];

const FIELD_NAME_OPTIONS = [
  { label: "Load", value: "load" },
  { label: "Truck", value: "truck" },
  { label: "Product", value: "product" },
];

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const emptyEntry = (): SubscriptionEntry => ({
  packageName: "",
  packageType: "",
  fieldName: "",
  price: "",
  durationDays: "",
  status: "active",
});

// ── Component ──────────────────────────────────────────────────────────────

export function SubscriptionForm({
  mode = "create",
  editId,
  onSuccess,
}: SubscriptionFormProps) {
  const router = useRouter();
  const { notify } = useNotification();

  const [entries, setEntries] = useState<SubscriptionEntry[]>([emptyEntry()]);
  const [loading, setLoading] = useState(mode === "edit");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [docId, setDocId] = useState("");

  // Load edit data if in edit mode
  useEffect(() => {
    if (mode !== "edit" || !editId) return;

    setLoading(true);
    getSubscriptionAll()
      .then((docs: Subscription[]) => {
        for (const doc of docs) {
          for (const [fieldKey, items] of Object.entries(doc.subscriptions)) {
            const found = items.find((i) => i.id === editId);
            if (found) {
              setDocId(doc._id);
              setEntries([
                {
                  packageName: found.packageName,
                  packageType: found.packageType,
                  fieldName: fieldKey,
                  price: found.price,
                  durationDays: found.durationDays,
                  status: found.status as "active" | "inactive",
                },
              ]);
              return;
            }
          }
        }
        setError("Subscription item not found.");
      })
      .catch((err) => {
        const msg =
          err instanceof Error ? err.message : "Failed to load subscription.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [mode, editId]);

  // ── Entry helpers ──────────────────────────────────────────────────────

  const handleAddEntry = () => {
    setEntries((prev) => [...prev, emptyEntry()]);
  };

  const removeEntry = (idx: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateEntry = (
    idx: number,
    field: keyof SubscriptionEntry,
    value: string | number
  ) => {
    setEntries((prev) => {
      const next = structuredClone(prev);
      (next[idx] as unknown as Record<string, unknown>)[field] = value;
      return next;
    });
  };

  // ── Submit handler ──────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (entries.length === 0) {
      setError("Add at least one subscription entry before submitting.");
      return;
    }

    const isValid = entries.every(
      (e) =>
        e.packageName &&
        e.packageType &&
        e.fieldName &&
        e.price !== "" &&
        e.durationDays !== ""
    );






    setError("");
    setSubmitting(true);

    try {
      if (mode === "edit") {
        if (!editId) {
          throw new Error("Subscription ID is missing");
        }

        const entry = entries[0];

        await updateSubscriptionItems(docId, {
          updates: [
            {
              id: editId,
              packageName: entry.packageName.trim(),
              packageType: entry.packageType,
              price: Number(entry.price),
              durationDays: Number(entry.durationDays),
              status: entry.status,
            },
          ],
        });

        notify({ type: "success", message: "Subscription updated." });
      } else {
        // Create new subscriptions
        const subscriptions: SubscriptionItemInput[] = entries.map((e) => ({
          packageName: e.packageName.trim(),
          packageType: e.packageType,
          fieldName: e.fieldName,
          price: Number(e.price),
          durationDays: Number(e.durationDays),
          status: e.status,
        }));

        const currentUser = await getCurrentUser().catch(() => null);
        const user = currentUser
          ? { name: currentUser.name, role: currentUser.role }
          : undefined;

        await createSubscription({ subscriptions, user });
        notify({ type: "success", message: "Subscriptions created." });
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(routes.subscription.list());
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Operation failed";
      setError(msg);
      notify({ type: "error", message: msg });
    } finally {
      setSubmitting(false);
    }
  }, [entries, mode, editId, docId, onSuccess, notify, router]);

  // ── Calculate stats ──────────────────────────────────────────────────

  const totalPrice = entries.reduce(
    (sum, e) => sum + (typeof e.price === "number" ? e.price : 0),
    0
  );

  // ── Loading state ────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box sx={{ py: 6, textAlign: "center" }}>
        <CircularProgress sx={{ color: PRIMARY }} />
        <Typography sx={{ mt: 2, color: "text.secondary" }}>
          Loading…
        </Typography>
      </Box>
    );
  }

  if (mode === "edit" && error && docId === "") {
    return (
      <Box sx={{ maxWidth: 1400, mx: "auto", p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="outlined"
          onClick={() => router.push(routes.subscription.list())}
        >
          Back to Subscriptions
        </Button>
      </Box>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto", p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={700} mb={1}>
          {mode === "edit"
            ? "Edit Subscription Package"
            : "Create Subscription"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {mode === "edit"
            ? "Update the subscription package details below."
            : "Configure subscription packages below. Each entry represents one package option."}
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError("")}
          sx={{ mb: 3 }}
          variant="filled"
        >
          {error}
        </Alert>
      )}

      {/* Form Container */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      >
        {/* Column Headers */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns:
              mode === "edit"
                ? "minmax(150px, 1fr) minmax(140px, 0.9fr) minmax(130px, 0.8fr) minmax(100px, 0.7fr) minmax(120px, 0.8fr) minmax(110px, 0.7fr) 48px"
                : "minmax(150px, 1fr) minmax(140px, 0.9fr) minmax(130px, 0.8fr) minmax(100px, 0.7fr) minmax(120px, 0.8fr) minmax(110px, 0.7fr) 48px",
            gap: 2,
            p: 2.5,
            bgcolor: "grey.50",
            borderBottom: "1px solid",
            borderColor: "divider",
            alignItems: "center",
            fontWeight: 600,
            fontSize: "0.875rem",
            color: "text.secondary",
          }}
        >
          <Typography variant="caption" fontWeight={600}>
            Package Name *
          </Typography>
          <Typography variant="caption" fontWeight={600}>
            Type *
          </Typography>
          <Typography variant="caption" fontWeight={600}>
            Price (₹) *
          </Typography>
          <Typography variant="caption" fontWeight={600}>
            Duration (days) *
          </Typography>
          <Typography variant="caption" fontWeight={600}>
            Field *
          </Typography>
          {mode === "edit" && (
            <Typography variant="caption" fontWeight={600}>
              Status
            </Typography>
          )}
          <Typography variant="caption"></Typography>
        </Box>

        {/* Entries */}
        <Box sx={{ p: 2.5 }}>
          {entries.map((entry, idx) => (
            <Box key={idx}>
              {idx > 0 && <Divider sx={{ my: 2 }} />}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns:
                    mode === "edit"
                      ? "minmax(150px, 1fr) minmax(140px, 0.9fr) minmax(130px, 0.8fr) minmax(100px, 0.7fr) minmax(120px, 0.8fr) minmax(110px, 0.7fr) 48px"
                      : "minmax(150px, 1fr) minmax(140px, 0.9fr) minmax(130px, 0.8fr) minmax(100px, 0.7fr) minmax(120px, 0.8fr) minmax(110px, 0.7fr) 48px",
                  gap: 2,
                  alignItems: "flex-start",
                }}
              >
                {/* Package Name */}
                <TextField
                  label="Name"
                  placeholder="e.g., Premium"
                  value={entry.packageName}
                  onChange={(e) =>
                    updateEntry(idx, "packageName", e.target.value)
                  }
                  size="small"
                  fullWidth
                  required
                  disabled={submitting}
                />

                {/* Package Type */}
                <TextField
                  select
                  label="Type"
                  value={entry.packageType}
                  onChange={(e) =>
                    updateEntry(idx, "packageType", e.target.value)
                  }
                  size="small"
                  fullWidth
                  required
                  disabled={submitting}
                >
                  <MenuItem value="">
                    <em>Select…</em>
                  </MenuItem>
                  {PACKAGE_TYPE_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </TextField>

                {/* Price */}
                <TextField
                  label="Price"
                  type="number"
                  value={entry.price}
                  onChange={(e) =>
                    updateEntry(
                      idx,
                      "price",
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  size="small"
                  fullWidth
                  required
                  disabled={submitting}
                  inputProps={{ min: 0, step: 1 }}
                  slotProps={{
                    input: {
                      startAdornment: "₹",
                    },
                  }}
                />

                {/* Duration */}
                <TextField
                  label="Days"
                  type="number"
                  value={entry.durationDays}
                  onChange={(e) =>
                    updateEntry(
                      idx,
                      "durationDays",
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  size="small"
                  fullWidth
                  required
                  disabled={submitting}
                  inputProps={{ min: 1, max: 9999 }}
                />

                {/* Status (Edit Mode Only) */}
                {mode === "edit" && (
                  <TextField
                    select
                    label="Status"
                    value={entry.status}
                    onChange={(e) =>
                      updateEntry(
                        idx,
                        "status",
                        e.target.value as "active" | "inactive"
                      )
                    }
                    size="small"
                    fullWidth
                    disabled={submitting}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </TextField>
                )}

                {/* Delete Button */}
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removeEntry(idx)}
                    title={
                      mode === "edit"
                        ? "Cannot delete while editing"
                        : "Remove entry"
                    }
                    disabled={
                      submitting ||
                      (mode === "edit" ? true : entries.length === 1)
                    }
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Add Entry Button (Create Mode Only) */}
      {mode === "create" && (
        <Box sx={{ mb: 4 }}>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddEntry}
            variant="outlined"
            disabled={submitting}
            sx={{
              textTransform: "none",
              fontWeight: 500,
            }}
          >
            Add Another Package
          </Button>
        </Box>
      )}

      {/* Summary Stats */}
      {entries.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 4,
            bgcolor: "info.lighter",
            border: "1px solid",
            borderColor: "info.light",
            borderRadius: 1,
            display: "flex",
            gap: 3,
          }}
        >
          {mode === "create" ? (
            <>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Total Packages
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {entries.length}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Total Revenue
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  ₹
                  {totalPrice.toLocaleString("en-IN", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </Typography>
              </Box>
            </>
          ) : (
            <>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Price
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  ₹
                  {totalPrice.toLocaleString("en-IN", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Duration
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {entries[0]?.durationDays || "0"} days
                </Typography>
              </Box>
            </>
          )}
        </Paper>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
        <Button
          variant="outlined"
          onClick={() => router.push(routes.subscription.list())}
          disabled={submitting}
          sx={{ textTransform: "none", fontWeight: 500 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => void handleSubmit()}
          disabled={submitting || entries.length === 0}
          startIcon={
            submitting ? (
              <CircularProgress size={18} color="inherit" />
            ) : undefined
          }
          sx={{
            bgcolor: PRIMARY,
            textTransform: "none",
            fontWeight: 600,
            px: 3,
            "&:hover": { bgcolor: "#5a3d92" },
          }}
        >
          {submitting
            ? mode === "edit"
              ? "Saving…"
              : "Creating…"
            : mode === "edit"
              ? "Save Changes"
              : "Create Subscriptions"}
        </Button>
      </Box>
    </Box>
  );
}