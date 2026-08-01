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

/** Loose name match (includes) for marketplace highlight chips. */
function normalizeSpecKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pullSpecLoose(
  specifications: BuySellSpecification[] | undefined,
  ...needles: string[]
): string | undefined {
  if (!specifications?.length) return undefined;
  const wanted = needles.map(normalizeSpecKey).filter(Boolean);

  // Prefer exact normalized name, then includes (longer needles first via caller order).
  let includesMatch: BuySellSpecification | undefined;
  for (const needle of wanted) {
    const exact = specifications.find((s) => {
      const specName = normalizeSpecKey(
        s.specification_info?.specification_name ?? "",
      );
      return specName === needle;
    });
    if (exact) {
      return (
        exact.specification_value_info?.specification_value_name ??
        (exact.specification_value != null
          ? String(exact.specification_value)
          : undefined)
      );
    }
  }

  for (const needle of wanted) {
    includesMatch = specifications.find((s) => {
      const specName = normalizeSpecKey(
        s.specification_info?.specification_name ?? "",
      );
      return Boolean(specName) && specName.includes(needle);
    });
    if (includesMatch) break;
  }

  if (!includesMatch) return undefined;
  return (
    includesMatch.specification_value_info?.specification_value_name ??
    (includesMatch.specification_value != null
      ? String(includesMatch.specification_value)
      : undefined)
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

export type ListingSpecChip = {
  key: "year" | "fuel" | "owners" | "listingId";
  label: string;
  /** Small caption shown above/beside the value (matches Vehicle Details). */
  caption: string;
};

function formatOwnersLabel(raw: string): string {
  const n = Number(String(raw).replace(/[^\d]/g, ""));
  if (Number.isFinite(n)) return String(n);
  return raw.trim();
}

/**
 * List-card highlights aligned with Vehicle Details:
 * Make Year, Fuel Type, No. of Owners, Listing ID.
 */
export function getListingSpecChips(product: BuySellProduct): ListingSpecChip[] {
  const highlights = product.listing_highlights;
  const specs = product.specifications;

  const year =
    highlights?.makeYear?.trim() ||
    pullSpecLoose(
      specs,
      "make year",
      "manufacture year",
      "model year",
      "year",
    );
  const fuel =
    highlights?.fuelType?.trim() ||
    pullSpecLoose(specs, "fuel type", "fuel");
  const owners =
    highlights?.owners?.trim() ||
    pullSpecLoose(
      specs,
      "no of owners",
      "number of owners",
      "no of owner",
      "number of owner",
      "owners",
      "owner",
    );
  const listingId =
    highlights?.listingId?.trim() || product.bsNumber?.trim() || "";

  // Skip unresolved ObjectId-looking selectable values.
  const looksLikeObjectId = (v?: string) =>
    Boolean(v && /^[a-f0-9]{24}$/i.test(v.trim()));

  const chips: ListingSpecChip[] = [];
  if (year?.trim() && !looksLikeObjectId(year)) {
    chips.push({ key: "year", caption: "Make Year", label: year.trim() });
  }
  if (fuel?.trim() && !looksLikeObjectId(fuel)) {
    chips.push({
      key: "fuel",
      caption: "Fuel Type",
      label: fuel.trim().toUpperCase(),
    });
  }
  if (owners?.trim() && !looksLikeObjectId(owners)) {
    chips.push({
      key: "owners",
      caption: "No. of Owners",
      label: formatOwnersLabel(owners),
    });
  }
  // if (listingId) {
  //   chips.push({
  //     key: "listingId",
  //     caption: "Listing ID",
  //     label: listingId,
  //   });
  // }
  return chips;
}

/** Prefer brand for card heading when specs are enriched. */
export function getListingCardTitle(product: BuySellProduct): string {
  const brand =
    product.listing_highlights?.brand?.trim() ||
    pullSpecLoose(product.specifications, "brand", "make");
  if (brand?.trim() && !/^[a-f0-9]{24}$/i.test(brand.trim())) return brand.trim();
  return getProductTitle(product);
}

/** Category / subcategory line under the card title. */
export function getListingCardCategory(product: BuySellProduct): string {
  const sub =
    typeof product.subcategory_id === "object" && product.subcategory_id
      ? product.subcategory_id.sub_category_name
      : null;
  const cat =
    typeof product.category_id === "object" && product.category_id
      ? product.category_id.category_name
      : null;
  return (sub || cat || "").trim();
}

const PLACEHOLDER_PERSON_NAMES = new Set([
  "buyer",
  "seller",
  "unknown",
  "admin",
  "user",
  "",
]);

function isPlaceholderPersonName(value?: string | null): boolean {
  if (value == null) return true;
  try {
    return PLACEHOLDER_PERSON_NAMES.has(String(value).trim().toLowerCase());
  } catch {
    return true;
  }
}

/** Prefer live `sellerName` from API enrichment; skip role placeholders like "Buyer". */
export function getSellerDisplayName(
  product?: BuySellProduct | null | Partial<BuySellProduct>,
): string {
  if (!product) return "Seller";
  try {
    const candidates = [product.sellerName, product.created_by];
    for (const c of candidates) {
      if (!isPlaceholderPersonName(c)) return String(c).trim();
    }
  } catch {
    /* ignore */
  }
  return "Seller";
}

export function getBuyerDisplayName(bit?: {
  buyer_name?: string | null;
  userName?: string | null;
} | null): string {
  if (!bit) return "Buyer";
  try {
    const candidates = [bit.buyer_name, bit.userName];
    for (const c of candidates) {
      if (!isPlaceholderPersonName(c)) return String(c).trim();
    }
  } catch {
    /* ignore */
  }
  return "Buyer";
}

/** Seller / buyer contact from API enrichment (or bid `userEmail` when it holds a phone). */
export function getSellerMobile(
  product?: BuySellProduct | null | Partial<BuySellProduct>,
): string | null {
  if (!product) return null;
  return formatContactMobile(product.seller_mobile);
}

export function getBuyerMobile(bit?: {
  buyer_mobile?: string | null;
  userEmail?: string | null;
} | null): string | null {
  if (!bit) return null;
  return (
    formatContactMobile(bit.buyer_mobile) ||
    formatContactMobile(looksLikePhone(bit.userEmail) ? bit.userEmail : null)
  );
}

function looksLikePhone(value?: string | null): boolean {
  if (!value) return false;
  const digits = String(value).replace(/\D/g, "");
  return digits.length >= 10 && !String(value).includes("@");
}

/** Normalize for display; returns null when empty. */
export function formatContactMobile(value?: string | null): string | null {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw || raw.toLowerCase() === "unknown") return null;
  return raw;
}

/** `tel:` href from a stored mobile value. */
export function contactTelHref(mobile?: string | null): string | null {
  const formatted = formatContactMobile(mobile);
  if (!formatted) return null;
  const digits = formatted.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : null;
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
