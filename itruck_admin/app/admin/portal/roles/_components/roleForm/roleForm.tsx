"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";

import type { User } from "@/model/api";
import {
  type Role,
  type PermissionGroup,
  type PermissionAccess,
  isPermissionGroup,
  getPermissionGroups,
  createRole,
  updateRole,
} from "@/model/services/role";
import { DEFAULT_PERMISSION_TEMPLATE, type PermissionItem } from "@/model/services/permission";
import { getCurrentUser } from "@/model/api";
import { BackButton, FormFooter, FormTextField, FormPageLayout, FormGrid, FormGridFull } from "@/components/common";
import { routes } from "@/lib/routes";
import { useToast } from "@/lib/toast";
import React from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACCESS_KEYS: (keyof Omit<PermissionAccess, "list">)[] = [
  "create",
  "view",
  "edit",
  "delete",
];

function getUserPayload(u: User | null) {
  return u ? { name: u.name, role: u.role } : undefined;
}

/**
 * Safely extracts the PermissionGroup _id from a role regardless of which
 * union member `role.permissions` currently holds.
 */
function resolveSelectedGroupId(role?: Role): string {
  if (!role) return "";
  const p = role.permissions;
  // Populated PermissionGroup object → use its _id
  if (isPermissionGroup(p)) return p._id;
  // Flat RolePermissionsMap or null/undefined → no _id available
  return "";
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RoleFormProps {
  role?: Role;
  mode?: "create" | "edit";
  onSuccess?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RoleForm({ role, mode, onSuccess }: RoleFormProps) {
  const router = useRouter();
  const toast = useToast();

  const effectiveMode: "create" | "edit" = mode ?? (role ? "edit" : "create");
  const isEdit = effectiveMode === "edit";

  // ── Auth user
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // ── Form state
  const [name, setName] = useState(role?.name || "");
  const [description, setDescription] = useState(role?.description || "");
  const [status, setStatus] = useState<"admin" | "user">(role?.status ?? "user");

  // ── Permission group selection
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  /**
   * selectedGroupId holds the _id of the chosen PermissionGroup.
   * On edit we pre-populate from role.permissions (only when it is a
   * populated PermissionGroup — not a flat RolePermissionsMap).
   */
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    () => resolveSelectedGroupId(role)
  );

  // Derived: the currently selected group object (for displaying checkboxes)
  const selectedGroup: PermissionGroup | null =
    permissionGroups.find((g) => g._id === selectedGroupId) ?? null;

  // Merge the selected group's permissions with the default template so all 25 items are always visible
  const previewPermissions: PermissionItem[] = React.useMemo(() => {
    if (!selectedGroup) return [];
    
    const merged = JSON.parse(JSON.stringify(DEFAULT_PERMISSION_TEMPLATE)) as PermissionItem[];
    const fetchedItems = selectedGroup.permissions || [];
    
    for (const fetched of fetchedItems) {
      const t = (fetched.title_name || "").toLowerCase();
      const existingIdx = merged.findIndex(p => p.title_name.toLowerCase() === t);
      
      const normalizedAccess = {
        create: Boolean(fetched.access?.create),
        view: Boolean(fetched.access?.view),
        edit: Boolean(fetched.access?.edit || fetched.access?.update),
        delete: Boolean(fetched.access?.delete),
        list: Boolean(fetched.access?.list),
      };

      if (existingIdx >= 0) {
        merged[existingIdx].access = normalizedAccess;
        if (fetched.display_name) merged[existingIdx].display_name = fetched.display_name;
      } else if (fetched.title_name) {
        merged.push({
          title_name: fetched.title_name,
          display_name: fetched.display_name || fetched.title_name,
          access: normalizedAccess,
        });
      }
    }
    return merged;
  }, [selectedGroup]);

  // ── Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ── Load current user
  useEffect(() => {
    getCurrentUser()
      .then((u) => setCurrentUser(u as User))
      .catch(() => setCurrentUser(null));
  }, []);

  // ── Load permission groups
  useEffect(() => {
    setLoadingGroups(true);
    getPermissionGroups()
      .then((groups) => {
        setPermissionGroups(groups);
        // In create mode default to the first group if nothing is selected yet
        if (!selectedGroupId && groups.length > 0) {
          setSelectedGroupId(groups[0]._id);
        }
      })
      .catch(() => toast.error("Failed to load permission groups"))
      .finally(() => setLoadingGroups(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync fields when `role` prop changes (e.g. parent refetches)
  useEffect(() => {
    if (!role) return;
    setName(role.name || "");
    setDescription(role.description || "");
    setStatus(role.status ?? "user");
    setSelectedGroupId(resolveSelectedGroupId(role));
  }, [role]);

  // ── Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      const msg = "Name is required";
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!selectedGroupId) {
      const msg = "Please select a permission group";
      setError(msg);
      toast.error(msg);
      return;
    }

    const user = getUserPayload(currentUser);
    const payload = {
      description: description.trim() || undefined,
      permissions: selectedGroupId, // ObjectId string — what the backend expects
      status,
      user,
    };

    setSubmitting(true);
    try {
      if (isEdit && role) {
        await updateRole({ name: role.name, ...payload });
        toast.success("Role updated successfully");
      } else {
        await createRole({ name: name.trim(), ...payload });
        toast.success("Role created successfully");
      }
      onSuccess ? onSuccess() : router.push(routes.role.list());
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : isEdit
          ? "Failed to update role"
          : "Failed to create role";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <FormPageLayout
      title={isEdit ? "Edit Role" : "Create Role"}
      subtitle={isEdit ? role?.name : "Add a new role and assign a permission group."}
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Roles", href: routes.role.list() },
        { label: isEdit ? "Edit" : "Create" },
      ]}
      backButton={<BackButton fallback={routes.role.list()} label="Back to list" />}
      footer={
        <FormFooter
          formId="role-form"
          submitting={submitting}
          submitLabel={isEdit ? "Update" : "Create"}
          submittingLabel={isEdit ? "Updating…" : "Creating…"}
          onCancel={() => router.push(routes.role.list())}
        />
      }
    >
      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2.5 }}>
          {error}
        </Alert>
      )}

      <Box
        component="form"
        id="role-form"
        onSubmit={handleSubmit}
        sx={{ "& > *": { minWidth: 0 } }}
      >
        <FormGrid>
          {/* ── Name ── */}
          <FormTextField
            label="Name"
            value={name}
            onChange={setName}
            required
            disabled={isEdit}
          />

          {isEdit && (
            <FormGridFull>
              <Typography variant="caption" color="text.secondary">
                Role name cannot be changed.
              </Typography>
            </FormGridFull>
          )}

          {/* ── Status ── */}
          <FormControl size="small">
            <InputLabel id="role-status-label">Status</InputLabel>
            <Select
              labelId="role-status-label"
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as "admin" | "user")}
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>

          {/* ── Permission Group Selector ── */}
          <FormGridFull>
            <FormControl fullWidth size="small" disabled={loadingGroups}>
              <InputLabel id="permission-group-label">
                {loadingGroups ? "Loading permission groups…" : "Permission Group"}
              </InputLabel>
              <Select
                labelId="permission-group-label"
                label={
                  loadingGroups ? "Loading permission groups…" : "Permission Group"
                }
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                startAdornment={
                  loadingGroups ? (
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                  ) : null
                }
              >
                {permissionGroups.map((g) => (
                  <MenuItem key={g._id} value={g._id}>
                    <Box sx={{ display: "flex", flexDirection: "column" }}>
                      <Typography variant="body2" fontWeight={600}>
                        {g.name}
                      </Typography>
                      {g.description && (
                        <Typography variant="caption" color="text.secondary">
                          {g.description}
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </FormGridFull>

          {/* ── Read-only Permission Preview ── */}
          <FormGridFull>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Permissions Preview
              <Typography
                component="span"
                variant="caption"
                color="text.disabled"
                sx={{ ml: 1 }}
              >
                (read-only — managed via Permission Groups)
              </Typography>
            </Typography>

            {!selectedGroup && !loadingGroups && (
              <Typography variant="body2" color="text.secondary">
                Select a permission group above to preview its permissions.
              </Typography>
            )}

            {selectedGroup && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  maxHeight: 360,
                  overflowY: "auto",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 1.5,
                }}
              >
                {/* Group meta */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    pb: 1,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    mb: 0.5,
                  }}
                >
                  <Typography variant="body2" fontWeight={700}>
                    {selectedGroup.name}
                  </Typography>
                  {selectedGroup.description && (
                    <Typography variant="caption" color="text.secondary">
                      — {selectedGroup.description}
                    </Typography>
                  )}
                  <Chip
                    label={`${selectedGroup.permissions.length} items`}
                    size="small"
                    variant="outlined"
                    sx={{ ml: "auto" }}
                  />
                </Box>

                {previewPermissions.map((item) => (
                  <Box
                    key={item.title_name}
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 0.5,
                      py: 0.5,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      "&:last-child": { borderBottom: "none" },
                    }}
                  >
                    {/* Row label */}
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      sx={{ minWidth: 180, flexShrink: 0, color: item.access && Object.values(item.access).some(Boolean) ? 'text.primary' : 'text.disabled' }}
                    >
                      {item.display_name || item.title_name}
                    </Typography>

                    {/* Access flag checkboxes — visual only, not interactive */}
                    {ACCESS_KEYS.map((key) => (
                      <FormControlLabel
                        key={key}
                        sx={{ mr: 0 }}
                        control={
                          <Checkbox
                            size="small"
                            checked={Boolean(item.access?.[key])}
                            disableRipple
                            sx={{
                              pointerEvents: "none",
                              cursor: "default",
                              color: item.access?.[key]
                                ? "primary.main"
                                : "action.disabled",
                              "&.Mui-checked": { color: "primary.main" },
                            }}
                          />
                        }
                        label={
                          <Typography
                            variant="caption"
                            color={
                              item.access?.[key] ? "text.primary" : "text.disabled"
                            }
                          >
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                          </Typography>
                        }
                      />
                    ))}
                  </Box>
                ))}

                {previewPermissions.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    This permission group has no items defined.
                  </Typography>
                )}
              </Box>
            )}
          </FormGridFull>

          {/* ── Description ── */}
          <FormGridFull>
            <FormTextField
              label="Description"
              value={description}
              onChange={setDescription}
              multiline
              rows={2}
            />
          </FormGridFull>
        </FormGrid>
      </Box>
    </FormPageLayout>
  );
}