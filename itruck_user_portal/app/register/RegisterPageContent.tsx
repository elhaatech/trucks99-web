"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import {
  registerMarketplaceUser,
  getLocationCountriesAll,
  getLocationStatesByCountry,
  getLocationCitiesByState,
} from "@/model/api";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { WelcomePanel } from "@/components/layout/WelcomePanel";
import { AuthTextField } from "@/components/ui/AuthTextField";
import { GradientButton } from "@/components/ui/GradientButton";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { isMarketplaceUserLoggedIn } from "@/lib/requireMarketplaceLogin";

interface SimpleOption {
  id: string;
  name: string;
}

function resolveReturnTarget(searchParams: URLSearchParams): string | null {
  const fromQuery = searchParams.get("returnTo")?.trim();
  if (fromQuery && fromQuery.startsWith("/")) return fromQuery;
  return null;
}

export default function MarketplaceRegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const returnTo = useMemo(
    () => resolveReturnTarget(searchParams),
    [searchParams],
  );

  const loginHref = useMemo(() => {
    const base = userProductRoutes.login(returnTo ?? undefined);
    return base;
  }, [returnTo]);

  const [countries, setCountries] = useState<SimpleOption[]>([]);
  const [states, setStates] = useState<SimpleOption[]>([]);
  const [cities, setCities] = useState<SimpleOption[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    mobile: "",
    company_name: "",
    countryId: "",
    country: "",
    stateId: "",
    state: "",
    city: "",
  });

  useEffect(() => {
    void isMarketplaceUserLoggedIn().then((loggedIn) => {
      if (loggedIn) {
        router.replace(returnTo ?? userProductRoutes.dashboard());
      }
    });
  }, [router, returnTo]);

  useEffect(() => {
    let cancelled = false;
    async function loadCountries() {
      setLoadingCountries(true);
      try {
        const countryData = await getLocationCountriesAll();
        if (cancelled) return;
        const countryOpts = (countryData || [])
          .map((c) => ({ id: c.id || c.uuid || "", name: c.name || "" }))
          .filter((c) => c.id && c.name);
        const india = countryOpts.find(
          (c) => c.name.trim().toLowerCase() === "india",
        );
        if (india) {
          setCountries([india]);
          setForm((prev) => ({
            ...prev,
            countryId: india.id,
            country: india.name,
          }));
        } else {
          setCountries([]);
        }
      } catch (err) {
        console.error("Failed to load countries", err);
        if (!cancelled) setError("Could not load location data. Try again later.");
      } finally {
        if (!cancelled) setLoadingCountries(false);
      }
    }
    loadCountries();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!form.countryId) {
      setStates([]);
      return;
    }

    let cancelled = false;
    async function loadStates() {
      setLoadingStates(true);
      try {
        const res = await getLocationStatesByCountry(form.countryId, {
          limit: 2000,
          page: 1,
        });
        if (cancelled) return;
        const items = res?.items || [];
        setStates(
          items
            .map((s) => ({ id: s.id || s.uuid || "", name: s.name || "" }))
            .filter((s) => s.id && s.name),
        );
      } catch (err) {
        console.error("Failed to load states", err);
        if (!cancelled) setStates([]);
      } finally {
        if (!cancelled) setLoadingStates(false);
      }
    }

    loadStates();
    return () => {
      cancelled = true;
    };
  }, [form.countryId]);

  useEffect(() => {
    if (!form.stateId) {
      setCities([]);
      return;
    }

    let cancelled = false;
    async function loadCities() {
      setLoadingCities(true);
      try {
        const res = await getLocationCitiesByState(form.stateId, {
          limit: 2000,
          page: 1,
        });
        if (cancelled) return;
        const items = res?.items || [];
        setCities(
          items
            .map((c) => ({ id: c.id || c.uuid || "", name: c.name || "" }))
            .filter((c) => c.id && c.name),
        );
      } catch (err) {
        console.error("Failed to load cities", err);
        if (!cancelled) setCities([]);
      } finally {
        if (!cancelled) setLoadingCities(false);
      }
    }

    loadCities();
    return () => {
      cancelled = true;
    };
  }, [form.stateId]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!form.mobile.trim()) {
      setError("Mobile number is required.");
      return;
    }
    if (!termsAccepted) {
      setError("Please accept the Terms and Conditions.");
      return;
    }

    try {
      setLoading(true);
      await registerMarketplaceUser({
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        company_name: form.company_name.trim() || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        country: form.country || undefined,
        termsAccepted: true,
      });

      const params = new URLSearchParams();
      params.set("registered", "1");
      params.set("mobile", form.mobile.trim());
      if (returnTo) params.set("returnTo", returnTo);
      router.replace(`${userProductRoutes.login()}?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      leftContent={
        <WelcomePanel
          title="Join TRUCKS99"
          subtitle="Create a marketplace account to list vehicles, make offers, and view full details."
          siteUrl="truck.elhaa.com"
        />
      }
      rightContent={
        <Box sx={{ width: "100%" }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              textAlign: "center",
              mb: 1,
              letterSpacing: "-0.03em",
              fontSize: { xs: "1.5rem", sm: "1.75rem" },
            }}
          >
            Create your account
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: "center", mb: 3, lineHeight: 1.6 }}
          >
            Your account will be set up as a Buy/Sell marketplace user.
          </Typography>

          <form onSubmit={handleRegister}>
            <AuthTextField
              label="Name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              disabled={loading}
            />

            <AuthTextField
              label="Mobile number"
              type="tel"
              placeholder="9876543210"
              value={form.mobile}
              onChange={(e) => setForm((prev) => ({ ...prev, mobile: e.target.value }))}
              disabled={loading}
            />

            <AuthTextField
              label="Company name (optional)"
              value={form.company_name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, company_name: e.target.value }))
              }
              disabled={loading}
            />

            <AuthTextField
              select
              label="Country"
              value={form.countryId}
              onChange={(e) => {
                const id = e.target.value;
                const selected = countries.find((c) => c.id === id);
                setForm((prev) => ({
                  ...prev,
                  countryId: id,
                  country: selected?.name ?? "",
                  stateId: "",
                  state: "",
                  city: "",
                }));
              }}
              disabled={loading || loadingCountries}
            >
              {countries.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </AuthTextField>

            <AuthTextField
              select
              label="State"
              value={form.stateId}
              onChange={(e) => {
                const id = e.target.value;
                const selected = states.find((s) => s.id === id);
                setForm((prev) => ({
                  ...prev,
                  stateId: id,
                  state: selected?.name ?? "",
                  city: "",
                }));
              }}
              disabled={!form.countryId || loading || loadingStates}
            >
              {states.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </AuthTextField>

            <AuthTextField
              select
              label="City"
              value={form.city}
              onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
              disabled={!form.stateId || loading || loadingCities}
            >
              {cities.map((c) => (
                <MenuItem key={c.id} value={c.name}>
                  {c.name}
                </MenuItem>
              ))}
            </AuthTextField>

            <FormControlLabel
              control={
                <Checkbox
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  disabled={loading}
                />
              }
              label={
                <Typography variant="body2">
                  I agree to the{" "}
                  <Link
                    href="/privacy/policy"
                    target="_blank"
                    style={{ fontWeight: 600, textDecoration: "none" }}
                  >
                    Terms and Conditions
                  </Link>
                </Typography>
              }
              sx={{ mt: 1 }}
            />

            {error ? (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            ) : null}

            <Box sx={{ mt: 3 }}>
              <GradientButton type="submit" disabled={loading}>
                {loading ? "Creating account…" : "Create account"}
              </GradientButton>
            </Box>
          </form>

          <Typography variant="body2" sx={{ textAlign: "center", mt: 3 }}>
            Already have an account?{" "}
            <Link href={loginHref} style={{ fontWeight: 600, textDecoration: "none" }}>
              Sign in
            </Link>
          </Typography>
        </Box>
      }
    />
  );
}
