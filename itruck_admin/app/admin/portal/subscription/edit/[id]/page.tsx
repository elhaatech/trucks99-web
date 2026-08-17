"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";

import { PRIMARY } from "@/lib/theme";
import { routes } from "@/lib/routes";
import {
  getSubscriptionAll,
  updateSubscriptionItems,
  type Subscription,
} from "@/model/services/subscription";
import { useNotification } from "@/hooks/useNotification";

interface FormState {
  packageName: string;
  packageType: string;
  price: string;
  durationDays: string;
  status: string;
  description: string;
}

const PACKAGE_TYPES = [
  { value: "match_load", label: "Match Load" },
  { value: "match_truck", label: "Match Truck" },
  { value: "match_product", label: "Match Product" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function SubscriptionEditPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { notify } = useNotification();

  const [docId, setDocId] = useState("");
  const [fieldName, setFieldName] = useState("");
  const [form, setForm] = useState<FormState>({
    packageName: "",
    packageType: "",
    price: "",
    durationDays: "",
    status: "active",
    description: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    getSubscriptionAll()
      .then((docs: Subscription[]) => {
        for (const doc of docs) {
          for (const [fieldKey, items] of Object.entries(doc.subscriptions)) {
            const found = items.find((i) => i.id === id);
            if (found) {
              setDocId(doc._id);
              setFieldName(fieldKey);
              setForm({
                packageName: found.packageName,
                packageType: found.packageType,
                price: String(found.price),
                durationDays: String(found.durationDays),
                status: found.status,
                description: found.description ?? "",
              });
              return;
            }
          }
        }
        setError("Subscription item not found.");
      })
      .catch(() => setError("Failed to load subscription."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = useCallback(
    (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!form.packageName.trim()) {
      setError("Package name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateSubscriptionItems(docId, {
        updates: [
          {
            id,
            packageName: form.packageName.trim(),
            packageType: form.packageType,
            price: Number(form.price),
            durationDays: Number(form.durationDays),
            description: form.description,
          },
        ],
      });
      notify({ type: "success", message: "Subscription updated." });
      router.push(routes.subscription.list());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setError(msg);
      notify({ type: "error", message: msg });
    } finally {
      setSaving(false);
    }
  }, [docId, form, id, notify, router]);

  if (loading) {
    return (
      <Box sx={{ py: 6, textAlign: "center" }}>
        <CircularProgress sx={{ color: PRIMARY }} />
        <Typography sx={{ mt: 2, color: "text.secondary" }}>
          Loading subscription…
        </Typography>
      </Box>
    );
  }

  if (error && docId === "") {
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

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto", p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={700} mb={1}>
          Edit Subscription Package
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Update the subscription package details below.
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
              "minmax(150px, 1fr) minmax(140px, 0.9fr) minmax(130px, 0.8fr) minmax(100px, 0.7fr) minmax(120px, 0.8fr) minmax(110px, 0.7fr) 48px",
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
            Price *
          </Typography>
          <Typography variant="caption" fontWeight={600}>
            Duration (days) *
          </Typography>
       
        </Box>

        {/* Form Entry */}
        <Box sx={{ p: 2.5 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns:
                "minmax(150px, 1fr) minmax(140px, 0.9fr) minmax(130px, 0.8fr) minmax(100px, 0.7fr) minmax(120px, 0.8fr) minmax(110px, 0.7fr) 48px",
              gap: 2,
              alignItems: "flex-start",
            }}
          >
            {/* Package Name */}
            <TextField
              label="Name"
              placeholder="e.g., Premium"
              value={form.packageName}
              onChange={handleChange("packageName")}
              size="small"
              fullWidth
              required
              disabled={saving}
            />

            {/* Package Type */}
            <TextField
              select
              label="Type"
              value={form.packageType}
              onChange={handleChange("packageType")}
              size="small"
              fullWidth
              required
              disabled={saving}
            >
              <MenuItem value="">
                <em>Select…</em>
              </MenuItem>
              {PACKAGE_TYPES.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>

            {/* Price */}
            <TextField
              label="Price"
              type="number"
              value={form.price}
              onChange={handleChange("price")}
              size="small"
              fullWidth
              required
              disabled={saving}
              inputProps={{ min: 0, step: 0.01 }}
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
              value={form.durationDays}
              onChange={handleChange("durationDays")}
              size="small"
              fullWidth
              required
              disabled={saving}
              inputProps={{ min: 1, max: 9999 }}
            />

     

            {/* Delete Button (Disabled) */}
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <IconButton
                size="small"
                color="error"
                disabled
                title="Cannot delete while editing"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Paper>



      {/* Summary Stats */}
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
        <Box>
          <Typography variant="caption" color="text.secondary">
            Price
          </Typography>
          <Typography variant="h6" fontWeight={600}>
            ₹
            {Number(form.price || 0).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Duration
          </Typography>
          <Typography variant="h6" fontWeight={600}>
            {form.durationDays || "0"} days
          </Typography>
        </Box>
      </Paper>

      {/* Action Buttons */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
        <Button
          variant="outlined"
          onClick={() => router.push(routes.subscription.list())}
          disabled={saving}
          sx={{ textTransform: "none", fontWeight: 500 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => void handleSave()}
          disabled={saving || !form.packageName.trim()}
          startIcon={
            saving ? <CircularProgress size={18} color="inherit" /> : undefined
          }
          sx={{
            bgcolor: PRIMARY,
            textTransform: "none",
            fontWeight: 600,
            px: 3,
            "&:hover": { bgcolor: "#5a3d92" },
          }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </Box>
    </Box>
  );
}