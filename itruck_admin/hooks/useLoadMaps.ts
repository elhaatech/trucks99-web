import { useMemo } from "react";
import type { VehicleType, VehicleBodyType, Material, User } from "@/model/api";
import { getRowId } from "@/model/api";

function idString(u: User): string {
  return getRowId(u) ?? (u as { _id?: string })._id ?? "";
}

function materialId(m: Material): string {
  return m.id ?? (m as { _id?: string })._id ?? "";
}

function vehicleTypeId(vt: VehicleType): string {
  return vt.id ?? (vt as { _id?: string })._id ?? "";
}

function vehicleBodyId(vbt: VehicleBodyType): string {
  return vbt.vehicle_id ?? vbt.id ?? (vbt as { _id?: string })._id ?? "";
}

export function useLoadMaps(
  users: User[],
  materials: Material[],
  vehicleTypes: VehicleType[],
  vehicleBodyTypes: VehicleBodyType[],
  currentUser?: User  
) {
  const usersMap = useMemo(() => {
    const map = new Map<string, User>();
    users.forEach((u) => {
      const id = idString(u);
      if (id) map.set(String(id), u);
    });
    return map;
  }, [users]);

  const materialsMap = useMemo(() => {
    const map = new Map<string, Material>();
    materials.forEach((m) => {
      const id = materialId(m);
      if (id) map.set(String(id), m);
    });
    return map;
  }, [materials]);

  const vehicleTypesMap = useMemo(() => {
    const map = new Map<string, VehicleType>();
    vehicleTypes.forEach((vt) => {
      const id = vehicleTypeId(vt);
      if (id) map.set(String(id), vt);
    });
    return map;
  }, [vehicleTypes]);

  const vehicleBodyTypesMap = useMemo(() => {
    const map = new Map<string, VehicleBodyType>();
    vehicleBodyTypes.forEach((vbt) => {
      const id = vehicleBodyId(vbt);
      if (id) map.set(String(id), vbt);
    });
    return map;
  }, [vehicleBodyTypes]);

  return { usersMap, materialsMap, vehicleTypesMap, vehicleBodyTypesMap, currentUser };
}