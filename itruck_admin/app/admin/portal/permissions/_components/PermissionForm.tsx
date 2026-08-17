"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import CircularProgress from "@mui/material/CircularProgress";
import TextField from "@mui/material/TextField";

import type { User } from "@/model/api";
import {
  type PermissionGroup,
  type PermissionItem,
  type PermissionAccess,
  createPermission,
  updatePermission,
  getPermissionById,
  DEFAULT_PERMISSION_TEMPLATE,
} from "@/model/services/permission";
import { getCurrentUser } from "@/model/api";
import { PageHeader, FormFooter, FormTextField } from "@/components/common";
import { routes } from "@/lib/routes";
import { useToast } from "@/lib/toast";

export interface PermissionFormProps {
  mode: "create" | "edit";
  editId?: string;
  onSuccess?: () => void;
}

const ACCESS_KEYS: (keyof Omit<PermissionAccess, "list" | "update">)[] = [
  "create",
  "view",
  "edit",
  "delete",
];

const emptyPermissionItem = (): PermissionItem => ({
  title_name: "",
  display_name: "",
  access: { create: false, view: false, edit: false, delete: false, list: false },
});



export function PermissionForm({ mode, editId, onSuccess }: PermissionFormProps) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = mode === "edit";

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<PermissionItem[]>(
    isEdit ? [emptyPermissionItem()] : JSON.parse(JSON.stringify(DEFAULT_PERMISSION_TEMPLATE))
  );

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getCurrentUser()
      .then((u) => setCurrentUser(u as User))
      .catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    if (!isEdit || !editId) return;

    setLoading(true);
    getPermissionById(editId)
      .then((group) => {
        setName(group.name || "");
        setDescription(group.description || "");
        
        const fetchedItems = group.permissions || [];
        
        // Start with a fresh copy of the default template
        const mergedPermissions: PermissionItem[] = JSON.parse(JSON.stringify(DEFAULT_PERMISSION_TEMPLATE));
        
        // Merge fetched data into the template
        for (const fetched of fetchedItems) {
          const t = (fetched.title_name || "").toLowerCase();
          const existingIdx = mergedPermissions.findIndex(p => p.title_name.toLowerCase() === t);
          
          const normalizedAccess = {
            create: Boolean(fetched.access?.create),
            view: Boolean(fetched.access?.view),
            edit: Boolean(fetched.access?.edit || fetched.access?.update),
            delete: Boolean(fetched.access?.delete),
            list: Boolean(fetched.access?.list),
          };

          if (existingIdx >= 0) {
            // Update existing template item
            mergedPermissions[existingIdx].access = normalizedAccess;
            // Use the saved display name if it exists
            if (fetched.display_name) {
              mergedPermissions[existingIdx].display_name = fetched.display_name;
            }
          } else if (fetched.title_name) {
            // It's a custom permission not in our default template, append it
            mergedPermissions.push({
              title_name: fetched.title_name,
              display_name: fetched.display_name || fetched.title_name,
              access: normalizedAccess,
            });
          }
        }
        
        setPermissions(mergedPermissions);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load permission group");
        toast.error("Failed to load permission group");
      })
      .finally(() => setLoading(false));
  }, [isEdit, editId, toast]);

  const handleAddPermission = () => {
    setPermissions((prev) => [...prev, emptyPermissionItem()]);
  };

  const handleRemovePermission = (idx: number) => {
    setPermissions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updatePermissionField = (idx: number, field: keyof PermissionItem, value: string) => {
    setPermissions((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const updatePermissionAccess = (idx: number, key: keyof PermissionAccess, value: boolean) => {
    setPermissions((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        access: {
          ...(next[idx].access || {}),
          [key]: value,
        },
      };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      const msg = "Name is required";
      setError(msg);
      toast.error(msg);
      return;
    }

    // Filter out completely empty items
    const validPermissions = permissions.filter(p => p.title_name.trim() || p.display_name.trim());
    
    // Check for duplicates or missing keys in valid items
    const seenTitles = new Set<string>();
    for (const p of validPermissions) {
      const title = p.title_name.trim();
      if (!title) {
        const msg = "All added permissions must have a System ID (title_name).";
        setError(msg);
        toast.error(msg);
        return;
      }
      if (seenTitles.has(title.toLowerCase())) {
        const msg = `Duplicate System ID found: '${title}'. Must be unique.`;
        setError(msg);
        toast.error(msg);
        return;
      }
      seenTitles.add(title.toLowerCase());
    }

    if (validPermissions.length === 0) {
      const msg = "Please add at least one permission feature.";
      setError(msg);
      toast.error(msg);
      return;
    }

    const userPayload = currentUser ? { name: currentUser.name, role: currentUser.role } : undefined;

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      permissions: validPermissions,
      user: userPayload,
    };

    setSubmitting(true);
    try {
      if (isEdit && editId) {
        await updatePermission(editId, payload);
        toast.success("Permission group updated successfully");
      } else {
        await createPermission(payload);
        toast.success("Permission group created successfully");
      }
      onSuccess ? onSuccess() : router.push(routes.permission.list());
    } catch (err) {
      const msg = err instanceof Error ? err.message : isEdit ? "Failed to update" : "Failed to create";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 6, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2, color: "text.secondary" }}>Loading permission group…</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto" }}>
      <Box sx={{ px: 4, py: 4, bgcolor: "background.paper", borderRadius: 2, boxShadow: 1 }}>
        <PageHeader
          title={isEdit ? "Edit Permission Group" : "Create Permission Group"}
          subtitle={isEdit ? name : "Add a new permission group and configure its features."}
          action={
            <Button variant="outlined" onClick={() => router.push(routes.permission.list())}>
              Back to list
            </Button>
          }
        />

        {error && (
          <Alert severity="error" onClose={() => setError("")} sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" id="permission-form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
            <FormTextField
              label="Group Name"
              value={name}
              onChange={setName}
              required
              fullWidth
              disabled={isEdit || submitting}
              placeholder="e.g. Content Editors"
              helperText={isEdit ? "Group name cannot be changed." : undefined}
            />

            <FormTextField
              label="Description"
              value={description}
              onChange={setDescription}
              fullWidth
              multiline
              rows={1}
              disabled={submitting}
              placeholder="Brief description of this group's purpose"
            />
          </Box>

          <Box>
            <Typography variant="h6" fontWeight={600} mb={1}>
              Permissions Features
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Add the specific features and modules this group can access.
            </Typography>

            <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
              {permissions.map((p, idx) => (
                <Box key={idx}>
                  {idx > 0 && <Divider />}
                  <Box sx={{ p: 2.5, display: "flex", flexWrap: "wrap", gap: 3, alignItems: "center" }}>
                    
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 250 }}>
                      <TextField
                        label="Display Name"
                        placeholder="e.g. Dashboard"
                        value={p.display_name}
                        onChange={(e) => updatePermissionField(idx, "display_name", e.target.value)}
                        size="small"
                        required
                        disabled={submitting}
                      />
                      <TextField
                        label="System ID"
                        placeholder="e.g. dashboard"
                        value={p.title_name}
                        onChange={(e) => updatePermissionField(idx, "title_name", e.target.value)}
                        size="small"
                        required
                        disabled={submitting}
                        helperText="Used in code to map access."
                      />
                    </Box>

                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, flex: 2, minWidth: 280 }}>
                      <Typography variant="subtitle2" sx={{ width: "100%", color: "text.secondary", mb: -1 }}>Access Rights</Typography>
                      {ACCESS_KEYS.map((key) => (
                        <FormControlLabel
                          key={key}
                          control={
                            <Checkbox
                              size="small"
                              checked={Boolean(p.access?.[key])}
                              onChange={(e) => updatePermissionAccess(idx, key, e.target.checked)}
                              disabled={submitting}
                            />
                          }
                          label={key.charAt(0).toUpperCase() + key.slice(1)}
                        />
                      ))}
                    </Box>

                    <Box sx={{ ml: "auto" }}>
                      <IconButton
                        color="error"
                        onClick={() => handleRemovePermission(idx)}
                        disabled={submitting || permissions.length === 1}
                        title="Remove feature"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>

                  </Box>
                </Box>
              ))}
            </Paper>

            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddPermission}
              disabled={submitting}
              sx={{ mt: 2, fontWeight: 600, textTransform: "none" }}
            >
              Add Another Feature
            </Button>
          </Box>

          <FormFooter
            formId="permission-form"
            submitting={submitting}
            submitLabel={isEdit ? "Update Group" : "Create Group"}
            submittingLabel={isEdit ? "Updating…" : "Creating…"}
            onCancel={() => router.push(routes.permission.list())}
          />
        </Box>
      </Box>
    </Box>
  );
}
