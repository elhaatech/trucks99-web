"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import type { Role, User } from "@/model/api";
import {
  createUser,
  getCurrentUser,
  getRoles,
  getRowId,
  updateUser,
} from "@/model/api";
import { useNotification } from "@/hooks/useNotification";
import { useForm } from "@/hooks/useForm";
import { routes } from "@/lib/routes";
import {
  BackButton,
  FormFooter,
  FormTextField,
  FormSelectField,
  FormPageLayout,
  FormGrid,
  FormGridFull,
} from "@/components/common";
import { resolveApiBase, getAuthHeaders } from "@/model/services/common";
import type { FormState } from "../interface/userTypes";
import { EMPTY_FORM } from "../interface/userTypes";

const FORM_ID = "user-form";

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeMobileInput(mobile: string): string {
  const trimmed = String(mobile).trim().replace(/\s/g, "");
  if (/^\d{10}$/.test(trimmed)) return `+91${trimmed}`;
  if (trimmed.startsWith("+")) return trimmed;
  return trimmed ? `+91${trimmed}` : "";
}

function isSuperAdminRole(role: Role): boolean {
  const name = (role.name || "").trim().toLowerCase();
  return name === "super admin" || name === "superadmin";
}

// Robustly extract roleId string from a user object
// — handles: populated object, plain string, uuid/id field
function extractRoleId(user: User): string {
  // 1. Try roleId field (may be string or populated object)
  const rid = user.roleId as unknown;
  if (rid) {
    if (typeof rid === "string" && rid.trim()) return rid.trim();
    if (typeof rid === "object") {
      const obj = rid as Record<string, unknown>;
      const val = (obj._id ?? obj.id ?? obj.uuid) as string | undefined;
      if (val && String(val).trim()) return String(val).trim();
    }
  }
  // 2. Fall back to embedded role object
  const role = user.role as unknown;
  if (role && typeof role === "object") {
    const obj = role as Record<string, unknown>;
    const val = (obj._id ?? obj.id ?? obj.uuid) as string | undefined;
    if (val && String(val).trim()) return String(val).trim();
  }
  return "";
}

// Resolve DB-stored relative path → full URL for display
function getFileUrl(path?: string | null): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${resolveApiBase()}${path}`;
}

// Upload image to backend — same pattern as VehicleBodyTypeForm
async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("key", "profile");
  formData.append("file", file);
  const res = await fetch(`${resolveApiBase()}/api/upload`, {
    method: "POST",
    body: formData,
    headers: { ...getAuthHeaders() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "File upload failed");
  return (data.url || data.path) as string;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface UserFormProps {
  user?: User;
  mode?: "create" | "edit";
  onSuccess?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function UserForm({ user, mode, onSuccess }: UserFormProps) {
  const effectiveMode: "create" | "edit" = mode ?? (user ? "edit" : "create");
  const isEdit = effectiveMode === "edit";

  const router = useRouter();
  const { notify } = useNotification();

  const { values, setFieldValue, setValues } = useForm<FormState>(EMPTY_FORM);

  const [roles, setRoles] = useState<Role[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [rolesLoaded, setRolesLoaded] = useState(false); // ✅ track when roles are ready

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── Load roles + currentUser once ────────────────────────────────────────
  useEffect(() => {
    Promise.all([getRoles(), getCurrentUser()])
      .then(([rolesRes, userRes]) => {
        setRoles(rolesRes ?? []);
        setCurrentUser(userRes as User);
        setRolesLoaded(true); // ✅ signal roles are ready
      })
      .catch(() => {
        setRoles([]);
        setCurrentUser(null);
        setRolesLoaded(true);
      });
  }, []);

  // ── Populate form values — wait until BOTH user prop AND roles are loaded ─
  // This is the key fix: if roles aren't loaded yet, the select has no options
  // and the pre-selected roleId won't match anything → shows blank.
  useEffect(() => {
    if (!rolesLoaded) return; // ✅ wait for roles before populating

    setImageFile(null);
    setImagePreviewUrl("");

    if (!user) {
      setValues(EMPTY_FORM);
      return;
    }

    setValues({
      name: user.name || "",
      mobile: user.mobile || "",
      companyName: user.company_name || "",
      city: user.city || "",
      state: user.state || "",
      country: user.country || "",
      profileImage: user.profileImage || "",
      roleId: extractRoleId(user), // ✅ robust extraction
    });
  }, [user, rolesLoaded, setValues]);

  // ── Object URL for image file preview ────────────────────────────────────
  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl("");
      return;
    }
    const objUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(objUrl);
    return () => URL.revokeObjectURL(objUrl);
  }, [imageFile]);

  // Local preview takes priority; fall back to stored URL resolved to full path
  const previewSrc = useMemo(
    () => imagePreviewUrl || getFileUrl(values.profileImage),
    [imagePreviewUrl, values.profileImage],
  );

  // Filter out Super Admin role from options
  const roleOptions = useMemo(
    () =>
      roles
        .filter((r) => !isSuperAdminRole(r))
        .map((r) => ({
          value: String(r._id ?? r.id ?? ""),
          label: r.name ?? "",
        }))
        .filter((o) => Boolean(o.value)),
    [roles],
  );

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const name = values.name.trim();
    if (!name) {
      const msg = "Name is required";
      setError(msg);
      notify({ type: "error", message: msg });
      return;
    }

    const roleId = values.roleId.trim();
    if (!roleId) {
      const msg = "Role is required";
      setError(msg);
      notify({ type: "error", message: msg });
      return;
    }

    const mobileNormalized = normalizeMobileInput(values.mobile);
    if (!mobileNormalized) {
      const msg = "Mobile is required";
      setError(msg);
      notify({ type: "error", message: msg });
      return;
    }

    // actor required by backend PUT /api/user/edit/:id
    const actorPayload = currentUser
      ? { name: currentUser.name, role: currentUser.role }
      : undefined;

    setSubmitting(true);
    try {
      // Upload new image first if a file was picked
      let finalProfileImage = values.profileImage;
      if (imageFile) {
        finalProfileImage = await uploadImage(imageFile);
      }

      if (isEdit && user) {
        await updateUser(getRowId(user), {
          name,
          roleId,
          mobile: mobileNormalized,
          company_name: values.companyName.trim() || undefined,
          city: values.city.trim() || undefined,
          state: values.state.trim() || undefined,
          country: values.country.trim() || undefined,
          profileImage: finalProfileImage || null,
          user: actorPayload,
        });
        notify({ type: "success", message: "User updated successfully." });
      } else {
        await createUser({
          name,
          roleId,
          mobile: mobileNormalized,
          company_name: values.companyName.trim() || undefined,
          city: values.city.trim() || undefined,
          state: values.state.trim() || undefined,
          country: values.country.trim() || undefined,
          profileImage: finalProfileImage || undefined,
          termsAccepted: true,
        });
        notify({ type: "success", message: "User created successfully." });
      }

      onSuccess ? onSuccess() : router.push(routes.user.list());
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : isEdit
            ? "Failed to update user"
            : "Failed to create user";
      setError(msg);
      notify({ type: "error", message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <FormPageLayout
      title={isEdit ? "Edit User" : "Create User"}
      subtitle={isEdit ? user?.name || "Edit existing user" : "Add a new user to the platform."}
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Users", href: routes.user.list() },
        { label: isEdit ? "Edit" : "Create" },
      ]}
      backButton={<BackButton fallback={routes.user.list()} label="Back to list" />}
      footer={
        <FormFooter
          formId={FORM_ID}
          submitting={submitting}
          submitLabel={isEdit ? "Update" : "Create"}
          submittingLabel={isEdit ? "Updating…" : "Creating…"}
          onCancel={() => router.push(routes.user.list())}
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
        id={FORM_ID}
        onSubmit={handleSubmit}
        sx={{ "& > *": { minWidth: 0 } }}
      >
        <FormGrid>
          {/* ── Row 1: Name · Mobile · Company ── */}
          <FormTextField
            label="Name"
            value={values.name}
            onChange={(v) => setFieldValue("name", v)}
            required
          />

          <FormTextField
            label="Mobile"
            value={values.mobile}
            onChange={(v) => setFieldValue("mobile", v)}
            placeholder="9876543210 or +919876543210"
            required
          />

          <FormTextField
            label="Company name"
            value={values.companyName}
            onChange={(v) => setFieldValue("companyName", v)}
          />

          {/* ── Row 2: City · State · Country ── */}
          <FormTextField
            label="City"
            value={values.city}
            onChange={(v) => setFieldValue("city", v)}
          />

          <FormTextField
            label="State"
            value={values.state}
            onChange={(v) => setFieldValue("state", v)}
          />

          <FormTextField
            label="Country"
            value={values.country}
            onChange={(v) => setFieldValue("country", v)}
          />

          {/* ── Row 3: Profile image upload ── */}
          <FormGridFull>
            <Button component="label" variant="outlined" size="small">
              {imageFile || values.profileImage
                ? "Change profile image"
                : "Upload profile image"}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
            </Button>

            {previewSrc && (
              <Box sx={{ mt: 1 }}>
                <Box
                  component="img"
                  src={previewSrc}
                  alt="Profile preview"
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                />
              </Box>
            )}

            {imageFile && (
              <Box sx={{ mt: 0.5 }}>
                <Box
                  component="span"
                  sx={{ fontSize: 12, color: "text.secondary" }}
                >
                  Selected: {imageFile.name}
                </Box>
              </Box>
            )}
          </FormGridFull>

          {/* ── Row 4: Role ── */}
          <FormGridFull>
            <FormSelectField
              label="Role"
              value={values.roleId}
              onChange={(v) => setFieldValue("roleId", v)}
              options={roleOptions}
              placeholder={rolesLoaded ? "— Select role —" : "Loading roles…"}
              required
              fullWidth
            />
          </FormGridFull>
        </FormGrid>
      </Box>
    </FormPageLayout>
  );
}
