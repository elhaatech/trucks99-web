import { api } from "./common_fixed";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MatchOwner = {
  _id: string;
  id: string | null;
  name: string | null;
  mobile: string | null;
  email: string | null;
};

export type MatchedTruck = {
  _id: string;
  id: string;
  truckNumber: string;
  registrationNumber: string;
  truckType: string;
  vehicleType: any;
  vehicleBodyType: string;
  capacity: string;
  status: string;
  currentLocation: string;
  routes: any[];
  /** Posted bid/asking amount (backend's `bit` field, surfaced here as price). */
  price?: number | null;
};

export type MatchedLoad = {
  _id: string;
  id: string;
  loadNumber: string;
  title: string;
  origin: string;
  destination: string;
  vehicleType: string;
  vehicleBodyType: string;
  vehicleCapacity: string;
  status: string;
  /** Posted bid/asking amount (backend's `bit` field, surfaced here as price). */
  price?: number | null;
  date?: string | null;
};

export type LoadMatchPair = {
  score: number;
  matchedOn: string[];
  truck: MatchedTruck;
  truckOwner: MatchOwner | null;
};

export type TruckMatchPair = {
  score: number;
  matchedOn: string[];
  load: MatchedLoad;
  loadOwner: MatchOwner | null;
};

export type LoadMatchGroup = {
  load: MatchedLoad;
  totalMatches: number;
  matches: LoadMatchPair[];
};

export type TruckMatchGroup = {
  truck: MatchedTruck;
  totalMatches: number;
  matches: TruckMatchPair[];
};

export type MySummaryLoad = {
  _id: string;
  id: string;
  loadNumber: string;
  title: string;
  origin: string;
  destination: string;
  status: string;
  price?: number | null;
};

export type MySummaryTruck = {
  _id: string;
  id: string;
  truckNumber: string;
  registrationNumber: string;
  truckType: string;
  status: string;
  price?: number | null;
};

export type MatchResponse = {
  success: boolean;
  mode: string;
  myLoads: MySummaryLoad[];
  myTrucks: MySummaryTruck[];
  /**
   * Flat, score-sorted list of loads matched against the user's truck(s)
   * (populated when the backend mode resolves to "give me loads").
   * Optional for backward compatibility with older API versions.
   */
  loads?: (MatchedLoad & { matchScore: number; matchedOn: string[] })[];
  loadMatches: LoadMatchGroup[];
  truckMatches: TruckMatchGroup[];
  summary: {
    totalMyLoads: number;
    totalMyTrucks: number;
    totalLoadMatches: number;
    totalTruckMatches: number;
    totalMatchedLoads?: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type MatchParams = {
  /**
   * From the UI's point of view (unchanged contract):
   *   "load"  = my loads → matched trucks   (consume `loadMatches`)
   *   "truck" = my trucks → matched loads   (consume `truckMatches`)
   *   "both"  = both directions
   *
   * NOTE: the backend's own `mode` query param was inverted as part of a
   * bugfix (it now means "what do I want returned" rather than "what do I
   * own") — `toApiMode()` below translates this UI-facing value to whatever
   * the backend actually expects, so callers and components never need to
   * know about that flip.
   */
  mode?: "load" | "truck" | "both";
  radiusKm?: number;
  minScore?: number;
  page?: number;
  limit?: number;
};

// Backend mode semantics (as of the matching-engine fix) are the mirror
// image of the UI's mode semantics:
//   UI "load"  (my loads → other trucks)  → backend "truck"
//   UI "truck" (my trucks → other loads)  → backend "load"
//   "both" is symmetric either way.
function toApiMode(mode: "load" | "truck" | "both"): "load" | "truck" | "both" {
  if (mode === "load") return "truck";
  if (mode === "truck") return "load";
  return "both";
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * GET /api/match — fetch matching results for the logged-in user.
 * mode: "load" = my loads → other trucks, "truck" = my trucks → other loads, "both" = all.
 * (This is the UI-facing contract; see toApiMode() for the backend translation.)
 */
export async function getMatches(
  params: MatchParams = {}
): Promise<MatchResponse> {
  const {
    mode = "both",
    radiusKm = 50,
    minScore = 20,
    page = 1,
    limit = 20,
  } = params;

  return api<MatchResponse>("/api/match", {
    params: {
      mode: toApiMode(mode),
      radiusKm: String(radiusKm),
      minScore: String(minScore),
      page: String(page),
      limit: String(limit),
    },
  });
}

/**
 * POST /api/match — same as GET but via POST body.
 */
export async function postMatches(
  params: MatchParams = {}
): Promise<MatchResponse> {
  const {
    mode = "both",
    radiusKm = 50,
    minScore = 20,
    page = 1,
    limit = 20,
  } = params;

  return api<MatchResponse>("/api/match", {
    method: "POST",
    body: JSON.stringify({ mode: toApiMode(mode), radiusKm, minScore, page, limit }),
  });
}