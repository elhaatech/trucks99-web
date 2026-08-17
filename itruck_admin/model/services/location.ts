import { api } from "./common";

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

