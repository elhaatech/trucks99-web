"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

import type { CompanyStartCountry, User } from "@/model/api";
import {
  createCompanyStartCountry,
  getCurrentUser,
  getRowId,
  updateCompanyStartCountry,
} from "@/model/api";
import {
  BackButton,
  FormFooter,
  FormPageLayout,
  type SelectOption,
} from "@/components/common";
import { useForm } from "@/hooks/useForm";
import { useNotification } from "@/hooks/useNotification";
import { routes } from "@/lib/routes";

import type { FormState } from "../interface/companyStartCountryTypes";
import { EMPTY_FORM } from "../interface/companyStartCountryTypes";

export interface CompanyStartCountryFormProps {
  companyStartCountry?: CompanyStartCountry;
  mode?: "create" | "edit";
  onSuccess?: () => void;
}

export function CompanyStartCountryForm({
  companyStartCountry,
  mode,
  onSuccess,
}: CompanyStartCountryFormProps) {
  const effectiveMode: "create" | "edit" =
    mode ?? (companyStartCountry ? "edit" : "create");
  const isEdit = effectiveMode === "edit";

  const router = useRouter();
  const { notify } = useNotification();

  const { values, setFieldValue } = useForm<FormState>(EMPTY_FORM);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [countriesLoading, setCountriesLoading] = useState(false);
  const [statesLoading, setStatesLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);

  const [countriesOptions, setCountriesOptions] = useState<SelectOption[]>([]);
  const [statesOptions, setStatesOptions] = useState<SelectOption[]>([]);
  const [citiesOptions, setCitiesOptions] = useState<SelectOption[]>([]);

  // Lookup maps for cascading selection (lowercased name -> API id)
  const [countryNameToId, setCountryNameToId] = useState<
    Record<string, string>
  >({});
  const [stateNameToId, setStateNameToId] = useState<Record<string, string>>(
    {},
  );

  const countryOptionValues = useMemo(() => {
    const set = new Set(countriesOptions.map((o) => o.value).filter(Boolean));
    const current = values.country.trim();
    if (current) set.add(current);
    return Array.from(set);
  }, [countriesOptions, values.country]);

  const stateOptionValues = useMemo(() => {
    const set = new Set(statesOptions.map((o) => o.value).filter(Boolean));
    const current = values.state.trim();
    if (current) set.add(current);
    return Array.from(set);
  }, [statesOptions, values.state]);

  const cityOptionValues = useMemo(() => {
    const set = new Set(citiesOptions.map((o) => o.value).filter(Boolean));
    const current = values.city.trim();
    if (current) set.add(current);
    return Array.from(set);
  }, [citiesOptions, values.city]);

  async function loadCountries() {
    setCountriesLoading(true);
    try {
      const list = await import("@/model/api").then((m) =>
        m.getLocationCountriesAll(),
      );
      const opts = (list || [])
        .map((c) => ({ value: c.name || "", label: c.name || "" }))
        .filter((o) => o.value);
      const map: Record<string, string> = {};
      for (const c of list || []) {
        if (!c.name) continue;
        const id = c.id || c.uuid || "";
        if (!id) continue;
        map[String(c.name).toLowerCase()] = id;
      }
      setCountriesOptions(opts);
      setCountryNameToId(map);
    } finally {
      setCountriesLoading(false);
    }
  }

  async function loadStatesByCountry(
    countryId: string,
    preselectedStateName?: string,
  ) {
    setStatesLoading(true);
    try {
      const { getLocationStatesByCountry } = await import("@/model/api");
      const res = await getLocationStatesByCountry(countryId, {
        limit: 2000,
        page: 1,
      });
      const items = res?.items || [];
      const opts = items
        .map((s) => ({ value: s.name || "", label: s.name || "" }))
        .filter((o) => o.value);
      const map: Record<string, string> = {};
      for (const s of items) {
        const id = s.id || s.uuid || "";
        if (!s.name || !id) continue;
        map[String(s.name).toLowerCase()] = id;
      }
      // Ensure preselected value exists in dropdown even if it's missing from current page
      const preLower = preselectedStateName
        ? preselectedStateName.toLowerCase()
        : "";
      if (
        preselectedStateName &&
        !opts.some((o) => o.value.toLowerCase() === preLower)
      ) {
        opts.unshift({
          value: preselectedStateName,
          label: preselectedStateName,
        });
      }
      setStatesOptions(opts);
      setStateNameToId(map);
      return map;
    } finally {
      setStatesLoading(false);
    }
  }

  async function loadCitiesByState(
    stateId: string,
    preselectedCityName?: string,
  ) {
    setCitiesLoading(true);
    try {
      const { getLocationCitiesByState } = await import("@/model/api");
      const res = await getLocationCitiesByState(stateId, {
        limit: 2000,
        page: 1,
      });
      const items = res?.items || [];
      const opts = items
        .map((ct) => ({ value: ct.name || "", label: ct.name || "" }))
        .filter((o) => o.value);
      const preLower = preselectedCityName
        ? preselectedCityName.toLowerCase()
        : "";
      if (
        preselectedCityName &&
        !opts.some((o) => o.value.toLowerCase() === preLower)
      ) {
        opts.unshift({
          value: preselectedCityName,
          label: preselectedCityName,
        });
      }
      setCitiesOptions(opts);
      return;
    } finally {
      setCitiesLoading(false);
    }
  }

  useEffect(() => {
    getCurrentUser()
      .then((u) => setCurrentUser(u as User))
      .catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    loadCountries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!companyStartCountry) return;
    setFieldValue("city", companyStartCountry.city || "");
    setFieldValue("state", companyStartCountry.state || "");
    setFieldValue("country", companyStartCountry.country || "");
  }, [companyStartCountry, setFieldValue]);

  // After countries are loaded, initialize cascaded dropdowns for edit mode.
  useEffect(() => {
    if (!companyStartCountry) return;
    if (countriesOptions.length === 0) return;

    const cName = companyStartCountry.country || "";
    if (!cName) return;
    const cId = countryNameToId[String(cName).toLowerCase()];
    if (cId == null) return;

    (async () => {
      const stateMap = await loadStatesByCountry(
        cId,
        companyStartCountry.state || "",
      );
      const sName = companyStartCountry.state || "";
      const sId = sName ? stateMap[String(sName).toLowerCase()] : null;
      if (sId != null)
        await loadCitiesByState(sId, companyStartCountry.city || "");
    })().catch((e) => {
      notify({
        type: "error",
        message:
          e instanceof Error ? e.message : "Failed to load location dropdowns",
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyStartCountry, countriesOptions.length]);

  // Keep dependent dropdowns in sync even when user types (freeSolo) instead of selecting from menu.
  useEffect(() => {
    const countryName = values.country.trim();
    if (!countryName) {
      setStatesOptions([]);
      setCitiesOptions([]);
      setStateNameToId({});
      return;
    }

    const countryId = countryNameToId[countryName.toLowerCase()];
    if (!countryId) return;

    void loadStatesByCountry(countryId).catch((e) => {
      notify({
        type: "error",
        message: e instanceof Error ? e.message : "Failed to load states",
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.country, countryNameToId]);

  useEffect(() => {
    const stateName = values.state.trim();
    if (!stateName) {
      setCitiesOptions([]);
      return;
    }

    const stateId = stateNameToId[stateName.toLowerCase()];
    if (!stateId) return;

    void loadCitiesByState(stateId).catch((e) => {
      notify({
        type: "error",
        message: e instanceof Error ? e.message : "Failed to load cities",
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.state, stateNameToId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const city = values.city.trim();
    const state = values.state.trim();
    const country = values.country.trim();

    if (!city) {
      const msg = "City is required";
      setError(msg);
      notify({ type: "error", message: msg });
      return;
    }
    if (!state) {
      const msg = "State is required";
      setError(msg);
      notify({ type: "error", message: msg });
      return;
    }
    if (!country) {
      const msg = "Country is required";
      setError(msg);
      notify({ type: "error", message: msg });
      return;
    }

    const userPayload = currentUser
      ? { name: currentUser.name, role: currentUser.role }
      : undefined;

    setSubmitting(true);
    try {
      if (isEdit && companyStartCountry) {
        await updateCompanyStartCountry(getRowId(companyStartCountry), {
          city,
          state,
          country,
          user: userPayload,
        });
        notify({ type: "success", message: "Location updated successfully." });
      } else {
        await createCompanyStartCountry({
          city,
          state,
          country,
          user: userPayload,
        });
        notify({ type: "success", message: "Location created successfully." });
      }

      onSuccess ? onSuccess() : router.push(routes.companyStartCountry.list());
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : isEdit
            ? "Failed to update"
            : "Failed to create";
      setError(msg);
      notify({ type: "error", message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormPageLayout
      title={isEdit ? "Edit Location" : "Create Location"}
      subtitle={isEdit ? "Update city/state/country mapping" : "Add city/state/country mapping."}
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Company Start Countries", href: routes.companyStartCountry.list() },
        { label: isEdit ? "Edit" : "Create" },
      ]}
      backButton={<BackButton fallback={routes.companyStartCountry.list()} label="Back to list" />}
      footer={
        <FormFooter
          formId="company-start-country-form"
          submitting={submitting}
          submitLabel={isEdit ? "Update" : "Create"}
          submittingLabel={isEdit ? "Updating…" : "Creating…"}
          onCancel={() => router.push(routes.companyStartCountry.list())}
        />
      }
    >
      {error ? (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2.5 }}>
          {error}
        </Alert>
      ) : null}

      <Box
        component="form"
        id="company-start-country-form"
        onSubmit={handleSubmit}
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
          gap: 2.5,
          "& > *": { minWidth: 0 },
          "& .fullWidth": { gridColumn: "1 / -1" },
        }}
      >
          <Autocomplete
            freeSolo
            options={countryOptionValues}
            value={values.country}
            onInputChange={(_, countryName) => {
              setFieldValue("country", countryName);
            }}
            onChange={async (_, countryName) => {
              const selected = (countryName || "").trim();
              setFieldValue("country", selected);
              setFieldValue("state", "");
              setFieldValue("city", "");
              setStatesOptions([]);
              setCitiesOptions([]);
              setStateNameToId({});

              if (!selected) return;
              const cId = countryNameToId[selected.toLowerCase()];
              if (cId) await loadStatesByCountry(cId);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                required
                fullWidth
                size="small"
                label="Country"
                helperText="Select existing or type a new country"
                disabled={countriesLoading || submitting}
              />
            )}
          />

          <Autocomplete
            freeSolo
            options={stateOptionValues}
            value={values.state}
            onInputChange={(_, stateName) => {
              setFieldValue("state", stateName);
            }}
            onChange={async (_, stateName) => {
              const selected = (stateName || "").trim();
              setFieldValue("state", selected);
              setFieldValue("city", "");
              setCitiesOptions([]);

              if (!selected) return;
              const sId = stateNameToId[selected.toLowerCase()];
              if (sId) await loadCitiesByState(sId);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                required
                fullWidth
                size="small"
                label="State"
                helperText="Select existing or type a new state"
                disabled={statesLoading || submitting}
              />
            )}
          />

          <Autocomplete
            freeSolo
            options={cityOptionValues}
            value={values.city}
            onInputChange={(_, cityName) => {
              setFieldValue("city", cityName);
            }}
            onChange={(_, cityName) => {
              setFieldValue("city", (cityName || "").trim());
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                required
                fullWidth
                size="small"
                label="City"
                helperText="Select existing or type a new city"
                disabled={citiesLoading || submitting}
              />
            )}
          />

      </Box>
    </FormPageLayout>
  );
}
