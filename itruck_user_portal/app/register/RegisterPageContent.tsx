"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";
import { SearchableSelect, type SelectOption } from "@/components/common/SearchableSelect";
import { registerMarketplaceUser,
  getLocationCountriesAll,
  getLocationStatesByCountry,
  getLocationCitiesByState,
} from "@/model/api";
import { uploadFile } from "@/model/services/uploadapi";
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

  const [states, setStates] = useState<SimpleOption[]>([]);
  const [cities, setCities] = useState<SimpleOption[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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
          setForm((prev) => ({
            ...prev,
            countryId: india.id,
            country: india.name,
          }));
        }
      } catch (err) {
        console.error("Failed to load countries", err);
        if (!cancelled) setError("Could not load location data. Try again later.");
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
        const stateOpts = items
          .map((s) => ({ id: s.id || s.uuid || "", name: s.name || "" }))
          .filter((s) => s.id && s.name);
        setStates(stateOpts);

        const tamilNadu = stateOpts.find(
          (s) => s.name.trim().toLowerCase() === "tamil nadu",
        );
        if (tamilNadu && !cancelled) {
          setForm((prev) => ({
            ...prev,
            stateId: tamilNadu.id,
            state: tamilNadu.name,
          }));
        }
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

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setPhotoError("");
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select a valid image file.");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setPhotoError("Image must be smaller than 5MB.");
      return;
    }

    setProfileImagePreview(URL.createObjectURL(file));
  };

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
      let profileImageUrl: string | undefined;
      if (profileImagePreview) {
        setUploadingPhoto(true);
        try {
          const file = fileInputRef.current?.files?.[0];
          if (file) {
            profileImageUrl = await uploadFile(file, "user_profile");
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to upload photo.");
          setLoading(false);
          setUploadingPhoto(false);
          return;
        } finally {
          setUploadingPhoto(false);
        }
      }

      const result = await registerMarketplaceUser({
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        company_name: form.company_name.trim() || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        country: "India",
        profileImage: profileImageUrl,
        termsAccepted: true,
      });

      const params = new URLSearchParams();
      params.set("registered", "1");
      params.set("mobile", form.mobile.trim());
      if (!result.otpSentToMobile && !result.otpSentViaSms) {
        params.set("smsFailed", "1");
      }
      if (returnTo) params.set("returnTo", returnTo);
      router.replace(`${userProductRoutes.login()}?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account.");
    } finally {
      setLoading(false);
    }
  }

  const stateOptions: SelectOption[] = useMemo(
    () => states.map((s) => ({ value: s.id, label: s.name })),
    [states],
  );

  const cityOptions: SelectOption[] = useMemo(
    () => cities.map((c) => ({ value: c.id, label: c.name })),
    [cities],
  );

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
              mb: 0.5,
              letterSpacing: "-0.03em",
              fontSize: { xs: "1.5rem", sm: "1.75rem" },
            }}
          >
            Create your account
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: "center", mb: 2, lineHeight: 1.6 }}
          >
            Your account will be set up as a Buy/Sell marketplace user.
          </Typography>

          <form onSubmit={handleRegister}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.25 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handlePhotoSelect}
                />
                <Avatar
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    width: 80,
                    height: 80,
                    cursor: "pointer",
                    border: "2px dashed",
                    borderColor: photoError ? "error.main" : "divider",
                    bgcolor: "background.paper",
                    "&:hover": {
                      borderColor: "primary.main",
                      opacity: 0.85,
                    },
                  }}
                >
                  {profileImagePreview ? (
                    <img
                      src={profileImagePreview}
                      alt="Profile preview"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <CameraAltOutlinedIcon sx={{ fontSize: 28, color: "text.secondary" }} />
                  )}
                </Avatar>
                <Typography variant="caption" color="text.secondary">
                  {profileImagePreview ? "Click to change photo" : "Click to upload profile photo (optional)"}
                </Typography>
                {photoError && (
                  <Typography variant="caption" color="error.main">
                    {photoError}
                  </Typography>
                )}
              </Box>

              <AuthTextField
                label="Name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                disabled={loading}
                sx={{ m: 0 }}
              />

              <AuthTextField
                label="Mobile number"
                type="tel"
                placeholder="9876543210"
                value={form.mobile}
                onChange={(e) => setForm((prev) => ({ ...prev, mobile: e.target.value }))}
                disabled={loading}
                sx={{ m: 0 }}
              />

              <AuthTextField
                label="Company name (optional)"
                value={form.company_name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, company_name: e.target.value }))
                }
                disabled={loading}
                sx={{ m: 0 }}
              />

              <SearchableSelect
                label="State"
                value={form.stateId}
                onChange={(id) => {
                  const selected = states.find((s) => s.id === id);
                  setForm((prev) => ({
                    ...prev,
                    stateId: id,
                    state: selected?.name ?? "",
                    city: "",
                  }));
                }}
                options={stateOptions}
                disabled={!form.countryId || loading || loadingStates}
                placeholder="Select state"
                sx={{ m: 0 }}
              />

              <SearchableSelect
                label="City"
                value={form.city}
                onChange={(id) =>
                  setForm((prev) => ({ ...prev, city: id }))
                }
                options={cityOptions}
                disabled={!form.stateId || loading || loadingCities}
                placeholder="Select city"
                sx={{ m: 0 }}
              />
            </Box>

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
                     href={userProductRoutes.legal("terms")}
                     target="_blank"
                     style={{ fontWeight: 600, textDecoration: "none" }}
                   >
                     Terms and Conditions
                   </Link>
                 </Typography>
               }
               sx={{ mt: 0.5 }}
             />

             {error ? (
               <Alert severity="error" sx={{ mt: 1.5 }}>
                 {error}
               </Alert>
             ) : null}

             <Box sx={{ mt: 2 }}>
               <GradientButton type="submit" disabled={loading}>
                 {loading ? "Creating account…" : "Create account"}
               </GradientButton>
             </Box>
           </form>

           <Typography variant="body2" sx={{ textAlign: "center", mt: 2 }}>
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
