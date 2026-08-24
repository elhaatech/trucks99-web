import { api } from "./common_fixed";

export type LocationCountry = {
  _id?: string;
  id?: string;
  uuid?: string;
  externalId?: number;
  sortname?: string;
  name?: string;
};

export type LocationState = {
  _id?: string;
  id?: string;
  uuid?: string;
  externalId?: number;
  name?: string;
  countryExternalId?: number;
};

export type LocationCity = {
  _id?: string;
  id?: string;
  uuid?: string;
  externalId?: number;
  name?: string;
  stateExternalId?: number;
};

export async function getLocationCountriesAll(): Promise<LocationCountry[]> {
  return api<LocationCountry[]>("/api/location/countries/all");
}

export async function getLocationStatesByCountry(countryId: number | string, options?: { q?: string; limit?: number; page?: number }) {
  return api<{ items: LocationState[]; total: number; page: number; limit: number }>("/api/location/states/by-country", {
    method: "POST",
    body: JSON.stringify({
      countryId: String(countryId),
      q: options?.q ?? "",
      limit: options?.limit ?? 2000,
      page: options?.page ?? 1,
    }),
  });
}

/** Cities for a state; `state` is the resolved row (matches server `handleLocation.js`). */
export type LocationCitiesByStateResponse = {
  state?: LocationState | null;
  items: LocationCity[];
  total: number;
  page: number;
  limit: number;
};

export async function getLocationCitiesByState(stateId: number | string, options?: { q?: string; limit?: number; page?: number }) {
  return api<LocationCitiesByStateResponse>("/api/location/cities/by-state", {
    method: "POST",
    body: JSON.stringify({
      stateId: String(stateId),
      q: options?.q ?? "",
      limit: options?.limit ?? 2000,
      page: options?.page ?? 1,
    }),
  });
}

// India's stable external id (numeric `id` from the location dataset, = 101).
// The seeded country document's Mongo `_id` is auto-generated, so the previously
// hardcoded ObjectId was unresolvable: the server's location endpoints resolve a
// country via its numeric externalId / name, returning 400 for an unknown `_id`
// and leaving the State/City dropdowns empty. 101 resolves correctly everywhere.
export const INDIA_COUNTRY_ID = "101";

// Module-level cache of states per country so dependent dropdowns and the
// filter payload can resolve a selected state NAME back to its id without
// re-fetching (mirrors how the signup form resolves a single states query).
const statesByCountryCache: Record<string, LocationState[]> = {};

export function cacheLocationStates(countryId: string, states: LocationState[]): void {
  statesByCountryCache[String(countryId)] = states;
}

export function getCachedLocationStates(countryId: string): LocationState[] | undefined {
  return statesByCountryCache[String(countryId)];
}

export function resolveStateIdByName(countryId: string, name: string): string | undefined {
  const states = statesByCountryCache[String(countryId)];
  if (!states || !name) return undefined;
  const target = name.trim().toLowerCase();
  const match = states.find((s) => (s.name || "").trim().toLowerCase() === target);
  return match?.id || match?._id || match?.uuid;
}

