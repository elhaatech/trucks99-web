"use client";
import {
  FilterCard,
  FilterFieldItem,
  FilterSelectInput,
  FilterTextInput,
  FormAddressField,
  type SelectOption,
} from "@/components/common";
import {
  type TruckFilterState,
  STATUS_OPTIONS,
  TRUCK_STATUS_OPTIONS,
  LOAD_STATUS_OPTIONS,
} from "./truckTypes";
import type { User } from "@/model/api";

interface Props {
  filters: TruckFilterState;
  onChange: (patch: Partial<TruckFilterState>) => void;
  onApply: () => void;
  onClear: () => void;
  vehicleTypeOptions: SelectOption[];
  vehicleBodyTypeOptions: SelectOption[];
  users?: SelectOption[] | User[];
  userOptions?: SelectOption[];
  currentUser?: SelectOption | User | null;
  /** Show truck owner filter dropdown (default: false for Find Truck, true for admin) */
  showUserFilter?: boolean;
}

export function TruckFilters({
  filters,
  onChange,
  onApply,
  onClear,
  vehicleTypeOptions,
  vehicleBodyTypeOptions,
  users,
  userOptions,
  currentUser,
  showUserFilter = false,
}: Props) {
  return (
    <FilterCard
      title="Truck filters"
      subtitle="Refine trucks by location, type, and availability."
      onSearch={onApply}
      onClear={onClear}
      searchLabel="Search"
    >
      {/* ── Row 1: Locations ─────────────────────────────────────────────── */}
      <FilterFieldItem>
        <FormAddressField
          label="Pickup location"
          value={filters.pickupAddress}
          onChange={(val) => onChange({ pickupAddress: val })}
          placeholder="Address or place"
          onPlaceSelect={(addr, { lat, lng }) =>
            onChange({ pickupAddress: addr, pickupLat: lat, pickupLng: lng })
          }
        />
      </FilterFieldItem>

      <FilterFieldItem>
        <FormAddressField
          label="Drop location"
          value={filters.dropAddress}
          onChange={(val) => onChange({ dropAddress: val })}
          placeholder="Address or place"
          onPlaceSelect={(addr, { lat, lng }) =>
            onChange({ dropAddress: addr, dropLat: lat, dropLng: lng })
          }
        />
      </FilterFieldItem>

      {/* ── Row 2: Vehicle classification + Owner ─────────────────────────── */}
      <FilterFieldItem>
        <FilterSelectInput
          label="Vehicle type"
          value={filters.vehicleTypeId}
          onChange={(val) => onChange({ vehicleTypeId: val })}
          options={vehicleTypeOptions}
          placeholder="— Any —"
        />
      </FilterFieldItem>

      <FilterFieldItem>
        <FilterSelectInput
          label="Body type"
          value={filters.vehicleBodyTypeId}
          onChange={(val) => onChange({ vehicleBodyTypeId: val })}
          options={vehicleBodyTypeOptions}
          placeholder="— Any —"
        />
      </FilterFieldItem>

      {/* ── Truck Owner — conditional (admin only) ──────────────────────── */}
      {showUserFilter && (
        <FilterFieldItem>
          <FilterSelectInput
            label="Truck Owner"
            value={(filters as any).userId || ""}
            onChange={(val) => onChange({ userId: val } as any)}
            options={userOptions || []}
            placeholder="— Any —"
          />
        </FilterFieldItem>
      )}

      {/* ── Row 3: Vehicle number + availability status ───────────────────── */}
      <FilterFieldItem>
        <FilterTextInput
          label="Vehicle / Reg. number"
          value={filters.vehicleNumber}
          onChange={(val) => onChange({ vehicleNumber: val })}
          placeholder="Partial match e.g. MH12"
        />
      </FilterFieldItem>

      <FilterFieldItem>
        <FilterSelectInput
          label="Availability"
          value={filters.status}
          onChange={(val) => onChange({ status: val })}
          options={STATUS_OPTIONS}
          placeholder="— Any —"
        />
      </FilterFieldItem>

      {/* ── Row 4: Truck status + load status ────────────────────────────── */}
      <FilterFieldItem>
        <FilterSelectInput
          label="Return Truck ?"
          value={filters.truck_status}
          onChange={(val) => onChange({ truck_status: val })}
          options={TRUCK_STATUS_OPTIONS}
          placeholder="— Any —"
        />
      </FilterFieldItem>

      <FilterFieldItem>
        <FilterSelectInput
          label="Load status"
          value={filters.load_status}
          onChange={(val) => onChange({ load_status: val })}
          options={LOAD_STATUS_OPTIONS}
          placeholder="— Any —"
        />
      </FilterFieldItem>
    </FilterCard>
  );
}
