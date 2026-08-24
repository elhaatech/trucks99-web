import { api, clearToken, setToken, resolveApiBase } from "./common_fixed";
import { getAuthHeaders } from "@/services";
import { persistMarketplaceUserId, clearMarketplaceUserId } from "@/lib/marketplaceUser";
import { clearMarketplaceGuestKey } from "@/lib/marketplaceGuest";
import { notifyMarketplaceAuthChanged } from "@/lib/marketplaceAuth";
import { clearPendingFavorite } from "@/lib/pendingFavorite";
import { invalidateBuySellFavoritesCache } from "@/model/services/favoriteapi";
import { cachedRequest, invalidateCache } from "@/lib/apiCache";
import { normalizeRolePermissionsInput, type Role, getRoles as listRolesViaPost } from "./role";
import {
  getRoleDocumentId,
  pickBuySellMarketplaceRole,
} from "@/lib/marketplaceDefaultRole";

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
  const digits = String(mobile).trim().replace(/\D/g, "");
  const ten =
    digits.length === 10
      ? digits
      : digits.length === 11 && digits.startsWith("0")
        ? digits.slice(1)
        : digits.length === 12 && digits.startsWith("91")
          ? digits.slice(2)
          : digits.length > 10
            ? digits.slice(-10)
            : "";
  return /^\d{10}$/.test(ten) ? `+91${ten}` : "";
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

export class OtpError extends Error {
  remainingAttempts?: number;
  retryAfterSeconds?: number;

  constructor(
    message: string,
    options?: { remainingAttempts?: number; retryAfterSeconds?: number },
  ) {
    super(message);
    this.name = "OtpError";
    this.remainingAttempts = options?.remainingAttempts;
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }
}

async function postOtpJson<T>(
  path: string,
  body: Record<string, string | boolean>,
  timeoutMs = 30000,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const base = resolveApiBase();

  try {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => ({}))) as T & {
      message?: string;
      remainingAttempts?: number;
      retryAfterSeconds?: number;
    };

    if (!res.ok) {
      throw new OtpError(data.message || res.statusText || "Request failed", {
        remainingAttempts: data.remainingAttempts,
        retryAfterSeconds: data.retryAfterSeconds,
      });
    }

    return data as T;
  } catch (err) {
    if (err instanceof OtpError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        "OTP request timed out. Is the backend server running on port 3003?",
      );
    }
    if (err instanceof TypeError) {
      throw new Error(
        "Cannot reach backend API. Start server_trucks99 on port 3003.",
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

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

export type SendOtpResponse = {
  message: string;
  otpForDev?: string;
  otpSentViaSms?: boolean;
  smsError?: string;
  retryAfterSeconds?: number;
  isNewUser?: boolean;
};

/** POST /api/otp/send — body: { mobile, optional profile for new users } */
export async function sendOtp(mobile: string, profile?: SendOtpProfile) {
  const normalized = normalizeMobileInput(mobile);
  if (!normalized) throw new Error("Mobile number is required.");

  const body: Record<string, string | boolean> = { mobile: normalized };
  if (profile?.name?.trim()) body.name = profile.name.trim();
  if (profile?.email?.trim()) body.email = profile.email.trim();
  if (profile?.roleId) body.roleId = profile.roleId;
  if (profile?.company_name?.trim()) body.company_name = profile.company_name.trim();
  if (profile?.city?.trim()) body.city = profile.city.trim();
  if (profile?.state?.trim()) body.state = profile.state.trim();
  if (profile?.country?.trim()) body.country = profile.country.trim();
  if (profile?.profileImage?.trim()) body.profileImage = profile.profileImage.trim();
  if (profile?.termsAccepted === true) body.termsAccepted = true;

  return postOtpJson<SendOtpResponse>("/api/otp/send", body);
}

/** POST /api/otp/resend — body: { mobile } */
export async function resendOtp(mobile: string) {
  const normalized = normalizeMobileInput(mobile);
  if (!normalized) throw new Error("Mobile number is required.");

  return postOtpJson<{
    message: string;
    otpForDev?: string;
    otpSentViaSms?: boolean;
    smsError?: string;
    retryAfterSeconds?: number;
  }>("/api/otp/resend", { mobile: normalized });
}

/** POST /api/otp/verify — body: { mobile, otp } */
export async function verifyOtp(mobile: string, otp: string) {
  const normalized = normalizeMobileInput(mobile);
  if (!normalized || !otp?.trim()) {
    throw new Error("Mobile number and OTP are required.");
  }

  const res = await postOtpJson<{ message: string; token?: string; user: User }>(
    "/api/otp/verify",
    { mobile: normalized, otp: otp.trim() },
  );

  if (res.token) setToken(res.token);
  const uid = res.user?.id ?? res.user?._id;
  if (uid != null) persistMarketplaceUserId(String(uid));
  clearMarketplaceGuestKey();
  notifyMarketplaceAuthChanged();
  return { ...res, user: normalizeUserRoleEmbedded(res.user) };
}

export type MarketplaceRegisterInput = {
  name: string;
  mobile: string;
  company_name?: string;
  city?: string;
  state?: string;
  country?: string;
  profileImage?: string;
  termsAccepted?: boolean;
  /** Override only for admin flows; marketplace signup omits this. */
  roleId?: string;
};

/**
 * Public marketplace signup — assigns Buy/Sell role automatically when roleId is omitted.
 */
export async function registerMarketplaceUser(body: MarketplaceRegisterInput) {
  let roleId = body.roleId?.trim();
  if (!roleId) {
    const roles = await listRolesViaPost();
    const picked = pickBuySellMarketplaceRole(roles);
    if (!picked) {
      throw new Error(
        "Buy/Sell role is not configured. Please contact support or try again later.",
      );
    }
    roleId = getRoleDocumentId(picked);
  }
  const { roleId: _omit, ...rest } = body;
  return createUser({ ...rest, roleId });
}

export function invalidateCurrentUserCache(): void {
  invalidateCache("current-user");
}

export async function logout(): Promise<void> {
  const headers = getAuthHeaders();
  // Drop local auth first so the navbar cannot keep a stale session if the
  // API call is slow or fails.
  clearToken();
  clearMarketplaceUserId();
  clearPendingFavorite();
  invalidateCurrentUserCache();
  invalidateBuySellFavoritesCache();
  notifyMarketplaceAuthChanged();
  try {
    await fetch(`${resolveApiBase()}/api/logout`, {
      method: "DELETE",
      credentials: "include",
      headers,
    });
  } catch {
    // Server session may already be gone; client auth is already cleared.
  }
}

// ─── Current user ─────────────────────────────────────────────────────────────

/** GET /api/user — returns logged-in user with populated role + permissions */
export async function getCurrentUser() {
  return cachedRequest(
    "current-user",
    async () => {
      const user = await api<User>("/api/user");
      return normalizeUserRoleEmbedded(user);
    },
    15_000,
  );
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
    otpSentViaSms?: boolean;
    otpForDev?: string;
    otpSendError?: string;
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