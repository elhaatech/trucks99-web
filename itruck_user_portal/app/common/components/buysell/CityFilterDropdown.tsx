"use client";

import { useEffect, useState, useCallback } from "react";
import { SearchableSelect, type SelectOption } from "@/components/common/SearchableSelect";
import {
  getLocationStatesByCountry,
  getLocationCitiesByState,
  cacheLocationStates,
  resolveStateIdByName,
  INDIA_COUNTRY_ID,
} from "@/model/services/location";

const TARGET_STATE_NAME = "Tamil Nadu";

export function CityFilterDropdown({
  value,
  onChange,
  label = "City",
  placeholder = "All cities",
  /** When set, only cities belonging to this state (by name) are shown. */
  selectedStateName,
  sx,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  selectedStateName?: string;
  sx?: Record<string, unknown>;
}) {
  const [cityOptions, setCityOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      try {
        // Resolve the selected state's id, reusing the cached states list when
        // available (the State filter dropdown populates it on mount).
        let stateId = selectedStateName
          ? resolveStateIdByName(INDIA_COUNTRY_ID, selectedStateName)
          : "";

        if (!stateId) {
          const statesRes = await getLocationStatesByCountry(INDIA_COUNTRY_ID, {
            limit: 2000,
          });
          if (cancelled || controller.signal.aborted) return;

          const states = Array.isArray(statesRes?.items) ? statesRes.items : [];
          cacheLocationStates(INDIA_COUNTRY_ID, states);

          const target = selectedStateName
            ? states.find(
                (s) =>
                  (s.name || "").trim().toLowerCase() ===
                  selectedStateName.trim().toLowerCase(),
              )
            : states.find((s) => s.name === TARGET_STATE_NAME);
          stateId = target?._id || target?.id || target?.uuid || "";
        }

        if (!stateId) {
          setCityOptions([]);
          return;
        }

        const result = await getLocationCitiesByState(stateId, {
          limit: 2000,
        });
        if (cancelled || controller.signal.aborted) return;

        const rawItems = Array.isArray(result?.items) ? result.items : [];
        const cities = rawItems.filter((item): item is { _id?: string; id?: string; uuid?: string; externalId?: number; name?: string } =>
          Boolean(item.name)
        );
        setCityOptions(
          cities.map((city) => ({
            value: city._id || city.id || city.uuid || String(city.externalId ?? ""),
            label: city.name || "",
          }))
        );
      } catch {
        if (!cancelled && !controller.signal.aborted) {
          setCityOptions([]);
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
  }, [selectedStateName]);

  const handleChange = useCallback(
    (newValue: string) => {
      onChange(newValue);
    },
    [onChange],
  );

  return (
    <SearchableSelect
      label={label}
      value={value}
      onChange={handleChange}
      options={cityOptions}
      placeholder={selectedStateName ? "All cities" : placeholder}
      loading={loading}
      sx={sx}
    />
  );
}
