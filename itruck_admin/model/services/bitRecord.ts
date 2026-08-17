import { api, publicApi } from "./common";
import type { ApiUser } from "./user";
import { getMarketplaceUserId } from "@/lib/marketplaceUser";
import { getOrCreateGuestKey } from "@/lib/marketplaceGuest";

function resolveProductMarketplaceIdentity(explicit?: {
  userId?: string;
  guestKey?: string;
}): { userId?: string; guestKey?: string } {
  if (explicit?.userId) return { userId: explicit.userId };
  if (explicit?.guestKey) return { guestKey: explicit.guestKey };
  const userId = getMarketplaceUserId();
  if (userId) return { userId };
  return { guestKey: getOrCreateGuestKey() };
}

function isPublicProductPayload(payload: Record<string, unknown>): boolean {
  return (
    payload.type === "product" &&
    (Boolean(payload.userId) || Boolean(payload.guestKey))
  );
}

export type BitRecordKind = "load" | "truck" | "product";

export type BitRecordStatus = "accept" | "reject" | "pending";

/** Shared shape for bid rows returned by the bids API */
export type BitRecordBase = {
  id?: string;
  _id?: string;
  bit: number;
  bitReason?: string;
  status?: BitRecordStatus;
  userId?: string;
  userName?: string;
  userEmail?: string;
  createdAt?: string;
  updatedAt?: string;
  truckId?: string;
};

export type LoadBitRecord = BitRecordBase & { loadId: string };
export type TruckBitRecord = BitRecordBase & { truckId: string };
export type ProductBitRecord = BitRecordBase & {
  productId: string;
  product_info?: {
    _id?: string;
    id?: string;
    description?: string;
    bsNumber?: string;
    price?: number;
    images?: string[];
    status?: string;
    created_by?: string;
  } | null;
};

export type CreateBitRecordPayload =
  | {
      type?: "load";
      loadId: string;
      bit: number;
      bitReason?: string;
      status?: BitRecordStatus;
      user?: ApiUser;
      truckId?: string;
    }
  | {
      type: "truck";
      truckId: string;
      bit: number;
      bitReason?: string;
      status?: BitRecordStatus;
      user?: ApiUser;
      loadId?: string;
    }
  | {
      type: "product";
      productId: string;
      bit: number;
      bitReason?: string;
      status?: BitRecordStatus;
      user?: ApiUser;
      userId?: string;
      guestKey?: string;
    };

export type CreateLoadBitRecordPayload = Extract<CreateBitRecordPayload, { loadId: string }>;
export type CreateTruckBitRecordPayload = Extract<CreateBitRecordPayload, { truckId: string }>;
export type CreateProductBitRecordPayload = Extract<CreateBitRecordPayload, { productId: string }>;

/** Unified bids API base path (POST list/create, PUT /:id update) */
export const BIT_RECORD_API_BASE = "/api/bit-records" as const;

/**
 * Endpoints keyed by `type` (entity id is loadId, truckId, or productId).
 * List and create are POST routes; update uses PUT /:id.
 */
export type ListBitRecordsBody = {
  /** Omit for user-wide my_offers / received_offers list. */
  entityId?: string;
  userId?: string;
  guestKey?: string;
  offerType?: "my_offers" | "received_offers";
  type?: "" | BitRecordKind;
};

export function jsonBodyForListBitRecords(body: ListBitRecordsBody): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (body.entityId) payload.entityId = body.entityId;
  payload.type = body.type ?? "";
  if (body.offerType) payload.offerType = body.offerType;

  const isProduct = body.type === "product" || body.type === "";
  if (isProduct && body.offerType === "my_offers") {
    const id = resolveProductMarketplaceIdentity({
      userId: body.userId,
      guestKey: body.guestKey,
    });
    if (id.userId) payload.userId = id.userId;
    else if (id.guestKey) payload.guestKey = id.guestKey;
  } else {
    if (body.userId) payload.userId = body.userId;
    if (body.guestKey) payload.guestKey = body.guestKey;
  }
  return payload;
}

export const BIT_RECORD_HTTP: Record<
  BitRecordKind,
  {
    listPath: string;
    createPath: string;
    updatePath: (recordId: string) => string;
  }
> = {
  load: {
    listPath: `${BIT_RECORD_API_BASE}/list`,
    createPath: BIT_RECORD_API_BASE,
    updatePath: (recordId) => `${BIT_RECORD_API_BASE}/${recordId}`,
  },
  truck: {
    listPath: `${BIT_RECORD_API_BASE}/list`,
    createPath: BIT_RECORD_API_BASE,
    updatePath: (recordId) => `${BIT_RECORD_API_BASE}/${recordId}`,
  },
  product: {
    listPath: `${BIT_RECORD_API_BASE}/list`,
    createPath: BIT_RECORD_API_BASE,
    updatePath: (recordId) => `${BIT_RECORD_API_BASE}/${recordId}`,
  },
};

export type GetBitRecordsParams = ListBitRecordsBody & {
  /** @deprecated type is inferred server-side from entityId when entityId is set */
  type?: BitRecordKind;
};

export type UpdateBitRecordStatusParams =
  | { type: "load"; recordId: string; status: BitRecordStatus }
  | { type: "truck"; recordId: string; status: BitRecordStatus }
  | { type: "product"; recordId: string; status: BitRecordStatus; userId?: string };

/** JSON body for POST — aligns with backend; only sends ids relevant to `type` */
export function jsonBodyForCreateBitRecord(body: CreateBitRecordPayload): Record<string, unknown> {
  const kind: BitRecordKind = body.type ?? "load";
  const base: Record<string, unknown> = {
    type: kind,
    bit: body.bit,
    bitReason: body.bitReason,
    status: body.status,
  };
  if (body.user) base.user = body.user;

  if (kind === "load") {
    const b = body as Extract<CreateBitRecordPayload, { loadId: string }>;
    base.loadId = b.loadId;
    if (b.truckId != null && b.truckId !== "") base.truckId = b.truckId;
    return base;
  }

  if (kind === "truck") {
    const b = body as Extract<CreateBitRecordPayload, { truckId: string }>;
    base.truckId = b.truckId;
    if (b.loadId != null && b.loadId !== "") base.loadId = b.loadId;
    return base;
  }

  // product
  const b = body as Extract<CreateBitRecordPayload, { productId: string }>;
  base.productId = b.productId;
  const id = resolveProductMarketplaceIdentity({
    userId: b.userId,
    guestKey: b.guestKey,
  });
  if (id.userId) base.userId = id.userId;
  else if (id.guestKey) base.guestKey = id.guestKey;
  return base;
}

function jsonBodyForUpdateBitRecord(params: UpdateBitRecordStatusParams): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    type: params.type,
    status: params.status,
  };
  if (params.type === "product") {
    const userId = params.userId ?? getMarketplaceUserId();
    if (userId) payload.userId = userId;
  }
  return payload;
}

function productMarketplaceClient(payload: Record<string, unknown>) {
  return isPublicProductPayload(payload) ? publicApi : api;
}

/** Global product offers for a user (my_offers | received_offers) — POST /api/bit-records/list */
export async function listProductOffers(params: {
  offerType: "my_offers" | "received_offers";
  userId?: string;
  guestKey?: string;
}): Promise<ProductBitRecord[]> {
  const listBody = jsonBodyForListBitRecords({
    offerType: params.offerType,
    userId: params.userId,
    guestKey: params.guestKey,
    type: "product",
  });
  const res = await publicApi<{
    success?: boolean;
    bitRecords?: ProductBitRecord[];
    data?: { bitRecords?: ProductBitRecord[] };
  }>(
    BIT_RECORD_API_BASE + "/list",
    {
      method: "POST",
      body: JSON.stringify(listBody),
    },
  );
  return res?.bitRecords ?? res?.data?.bitRecords ?? [];
}

/**
 * POST /api/bit-records/list
 * Payload: { entityId, userId?, offerType?, type: "" }
 * When offerType is omitted, returns all bids on the entity (used on view-page load).
 */
export async function getBitRecords<
  T extends LoadBitRecord | TruckBitRecord | ProductBitRecord = LoadBitRecord | TruckBitRecord | ProductBitRecord
>(
  params: GetBitRecordsParams
): Promise<T[]> {
  const listBody = jsonBodyForListBitRecords(params);
  const client = isPublicProductPayload(listBody) ? publicApi : api;
  const res = await client<{
    success?: boolean;
    bitRecords?: T[];
    data?: { bitRecords?: T[] };
  }>(BIT_RECORD_API_BASE + "/list", {
    method: "POST",
    body: JSON.stringify(listBody),
  });
  return (res?.bitRecords ?? res?.data?.bitRecords ?? []) as T[];
}

/** POST create */
export async function createBitRecord(
  body: CreateBitRecordPayload
): Promise<LoadBitRecord | TruckBitRecord | ProductBitRecord> {
  const kind: BitRecordKind = body.type ?? "load";
  const route = BIT_RECORD_HTTP[kind];
  const jsonBody = jsonBodyForCreateBitRecord(body);
  const client = productMarketplaceClient(jsonBody);
  const res = await client<{
    success?: boolean;
    message?: string;
    bitRecord: LoadBitRecord | TruckBitRecord | ProductBitRecord;
  }>(route.createPath, {
    method: "POST",
    body: JSON.stringify(jsonBody),
  });
  if (!res?.bitRecord) throw new Error(res?.message || "Invalid create bid response");
  return res.bitRecord;
}

/** PUT update (record id resolves load vs truck vs product on server); sends `type` for optional validation */
export async function updateBitRecordStatus(
  params: UpdateBitRecordStatusParams
): Promise<LoadBitRecord | TruckBitRecord | ProductBitRecord> {
  const path = BIT_RECORD_HTTP[params.type].updatePath(params.recordId);
  const jsonBody = jsonBodyForUpdateBitRecord(params);
  const client = productMarketplaceClient(jsonBody);
  const res = await client<{
    success?: boolean;
    message?: string;
    bitRecord: LoadBitRecord | TruckBitRecord | ProductBitRecord;
  }>(path, {
    method: "PUT",
    body: JSON.stringify(jsonBody),
  });
  if (!res?.bitRecord) throw new Error(res?.message || "Invalid update bid response");
  return res.bitRecord;
}