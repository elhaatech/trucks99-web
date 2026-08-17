import type { BuySellProduct } from "@/model/services/buysellapi";
import type { SubscriptionItem } from "@/model/services/subscription";

export type FeaturedListingUiState = "none" | "pending" | "active" | "expired" | "cancelled";

export type FeaturedListingUi = {
  state: FeaturedListingUiState;
  packageName?: string;
  startDate: Date | null;
  endDate: Date | null;
  daysRemaining: number | null;
  expiredDaysAgo: number | null;
  showPayNow: boolean;
  payNowLabel: string;
  statusLabel: string;
};

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffCalendarDays(from: Date, to: Date): number {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function readFeaturedFields(product: BuySellProduct) {
  const f = product.featured;
  const p = product.placement;
  const packageName =
    f?.packageName?.trim() ||
    p?.packageName?.trim() ||
    undefined;
  const startDate = parseDate(
    f?.featuredStartDate ?? f?.featuredAt ?? p?.featuredStartDate ?? p?.createdAt,
  );
  let endDate = parseDate(
    f?.featuredEndDate ?? f?.expiresAt ?? p?.featuredEndDate ?? p?.expiresAt,
  );
  if (!endDate && (product as BuySellProduct & { featuredExpiryDate?: string }).featuredExpiryDate) {
    endDate = parseDate((product as BuySellProduct & { featuredExpiryDate?: string }).featuredExpiryDate);
  }
  let statusRaw = String(
    f?.featuredStatus ?? p?.status ?? "",
  )
    .trim()
    .toLowerCase();
  const legacyFeatured = (product as BuySellProduct & { isFeatured?: boolean }).isFeatured;
  if (!statusRaw && legacyFeatured === true && endDate) {
    statusRaw = "active";
  }
  if (!statusRaw && legacyFeatured === false) {
    statusRaw = "";
  }
  return { packageName, startDate, endDate, statusRaw };
}

export function formatFeaturedListingDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export type FeaturedCardStatus = "active" | "expired" | "notFeatured";

/**
 * Maps listing featured fields (`product.featured` / `product.placement`) to a simple
 * card status. Treats missing placement as not featured; past expiry as expired.
 */
export function getFeaturedStatus(
  product: BuySellProduct,
  now: Date = new Date(),
): FeaturedCardStatus {
  // Prefer explicit list API flag when present (do not confuse with is_favorite).
  if (typeof product.isFeatured === "boolean") {
    if (product.isFeatured) {
      const end = parseDate(product.featuredExpiryDate ?? product.featured?.expiresAt);
      if (!end || end.getTime() > now.getTime()) return "active";
      return "expired";
    }
    const end = parseDate(product.featuredExpiryDate ?? product.featured?.expiresAt);
    const statusRaw = String(
      product.featured?.featuredStatus ?? product.placement?.status ?? "",
    )
      .trim()
      .toLowerCase();
    if (end && end.getTime() <= now.getTime()) return "expired";
    if (statusRaw === "expired" || statusRaw === "cancelled") return "expired";
    return "notFeatured";
  }

  const ui = resolveFeaturedListingUi(product, { now });
  if (ui.state === "active") return "active";
  if (ui.state === "expired" || ui.state === "cancelled") return "expired";
  return "notFeatured";
}

export function resolveFeaturedListingUi(
  product: BuySellProduct,
  options?: {
    now?: Date;
    /** Right after payment, before GET product returns placement. */
    optimisticPlan?: SubscriptionItem | null;
  },
): FeaturedListingUi {
  const now = options?.now ?? new Date();
  const fromProduct = readFeaturedFields(product);
  let { packageName, startDate, endDate, statusRaw } = fromProduct;

  if ((!endDate || statusRaw === "") && options?.optimisticPlan) {
    packageName = options.optimisticPlan.packageName;
    startDate = now;
    endDate = new Date(now.getTime() + options.optimisticPlan.durationDays * 86400000);
    statusRaw = "active";
  }

  const base: FeaturedListingUi = {
    state: "none",
    packageName,
    startDate,
    endDate,
    daysRemaining: null,
    expiredDaysAgo: null,
    showPayNow: true,
    payNowLabel: "Mark as Featured",
    statusLabel: "Not featured",
  };

  if (!endDate && !statusRaw) {
    return base;
  }

  if (statusRaw === "pending") {
    return {
      ...base,
      state: "pending",
      showPayNow: false,
      payNowLabel: "Pending Approval",
      statusLabel: "Pending Approval",
    };
  }

  if (statusRaw === "rejected") {
    return {
      ...base,
      state: "none",
      showPayNow: true,
      payNowLabel: "Request Free Plan again",
      statusLabel: "Free Plan request declined",
    };
  }

  if (statusRaw === "cancelled") {
    return {
      ...base,
      state: "cancelled",
      showPayNow: true,
      payNowLabel: "Feature again",
      statusLabel: "Featured plan cancelled",
    };
  }

  const isPast = endDate ? endDate.getTime() <= now.getTime() : statusRaw === "expired";
  const isActive =
    !isPast &&
    (statusRaw === "active" || statusRaw === "") &&
    Boolean(endDate && endDate.getTime() > now.getTime());

  if (isActive && endDate) {
    const daysRemaining = Math.max(0, diffCalendarDays(now, endDate));
    return {
      ...base,
      state: "active",
      daysRemaining,
      showPayNow: false,
      payNowLabel: "",
      statusLabel: "Featured — live on TRUCKS99",
    };
  }

  if (isPast || statusRaw === "expired") {
    const expiredDaysAgo =
      endDate && endDate.getTime() <= now.getTime()
        ? Math.max(0, diffCalendarDays(endDate, now))
        : null;
    return {
      ...base,
      state: "expired",
      expiredDaysAgo,
      showPayNow: true,
      payNowLabel: "Renew featured plan",
      statusLabel: "Featured plan expired",
    };
  }

  return base;
}
