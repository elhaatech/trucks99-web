import { routes } from "@/lib/routes";

export type NotificationLinkInput = {
  event?: string;
  loadId?: string;
  productId?: string;
  postId?: string;
  postType?: string;
  metadata?: {
    route?: string;
    productId?: string;
    postId?: string;
    postType?: string;
    entityType?: string;
    entityId?: string;
    loadId?: string;
    truckId?: string;
  } | null;
};

function firstId(...values: unknown[]): string {
  for (const value of values) {
    if (value == null) continue;
    const s = String(value).trim();
    if (s && s !== "undefined" && s !== "null") return s;
  }
  return "";
}

function idFromRoute(route: string | undefined, kind: "products" | "loads" | "trucks"): string {
  if (!route) return "";
  const match = String(route).match(new RegExp(`/(?:portal/)?${kind}/([^/?#]+)`, "i"));
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

/** Map a notification to the admin page that should open (product / load / truck). */
export function resolveNotificationHref(n: NotificationLinkInput): string | null {
  const meta = n.metadata || {};
  const postType = String(meta.postType || meta.entityType || n.postType || "").toUpperCase();

  const productId = firstId(
    meta.productId,
    n.productId,
    postType === "PRODUCT" ? meta.postId || meta.entityId || n.postId : "",
    idFromRoute(meta.route, "products"),
  );
  const loadId = firstId(
    meta.loadId,
    n.loadId,
    postType === "LOAD" ? meta.postId || meta.entityId || n.postId : "",
    idFromRoute(meta.route, "loads"),
  );
  const truckId = firstId(
    meta.truckId,
    postType === "TRUCK" ? meta.postId || meta.entityId || n.postId : "",
    idFromRoute(meta.route, "trucks"),
  );

  if (productId) return routes.buysell.view(productId);
  if (loadId) return routes.load.view(loadId);
  if (truckId) return routes.truck.view(truckId);

  if (n.event === "featured_free_plan_request") {
    return routes.buysell.featuredVehicles();
  }

  const route = meta.route;
  if (
    route &&
    !route.startsWith("/portal/products") &&
    !route.startsWith("/portal/loads") &&
    !route.startsWith("/portal/trucks") &&
    route !== "/admin/portal/notifications"
  ) {
    return route;
  }

  return null;
}
