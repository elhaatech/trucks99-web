import type { BuySellProduct, BuySellSpecification, BuySellDashboardMetrics } from "@/model/services/buysellapi";

export function extractId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "object" && value !== null) {
    const obj = value as { _id?: unknown; id?: unknown };
    if (obj._id) return String(obj._id);
    if (obj.id) return String(obj.id);
  }
  return String(value);
}

export function pullSpec(
  specifications: BuySellSpecification[] | undefined,
  ...names: string[]
): string | undefined {
  if (!specifications) return undefined;
  const wanted = names.map((n) => n.toLowerCase());
  const match = specifications.find((s) => {
    const specName = s.specification_info?.specification_name?.toLowerCase();
    return specName && wanted.includes(specName);
  });
  if (!match) return undefined;
  return (
    match.specification_value_info?.specification_value_name ??
    (match.specification_value as string | undefined)
  );
}

export function getProductTitle(product: BuySellProduct): string {
  if (product.description?.trim()) return product.description.trim();
  const sub =
    typeof product.subcategory_id === "object" && product.subcategory_id
      ? product.subcategory_id.sub_category_name
      : null;
  const cat =
    typeof product.category_id === "object" && product.category_id
      ? product.category_id.category_name
      : null;
  if (sub && cat) return `${sub} · ${cat}`;
  if (sub) return sub;
  if (cat) return cat;
  return product.bsNumber || "Commercial Vehicle";
}

export function formatVehicleIdDisplay(vehicleId?: string | null): string {
  const id = String(vehicleId ?? "").trim();
  if (!id) return "";
  return `Vehicle ID: ${id}`;
}

export function getProductVehicleId(product: {
  vehicleId?: string | null;
  bsNumber?: string | null;
}): string {
  const id = String(product.vehicleId ?? "").trim();
  if (id) return id;
  const bs = String(product.bsNumber ?? "").trim();
  if (/^\d{10}$/.test(bs)) return bs;
  return "";
}

export function getProductBsNumber(product: { bsNumber?: string | null }): string {
  const bs = String(product.bsNumber ?? "").trim();
  if (!bs || /^\d{10}$/.test(bs)) return "";
  return bs;
}

export function getProductLocation(product: BuySellProduct): string {
  const fromInfo = [product.city_info?.name, product.state_info?.name]
    .filter(Boolean)
    .join(", ");
  if (fromInfo) return fromInfo;
  if (product.address?.trim()) return product.address.trim();
  if (product.pincode?.trim()) return product.pincode.trim();
  return "";
}

export function getProductSubtitle(product: BuySellProduct): string {
  const year = pullSpec(
    product.specifications,
    "year",
    "manufacture year",
    "make year",
  );
  const brand = pullSpec(product.specifications, "brand", "make");
  const model = pullSpec(product.specifications, "model");
  const parts = [
    year ? `${year} Model` : null,
    brand && model ? `${brand} ${model}` : brand || model,
  ].filter(Boolean);
  return parts.join(" · ") || getProductLocation(product) || "";
}

export function getSpecDisplayValue(spec: BuySellSpecification): string {
  const name = spec.specification_info?.specification_name?.toLowerCase() ?? "";
  const raw =
    spec.specification_value_info?.specification_value_name ??
    (spec.specification_value != null ? String(spec.specification_value) : "");

  if (!raw) return "—";
  if (name.includes("km") || name.includes("mileage") || name.includes("driven")) {
    const n = Number(String(raw).replace(/[^\d.]/g, ""));
    if (Number.isFinite(n)) return `${n.toLocaleString("en-IN")} km`;
  }
  return raw;
}

export function productSpecsToEntries(
  specifications: BuySellSpecification[] | undefined,
): Array<{ label: string; value: string }> {
  if (!specifications?.length) return [];
  return specifications.map((spec, idx) => ({
    label: spec.specification_info?.specification_name ?? `Specification ${idx + 1}`,
    value: getSpecDisplayValue(spec),
  }));
}

export function formatProductPrice(price: number | string | null | undefined): string {
  const n = Number(price);
  if (!Number.isFinite(n)) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
}

export function sortProducts(
  products: BuySellProduct[],
  sortBy: "newest" | "price_asc" | "price_desc" | "views",
): BuySellProduct[] {
  const copy = [...products];
  switch (sortBy) {
    case "price_asc":
      return copy.sort((a, b) => Number(a.price) - Number(b.price));
    case "price_desc":
      return copy.sort((a, b) => Number(b.price) - Number(a.price));
    case "views":
      return copy.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
    case "newest":
    default:
      return copy.sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
      );
  }
}

export function filterProductsBySearch(
  products: BuySellProduct[],
  search: string,
): BuySellProduct[] {
  const q = search.trim().toLowerCase();
  if (!q) return products;
  return products.filter((p) => {
    const title = getProductTitle(p).toLowerCase();
    const bs = (p.bsNumber ?? "").toLowerCase();
    const cat =
      typeof p.category_id === "object" && p.category_id
        ? p.category_id.category_name.toLowerCase()
        : "";
    const sub =
      typeof p.subcategory_id === "object" && p.subcategory_id
        ? p.subcategory_id.sub_category_name.toLowerCase()
        : "";
    const loc = getProductLocation(p).toLowerCase();
    return (
      title.includes(q) ||
      bs.includes(q) ||
      cat.includes(q) ||
      sub.includes(q) ||
      loc.includes(q)
    );
  });
}

export type MarketplaceStats = {
  totalListings: number;
  activeListings: number;
  soldVehicles: number;
  totalOffers: number;
};

/** Map GET /api/buy-sell/dashboard-stats metrics to dashboard cards. */
export function mapDashboardMetricsToMarketplaceStats(
  metrics: BuySellDashboardMetrics,
): MarketplaceStats {
  return {
    totalListings: metrics.totalListings ?? 0,
    activeListings: metrics.activeListings ?? 0,
    soldVehicles: metrics.soldVehicles ?? 0,
    totalOffers: metrics.totalOffers ?? 0,
  };
}

export function deriveMarketplaceStats(products: BuySellProduct[]): MarketplaceStats {
  let activeListings = 0;
  let soldVehicles = 0;
  let totalOffers = 0;

  for (const p of products) {
    const status = (p.status ?? "").toLowerCase();
    if (status === "active" || status === "pending") activeListings += 1;
    if (status === "sold" || status === "purchased") soldVehicles += 1;
    const extended = p as BuySellProduct & { bid_count?: number; bit_records?: unknown[] };
    if (typeof extended.bid_count === "number") {
      totalOffers += extended.bid_count;
    } else if (Array.isArray(extended.bit_records)) {
      totalOffers += extended.bit_records.length;
    }
  }

  return {
    totalListings: products.length,
    activeListings,
    soldVehicles,
    totalOffers,
  };
}
