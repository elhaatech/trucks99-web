import { api } from "./common";
import type { ApiUser } from "./user";

// ——— Vehicle Type ———
export type VehicleType = {
  status: string;
  _id: string;
  id?: string;
  vehicle_type: string;
  description?: string;
  name?: string;
  minimumCapacity?: string;
  maximumCapacity?: string;
  /** Optional image URL or uploaded path */
  image?: string;
  /** Populated array of body types OR raw string IDs */
  available_body_type?: VehicleBodyType[] | string[];
  createdAt?: string;
  updatedAt?: string;
  uuid?: string;
};

export async function getVehicleTypeAll(): Promise<VehicleType[]> {
  return api<VehicleType[]>("/api/vehicle-type/all");
}

export async function getVehicleType(id: string) {
  return api<VehicleType>(`/api/vehicle-type/${id}`);
}

export async function createVehicleType(body: {
  vehicle_type: string;
  description?: string;
  minimumCapacity?: string;
  maximumCapacity?: string;
  image?: string;
  available_body_type?: string[];
  user?: ApiUser;
}) {
  return api<{ message: string; vehicleType: VehicleType }>("/api/vehicle-type/add", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateVehicleType(
  id: string,
  body: {
    vehicle_type?: string;
    description?: string;
    minimumCapacity?: string;
    maximumCapacity?: string;
    image?: string;
    available_body_type?: string[];
    user?: ApiUser;
  }
) {
  return api<{ message: string; vehicleType: VehicleType }>(`/api/vehicle-type/edit/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteVehicleType(ids: string[]) {
  return api<{ message: string; deletedCount: number; ids: string[] }>("/api/vehicle-type/delete", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}




// ——— Vehicle Body Type ———
export type VehicleBodyType = {
  _id?: string;
  id?: string;
  vehicle_id?: string;
  vehicle_name: string;
  image?: string;
  status?: "active" | "inactive";
  has_wheel_variants?: "Yes" | "No";
  available_wheels_count?: number[];
  has_length_variants?: "Yes" | "No";
  available_lengths?: number[];
  available_capacity_lengths?: number[];
  createdAt?: string;
  updatedAt?: string;
};

export async function getVehicleBodyTypeAll(): Promise<VehicleBodyType[]> {
  const raw = await api<VehicleBodyType[] | unknown>("/api/vehicle-body-type/all");
  const list = Array.isArray(raw) ? raw : [];
  return list.map((item: VehicleBodyType) => {
    const vehicleId = item?.vehicle_id != null ? String(item.vehicle_id) : "";
    return {
      ...item,
      vehicle_name: item?.vehicle_name ?? "",
      vehicle_id: vehicleId,
      _id: vehicleId,
      id: vehicleId,
    };
  });
}

export async function getVehicleBodyType(id: string): Promise<VehicleBodyType> {
  const item = await api<VehicleBodyType>(`/api/vehicle-body-type/${id}`);
  return {
    ...item,
    vehicle_name: item.vehicle_name,
    _id: item.vehicle_id,
    id: item.vehicle_id,
  };
}

export type VehicleBodyTypePayload = {
  vehicle_name: string;
  image?: string;
  user?: ApiUser;
  has_wheel_variants?: "Yes" | "No";
  available_wheels_count?: number[];
  has_length_variants?: "Yes" | "No";
  available_lengths?: number[];
  available_capacity_lengths?: number[];
};

export async function createVehicleBodyType(body: VehicleBodyTypePayload) {
  return api<{ message: string; vehicle_body_type: VehicleBodyType }>("/api/vehicle-body-type/add", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateVehicleBodyType(id: string, body: VehicleBodyTypePayload) {
  return api<{ message: string; vehicle_body_type: VehicleBodyType }>(`/api/vehicle-body-type/edit/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteVehicleBodyType(ids: string[]) {
  return api<{ message: string; deletedCount: number; ids: string[] }>("/api/vehicle-body-type/delete", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}