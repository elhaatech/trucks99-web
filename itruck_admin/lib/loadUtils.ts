import type { Load } from "@/model/api";

export const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
};

import { formatCreatedDate } from "./dateUtils";

export const formatDateTime = (value?: string | null): string =>
  formatCreatedDate(value);

export const pickupStr = (row: Load): string =>
  row.pickupLocation?.address ?? (row as { origin?: string }).origin ?? "—";

export const dropStr = (row: Load): string =>
  row.dropLocation?.address ?? (row as { destination?: string }).destination ?? "—";
