"use client";

import { useEffect, useState, useCallback } from "react";
import { SearchableSelect, type SelectOption } from "@/components/common/SearchableSelect";
import { getLocationStatesByCountry, getLocationCitiesByState } from "@/model/services/location";

const DEFAULT_COUNTRY_ID = "69c60d5a50d03d49adb72bc3";
const TARGET_STATE_NAME = "Tamil Nadu";

export function useTamilNaduCities() {
  const [cityOptions, setCityOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      try {
        const statesRes = await getLocationStatesByCountry(DEFAULT_COUNTRY_ID, {
          limit: 2000,
        });
        if (cancelled || controller.signal.aborted) return;

        const states = Array.isArray(statesRes?.items) ? statesRes.items : [];
        const tamilNadu = states.find((s) => s.name === TARGET_STATE_NAME);
        const stateId = tamilNadu?._id || tamilNadu?.id || tamilNadu?.uuid || "";

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
  }, []);

  return { cityOptions, cityLoading: loading };
}

export function CityFilterDropdown({
  value,
  onChange,
  label = "City",
  placeholder = "All cities",
  sx,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  sx?: Record<string, unknown>;
}) {
  const { cityOptions, cityLoading } = useTamilNaduCities();

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
      placeholder={placeholder}
      loading={cityLoading}
      sx={sx}
    />
  );
}
