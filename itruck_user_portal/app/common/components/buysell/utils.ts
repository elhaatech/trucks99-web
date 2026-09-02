import type { BuySellProduct, BuySellSpecification, BuySellDashboardMetrics } from "@/model/services/buysellapi";
import type { MarketplaceDashboardSummary } from "@/model/services/dashboard";

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

function pullSpecExact(
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
  if (product.description?.trim()) return product.description.trim();
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

export type ListingSpecChip = {
  key: "year" | "km" | "fuel" | "owners" | "listingId";
  label: string;
  /** Small caption shown above/beside the value (matches Vehicle Details). */
  caption: string;
};

function formatOwnersLabel(raw: string): string {
  const n = Number(String(raw).replace(/[^\d]/g, ""));
  if (Number.isFinite(n)) return String(n);
  return raw.trim();
}

function formatKilometers(raw: string | undefined): string | undefined {
  const value = String(raw ?? "").trim();
  if (!value) return undefined;
 
  return value;
}

function extractRefId(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "object") {
    const obj = value as { _id?: unknown; id?: unknown; $oid?: string };
    if (obj._id != null) return String(obj._id);
    if (obj.$oid) return String(obj.$oid);
    if (obj.id != null) return String(obj.id);
  }
  const str = String(value).trim();
  return str === "[object Object]" ? "" : str;
}

const FUEL_SPEC_IDS = new Set([
  "6a32447946ebddbeb905e6f2",
  "6a7dae0a3bd76bf10c1e4a8d",
]);
const YEAR_SPEC_IDS = new Set(["6a32441146ebddbeb905e6c4"]);
const KM_SPEC_IDS = new Set(["6a32444546ebddbeb905e6db"]);
const OWNER_SPEC_IDS = new Set(["6a32457a46ebddbeb905e8b9"]);
const KNOWN_FUEL_NAMES = new Set([
  "diesel",
  "petrol",
  "cng",
  "lpg",
  "electric",
  "hybrid",
  "not applicable",
  "gasoline",
  "gas",
]);

function looksLikeObjectId(value?: string): boolean {
  return Boolean(value && /^[a-f0-9]{24}$/i.test(value.trim()));
}

function specDisplayValue(spec: BuySellSpecification | undefined): string {
  if (!spec) return "";
  const named = spec.specification_value_info?.specification_value_name;
  if (named && String(named).trim()) return String(named).trim();
  const raw = extractRefId(spec.specification_value);
  if (!raw || looksLikeObjectId(raw)) return "";
  return raw;
}

function pullFuelType(
  specifications: BuySellSpecification[] | undefined,
): string | undefined {
  const byName = pullSpecLoose(
    specifications,
    "fuel type",
    "fule type",
    "fuel",
  );
  if (byName && !looksLikeObjectId(byName)) return byName;

  const byKnownId = specifications?.find((s) =>
    FUEL_SPEC_IDS.has(extractRefId(s.specification_id)),
  );
  const fromId = specDisplayValue(byKnownId);
  if (fromId) return fromId;

  for (const spec of specifications || []) {
    const value = specDisplayValue(spec);
    if (value && KNOWN_FUEL_NAMES.has(value.toLowerCase())) return value;
  }

  return undefined;
}

function pullSpecByIds(
  specifications: BuySellSpecification[] | undefined,
  ids: Set<string>,
): string | undefined {
  const match = specifications?.find((spec) =>
    ids.has(extractRefId(spec.specification_id)),
  );
  const value = specDisplayValue(match);
  return value || undefined;
}

/**
 * List-card highlights aligned with Vehicle Details:
 * Make Year, Fuel Type, No. of Owners.
 *
 * Vehicle ID is shown separately on the card as `Vehicle ID: YYMMDD####`.
 *
 * When `all` is true, always returns all four spec chips with a fallback
 * label ("N/A") when the underlying value is missing, so the card info
 * grid never collapses to fewer boxes.
 */
export function getListingSpecChips(
  product: BuySellProduct,
  all = false,
): ListingSpecChip[] {
  const highlights = product.listing_highlights;
  const specs = product.specifications;

  const year =
    highlights?.makeYear?.trim() ||
    String((product as BuySellProduct & { manufacturingYear?: string | null }).manufacturingYear ?? "").trim() ||
    pullSpecLoose(
      specs,
      "make year",
      "manufacture year",
      "model year",
      "year",
    ) ||
    pullSpecByIds(specs, YEAR_SPEC_IDS);
  const km =
    highlights?.mileage?.trim() ||
    String((product as BuySellProduct & { kmDriven?: string | null }).kmDriven ?? "").trim() ||
    pullSpecLoose(specs, "kilometers", "km", "mileage", "odometer", "driven") ||
    pullSpecByIds(specs, KM_SPEC_IDS);
  const fuel =
    highlights?.fuelType?.trim() ||
    String((product as BuySellProduct & { fuelType?: string | null }).fuelType ?? "").trim() ||
    pullFuelType(specs);
  const owners =
    highlights?.owners?.trim() ||
    String((product as BuySellProduct & { owners?: string | null }).owners ?? "").trim() ||
    pullSpecLoose(
      specs,
      "no of owners",
      "number of owners",
      "no of owner",
      "number of owner",
      "owners",
      "owner",
    ) ||
    pullSpecByIds(specs, OWNER_SPEC_IDS);

  const fallback = "N/A";
  const chips: ListingSpecChip[] = [];

  const push = (
    key: ListingSpecChip["key"],
    caption: string,
    raw: string | undefined,
    format?: (v: string) => string | undefined,
  ) => {
    const trimmed = raw?.trim();
    if (!trimmed || looksLikeObjectId(trimmed)) {
      if (all) chips.push({ key, caption, label: fallback });
      return;
    }
    const formatted = format ? format(trimmed) : trimmed;
    if (!formatted) {
      if (all) chips.push({ key, caption, label: fallback });
      return;
    }
    chips.push({ key, caption, label: formatted });
  };

  push("year", "Make Year", year);
  push("km", "Odometer", km, formatKilometers);
  push("fuel", "Fuel Type", fuel, (v) => v.toUpperCase());
  push("owners", "No. of Owners", owners, formatOwnersLabel);

  return chips;
}

export type VehicleInfoValues = {
  year?: string;
  fuelType?: string;
  kmDriven?: string;
  owners?: string;
  location?: string;
};

export function getVehicleInfoValues(product: BuySellProduct): VehicleInfoValues {
  const specChips = getListingSpecChips(product);
  const values = Object.fromEntries(
    specChips.map((chip) => [chip.key, chip.label]),
  ) as Partial<Record<"year" | "km" | "fuel" | "owners", string>>;

  const directYear = String((product as BuySellProduct & Record<string, unknown>).manufacturingYear ?? "").trim();
  const directFuel = String((product as BuySellProduct & Record<string, unknown>).fuelType ?? "").trim();
  const directKm = formatKilometers(String((product as BuySellProduct & Record<string, unknown>).kmDriven ?? "").trim());
  const directOwners = String((product as BuySellProduct & Record<string, unknown>).owners ?? "").trim();

  return {
    year: directYear || values.year,
    fuelType: directFuel || values.fuel,
    kmDriven: directKm || values.km,
    owners: directOwners || values.owners,
    location: getProductLocation(product) || undefined,
  };
}

/** Prefer brand for card heading when specs are enriched. */
export function getListingCardTitle(product: BuySellProduct): string {
  const brand =
    product.listing_highlights?.brand?.trim() ||
    pullSpecExact(product.specifications, "brand", "make");
  if (brand?.trim() && !/^[a-f0-9]{24}$/i.test(brand.trim())) return brand.trim();
  return getProductTitle(product);
}

/** Category / subcategory line under the card title. */
export function getListingCardCategory(product: BuySellProduct): string {
  const sub =
    typeof product.subcategory_id === "object" && product.subcategory_id
      ? product.subcategory_id.sub_category_name
      : typeof product.subcategory_id === "string"
        ? product.subcategory_id
        : null;
  const cat =
    typeof product.category_id === "object" && product.category_id
      ? product.category_id.category_name
      : typeof product.category_id === "string"
        ? product.category_id
        : null;
  const parts = [cat, sub].filter(Boolean);
  return parts.length ? parts.join(" · ") : "N/A";
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
  const rawValue =
    spec.specification_value_info?.specification_value_name ??
    (spec.specification_value != null ? String(spec.specification_value) : "");
  const raw = String(rawValue).trim();

  if (!raw) return "—";
  if (/^[a-fA-F0-9]{24}$/.test(raw.trim())) return "—";
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
  totalUsers?: number;
  newListingsInPeriod?: number;
  newUsersInPeriod?: number;
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

/** Map GET /api/dashboard/summary onto the same dashboard cards. */
export function mapSummaryToMarketplaceStats(
  summary: MarketplaceDashboardSummary,
  offers = 0,
): MarketplaceStats {
  return {
    totalListings: summary.totalProducts ?? 0,
    activeListings: summary.activeProducts ?? 0,
    soldVehicles: summary.approvedProducts ?? summary.soldProducts ?? 0,
    totalOffers: offers,
    totalUsers: summary.totalUsers ?? 0,
    newListingsInPeriod: summary.periodCounts?.totalProducts ?? 0,
    newUsersInPeriod: summary.periodCounts?.totalUsers ?? 0,
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
