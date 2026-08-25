import { api } from "./common_fixed";
import { joinApiUrl } from "@/src/config/BASE_URL";

// ——— Shared filter body ———
export type ReportFilters = {
  dateFrom?: string;
  dateTo?: string;
  origin?: string;
  destination?: string;
  status?: string | string[];
  truckType?: string;
  vehicleType?: string;
  truck_status?: string | string[];
  loadType?: string;
  limit?: number;
  page?: number;
};

// ——— BuySell filter body ———
// NOTE: backend parseBuySellFilters() reads "user_type", not "type"
export type BuySellFilters = {
  dateFrom?:  string;
  dateTo?:    string;
  user_type?: "buy" | "sell" | string; // ← was "type" — backend field is user_type
  status?:    "Active" | "Inactive" | string | string[]; // ← Title-cased to match schema enum
  search?:    string;
  limit?:     number;
  page?:      number;
};

// ——— Real Load shape (from /api/load/all) ———
export type LoadOwnerUser = {
  _id: string;
  id: string;
  name: string;
  mobile: string;
  email: string;
};

export type BitRecord = {
  _id: string;
  loadId?: string;
  truckId?: string;
  bit: number;
  bitReason?: string;
  status: "pending" | "accept" | "reject";
  userId: string;
  userName: string;
  userEmail: string;
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type StopLocation = {
  address: string;
  lat: number;
  lng: number;
};

export type Load = {
  _id: string;
  id: string;
  loadNumber: string;
  title: string;
  description?: string;
  origin: string;
  destination: string;
  status: "pending" | "assigned" | "accepted" | "delivered" | "cancelled";
  distanceKm: number;
  truck_status: string | null;
  createdBy: string;
  userId: string;
  ownerId: string;
  pickupLocation: StopLocation;
  dropLocation: StopLocation;
  stop_all: StopLocation[];
  material?: string;
  materialId: string;
  vehicleBodyType: string;
  vehicleType: string;
  vehicleTypeId?: string | null;
  vehicleTypeLabel?: string;
  vehicleCapacity: number;
  loadCapacity?: number;
  total_tire: string;
  containerFeet?: string;
  pickupTime: string;
  bit: number;
  vehicle_id: string;
  vehicle_name: string;
  bitRecords: BitRecord[];
  ownerUser: LoadOwnerUser | null;
  cancelOwnerId?: string;
  rejectReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type LoadsResponse = {
  success: boolean;
  loads: Load[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

// ——— Real Truck shape (from /api/truck/all) ———
export type TruckVehicleType = {
  _id: string | null;
  uuid: string;
  name: string;
} | null;

export type Truck = {
  _id: string;
  id: string;
  registrationNumber: string;
  vehicleType: TruckVehicleType;
  truckType: string;
  capacity: string;
  containerFeet: string;
  vehicleBody: string;
  vehicleBodyType: string;
  vehicleBodyLength: string;
  total_tire: string;
  vehicleImage: string;
  vehicleImages: string[];
  vehicleRCDocument: string;
  routes: unknown[];
  stop_all: StopLocation[];
  truck_status: "half body" | "empty body" | "return truck" | "full load" | string;
  status: "available" | "inactive" | string;
  load_status: string;
  currentLocation: string;
  contactNumber: string;
  dropLocation: string;
  price: string;
  loadCapacity: string;
  bit: number | null;
  bitReason: string | null;
  ownerId: string;
  createdBy: string;
  ownerUser: LoadOwnerUser | null;
  bitRecords: BitRecord[];
  createdAt: string;
  updatedAt: string;
};

export type TrucksResponse = {
  success: boolean;
  trucks: Truck[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

// ——— Analytics report response shapes ———

export type LoadTruckMatchingRow = {
  date: string;
  loadsCreated: number;
  trucksAvailable: number;
  matchedLoads: number;
};
export type LoadTruckMatchingReport = {
  summary: { totalLoads: number; totalMatched: number; matchRate: string };
  rows: LoadTruckMatchingRow[];
};

export type StatusRow = { status: string; count: number };
export type LoadStatusSummary  = { summary: { total: number }; rows: StatusRow[] };
export type TruckStatusSummary = { summary: { total: number }; rows: StatusRow[] };

export type TruckBodyUtilizationRow    = { truckBodyType: string; count: number };
export type TruckBodyUtilizationReport = { rows: TruckBodyUtilizationRow[] };

export type FulfillmentTimeRow = {
  route: string;
  avgFulfillmentHours: number;
  minHours: number;
  maxHours: number;
  count: number;
};
export type FulfillmentTimeReport = { rows: FulfillmentTimeRow[] };

export type RoutePopularityRow = {
  route: string;
  totalLoads: number;
  avgPrice: number;
  deliveredCount: number;
  cancelledCount: number;
};
export type RoutePopularityReport = { rows: RoutePopularityRow[] };

export type NoOfferLoadRow = {
  loadId: string;
  loadNumber: string | null;
  title: string;
  route: string;
  price: number | null;
  weight: string | null;
  truckType: string | null;
  truckBodyType: string | null;
  hoursPending: number;
  createdAt: string;
};
export type NoOfferLoadsReport = { total: number; rows: NoOfferLoadRow[] };

export type IdleTruckRow = {
  truckId: string;
  registrationNumber: string;
  truckType: string;
  capacity: string;
  truckBodyType: string | null;
  currentLocation: string | null;
  idleHours: number;
  createdAt: string;
};
export type IdleTrucksReport = { total: number; rows: IdleTruckRow[] };

export type PricingComparisonRow = {
  truckBodyType: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  count: number;
  discountVsFullLoad: string;
};
export type PricingComparisonReport = { rows: PricingComparisonRow[] };

export type TopUserRow = {
  userId: string;
  name: string;
  mobile: string | null;
  company: string | null;
  loadsPosted: number;
  totalValue: number;
  deliveredCount: number;
  cancelledCount: number;
};
export type TopUsersReport = { rows: TopUserRow[] };

export type CancellationSummary = {
  summary: { totalCancellations: number };
  byReason: { reason: string; count: number }[];
  byDay: { date: string; count: number }[];
};

export type DailyActivityRow = {
  date: string;
  created: number;
  assigned: number;
  accepted: number;
  delivered: number;
  cancelled: number;
  totalRevenue: number;
};
export type DailyActivityReport = {
  summary: {
    totalCreated: number;
    totalDelivered: number;
    totalCancelled: number;
    totalRevenue: number;
  };
  rows: DailyActivityRow[];
};

export type MaterialDemandRow    = { material: string; count: number; avgPrice: number; deliveredCount: number };
export type MaterialDemandReport = { rows: MaterialDemandRow[] };

export type VehicleTypeDemandRow    = { vehicleType: string; count: number; avgPrice: number; deliveredCount: number; cancelledCount: number };
export type VehicleTypeDemandReport = { rows: VehicleTypeDemandRow[] };

export type OverviewSummary = {
  loads: {
    total: number;
    pending: number;
    assigned: number;
    delivered: number;
    cancelled: number;
    matchRate: string;
  };
  trucks: {
    total: number;
    available: number;
    halfBodyLoads: number;
    returnTruckLoads: number;
    emptyBodyLoads: number;
  };
  pricing: { totalRevenue: number; avgPricePerLoad: number };
};
export type OverviewReport = { summary: OverviewSummary };

// ——— BuySell real API response shapes ———
// Matches the actual populated response from /api/buysell (doc 3):
//   category_id and subcategory_id are populated objects (not plain IDs)
//   bit_records array, bid_count, highest_bid are included

export type BuySellCategoryRef = {
  _id: string;
  category_name: string;
} | null;

export type BuySellSubcategoryRef = {
  _id: string;
  sub_category_name: string;
} | null;

export type BuySellBitRecord = {
  _id: string;
  productId: string;
  bit: number;
  bitReason?: string;
  status: "pending" | "accept" | "reject";
  userId: string;
  userName: string;
  userEmail: string;
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type BuySellSpecification = {
  specification_id: string;
  specification_value: string;
};

// ← Full listing shape matching real API response
export type BuySellListing = {
  _id:              string;
  id:               string;
  // populated refs
  category_id:      BuySellCategoryRef;
  subcategory_id:   BuySellSubcategoryRef;
  userid:           string;
  price?:           number | string | null;
  description?:     string;
  images:           string[];
  specifications:   BuySellSpecification[];
  country_id?:      string;
  state_id?:        string;
  city_id?:         string;
  address?:         string;
  pincode?:         string;
  // user_type may not be on individual listings but is on summary/type rows
  user_type?:       "buy" | "sell" | string;
  status:           "Active" | "Inactive" | string; // ← Title-cased to match schema enum
  created_by?:      string;
  updated_by?:      string;
  is_favorite?:     boolean;
  bit_records:      BuySellBitRecord[];
  bid_count:        number;
  highest_bid:      number | null;
  createdAt:        string;
  updatedAt:        string;
};

export type BuySellSummaryReport = {
  report: "buysell-summary";
  summary: {
    total: number;
    byType:   { buy: number; sell: number };
    byStatus: { active: number; inactive: number };
  };
  recentListings: BuySellListing[];
};

export type BuySellStatusSummaryReport = {
  report: "buysell-status-summary";
  summary: { total: number };
  rows: { status: string; count: number }[];
};

export type BuySellTypeSummaryRow = {
  user_type:     string;  // ← was "type" — backend $project outputs user_type
  total:         number;
  activeCount:   number;
  inactiveCount: number;
};
export type BuySellTypeSummaryReport = {
  report: "buysell-type-summary";
  rows: BuySellTypeSummaryRow[];
};

export type BuySellDailyActivityRow = {
  date:      string;
  created:   number;
  buyCount:  number;
  sellCount: number;
  active:    number;
};
export type BuySellDailyActivityReport = {
  report: "buysell-daily-activity";
  summary: {
    totalCreated: number;
    totalBuy:     number;
    totalSell:    number;
  };
  rows: BuySellDailyActivityRow[];
};

// ——— Category-wise posted (vehicles for sell) ———
export type BuySellCategoryPostedRow = {
  categoryId:      string;
  categoryName:    string;
  subcategoryId:   string;
  subcategoryName: string;
  totalPosted:     number;
  activeCount:     number;
  inactiveCount:   number;
  avgPrice:        number;
  minPrice:        number;
  maxPrice:        number;
};
export type BuySellCategoryPostedReport = {
  report: "buysell-category-posted";
  summary: { totalPosted: number; totalActive: number; totalInactive: number; categories: number };
  rows: BuySellCategoryPostedRow[];
};

// ——— Category-wise sold (Inactive sell listings) ———
export type BuySellCategorySoldRow = {
  categoryId:      string;
  categoryName:    string;
  subcategoryId:   string;
  subcategoryName: string;
  totalSold:       number;
  avgPrice:        number;
  minPrice:        number;
  maxPrice:        number;
};
export type BuySellCategorySoldReport = {
  report: "buysell-category-sold";
  summary: { totalSold: number; categories: number };
  rows: BuySellCategorySoldRow[];
};

// ——— API helper ———
function reportApi<T>(endpoint: string, filters: ReportFilters | BuySellFilters = {}): Promise<T> {
  return api<T>(`/api/reports/${endpoint}`, {
    method: "POST",
    body: JSON.stringify(filters),
  });
}

// ——— Load / Truck analytics API functions ———
export const getOverview             = (f?: ReportFilters) => reportApi<OverviewReport>("overview", f);
export const getLoadTruckMatching    = (f?: ReportFilters) => reportApi<LoadTruckMatchingReport>("load-truck-matching", f);
export const getLoadStatusSummary    = (f?: ReportFilters) => reportApi<LoadStatusSummary>("load-status-summary", f);
export const getTruckStatusSummary   = (f?: ReportFilters) => reportApi<TruckStatusSummary>("truck-status-summary", f);
export const getTruckBodyUtilization = (f?: ReportFilters) => reportApi<TruckBodyUtilizationReport>("truck-body-utilization", f);
export const getLoadFulfillmentTime  = (f?: ReportFilters) => reportApi<FulfillmentTimeReport>("load-fulfillment-time", f);
export const getRoutePopularity      = (f?: ReportFilters) => reportApi<RoutePopularityReport>("route-popularity", f);
export const getNoOfferLoads         = (f?: ReportFilters) => reportApi<NoOfferLoadsReport>("no-offer-loads", f);
export const getIdleTrucks           = (f?: ReportFilters) => reportApi<IdleTrucksReport>("idle-trucks", f);
export const getPricingComparison    = (f?: ReportFilters) => reportApi<PricingComparisonReport>("pricing-comparison", f);
export const getTopUsers             = (f?: ReportFilters) => reportApi<TopUsersReport>("top-users", f);
export const getCancellationSummary  = (f?: ReportFilters) => reportApi<CancellationSummary>("cancellation-summary", f);
export const getDailyActivity        = (f?: ReportFilters) => reportApi<DailyActivityReport>("daily-activity", f);
export const getMaterialDemand       = (f?: ReportFilters) => reportApi<MaterialDemandReport>("material-demand", f);
export const getVehicleTypeDemand    = (f?: ReportFilters) => reportApi<VehicleTypeDemandReport>("vehicle-type-demand", f);

// ——— BuySell analytics API functions ———
export const getBuySellSummary        = (f?: BuySellFilters) => reportApi<BuySellSummaryReport>("buysell-summary", f);
export const getBuySellStatusSummary  = (f?: BuySellFilters) => reportApi<BuySellStatusSummaryReport>("buysell-status-summary", f);
export const getBuySellTypeSummary    = (f?: BuySellFilters) => reportApi<BuySellTypeSummaryReport>("buysell-type-summary", f);
export const getBuySellDailyActivity  = (f?: BuySellFilters) => reportApi<BuySellDailyActivityReport>("buysell-daily-activity", f);
export const getBuySellCategoryPosted = (f?: BuySellFilters) => reportApi<BuySellCategoryPostedReport>("buysell-category-posted", f);
export const getBuySellCategorySold   = (f?: BuySellFilters) => reportApi<BuySellCategorySoldReport>("buysell-category-sold", f);

// ——— Download types ———
export type DownloadType =
  | "all-loads"
  | "pending-loads"
  | "cancelled-loads"
  | "assigned-loads"
  | "delivered-loads"
  | "all-trucks"
  | "available-trucks"
  | "half-body-loads"
  | "return-truck-loads"
  // BuySell downloads
  | "all-buysell"
  | "buy-listings"
  | "sell-listings"
  | "active-buysell"
  | "inactive-buysell"
  | "buysell-category-posted"
  | "buysell-category-sold";

// ─── Download function ────────────────────────────────────────────────────────
// Backend returns a real .xlsx binary (ExcelJS).
// We use raw fetch → arrayBuffer() → Blob → browser download.
// IMPORTANT: Never route this through the api() helper — it parses JSON
// and will corrupt the binary response.
export async function downloadReport(
  type: DownloadType,
  filters: ReportFilters | BuySellFilters = {}
): Promise<void> {
  const endpointMap: Record<DownloadType, string> = {
    "all-loads":                "download/all-loads",
    "pending-loads":            "download/pending-loads",
    "assigned-loads":           "download/assigned-loads",
    "delivered-loads":          "download/delivered-loads",
    "cancelled-loads":          "download/cancelled-loads",
    "all-trucks":               "download/all-trucks",
    "available-trucks":         "download/available-trucks",
    "half-body-loads":          "download/half-body-loads",
    "return-truck-loads":       "download/return-truck-loads",
    // BuySell
    "all-buysell":              "download/all-buysell",
    "buy-listings":             "download/buy-listings",
    "sell-listings":            "download/sell-listings",
    "active-buysell":           "download/active-buysell",
    "inactive-buysell":         "download/inactive-buysell",
    "buysell-category-posted":  "download/buysell-category-posted",
    "buysell-category-sold":    "download/buysell-category-sold",
  };

  const token = typeof window !== "undefined" ? localStorage.getItem("itruck_token") : null;
  const url   = joinApiUrl(`/api/reports/${endpointMap[type]}`);

  // ── 1. Raw fetch (NOT api()) ──────────────────────────────────────────────
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify(filters),
  });

  // ── 2. Handle HTTP errors before reading body ─────────────────────────────
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json() as { message?: string };
      if (j.message) msg = j.message;
    } catch {
      // body might not be JSON
    }
    throw new Error(`Download failed: ${msg}`);
  }

  // ── 3. Read as binary ArrayBuffer — NEVER use .text() or .json() ─────────
  const buffer = await res.arrayBuffer();

  // ── 4. Validate xlsx magic bytes: first two bytes must be PK (0x50 0x4B) ─
  const magic = new Uint8Array(buffer, 0, 2);
  if (magic[0] !== 0x50 || magic[1] !== 0x4B) {
    const preview = new TextDecoder().decode(new Uint8Array(buffer, 0, 300));
    let errMsg = "Server returned an unexpected response. Please try again.";
    try {
      const json = JSON.parse(preview) as { message?: string };
      if (json.message) errMsg = json.message;
    } catch {
      // not JSON, use the generic message
    }
    throw new Error(errMsg);
  }

  // ── 5. Create Blob and trigger browser file download ─────────────────────
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const objectUrl = URL.createObjectURL(blob);
  const date      = new Date().toISOString().slice(0, 10);
  const filename  = `${type}-${date}.xlsx`;

  const anchor         = document.createElement("a");
  anchor.href          = objectUrl;
  anchor.download      = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(objectUrl), 2_000);
}