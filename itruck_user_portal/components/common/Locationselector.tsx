"use client";

import { useEffect, useRef, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

import {
  getLocationCountriesAll,
  getLocationStatesByCountry,
  getLocationCitiesByState,
} from "@/model/api";

// ─── Types ────────────────────────────────────────────────────────────────

export interface LocationOption {
  /** Canonical id — the one that should be sent to child APIs / saved. */
  id: string;
  name: string;
  /** All raw id-like fields the backend might have returned (id, uuid, _id, externalId). */
  aliases: string[];
}

export interface LocationValue {
  countryId: string;
  country: string;
  stateId: string;
  state: string;
  cityId: string;
  city: string;
}

export const EMPTY_LOCATION_VALUE: LocationValue = {
  countryId: "",
  country: "",
  stateId: "",
  state: "",
  cityId: "",
  city: "",
};

interface LocationSelectorProps {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  disabled?: boolean;
  required?: boolean;
  size?: "small" | "medium";
  /**
   * Restrict the country dropdown to a single country (case-insensitive
   * name match) and auto-select it. Hides the country field entirely if
   * only one match is found. Defaults to "India" so the country field is
   * always locked/hidden unless a caller explicitly passes a different
   * value (or `undefined` to show all countries).
   */
  onlyCountry?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function normalizeOption(raw: any): LocationOption {
  const _id = raw?._id ? String(raw._id) : "";
  const id = raw?.id ? String(raw.id) : "";
  const uuid = raw?.uuid ? String(raw.uuid) : "";
  const externalId = raw?.externalId ? String(raw.externalId) : "";
  const canonical = externalId || id || uuid || _id || "";
  const aliases = [_id, id, uuid, externalId].filter(Boolean);
  return { id: canonical, name: String(raw?.name ?? ""), aliases };
}

/** Finds an option whose canonical id OR any alias matches the stored value. */
function findOption(options: LocationOption[], storedId: string): LocationOption | undefined {
  if (!storedId) return undefined;
  return options.find((o) => o.id === storedId || o.aliases.includes(storedId));
}

// ─── Component ────────────────────────────────────────────────────────────

export function LocationSelector({
  value,
  onChange,
  disabled,
  required,
  size = "small",
  onlyCountry = "India",
}: LocationSelectorProps) {
  const [countries, setCountries] = useState<LocationOption[]>([]);
  const [states, setStates] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);

  const [countriesLoading, setCountriesLoading] = useState(true);
  const [statesLoading, setStatesLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);

  const loadedCountryIdRef = useRef<string>("");
  const loadedStateIdRef = useRef<string>("");

  // ── Load countries once ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setCountriesLoading(true);

    getLocationCountriesAll()
      .then((list) => {
        if (cancelled) return;
        let opts = (list || []).map(normalizeOption).filter((o) => o.id && o.name);

        if (onlyCountry) {
          const target = opts.find(
            (o) => o.name.trim().toLowerCase() === onlyCountry.trim().toLowerCase(),
          );
          opts = target ? [target] : [];

          if (target && !value.countryId) {
            onChange({ ...value, countryId: target.id, country: target.name });
          }
        }

        setCountries(opts);
      })
      .catch(() => {
        if (!cancelled) setCountries([]);
      })
      .finally(() => {
        if (!cancelled) setCountriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyCountry]);

  // ── Resolve + load states whenever the (resolved) country changes ──────
  useEffect(() => {
    if (countriesLoading) return;

    if (!value.countryId) {
      setStates([]);
      setCities([]);
      loadedCountryIdRef.current = "";
      return;
    }

    const match = findOption(countries, value.countryId);
    if (!match) return; // stored id doesn't exist in the loaded list yet/at all

    // Normalize the stored value to the canonical id/name once resolved.
    if (value.countryId !== match.id || value.country !== match.name) {
      onChange({ ...value, countryId: match.id, country: match.name });
      return; // effect will re-run with the normalized id
    }

    if (loadedCountryIdRef.current === match.id) return;
    loadedCountryIdRef.current = match.id;

    let cancelled = false;
    setStatesLoading(true);
    setStates([]);
    setCities([]);

    getLocationStatesByCountry(match.id, { limit: 2000, page: 1 })
      .then((res) => {
        if (cancelled) return;
        setStates((res?.items || []).map(normalizeOption).filter((o) => o.id && o.name));
      })
      .catch(() => {
        if (!cancelled) setStates([]);
      })
      .finally(() => {
        if (!cancelled) setStatesLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries, countriesLoading, value.countryId]);

  // ── Resolve + load cities whenever the (resolved) state changes ────────
  useEffect(() => {
    if (statesLoading) return;

    if (!value.stateId) {
      setCities([]);
      loadedStateIdRef.current = "";
      return;
    }

    const match = findOption(states, value.stateId);
    if (!match) return;

    if (value.stateId !== match.id || value.state !== match.name) {
      onChange({ ...value, stateId: match.id, state: match.name });
      return;
    }

    if (loadedStateIdRef.current === match.id) return;
    loadedStateIdRef.current = match.id;

    let cancelled = false;
    setCitiesLoading(true);
    setCities([]);

    getLocationCitiesByState(match.id, { limit: 2000, page: 1 })
      .then((res) => {
        if (cancelled) return;
        setCities((res?.items || []).map(normalizeOption).filter((o) => o.id && o.name));
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      })
      .finally(() => {
        if (!cancelled) setCitiesLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [states, statesLoading, value.stateId]);

  // ── Resolve the currently-selected city name/id once cities are loaded ─
  useEffect(() => {
    if (citiesLoading || !value.cityId) return;
    const match = findOption(cities, value.cityId);
    if (match && (value.cityId !== match.id || value.city !== match.name)) {
      onChange({ ...value, cityId: match.id, city: match.name });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cities, citiesLoading, value.cityId]);

  const selectedCountry = findOption(countries, value.countryId) ?? null;
  const selectedState = findOption(states, value.stateId) ?? null;
  const selectedCity = findOption(cities, value.cityId) ?? null;

  const showCountryField = !onlyCountry || countries.length > 1;

  return (
    <>
      {showCountryField && (
        <Autocomplete
          options={countries}
          getOptionLabel={(o) => (typeof o === "string" ? o : o.name)}
          value={selectedCountry}
          loading={countriesLoading}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          disabled={disabled || countriesLoading}
          onChange={(_, opt) => {
            onChange({
              ...value,
              countryId: opt?.id ?? "",
              country: opt?.name ?? "",
              stateId: "",
              state: "",
              cityId: "",
              city: "",
            });
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Country"
              required={required}
              fullWidth
              size={size}
              disabled={disabled || countriesLoading}
            />
          )}
        />
      )}

      <Autocomplete
        options={states}
        getOptionLabel={(o) => (typeof o === "string" ? o : o.name)}
        value={selectedState}
        loading={statesLoading}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        disabled={disabled || !value.countryId || statesLoading}
        onChange={(_, opt) => {
          onChange({
            ...value,
            stateId: opt?.id ?? "",
            state: opt?.name ?? "",
            cityId: "",
            city: "",
          });
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="State"
            required={required}
            fullWidth
            size={size}
            disabled={disabled || !value.countryId || statesLoading}
          />
        )}
      />

      <Autocomplete
        options={cities}
        getOptionLabel={(o) => (typeof o === "string" ? o : o.name)}
        value={selectedCity}
        loading={citiesLoading}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        disabled={disabled || !value.stateId || citiesLoading}
        onChange={(_, opt) => {
          onChange({
            ...value,
            cityId: opt?.id ?? "",
            city: opt?.name ?? "",
          });
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="City"
            required={required}
            fullWidth
            size={size}
            disabled={disabled || !value.stateId || citiesLoading}
          />
        )}
      />
    </>
  );
}

export default LocationSelector;