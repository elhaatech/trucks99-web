import { userProductRoutes } from "@/lib/userProductRoutes";

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

function idFromRoute(route: string | undefined, kind: "products" | "product"): string {
  if (!route) return "";
  const match = String(route).match(new RegExp(`/(?:portal/)?${kind}/([^/?#]+)`, "i"));
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

/** Map a notification to the marketplace product detail page. */
export function resolveNotificationHref(n: NotificationLinkInput): string | null {
  const meta = n.metadata || {};
  const postType = String(meta.postType || meta.entityType || n.postType || "").toUpperCase();

  const productId = firstId(
    meta.productId,
    n.productId,
    postType === "PRODUCT" ? meta.postId || meta.entityId || n.postId : "",
    idFromRoute(meta.route, "products"),
    idFromRoute(meta.route, "product"),
  );

  if (productId) return userProductRoutes.view(productId);

  if (
    n.event === "featured_free_plan_approved" ||
    n.event === "featured_free_plan_rejected"
  ) {
    return userProductRoutes.myListings();
  }
  if (n.event === "featured_free_plan_request") {
    return userProductRoutes.featuredVehicles();
  }

  const route = meta.route;
  if (
    route &&
    route.startsWith("/") &&
    !route.startsWith("/portal/") &&
    route !== "/admin/portal/notifications"
  ) {
    return route;
  }

  return null;
}
