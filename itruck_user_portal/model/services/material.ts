import { api } from "./common_fixed";
import type { ApiUser } from "./user";

// ——— Material ———
export type Material = {
  _id: string;
  id?: string; // uuid when available
  materials_type: string;
  subcommodity?: string;
  commodity?: string;
  is_insurance_available?: boolean;
  status?: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
};

export async function getMaterialAll(): Promise<Material[]> {
  return api<Material[]>("/api/material/all");
}

export async function getMaterial(id: string) {
  return api<Material>(`/api/material/${id}`);
}

export async function createMaterial(body: {
  materials_type: string;
  subcommodity?: string;
  commodity?: string;
  is_insurance_available?: boolean;
  user?: ApiUser;
}) {
  return api<{ message: string; material: Material }>("/api/material/add", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateMaterial(
  id: string,
  body: {
    materials_type: string;
    subcommodity?: string;
    commodity?: string;
    is_insurance_available?: boolean;
    user?: ApiUser;
  }
) {
  return api<{ message: string; material: Material }>(`/api/material/edit/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteMaterial(ids: string[]) {
  return api<{ message: string; deletedCount: number; ids: string[] }>("/api/material/delete", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}

