// app/(dashboard)/trucks/_components/truckUtils.ts
import type { VehicleType, VehicleBodyType } from "@/model/api";
import { getRowId } from "@/model/api";
import { getFileUrl } from "@/lib/fileUrl";

export { getFileUrl };

// likely current broken code

export function getVehicleTypeLabel(
  vehicleTypes: VehicleType[],
  value: string | { _id?: string; uuid?: string; name?: string } | undefined | null
): string {
  if (!value) return "—";

  // If the backend already gave us the object with a name, just use it directly
  if (typeof value === "object") {
    return value.name ?? "—";
  }

  // Otherwise it's a string — look it up in the list
  const found = vehicleTypes.find(
    (v) => v.id === value || v.uuid === value || v.name === value
  );
  return found?.name ?? value ?? "—";
}
export const getVehicleBodyTypeLabel = (
  vehicleBodyTypes: VehicleBodyType[],
  id?: string
): string => {
  if (!id) return "—";
  const vbt = vehicleBodyTypes.find(
    (v) => (v.vehicle_id ?? (v as any).id ?? getRowId(v)) === id
  );
  return vbt?.vehicle_name ?? id;
};

export const getVbtId = (vbt: VehicleBodyType): string =>
  (vbt.vehicle_id ?? (vbt as any).id ?? getRowId(vbt) ?? "").trim();