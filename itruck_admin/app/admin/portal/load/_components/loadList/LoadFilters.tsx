"use client";

import { useMemo } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import Checkbox from "@mui/material/Checkbox";
import ListItemText from "@mui/material/ListItemText";
import type { VehicleType, VehicleBodyType, User } from "@/model/api";
import {
  FilterCard,
  FilterDateInput,
  FilterFieldItem,
} from "@/components/common";
import { getRowId } from "@/model/api";
import type { FilterState } from "../interface/loadTypes";

// ─── constants ────────────────────────────────────────────────────────────────

const LOAD_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "delivered",
  "cancelled",
  "draft",
] as const;

// ─── helpers ─────────────────────────────────────────────────────────────────

function getUserLabel(u: User): string {
  return (
    (u as any).name ??
    (u as any).company_name ??
    (u as any).mobile ??
    getRowId(u) ??
    ""
  ).toString();
}

function getUserObjectId(u: User): string {
  return ((u as any)._id ?? getRowId(u) ?? "").toString();
}

function getVehicleTypeId(vt: VehicleType): string {
  return (vt.id ?? (vt as any)._id ?? "").toString();
}

function getVehicleBodyTypeId(vbt: VehicleBodyType): string {
  return (
    (vbt as any).vehicle_id ??
    vbt.id ??
    (vbt as any)._id ??
    ""
  ).toString();
}

function getVehicleTypeName(vt: VehicleType): string {
  return (vt.vehicle_type ?? (vt as any).name ?? "").toString();
}

// Matches the label format used in LoadForm's vehicleTypeOptions
function getVehicleTypeLabel(vt: VehicleType): string {
  const name = getVehicleTypeName(vt);
  const min = (vt as any).minimumCapacity;
  const max = (vt as any).maximumCapacity;
  if (min != null && max != null) return `${name} (${min}T – ${max}T)`;
  return name;
}

function getVehicleBodyTypeLabel(vbt: VehicleBodyType): string {
  return (vbt.vehicle_name ?? (vbt as any).name ?? "").toString();
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── props ────────────────────────────────────────────────────────────────────

export interface LoadFiltersProps {
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onSearch: () => void;
  onClear: () => void;
  users: User[];
  vehicleTypes: VehicleType[];
  vehicleBodyTypes: VehicleBodyType[];
  uniquePickupAddresses: string[];
  uniqueDropAddresses: string[];
  loadNumbers?: string[];
  /** Show user filter dropdown (default: false for Find Load, true for admin) */
  showUserFilter?: boolean;
}

// ─── component ────────────────────────────────────────────────────────────────

export function LoadFilters({
  filters,
  onChange,
  onSearch,
  onClear,
  users,
  vehicleTypes,
  vehicleBodyTypes,
  uniquePickupAddresses,
  uniqueDropAddresses,
  loadNumbers = [],
  showUserFilter = false,
}: LoadFiltersProps) {
  const selectedUsers: User[] = (filters.userIds ?? [])
    .map((id) =>
      users.find((u) => getUserObjectId(u) === id || getRowId(u) === id),
    )
    .filter((u): u is User => Boolean(u));

  const selectedVehicleType: VehicleType | null =
    vehicleTypes.find((vt) => getVehicleTypeId(vt) === filters.vehicleTypeId) ??
    null;

  // ── Cascade: filter body types based on selected vehicle type ─────────────
  // Mirrors the same logic used in LoadForm's vehicleBodyTypeOptions memo.
  // When a vehicle type is selected and has an available_body_type array,
  // only those body types are shown. Falls back to all body types otherwise.
  const filteredVehicleBodyTypes: VehicleBodyType[] = useMemo(() => {
    if (!selectedVehicleType) return vehicleBodyTypes;

    const availableBodyTypes = (selectedVehicleType as any).available_body_type;

    if (Array.isArray(availableBodyTypes) && availableBodyTypes.length > 0) {
      return availableBodyTypes as VehicleBodyType[];
    }

    // Vehicle type exists but has no nested body types → show nothing (same as LoadForm)
    if (Array.isArray(availableBodyTypes) && availableBodyTypes.length === 0) {
      return [];
    }

    // No available_body_type field at all → fallback to full list
    return vehicleBodyTypes;
  }, [selectedVehicleType, vehicleBodyTypes]);

  // ── Derive selected body type from the filtered list ─────────────────────
  // Must come AFTER filteredVehicleBodyTypes so it searches the correct subset.
  const selectedVehicleBodyType: VehicleBodyType | null =
    filteredVehicleBodyTypes.find(
      (vbt) => getVehicleBodyTypeId(vbt) === filters.vehicleBodyTypeId,
    ) ?? null;

  return (
    <FilterCard
      title="Load filters"
      subtitle="Refine loads by locations, vehicle, and date range."
      onSearch={onSearch}
      onClear={onClear}
    >
      {/* ── Load number ──────────────────────────────────────────────── */}
      <FilterFieldItem>
        <Autocomplete<string, false, false, true>
          size="small"
          freeSolo
          clearOnBlur={false}
          options={loadNumbers}
          value={filters.loadNumber || null}
          onChange={(_, v) =>
            onChange({ loadNumber: typeof v === "string" ? v : "" })
          }
          inputValue={filters.loadNumber ?? ""}
          onInputChange={(_, v) => onChange({ loadNumber: v })}
          getOptionLabel={(o) => (typeof o === "string" ? o : "")}
          filterOptions={(opts, { inputValue }) => {
            const q = inputValue.trim().toLowerCase();
            if (!q) return opts;
            return opts.filter((o) => o.toLowerCase().includes(q));
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Load number"
              placeholder="e.g. L001"
            />
          )}
        />
      </FilterFieldItem>

      {/* ── Status ───────────────────────────────────────────────────── */}
      <FilterFieldItem>
        <Autocomplete<string, true, false, false>
          size="small"
          multiple
          disableCloseOnSelect
          options={[...LOAD_STATUSES]}
          value={filters.status ?? []}
          onChange={(_, selected) => onChange({ status: selected })}
          getOptionLabel={(o) => capitalize(o)}
          isOptionEqualToValue={(option, value) => option === value}
          renderOption={(props, option, { selected }) => (
            <li {...props} key={option}>
              <Checkbox
                size="small"
                checked={selected}
                sx={{ mr: 1, p: 0.5 }}
              />
              <ListItemText primary={capitalize(option)} />
            </li>
          )}
          renderTags={(selected, getTagProps) =>
            selected.map((s, index) => (
              <Chip
                {...getTagProps({ index })}
                key={s}
                label={capitalize(s)}
                size="small"
              />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label="Status"
              placeholder={
                (filters.status ?? []).length === 0
                  ? "Select one or more..."
                  : ""
              }
            />
          )}
        />
      </FilterFieldItem>

      {/* ── Pickup location ──────────────────────────────────────────── */}
      <FilterFieldItem>
        <Autocomplete<string, false, false, true>
          size="small"
          freeSolo
          clearOnBlur={false}
          options={uniquePickupAddresses}
          value={filters.pickup || null}
          onChange={(_, v) =>
            onChange({ pickup: typeof v === "string" ? v : "" })
          }
          inputValue={filters.pickup ?? ""}
          onInputChange={(_, v) => onChange({ pickup: v })}
          getOptionLabel={(o) => (typeof o === "string" ? o : "")}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Pickup location"
              placeholder="Search or select..."
            />
          )}
        />
      </FilterFieldItem>

      {/* ── Drop location ────────────────────────────────────────────── */}
      <FilterFieldItem>
        <Autocomplete<string, false, false, true>
          size="small"
          freeSolo
          clearOnBlur={false}
          options={uniqueDropAddresses}
          value={filters.drop || null}
          onChange={(_, v) =>
            onChange({ drop: typeof v === "string" ? v : "" })
          }
          inputValue={filters.drop ?? ""}
          onInputChange={(_, v) => onChange({ drop: v })}
          getOptionLabel={(o) => (typeof o === "string" ? o : "")}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Drop location"
              placeholder="Search or select..."
            />
          )}
        />
      </FilterFieldItem>

      {/* ── Users — multi-select (admin/load-list only) ──────────────── */}
      {showUserFilter && (
        <FilterFieldItem>
          <Autocomplete<User, true, false, false>
            size="small"
            multiple
            disableCloseOnSelect
            options={users}
            value={selectedUsers}
            filterOptions={(opts, { inputValue }) => {
              const q = inputValue.trim().toLowerCase();
              if (!q) return opts;
              return opts.filter(
                (u) =>
                  getUserLabel(u).toLowerCase().includes(q) ||
                  ((u as any).mobile ?? "").toLowerCase().includes(q),
              );
            }}
            onChange={(_, selected) => {
              onChange({
                userIds: selected.map((u) => getUserObjectId(u)),
                userName: selected.map(getUserLabel).join(", "),
              });
            }}
            getOptionLabel={(u) => getUserLabel(u)}
            isOptionEqualToValue={(option, value) =>
              getUserObjectId(option) === getUserObjectId(value)
            }
            renderOption={(props, option, { selected }) => (
              <li {...props} key={getUserObjectId(option)}>
                <Checkbox
                  size="small"
                  checked={selected}
                  sx={{ mr: 1, p: 0.5 }}
                />
                <ListItemText
                  primary={getUserLabel(option)}
                  secondary={(option as any).mobile ?? undefined}
                />
              </li>
            )}
            renderTags={(selected, getTagProps) =>
              selected.map((u, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={getUserObjectId(u)}
                  label={getUserLabel(u)}
                  size="small"
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Load owner(s)"
                placeholder={
                  selectedUsers.length === 0 ? "Select one or more users..." : ""
                }
              />
            )}
          />
        </FilterFieldItem>
      )}

      {/* ── Vehicle type ─────────────────────────────────────────────── */}
      <FilterFieldItem>
        <Autocomplete<VehicleType, false, false, true>
          size="small"
          freeSolo
          clearOnBlur={false}
          options={vehicleTypes}
          value={
            selectedVehicleType ??
            (filters.vehicleTypeId ? filters.vehicleTypeId : null)
          }
          onChange={(_, v) => {
            if (!v) {
              // Changing vehicle type resets body type — same cascade as LoadForm
              onChange({ vehicleTypeId: "", vehicleBodyTypeId: "" });
            } else if (typeof v === "string") {
              onChange({ vehicleTypeId: v, vehicleBodyTypeId: "" });
            } else {
              onChange({ vehicleTypeId: getVehicleTypeId(v), vehicleBodyTypeId: "" });
            }
          }}
          inputValue={
            selectedVehicleType
              ? getVehicleTypeLabel(selectedVehicleType)
              : (filters.vehicleTypeId ?? "")
          }
          onInputChange={(_, v, reason) => {
            if (reason === "clear") onChange({ vehicleTypeId: "", vehicleBodyTypeId: "" });
            if (reason === "input") onChange({ vehicleTypeId: v, vehicleBodyTypeId: "" });
          }}
          getOptionLabel={(vt) =>
            typeof vt === "string" ? vt : getVehicleTypeLabel(vt)
          }
          isOptionEqualToValue={(option, value) => {
            const v = value as VehicleType | string;
            if (typeof v === "string") {
              return (
                getVehicleTypeId(option) === v ||
                getVehicleTypeLabel(option).toLowerCase() === v.toLowerCase()
              );
            }
            return getVehicleTypeId(option) === getVehicleTypeId(v);
          }}
          filterOptions={(opts, { inputValue }) => {
            const q = inputValue.trim().toLowerCase();
            if (!q) return opts;
            return opts.filter((vt) =>
              getVehicleTypeLabel(vt).toLowerCase().includes(q),
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Vehicle type"
              placeholder="Search or select..."
            />
          )}
        />
      </FilterFieldItem>

      {/* ── Vehicle body type — cascaded from selected vehicle type ──── */}
      <FilterFieldItem>
        <Autocomplete<VehicleBodyType, false, false, true>
          size="small"
          freeSolo
          clearOnBlur={false}
          options={filteredVehicleBodyTypes}
          value={
            selectedVehicleBodyType ??
            (filters.vehicleBodyTypeId ? filters.vehicleBodyTypeId : null)
          }
          onChange={(_, v) => {
            if (!v) {
              onChange({ vehicleBodyTypeId: "" });
            } else if (typeof v === "string") {
              onChange({ vehicleBodyTypeId: v });
            } else {
              onChange({ vehicleBodyTypeId: getVehicleBodyTypeId(v) });
            }
          }}
          inputValue={
            selectedVehicleBodyType
              ? getVehicleBodyTypeLabel(selectedVehicleBodyType)
              : (filters.vehicleBodyTypeId ?? "")
          }
          onInputChange={(_, v, reason) => {
            if (reason === "clear") onChange({ vehicleBodyTypeId: "" });
            if (reason === "input") onChange({ vehicleBodyTypeId: v });
          }}
          getOptionLabel={(vbt) =>
            typeof vbt === "string" ? vbt : getVehicleBodyTypeLabel(vbt)
          }
          isOptionEqualToValue={(option, value) => {
            const v = value as VehicleBodyType | string;
            if (typeof v === "string") {
              return (
                getVehicleBodyTypeId(option) === v ||
                getVehicleBodyTypeLabel(option).toLowerCase() ===
                  v.toLowerCase()
              );
            }
            return getVehicleBodyTypeId(option) === getVehicleBodyTypeId(v);
          }}
          filterOptions={(opts, { inputValue }) => {
            const q = inputValue.trim().toLowerCase();
            if (!q) return opts;
            return opts.filter((vbt) =>
              getVehicleBodyTypeLabel(vbt).toLowerCase().includes(q),
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Vehicle body type"
              placeholder={
                !filters.vehicleTypeId
                  ? "Search or select..."
                  : filteredVehicleBodyTypes.length === 0
                    ? "No body types available"
                    : "Search or select..."
              }
            />
          )}
        />
      </FilterFieldItem>

      {/* ── Date range ───────────────────────────────────────────────── */}
      <FilterFieldItem>
        <FilterDateInput
          label="Date from"
          value={filters.dateFrom}
          onChange={(v) => onChange({ dateFrom: v })}
        />
      </FilterFieldItem>
      <FilterFieldItem>
        <FilterDateInput
          label="Date to"
          value={filters.dateTo}
          onChange={(v) => onChange({ dateTo: v })}
        />
      </FilterFieldItem>
    </FilterCard>
  );
}