"use client";

import { useEffect, useState } from "react";
import { SearchableSelect, type SelectOption } from "@/components/common/SearchableSelect";
import {
  getLocationStatesByCountry,
  cacheLocationStates,
  getCachedLocationStates,
  INDIA_COUNTRY_ID,
  type LocationState,
} from "@/model/services/location";

/**
 * Option value is the state's id (NOT its name), so `state_id` matches the
 * server contract used by category_id / subcategory_id / city_id: the buy-sell
 * list API resolves `state_id` with a strict ObjectId check and silently drops
 * the filter for anything else. `_id` is the Mongo ObjectId; `state.id` is a
 * random UUID, so `_id` must win here (same order as CityFilterDropdown).
 */
function toStateOptions(states: LocationState[]): SelectOption[] {
  return states
    .map((s) => ({
      value: s._id || s.id || s.uuid || "",
      label: s.name || "",
    }))
    .filter((o) => o.value && o.label);
}

export function StateFilterDropdown({
  value,
  onChange,
  label = "State",
  placeholder = "All states",
  sx,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  sx?: Record<string, unknown>;
}) {
  // Seed from the module-level cache so a state already chosen in the URL shows
  // its name immediately instead of the raw id while the list is refetched.
  const [stateOptions, setStateOptions] = useState<SelectOption[]>(() =>
    toStateOptions(getCachedLocationStates(INDIA_COUNTRY_ID) ?? []),
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      try {
        const res = await getLocationStatesByCountry(INDIA_COUNTRY_ID, {
          limit: 2000,
        });
        if (cancelled || controller.signal.aborted) return;

        const states = Array.isArray(res?.items) ? res.items : [];
        cacheLocationStates(INDIA_COUNTRY_ID, states);
        setStateOptions(toStateOptions(states));
      } catch {
        if (!cancelled && !controller.signal.aborted) {
          setStateOptions([]);
        }
      } finally {
        if (!cancelled && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return (
    <SearchableSelect
      label={label}
      value={value}
      onChange={onChange}
      options={stateOptions}
      placeholder={placeholder}
      loading={loading}
      sx={sx}
    />
  );
}
