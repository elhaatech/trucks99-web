import { api } from "./common_fixed";
import type { ApiUser } from "./user";

// ——— Shipper ———
export type Shipper = {
  _id: string;
  id?: string; // uuid when available
  name: string;
  description?: string;
  contactEmail?: string;
  contactMobile?: string;
  company?: string;
  status?: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
};

export async function getShipperAll(): Promise<Shipper[]> {
  return api<Shipper[]>("/api/shipper/all");
}

/** Shippers linked to this user (createdBy). For Shipper view. */
export async function getMyShippers(userId: string): Promise<Shipper[]> {
  return api<Shipper[]>(`/api/shipper/my`, { params: { userId } });
}

export async function getShipper(id: string) {
  return api<Shipper>(`/api/shipper/${id}`);
}

export async function createShipper(body: Partial<Shipper> & { name: string; user?: ApiUser }) {
  return api<{ message: string; shipper: Shipper }>("/api/shipper/add", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateShipper(id: string, body: Partial<Shipper> & { user?: ApiUser }) {
  return api<{ message: string; shipper: Shipper }>(`/api/shipper/edit/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteShipper(ids: string[]) {
  return api<{ message: string; deletedCount: number; ids: string[] }>("/api/shipper/delete", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}

