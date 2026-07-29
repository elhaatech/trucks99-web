import { api } from "./common";
import {
  createBitRecord,
  getBitRecords,
  updateBitRecordStatus,
  type CreateTruckBitRecordPayload,
  type TruckBitRecord,
} from "./bitRecord";
import type { ApiUser } from "./user";

// ——— Truck (for Load form dropdowns) ———
export type TruckStop = { address: string; lat?: number; lng?: number };

// Dedicated types for per-route CRUD APIs
export type TruckRouteLocation = {
  address: string;
  /** Stored as string to match payload; backend should coerce to number. */
  lat: string;
  /** Note: API uses `lang` in payload instead of `lng`. */
  lang: string;
};

export type TruckRoute = {
  _id?: string;
  id?: string;
  truckId: string;
  from: TruckRouteLocation;
  to: TruckRouteLocation;
  price: string;
};

/** Creator details attached when truck is returned from get all / get one */
export type TruckCreatedByUser = {
  _id: string;
  id?: string;
  name?: string;
  mobile?: string;
  email?: string;
};

export type Truck = {
  createdBy: string | undefined;
  userId: string | undefined;
  truckNumber: any;
  loadCapacity: string;
  _id: string;
  id?: string; // uuid when available
  registrationNumber?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverId?: string;
  truckType?: string;
  vehicleType?: string;
  capacity?: string;
  vehicleCapacity?: string;
  containerFeet?: string;
  vehicleBody?: string;
  vehicleBodyType?: string;
  vehicleBodyLength?: string;
  total_tire?: string;
  vehicleTyre?: string;
  vehicleImage?: string;
  vehicleImages?: string[];
  vehicleRCDocument?: string;
  status?: string;
  currentLocation?: string;
  contactNumber?: string;
  bit?: number;
  bitReason?: string;
  loadbitRecords?: TruckBitRecord[];
  bitRecords?: TruckBitRecord[];
  stop_all?: TruckStop[];
  routes?: Array<{ from: TruckStop & { lang?: number }; to: TruckStop & { lang?: number }; price?: number | string }>;
  /** Selected owner user id */
  ownerId?: string;
  /** Populated on get all / get one: owner user details */
  ownerUser?: TruckCreatedByUser | null;
  /** @deprecated use ownerId/ownerUser */
  createdByUser?: TruckCreatedByUser | null;
  createdAt?: string;
  updatedAt?: string;
  truckStatus: string;
};

export type TruckListPayload = {
  /** Filter trucks by user (createdBy). Supports Mongo _id or user uuid. */
  userId?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  vehicleBodyType?: string;
  routeFrom?: string;
  routeTo?: string;
  status?: string;
  search?: Array<{
    pickupLocation?: { address?: string; lat?: number; lng?: number };
    dropLocation?: { address?: string; lat?: number; lng?: number };
    vehicleType?: string;
    vehicleBodyType?: string;
    vehicleNumber?: string;
    routeFrom?: string;
    routeTo?: string;
    status?: string;
    radiusKm?: number;
  }>;
  radiusKm?: number;
  /** Filter trucks by document creation date (YYYY-MM-DD). */
  createdFrom?: string;
  /** Filter trucks by document creation date (YYYY-MM-DD). */
  createdTo?: string;
  page?: number;
  limit?: number;
};

export type TruckListResponse = {
  trucks: Truck[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

/** Get all bit records for a truck (separate request). */
export async function getTruckBitRecords(truckId: string): Promise<TruckBitRecord[]> {
  return getBitRecords<TruckBitRecord>({ entityId: truckId });
}

/** POST /api/bit-records with `type: "truck"` — delegates to shared bid service. */
export async function createTruckBitRecord(
  body: Omit<CreateTruckBitRecordPayload, "type">
): Promise<TruckBitRecord> {
  return createBitRecord({ ...body, type: "truck" }) as Promise<TruckBitRecord>;
}

/** Get only routes for a truck (list view). Uses existing backend endpoint /api/truck/:id/routes. */
export async function getTruckRoutes(truckId: string): Promise<TruckRoute[]> {
  const res = await api<{ routes: TruckRoute[] }>(`/api/truck/${truckId}/routes`);
  return (res as any)?.routes ?? [];
}

/** Create one or more routes for a truck. */
export async function createTruckRoutes(
  truckId: string,
  routes: Omit<TruckRoute, "truckId" | "_id" | "id">[]
): Promise<TruckRoute[]> {
  const payload = {
    routes: routes.map((r) => ({
      from: r.from,
      to: r.to,
      price: r.price,
    })),
  };
  const res = await api<{ routes: TruckRoute[] }>(`/api/truck/${truckId}/routes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res?.routes ?? [];
}

/** Get a single route by its id (backend finds truck that contains it; response includes truckId). */
export async function getTruckRoute(routeId: string): Promise<TruckRoute> {
  return api<TruckRoute>(`/api/truck/routes/${routeId}`);
}

/** Update a single route; requires truck id and route id. */
export async function updateTruckRoute(
  truckId: string,
  routeId: string,
  body: Partial<Omit<TruckRoute, "truckId" | "_id" | "id">>
): Promise<TruckRoute> {
  const res = await api<{ route: TruckRoute }>(`/api/truck/${truckId}/routes/${routeId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return res.route;
}

/** Delete a single route; requires truck id and route id. */
export async function deleteTruckRoute(truckId: string, routeId: string): Promise<void> {
  await api<unknown>(`/api/truck/${truckId}/routes/${routeId}`, {
    method: "DELETE",
  });
}

/** PUT: update only the status of a truck bit record (id = bit record _id or id). */
export async function updateTruckBitRecordStatus(
  recordId: string,
  status: "accept" | "reject" | "pending"
): Promise<TruckBitRecord> {
  return updateBitRecordStatus({ type: "truck", recordId, status }) as Promise<TruckBitRecord>;
}

export async function getTruckAll(params?: TruckListPayload): Promise<Truck[]> {
  const res = await api<Truck[] | TruckListResponse>("/api/truck/all", {
    method: "POST",
    body: JSON.stringify(params ?? {}),
  });
  if (Array.isArray(res)) return res;
  return (res as TruckListResponse).trucks ?? [];
}

/** POST /api/truck/all with filter payload; returns trucks and pagination. */
export async function getTruckAllWithPagination(params: TruckListPayload): Promise<TruckListResponse> {
  const res = await api<Truck[] | TruckListResponse>("/api/truck/all", {
    method: "POST",
    body: JSON.stringify(params),
  });
  if (Array.isArray(res)) {
    return { trucks: res, pagination: { page: params.page ?? 1, limit: params.limit ?? 20, total: res.length, totalPages: 1 } };
  }
  return res as TruckListResponse;
}

export async function getTruck(id: string) {
  return api<Truck>(`/api/truck/${id}`);
}

export async function createTruck(body: Partial<Truck> & { user?: ApiUser }) {
  return api<{ message: string; truck: Truck }>("/api/truck/add", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateTruck(
  id: string,
  body: Partial<Truck> & { user?: ApiUser; bitStatus?: "accept" | "reject" | "pending" }
) {
  return api<{ message: string; truck: Truck }>(`/api/truck/edit/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/** Update only status and currentLocation for a truck. */
export async function updateTruckStatusLocation(
  id: string,
  body: { status?: string; currentLocation?: string }
) {
  return api<{ message: string; truck: Truck }>(`/api/truck/${id}/status-location`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteTruck(ids: string[]) {
  return api<{ message: string; deletedCount: number; ids: string[] }>("/api/truck/delete", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}

