export interface FilterState {
  pickup: string;
  drop: string;
  vehicleTypeId: string;
  vehicleBodyTypeId: string;
  dateFrom: string;
  dateTo: string;
  userName: string;
  userId: string;
  usear: string;
  userIds: string[];
  loadNumber: string;
  status: string[];
}

export interface FormState {
  description: string;
  pickupAddress: string;
  pickupLat: string;
  pickupLng: string;
  dropAddress: string;
  dropLat: string;
  dropLng: string;
  materialId: string;
  vehicleType: string;
  vehicleBodyType: string;
  loadCapacity: string;
  vehicleCapacity: string;
  totalTire: string;
  containerFeet: string;
  pickupTimeISO: string;
  bit: string;
  distanceKm: string;
  status: "pending" | "assigned" | "accepted" | "rejected" | "delivered";
  userId: string;
  usear: string;
}

/** Setter for one form field; use this on dialog props so generics match `useForm`'s `setFieldValue`. */
export type SetFormFieldFn = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

export const EMPTY_FORM: FormState = {
  description: "",
  pickupAddress: "",
  pickupLat: "",
  pickupLng: "",
  dropAddress: "",
  dropLat: "",
  dropLng: "",
  materialId: "",
  vehicleType: "",
  vehicleBodyType: "",
  vehicleCapacity: "",
  totalTire: "",
  containerFeet: "",
  pickupTimeISO: "",
  bit: "",
  distanceKm: "",
  status: "pending",
  userId: "",
  loadCapacity: "",
  usear: "",
};

export const EMPTY_FILTERS: FilterState = {
  pickup: "",
  drop: "",
  vehicleTypeId: "",
  vehicleBodyTypeId: "",
  dateFrom: "",
  dateTo: "",
  userName: "",
  userId: "",
  usear: "",
  userIds: [],
  loadNumber: "",
  status: [],
};