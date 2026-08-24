"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import {
  sendOtp,
  getLocationCountriesAll,
  getLocationStatesByCountry,
  getLocationCitiesByState,
  getRoles,
  type Role,
} from "@/model/api";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { WelcomePanel } from "@/components/layout/WelcomePanel";
import { AuthTextField } from "@/components/ui/AuthTextField";
import { GradientButton } from "@/components/ui/GradientButton";

interface SimpleOption {
  id: string;
  name: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  const [countries, setCountries] = useState<SimpleOption[]>([]);
  const [states, setStates] = useState<SimpleOption[]>([]);
  const [cities, setCities] = useState<SimpleOption[]>([]);
const [termsAccepted, setTermsAccepted] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    roleId: "",
    company_name: "",
    countryId: "",
    country: "",
    stateId: "",
    state: "",
    city: "",
  });

  useEffect(() => {
    async function loadInitial() {
      try {
        const [roleData, countryData] = await Promise.all([
          getRoles(),
          getLocationCountriesAll(),
        ]);

        const filteredRoles = roleData.filter((role) => {
          const roleName = role.name?.toLowerCase() ?? "";
          return roleName !== "super admin" && roleName !== "superadmin";
        });

        setRoles(filteredRoles);

        const countryOpts = (countryData || [])
          .map((c) => ({ id: c.id || c.uuid || "", name: c.name || "" }))
          .filter((c) => c.id && c.name);

        // ✅ Only keep India — no other countries should appear in the dropdown
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

        // ✅ Default to India if present
        if (india) {
          setForm((prev) => ({
            ...prev,
            countryId: india.id,
            country: india.name,
          }));
        }
      } catch (err) {
        console.error("Failed to load roles/countries", err);
      } finally {
        setLoadingRoles(false);
        setLoadingCountries(false);
      }
    }

    loadInitial();
  }, []);

  // Load states whenever country changes
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

  // Load cities whenever state changes
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
    setSuccess("");

    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    if (!form.email.trim()) {
      setError("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Enter a valid email address");
      return;
    }
    if (!form.mobile.trim()) {
      setError("Mobile number is required");
      return;
    }
    if (!form.roleId) {
      setError("Role is required");
      return;
    }
    try {
      setLoading(true);

      const result = await sendOtp(form.mobile.trim(), {
        name: form.name.trim(),
        email: form.email.trim(),
        roleId: form.roleId,
        company_name: form.company_name.trim() || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        country: form.country || undefined,
        ...(termsAccepted ? { termsAccepted: true } : {}),
      });

      const params = new URLSearchParams();
      params.set("mobile", form.mobile.trim());
      if (result.isNewUser) params.set("registered", "1");
      else params.set("existing", "1");
      if (!result.otpSentViaSms && !result.otpForDev) params.set("smsFailed", "1");
      router.replace(`/?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  const rightContent = (
    <Box sx={{ width: "100%", maxWidth: 420 }}>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          textAlign: "center",
          mb: 3,
        }}
      >
        Register
      </Typography>

      <form onSubmit={handleRegister}>
        <AuthTextField
          label="Name"
          value={form.name}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, name: e.target.value }))
          }
          disabled={loading}
          autoComplete="name"
        />

        <AuthTextField
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, email: e.target.value }))
          }
          disabled={loading}
          autoComplete="email"
        />

        <AuthTextField
          label="Mobile Number"
          type="tel"
          placeholder="9876543210"
          value={form.mobile}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, mobile: e.target.value }))
          }
          disabled={loading}
          autoComplete="tel"
        />

        <AuthTextField
          select
          label="Role"
          value={form.roleId}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, roleId: e.target.value }))
          }
          disabled={loading || loadingRoles}
        >
          {roles.map((role) => (
            <MenuItem
              key={role._id ?? role.id}
              value={String(role._id ?? role.id)}
            >
              {role.name}
            </MenuItem>
          ))}
        </AuthTextField>

        <AuthTextField
          label="Company Name"
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
          onChange={(e) =>
            setForm((prev) => ({ ...prev, city: e.target.value }))
          }
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
                style={{
                  color: "var(--color-primary)",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                Terms and Conditions
              </Link>
            </Typography>
          }
          sx={{ mt: 1 }}
        />

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {success}
          </Alert>
        )}

        <Box sx={{ mt: 3 }}>
          <GradientButton
            type="submit"
            disabled={loading || loadingRoles || loadingCountries}
          >
            {loading ? "Sending OTP..." : "Send OTP"}
          </GradientButton>
        </Box>

        <Typography variant="body2" sx={{ textAlign: "center", mt: 3 }}>
          Already have an account?{" "}
          <Link
            href="/"
            style={{
              color: "var(--color-primary)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Sign In
          </Link>
        </Typography>
      </form>
    </Box>
  );

  return (
    <AuthLayout
      leftContent={
        <WelcomePanel
          title="Join iTruck"
          subtitle="Create your account and start managing loads and trucks."
          siteUrl="www.itruck.com"
        />
      }
      rightContent={rightContent}
    />
  );
}
