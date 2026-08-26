import { api } from "./common";

// ——— In-app Notification ———
export type Notification = {
  _id: string;
  id?: string;
  userId: string;
  title: string;
  message: string;
  event?: string;
  loadId?: string;
  productId?: string;
  read?: boolean;
  createdAt?: string;
  postId?: string;
  postType?: string;
  metadata?: {
    route?: string;
    placementId?: string;
    productId?: string;
    postId?: string;
    postType?: string;
    entityType?: string;
    entityId?: string;
    loadId?: string;
    truckId?: string;
    requestStatus?: string;
    source?: string;
  };
};

export const NOTIFICATIONS_CHANGED_EVENT = "itruck-notifications-changed";

/** Admin portal only lists admin-role notifications. */
const PORTAL_AUDIENCE = "admin";

export function notifyNotificationsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}

export async function getNotifications(): Promise<Notification[]> {
  return api<Notification[]>(`/api/notification?audience=${PORTAL_AUDIENCE}`);
}

export async function markNotificationRead(id: string) {
  return api<Notification>(`/api/notification/${id}/read`, { method: "PUT" });
}

export async function markAllNotificationsRead() {
  return api<{ message: string }>("/api/notification/read-all", {
    method: "PUT",
    body: JSON.stringify({ audience: PORTAL_AUDIENCE }),
  });
}

// ——— Admin: delivery history ———
export type NotificationLogEntry = {
  _id: string;
  id?: string;
  userId?: { _id: string; name?: string; mobile?: string; email?: string };
  event: string;
  channel: "in_app" | "whatsapp" | "sms" | "email" | "push";
  title?: string;
  message: string;
  status: "pending" | "sent" | "delivered" | "failed" | "skipped";
  errorMessage?: string | null;
  sentAt?: string | null;
  createdAt?: string;
};

export type NotificationHistoryResponse = {
  data: NotificationLogEntry[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

export async function getNotificationHistory(params?: {
  page?: number;
  limit?: number;
  event?: string;
  channel?: string;
  status?: string;
  userId?: string;
}): Promise<NotificationHistoryResponse> {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.event) q.set("event", params.event);
  if (params?.channel) q.set("channel", params.channel);
  if (params?.status) q.set("status", params.status);
  if (params?.userId) q.set("userId", params.userId);
  const qs = q.toString();
  return api<NotificationHistoryResponse>(
    `/api/notification/history${qs ? `?${qs}` : ""}`,
  );
}

// ——— Admin: templates ———
export type NotificationTemplate = {
  _id: string;
  id?: string;
  event: string;
  label: string;
  description?: string;
  enabled: boolean;
  channels: {
    in_app?: boolean;
    whatsapp?: boolean;
    sms?: boolean;
    email?: boolean;
    push?: boolean;
  };
  templates: {
    in_app?: { title?: string; body?: string };
    whatsapp?: { body?: string };
    sms?: { body?: string };
    email?: { subject?: string; body?: string };
    push?: { title?: string; body?: string };
  };
  placeholders?: string[];
};

export async function getNotificationTemplates(): Promise<NotificationTemplate[]> {
  return api<NotificationTemplate[]>("/api/notification/templates");
}

export async function getNotificationTemplate(event: string): Promise<NotificationTemplate> {
  return api<NotificationTemplate>(`/api/notification/templates/${encodeURIComponent(event)}`);
}

export async function updateNotificationTemplate(
  event: string,
  payload: Partial<NotificationTemplate>,
): Promise<NotificationTemplate> {
  return api<NotificationTemplate>(`/api/notification/templates/${encodeURIComponent(event)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function sendBulkNotification(payload: {
  userIds: string[];
  message: string;
  channels?: string[];
}) {
  return api<{ message: string }>("/api/notification/bulk", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
