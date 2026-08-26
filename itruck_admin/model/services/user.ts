import {
  api,
  publicApi,
  clearToken,
  getAuthHeaders,
  setToken,
  joinApiUrl,
} from "./common";
import { persistMarketplaceUserId, clearMarketplaceUserId } from "@/lib/marketplaceUser";
import { normalizeRolePermissionsInput, type Role } from "./role";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PurchasedSubscription = {
  subscriptionItemId: string;
  fieldName: string;
  packageName: string;
  packageType: string;
  durationDays: number;
  price: number;
  paymentId?: string;
  orderId?: string;
  purchasedAt?: string;
  _id?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type User = {
  email: string;
  id: string;
  _id?: string;
  name?: string;
  mobile?: string | null;
  roleId?: string;
  role?: Role;
  permissions?: unknown[];
  modules?: unknown;
  company_name?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  profileImage?: string | null;
  status?: "active" | "inactive";
  purchasedSubscriptions?: PurchasedSubscription[];
};

export type ApiUser = { name?: string; role?: { name?: string } | string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeMobileInput(mobile: string): string {
  const trimmed = String(mobile).trim().replace(/\s/g, "");
  if (/^\d{10}$/.test(trimmed)) return `+91${trimmed}`;
  if (trimmed.startsWith("+")) return trimmed;
  return `+91${trimmed}`;
}

function normalizeUserRoleEmbedded(user: User): User {
  const r = user.role;
  if (!r?.permissions) return user;
  return {
    ...user,
    role: {
      ...r,
      permissions: normalizeRolePermissionsInput(r.permissions as unknown),
    },
  };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/** POST /api/login — Admin email + password */
export async function loginWithPassword(email: string, password: string) {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) throw new Error("Email is required.");
  if (!password) throw new Error("Password is required.");

  const res = await publicApi<{ message: string; token?: string; user: User }>("/api/login", {
    method: "POST",
    body: JSON.stringify({ email: trimmedEmail, password }),
  });
  if (res.token) setToken(res.token);
  const uid = res.user?.id ?? res.user?._id;
  if (uid != null) persistMarketplaceUserId(String(uid));
  return { ...res, user: normalizeUserRoleEmbedded(res.user) };
}

/** POST /api/otp/send — body: { mobile, optional profile for new users } */
export type SendOtpProfile = {
  name?: string;
  email?: string;
  roleId?: string;
  company_name?: string;
  city?: string;
  state?: string;
  country?: string;
  profileImage?: string;
  termsAccepted?: boolean;
};

export async function sendOtp(mobile: string, profile?: SendOtpProfile) {
  const normalized = normalizeMobileInput(mobile);
  if (!normalized) throw new Error("Mobile number is required.");
  const payload: Record<string, unknown> = { mobile: normalized };
  if (profile?.name?.trim()) payload.name = profile.name.trim();
  if (profile?.email?.trim()) payload.email = profile.email.trim();
  if (profile?.roleId) payload.roleId = profile.roleId;
  if (profile?.company_name?.trim()) payload.company_name = profile.company_name.trim();
  if (profile?.city?.trim()) payload.city = profile.city.trim();
  if (profile?.state?.trim()) payload.state = profile.state.trim();
  if (profile?.country?.trim()) payload.country = profile.country.trim();
  if (profile?.profileImage?.trim()) payload.profileImage = profile.profileImage.trim();
  if (profile?.termsAccepted === true) payload.termsAccepted = true;

  return publicApi<{
    message: string;
    otpForDev?: string;
    otpSentViaSms?: boolean;
    isNewUser?: boolean;
    smsError?: string;
    retryAfterSeconds?: number;
  }>("/api/otp/send", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** POST /api/otp/verify — body: { mobile, otp } */
export async function verifyOtp(mobile: string, otp: string) {
  const normalized = normalizeMobileInput(mobile);
  if (!normalized || !otp?.trim()) throw new Error("Mobile number and OTP are required.");
  const res = await publicApi<{ message: string; token?: string; user: User }>("/api/otp/verify", {
    method: "POST",
    body: JSON.stringify({ mobile: normalized, otp: otp.trim() }),
  });
  if (res.token) setToken(res.token);
  const uid = res.user?.id ?? res.user?._id;
  if (uid != null) persistMarketplaceUserId(String(uid));
  return { ...res, user: normalizeUserRoleEmbedded(res.user) };
}

export async function logout(): Promise<void> {
  await fetch(joinApiUrl("/api/logout"), {
    method: "DELETE",
    credentials: "include",
    headers: getAuthHeaders(),
  });
  clearToken();
  clearMarketplaceUserId();
}

// ─── Current user ─────────────────────────────────────────────────────────────

/** GET /api/user — returns logged-in user with populated role + permissions */
export async function getCurrentUser() {
  const user = await api<User>("/api/user");
  return normalizeUserRoleEmbedded(user);
}

// ─── User CRUD ────────────────────────────────────────────────────────────────

/**
 * POST /api/user/all — list all users.
 * Optionally pass { search } to filter by name, mobile, or company_name.
 */
export async function getUserAll(params?: { search?: string }): Promise<User[]> {
  const payload = params?.search?.trim() ? { search: params.search.trim() } : {};
  return api<User[]>("/api/user/all", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** GET /api/user/:id — get one user by id */
export async function getUser(id: string): Promise<User> {
  return api<User>(`/api/user/${id}`);
}

/**
 * POST /api/signup — create a new user (public signup route used by admin panel too).
 * Backend fields: name, roleId, mobile, company_name, city, state, country, profileImage
 */
export async function createUser(body: {
  name: string;
  roleId: string;
  mobile: string;
  company_name?: string;
  city?: string;
  state?: string;
  country?: string;
  profileImage?: string;
  termsAccepted?: boolean;
}) {
  const { name, roleId, mobile, company_name, city, state, country, profileImage, termsAccepted } = body;

  if (!name?.trim()) throw new Error("Name is required.");
  if (!roleId) throw new Error("Role is required.");
  if (!mobile?.trim()) throw new Error("Mobile is required.");

  const payload: Record<string, unknown> = {
    name: name.trim(),
    roleId,
    mobile: normalizeMobileInput(mobile.trim()),
  };

  if (termsAccepted === true) payload.termsAccepted = true;

  // optional fields — only send if provided
  if (company_name?.trim()) payload.company_name = company_name.trim();
  if (city?.trim()) payload.city = city.trim();
  if (state?.trim()) payload.state = state.trim();
  if (country?.trim()) payload.country = country.trim();
  if (profileImage?.trim()) payload.profileImage = profileImage.trim();

  return api<{
    message: string;
    userObj?: User;
    loginType?: string;
    otpSentToMobile?: boolean;
    otpForDev?: string;
  }>("/api/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * PUT /api/user/edit/:id — update an existing user.
 * Backend fields: name (required), roleId, permissions, mobile, profileImage, user (actor)
 */
export async function updateUser(
  id: string,
  body: {
    name: string;
    roleId?: string;
    permissions?: {
      title_name: string;
      access?: { create?: boolean; view?: boolean; edit?: boolean; delete?: boolean };
    }[];
    mobile?: string;
    company_name?: string;
    city?: string;
    state?: string;
    country?: string;
    profileImage?: string | null;
    user?: ApiUser; // actor (requesting user) — required by backend
  }
) {
  const { name, roleId, permissions, mobile, company_name, city, state, country, profileImage, user } = body;

  if (!name?.trim()) throw new Error("Name is required.");
  if (!user) throw new Error("Requesting user (actor) is required.");

  const payload: Record<string, unknown> = {
    name: name.trim(),
    user, // actor — backend key is "user"
  };

  if (roleId) payload.roleId = roleId;
  if (Array.isArray(permissions)) payload.permissions = permissions;
  if (mobile !== undefined) payload.mobile = mobile ? normalizeMobileInput(mobile) : "";
  if (company_name !== undefined) payload.company_name = company_name ?? null;
  if (city !== undefined) payload.city = city ?? null;
  if (state !== undefined) payload.state = state ?? null;
  if (country !== undefined) payload.country = country ?? null;
  // profileImage: send null to clear, string to update, omit to leave unchanged
  if (profileImage !== undefined) payload.profileImage = profileImage ?? null;

  return api<{ message: string; user: User }>(`/api/user/edit/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/**
 * DELETE /api/user/delete — delete user by mobile or id.
 * Body: { mobile?, id?, name?, user? (actor) }
 */
export async function deleteUser(body: {
  mobile?: string;
  id?: string;
  name?: string;
  user?: ApiUser;
}) {
  return api<{ message: string; user: User }>("/api/user/delete", {
    method: "DELETE",
    body: JSON.stringify(body),
  });
}

/** POST /api/signup — kept for backwards compat with signup page */
export async function signup(body: { name: string; roleId: string; mobile: string; termsAccepted?: boolean }) {
  return createUser(body);
}

// ─── Helpers (re-exported for consumers) ──────────────────────────────────────

/** Extracts a stable string id from a User object (uuid > _id fallback) */
export function getRowId(user: User): string {
  return String(user.id || user._id || "");
}

/** Block or unblock a user/entity */
export async function blockUnblock(
  entity: "user" | string,
  id: string,
  action: "block" | "unblock"
) {
  return api<{ message: string }>(`/api/${entity}/${action}/${id}`, {
    method: "PUT",
    body: JSON.stringify({}),
  });
}

/** Fetch all roles */
export async function getRoles(): Promise<Role[]> {
  return api<Role[]>("/api/role/all");
}