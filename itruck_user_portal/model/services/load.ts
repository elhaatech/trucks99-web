import { api } from "./common_fixed";
import {
  createBitRecord,
  getBitRecords,
  updateBitRecordStatus,
  type CreateLoadBitRecordPayload,
  type LoadBitRecord,
} from "./bitRecord";
import type { ApiUser } from "./user";

// ——— Buy/Sell ———
export type BuySell = {
  _id: string;
  id?: string; // uuid when available
  name: string;
  description?: string;
  contactEmail?: string;
  contactMobile?: string;
  address?: string;
  type?: "buy" | "sell" | "vendor";
  status?: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
};

export async function getBuySellAll(): Promise<BuySell[]> {
  return api<BuySell[]>("/api/buysell/all");
}

export async function getBuySell(id: string) {
  return api<BuySell>(`/api/buysell/${id}`);
}

export async function createBuySell(body: Partial<BuySell> & { name: string; user?: ApiUser }) {
  return api<{ message: string; buySell: BuySell }>("/api/buysell/add", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateBuySell(id: string, body: Partial<BuySell> & { user?: ApiUser }) {
  return api<{ message: string; buySell: BuySell }>(`/api/buysell/edit/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteBuySell(ids: string[]) {
  return api<{ message: string; deletedCount: number; ids: string[] }>("/api/buysell/delete", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}

// ——— Load ———
export type LoadLocation = {
  address: string;
  lat: number;
  lng: number;
};

export type Load = {
  _id: string;
  id?: string; // uuid when available
  /** Human‑friendly load number like L001, L002 */
  loadNumber?: string;
  title: string;
  description?: string;
  origin?: string;
  destination?: string;
  status?: "pending" | "assigned" | "accepted" | "rejected" | "delivered" | "cancelled" | "draft";
  loadType?: string;
  distanceKm?: number;
  mobileNumber?: string;
  rejectReason?: string;
  weight?: string | number;
  shipperId?: string;
  buySellId?: string;
  loaderId?: string;
  truck_id?: string | null;
  /** Mirrored from linked truck when assigned (e.g. available, in-transit). */
  truckStatus?: string;
  assignedDriverId?: string | null;
  agentId?: string | null;
  createdBy?: string;
  userId?: string;
  /** Selected owner user id */
  ownerId?: string;
  /** Populated: owner user details */
  ownerUser?: { _id: string; id?: string; name?: string; mobile?: string; email?: string } | null;
  /** User who cancelled the load (id set on cancel) */
  cancelOwnerId?: string;
  /** Populated: cancel owner user details (in get all / get by id response) */
  cancel_owner?: { _id: string; id?: string; name?: string; mobile?: string; email?: string } | null;
  pickupLocation?: LoadLocation;
  dropLocation?: LoadLocation;
  material?: string;
  materialId?: string;
  truckType?: string;
  vehicleBody?: string;
  vehicleBodyType?: string;
  vehicleType?: string;
  vehicleCapacity?: number;
  tyreCount?: string;
  total_tire?: string;
  containerFeet?: string;
  pickupTime?: string;
  price?: number;
  bit?: number;
  bitReason?: string;
  bitRecords?: LoadBitRecord[];
  date?: string;
  vehicle_id?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateLoadPayload = {
  title?: string;
  description?: string;
  pickupLocation?: LoadLocation | string;
  dropLocation?: LoadLocation | string;
  /** Material master reference (used in full dashboard flow). */
  materialId?: string;
  /** Free-text material name (used in buyer/seller flow). */
  material?: string;
  vehicleType?: string;
  truckType?: string;
  vehicleCapacity?: number;
  total_tire?: string;
  containerFeet?: string;
  pickupTime?: string;
  bit?: number;
  distanceKm?: number;
  createdBy?: string;
  userId?: string;
  /** Selected owner user id (preferred) */
  ownerId?: string;
  vehicle_id?: string;
  status?: "pending" | "assigned" | "accepted" | "rejected" | "delivered" | "cancelled" | "draft";
  /** Optional weight/quantity field for simplified flows. */
  weight?: number | string;
  price?: number;
  date?: string;
  user?: ApiUser;
};

export type LoadListPayload = {
  /** Filter loads by user (userId or createdBy). Supports Mongo _id or user uuid. */
  userId?: string;
  pickLocation?: string;
  dropLocation?: string;
  vehicleType?: string;
  vehicleBodyType?: string;
  /** Filter by load date (pickup/scheduled date). YYYY-MM-DD or ISO string. */
  dateFrom?: string;
  /** Filter by load date (pickup/scheduled date). YYYY-MM-DD or ISO string. */
  dateTo?: string;
  /** Filter by creator/owner name/company/mobile (case-insensitive partial match). */
  userName?: string;
  /** Filter by document creation date (YYYY-MM-DD). */
  createdFrom?: string;
  /** Filter by document creation date (YYYY-MM-DD). */
  createdTo?: string;
  /** Advanced search array used by /api/load/all (backend supports pickup/drop, vehicleType, vehicleBodyType, dateFrom, dateTo). */
  search?: Array<{
    pickupLocation?: { address?: string; lat?: number; lng?: number };
    dropLocation?: { address?: string; lat?: number; lng?: number };
    vehicleType?: string;
    vehicleBodyType?: string;
    dateFrom?: string;
    dateTo?: string;
    date?: string;
  }>;
  page?: number;
  limit?: number;
};

export type LoadListResponse = {
  loads: Load[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

/** GET: all loads (supports query params). Returns loads array for backward compat. */
export async function getLoadAll(params?: LoadListPayload): Promise<Load[]> {
  const res = await api<Load[] | LoadListResponse>("/api/load/all", params ? { method: "POST", body: JSON.stringify(params) } : {});
  if (Array.isArray(res)) return res;
  return (res as LoadListResponse).loads ?? [];
}

/** POST: loads with filters and pagination in body. Returns full response. */
export async function getLoadAllWithPagination(payload?: LoadListPayload): Promise<LoadListResponse> {
  const res = await api<LoadListResponse>("/api/load/all", {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
  return res;
}

/** Loads created by or assigned to this user (buyer/seller flow) */
export async function getMyLoads(userId: string): Promise<Load[]> {
  return api<Load[]>(`/api/load/my`, { params: { userId } });
}

/** Loads where shipperId matches (shipper can view their loads) */
export async function getLoadsByShipper(shipperId: string): Promise<Load[]> {
  return api<Load[]>(`/api/load/by-shipper`, { params: { shipperId } });
}

/** Loads where agentId matches (agent can view their assigned loads) */
export async function getLoadsByAgent(agentId: string): Promise<Load[]> {
  return api<Load[]>(`/api/load/by-agent`, { params: { agentId } });
}

/** Assign an agent to a load. Body: { loadId, agentId }. Returns { message, load }. */
export async function assignLoadAgent(loadId: string, agentId: string) {
  return api<{ message: string; load: Load }>("/api/load/assign-agent", {
    method: "PUT",
    body: JSON.stringify({ loadId, agentId }),
  });
}

/** Assign driver to load. Body: { loadId, driverId, assignedBy }. */
export async function assignLoadDriver(loadId: string, driverId: string, assignedBy?: string) {
  return api<{ success: boolean; message: string; load: Load }>("/api/load/assign-driver", {
    method: "PUT",
    body: JSON.stringify({ loadId, driverId, assignedBy }),
  });
}

/** Agent assigns driver and truck to a load. Body: { loadId, driverId, truckId }. Returns { message, load }. */
export async function assignLoadDriverTruck(loadId: string, driverId: string, truckId: string) {
  return api<{ message: string; load: Load }>("/api/load/assign-driver-truck", {
    method: "PUT",
    body: JSON.stringify({ loadId, driverId, truckId }),
  });
}

/** Driver accept/reject load. Body: { loadId, driverId, status, rejectReason? }. */
export async function updateLoadDriverStatus(
  loadId: string,
  driverId: string,
  status: "accepted" | "rejected",
  rejectReason?: string
) {
  return api<{ success: boolean; message: string; load: Load }>("/api/load/driver-status", {
    method: "PUT",
    body: JSON.stringify({ loadId, driverId, status, rejectReason }),
  });
}

/** Loads assigned to driver. */
export async function getLoadsByDriver(driverId: string): Promise<Load[]> {
  return api<Load[]>(`/api/load/by-driver`, { params: { driverId } });
}

/** Loads within radiusKm of (latitude, longitude). */
export async function getLoadsNearby(
  latitude: number,
  longitude: number,
  radiusKm?: number
): Promise<{ success: boolean; data: Load[] }> {
  return api<{ success: boolean; data: Load[] }>(`/api/load/nearby`, {
    params: { latitude: String(latitude), longitude: String(longitude), radiusKm: String(radiusKm ?? 50) },
  });
}

export async function getLoad(id: string) {
  return api<Load>(`/api/load/${id}`);
}

/** Get all bit records for a load (bargaining history). */
export async function getLoadBitRecords(loadId: string): Promise<LoadBitRecord[]> {
  return getBitRecords<LoadBitRecord>({ entityId: loadId });
}

/** POST: create a bit record for a load. Data is stored and included in load get all. */
export async function createLoadBitRecord(body: CreateLoadBitRecordPayload): Promise<LoadBitRecord> {
  return createBitRecord({ ...body, type: body.type ?? "load" }) as Promise<LoadBitRecord>;
}

/** PUT: update only the status of a load bit record (id = bit record _id or id). */
export async function updateLoadBitRecordStatus(
  recordId: string,
  status: "accept" | "reject" | "pending"
): Promise<LoadBitRecord> {
  return updateBitRecordStatus({ type: "load", recordId, status }) as Promise<LoadBitRecord>;
}

/** Cancel a load with a reason (sets status to rejected). */
export async function cancelLoad(id: string, reason: string, user?: ApiUser) {
  return api<{ message: string; load: Load }>(`/api/load/cancel/${id}`, {
    method: "PUT",
    body: JSON.stringify({ reason, user }),
  });
}

export async function createLoad(body: CreateLoadPayload) {
  return api<{ message: string; load: Load }>("/api/load/add", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateLoad(
  id: string,
  body: Partial<Load> & { user?: ApiUser; bitStatus?: "accept" | "reject" | "pending" }
) {
  return api<{ message: string; load: Load }>(`/api/load/edit/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteLoad(ids: string[]) {
  return api<{ message: string; deletedCount: number; ids: string[] }>("/api/load/delete", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}

