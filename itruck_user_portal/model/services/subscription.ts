import { api } from "./common_fixed";
import type { ApiUser } from "./user";

// ——— Subscription Item ———
export type SubscriptionItem = {
  id: string; // UUID
  packageName: string;
  packageType: string;
  fieldName: string;
  price: number;
  durationDays: number;
  status: "active" | "inactive";
  description?: string;
  features?: string[];
};

// ——— Grouped subscriptions (response shape) ———
export type SubscriptionGrouped = {
  [fieldName: string]: SubscriptionItem[]; // e.g. load: [...], truck: [...], product: [...]
};

// ——— Subscription Document ———
export type Subscription = {
  _id: string;
  subscriptions: SubscriptionGrouped;
  createdAt?: string;
  updatedAt?: string;
};

// ——— Raw item input (for create / add-items) ———
export type SubscriptionItemInput = {
  packageName: string;
  packageType: string;
  fieldName: string;
  price: number;
  durationDays: number;
  status?: "active" | "inactive";
  description?: string;
  features?: string[];
  id?: string; // optional UUID for updates (if not provided, server generates one)
};

// ——— Update item input (requires id UUID) ———
export type SubscriptionItemUpdate = Partial<SubscriptionItemInput> & {
  id: string; // UUID of the item to update
};

// ——— GET /api/subscription/all ———
export async function getSubscriptionAll(
  packageType?: string
): Promise<Subscription[]> {
  const body = packageType
    ? { packageType }
    : {};

  return api<Subscription[]>("/api/subscription/all", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

/** Canonical package name for featured vehicle promotion plans. */
export const FEATURED_VEHICLE_PACKAGE_NAME = "Feature Your Vehicle";

export function isFeaturedVehiclePlan(item: SubscriptionItem): boolean {
  const name = (item.packageName ?? "").trim().toLowerCase();
  return name === FEATURED_VEHICLE_PACKAGE_NAME.toLowerCase();
}

/** Flatten grouped subscription documents into a single item list. */
export function flattenSubscriptionItems(docs: Subscription[]): SubscriptionItem[] {
  const items: SubscriptionItem[] = [];
  for (const doc of docs) {
    const grouped = doc.subscriptions;
    if (!grouped || typeof grouped !== "object") continue;
    for (const itemsArray of Object.values(grouped)) {
      if (!Array.isArray(itemsArray)) continue;
      items.push(...itemsArray);
    }
  }
  return items;
}

/** Active paid "Feature Your Vehicle" plans from subscription catalog (agent packages). */
export async function getFeaturedVehiclePlans(): Promise<SubscriptionItem[]> {
  const docs = await getSubscriptionAll("agent");
  const seen = new Map<string, SubscriptionItem>();

  for (const item of flattenSubscriptionItems(docs)) {
    if (!isFeaturedVehiclePlan(item)) continue;
    if (item.status !== "active") continue;
    if (Number(item.price) <= 0) continue;
    if (!item.id || seen.has(item.id)) continue;
    seen.set(item.id, item);
  }

  return [...seen.values()].sort(
    (a, b) => Number(a.price) - Number(b.price) || a.durationDays - b.durationDays,
  );
}

// ——— GET /api/subscription/:id ———
export async function getSubscription(id: string): Promise<Subscription> {
  return api<Subscription>(`/api/subscription/${id}`);
}

// ——— POST /api/subscription/add ———
export async function createSubscription(body: {
  subscriptions: SubscriptionItemInput[];
  user?: ApiUser;
}) {
  return api<{ message: string; subscription: Subscription }>(
    "/api/subscription/add",
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

// ——— POST /api/subscription/add-items/:id ———
export async function addSubscriptionItems(
  id: string,
  body: {
    items: SubscriptionItemInput[];
    user?: ApiUser;
  }
) {
  return api<{ message: string; subscription: Subscription }>(
    `/api/subscription/add-items/${id}`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

// ——— PUT /api/subscription/edit-items/:id ———
export async function updateSubscriptionItems(
  id: string,
  body: {
    updates: SubscriptionItemUpdate[];
    user?: ApiUser;
  }
) {
  return api<{
    message: string;
    subscription: Subscription;
    notFound?: string[];
  }>(`/api/subscription/edit-items/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

// ——— DELETE /api/subscription/delete  (entire documents by MongoDB _id) ———
export async function deleteSubscription(ids: string[]) {
  return api<{ message: string; deletedCount: number; ids: string[] }>(
    "/api/subscription/delete",
    {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    }
  );
}

// ——— DELETE /api/subscription/delete-items/:id  (items by UUID inside a doc) ———
export async function deleteSubscriptionItems(
  docId: string,
  ids: string[] // item-level UUIDs
) {
  return api<{ message: string; subscription: Subscription }>(
    `/api/subscription/delete-items/${docId}`,
    {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    }
  );
}