// app/(dashboard)/trucks/_components/truckTypes.ts

export interface TruckFilterState {
  pickupAddress: string;
  pickupLat: number | "";
  pickupLng: number | "";
  dropAddress: string;
  dropLat: number | "";
  dropLng: number | "";
  vehicleTypeId: string;
  vehicleBodyTypeId: string;
  vehicleNumber: string;
  status: string;
  truck_status: string;
  load_status: string;
  radiusKm: number;
  page: number;
  limit: number;
}

export interface TruckFormState {
  // ── Identity ───────────────────────────────────────────────────────────────
  vehicleNumber: string;
  driverName: string;
  driverId: string;

  // ── Classification ─────────────────────────────────────────────────────────
  vehicleType: string;       // truckType on backend
  vehicleBody: string;       // vehicleBody on backend (open/closed body description)
  vehicleBodyType: string;   // vehicle body type id/name
  vehicleBodyLength: string;
  containerFeet: string;     // container size in feet

  // ── Capacity & tyres ───────────────────────────────────────────────────────
  capacity: string;          // vehicleCapacity
  loadCapacity: string;      // auto-filled from capacity + truckStatus; editable
  vehicleTyre: string;       // total_tire

  // ── Status ─────────────────────────────────────────────────────────────────
  status: string;            // available | in-transit | maintenance | unavailable
  truckStatus: string;       // truck_status: half body | empty body | return truck
  loadStatus: string;        // load_status: full load | half load | part load

  // ── Location / pricing ─────────────────────────────────────────────────────
  currentLocation: string;
  dropLocation: string;      // destination / drop address stored on truck
  price: string;             // freight price

  // ── Contact ────────────────────────────────────────────────────────────────
  contactNumber: string;

  // ── Owner ──────────────────────────────────────────────────────────────────
  ownerId: string;           // userId / ownerId sent to backend

  // ── Bid fields (stored on truck document) ──────────────────────────────────
  bit: string;               // bid amount
  bitReason: string;

  // ── Documents & images ─────────────────────────────────────────────────────
  vehicleImageUrl: string;
  vehicleImages: string[];          // additional image URLs already uploaded
  vehicleImageFile: File | null;    // new primary image to upload
  vehicleImageFiles: File[];        // new additional images to upload
  vehicleRCDocumentUrl: string;
  vehicleRCDocumentFile: File | null;
}

export const EMPTY_FORM: TruckFormState = {
  vehicleNumber: "",
  driverName: "",
  driverId: "",
  vehicleType: "",
  vehicleBody: "",
  vehicleBodyType: "",
  vehicleBodyLength: "",
  containerFeet: "",
  capacity: "",
  loadCapacity: "",
  vehicleTyre: "",
  status: "available",
  truckStatus: "",
  loadStatus: "",
  currentLocation: "",
  dropLocation: "",
  price: "",
  contactNumber: "",
  ownerId: "",
  bit: "",
  bitReason: "",
  vehicleImageUrl: "",
  vehicleImages: [],
  vehicleImageFile: null,
  vehicleImageFiles: [],
  vehicleRCDocumentUrl: "",
  vehicleRCDocumentFile: null,
};

export const EMPTY_FILTERS: TruckFilterState = {
  pickupAddress: "",
  pickupLat: "",
  pickupLng: "",
  dropAddress: "",
  dropLat: "",
  dropLng: "",
  vehicleTypeId: "",
  vehicleBodyTypeId: "",
  vehicleNumber: "",
  status: "",
  truck_status: "",
  load_status: "",
  radiusKm: 10,
  page: 1,
  limit: 20,
};

export const STATUS_OPTIONS = [
  { value: "available",   label: "Available"   },
  { value: "in-transit",  label: "In Transit"  },
  { value: "maintenance", label: "Maintenance" },
  { value: "unavailable", label: "Unavailable" },
  {value: "draft",       label: "Draft"       },
];

export const TRUCK_STATUS_OPTIONS = [
  { value: "forward",      label: "No"      }, // ← must be "forward", not "forword"
  { value: "return truck", label: "Yes" },
];

export const LOAD_STATUS_OPTIONS = [
  { value: "full load", label: "Full Load" },
  { value: "half load", label: "Half Load" },
  { value: "empty body",   label: "Empty Body"   },
];