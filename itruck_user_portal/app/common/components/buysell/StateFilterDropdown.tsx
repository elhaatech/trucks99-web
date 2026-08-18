"use client";

import { useEffect, useState } from "react";
import { SearchableSelect, type SelectOption } from "@/components/common/SearchableSelect";
import {
  getLocationStatesByCountry,
  cacheLocationStates,
  INDIA_COUNTRY_ID,
} from "@/model/services/location";

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
  const [stateOptions, setStateOptions] = useState<SelectOption[]>([]);
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
        setStateOptions(
          states
            .map((s) => ({ value: s.name || "", label: s.name || "" }))
            .filter((o) => o.value),
        );
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
