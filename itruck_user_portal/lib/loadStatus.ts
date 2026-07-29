import type { Load } from "@/model/services/load";

function norm(v: unknown): string {
  if (v == null) return "";
  return String(v).trim().toLowerCase();
}

type LoadRow = Load & {
  load_status?: unknown;
  LoadStatus?: unknown;
};

/**
 * Normalizes load lifecycle status for dashboards and counts.
 * Handles alternate JSON keys, empty strings, truck mirror fields, and legacy rows where
 * `status` stayed "pending" after a truck or driver was linked.
 */
export function getEffectiveLoadStatus(load: Load): string {
  const row = load as LoadRow;
  let s = norm(load.status) || norm(row.load_status) || norm(row.LoadStatus);

  // Bit-record APIs sometimes use "accept" / "reject"; normalize to load lifecycle enums
  if (s === "accept") s = "accepted";
  if (s === "reject") s = "rejected";

  if (s === "in-transit" || s === "in_transit") s = "assigned";
  if (s === "complete" || s === "completed") s = "delivered";

  const truckSt = norm(row.truckStatus);
  if (s === "pending" && (truckSt === "in-transit" || truckSt === "in_transit")) {
    s = "assigned";
  }

  if (!s && (truckSt === "in-transit" || truckSt === "in_transit")) {
    s = "assigned";
  }

  if (!s) {
    const hasTruck = Boolean(load.truck_id);
    const hasDriver = Boolean(load.assignedDriverId);
    if (hasTruck || hasDriver) s = "assigned";
    else s = "pending";
  }

  // Bid / bit flow: list API includes bitRecords; sometimes load.status lags behind an accepted bit
  if (s !== "delivered" && s !== "rejected" && s !== "cancelled") {
    const bits = load.bitRecords;
    if (Array.isArray(bits) && bits.length > 0) {
      const hasAcceptedBit = bits.some((b) => {
        const bs = norm((b as { status?: unknown }).status);
        return bs === "accept" || bs === "accepted";
      });
      if (hasAcceptedBit) return "accepted";
    }
  }

  return s;
}
