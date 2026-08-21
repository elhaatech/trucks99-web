/**
 * Next.js same-origin Places proxy (`/api/places/*`).
 * These are App Router routes, not the backend at PRODUCTION_API_ORIGIN.
 */

import { nextAppApiUrl } from "@/lib/appConfig";

export type PlacePrediction = { description: string; place_id: string };

export type PlaceDetailsResult = {
  formatted_address?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
};

export async function getPlaceAutocomplete(input: string): Promise<PlacePrediction[]> {
  const q = input.trim();
  if (q.length < 3) return [];
  const res = await fetch(
    `${nextAppApiUrl("/api/places/autocomplete")}?input=${encodeURIComponent(q)}`,
  );
  const data = (await res.json()) as { status?: string; predictions?: PlacePrediction[] };
  if (data.status === "OK" && Array.isArray(data.predictions)) return data.predictions;
  return [];
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetailsResult | null> {
  const res = await fetch(
    `${nextAppApiUrl("/api/places/details")}?placeId=${encodeURIComponent(placeId)}`,
  );
  const data = (await res.json()) as { result?: PlaceDetailsResult };
  return data?.result ?? null;
}
