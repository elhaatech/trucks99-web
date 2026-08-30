"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import CircularProgress from "@mui/material/CircularProgress";
import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";
import { getBuySellImageUrl, handleBuySellImageError } from "@/lib/buysellUtils";
import { uploadFile, validateProfileImageFile } from "@/model/services/uploadapi";
import {
  getCurrentUser,
  updateUser,
  invalidateCurrentUserCache,
  deleteUser,
  logout,
  type User,
} from "@/model/services/user";
import { useMarketplaceAuth } from "@/components/marketplace/MarketplaceAuthProvider";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { useNotification } from "@/hooks/useNotification";
import { SearchableSelect, type SelectOption } from "@/components/common/SearchableSelect";
import { ConfirmDialog } from "@/components/common";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import {
  getLocationCountriesAll,
  getLocationStatesByCountry,
  getLocationCitiesByState,
} from "@/model/services/location";

export default function ProfilePage() {
  const router = useRouter();
  const { user: authUser, authReady, isLoggedIn, refresh } = useMarketplaceAuth();
  const { notify } = useNotification();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const { open: deleteOpen, openWith: openDeleteConfirm, close: closeDeleteConfirm } =
    useConfirmDialog();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [city, setCity] = useState("");
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [state, setState] = useState("");
  const [country, setCountry] = useState("India");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [savedProfileImage, setSavedProfileImage] = useState<string | null>(null);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    if (!authReady) return;
    if (!isLoggedIn) {
      router.replace(userProductRoutes.login(userProductRoutes.profile()));
      return;
    }

    let cancelled = false;
    setLoading(true);
    void getCurrentUser()
      .then((u: User) => {
        if (cancelled) return;
        setUserId(String(u.id || u._id || ""));
        setName(u.name || "");
        setMobile(u.mobile || "");
        setEmail(u.email && !String(u.email).includes("@otp.user") ? u.email : "");
        setCompanyName(u.company_name || "");
        setCity(u.city || "");
        setState(u.state || "");
        setCountry(u.country || "India");
        setProfileImage(u.profileImage || null);
        setSavedProfileImage(u.profileImage || null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load profile");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authReady, isLoggedIn, router]);

  // Resolve the saved state (name or id) to its location id, then load that
  // state's cities so the City field can show the city NAME while keeping the
  // stored city ID for saving.
  useEffect(() => {
    let cancelled = false;
    async function resolveAndLoadCities() {
      if (!state) {
        setCities([]);
        return;
      }
      setLoadingCities(true);
      try {
        let resolvedStateId = state;
        try {
          const countries = await getLocationCountriesAll();
          const india = (countries || []).find(
            (c) => (c.name || "").trim().toLowerCase() === "india",
          );
          if (india) {
            const statesRes = await getLocationStatesByCountry(
              india.id || india.uuid || "",
              { limit: 2000, page: 1 },
            );
            const stateItems = statesRes?.items || [];
            const match = stateItems.find(
              (s) =>
                (s.id || s.uuid || "") === state ||
                (s.name || "").trim().toLowerCase() === state.trim().toLowerCase(),
            );
            if (match) resolvedStateId = match.id || match.uuid || state;
          }
        } catch {
          // Fall back to using the raw state value as the id.
        }

        const res = await getLocationCitiesByState(resolvedStateId, {
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

    resolveAndLoadCities();
    return () => {
      cancelled = true;
    };
  }, [state]);

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validationError = validateProfileImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const blobUrl = URL.createObjectURL(file);
    setProfileImage(blobUrl);
    setUploading(true);
    setError("");
    try {
      const url = await uploadFile(file, "user_profile");
      URL.revokeObjectURL(blobUrl);
      setProfileImage(url);
      notify({ type: "success", message: "Photo uploaded. Save profile to apply." });
    } catch (err: unknown) {
      URL.revokeObjectURL(blobUrl);
      setProfileImage(savedProfileImage);
      setError(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !authUser) return;
    setSaving(true);
    setError("");
    try {
      const imageToSave = profileImage?.startsWith("blob:")
        ? savedProfileImage
        : profileImage;
      await updateUser(userId, {
        name: name.trim(),
        mobile: mobile.trim() || undefined,
        company_name: companyName.trim(),
        city: city.trim(),
        state: state.trim(),
        country: country.trim() || "India",
        profileImage: imageToSave,
        user: {
          name: authUser.name,
          role: typeof authUser.role === "object" ? authUser.role?.name : authUser.role,
        },
      });
      setSavedProfileImage(imageToSave);
      invalidateCurrentUserCache();
      await refresh({ force: true });
      notify({ type: "success", message: "Profile updated successfully." });
      router.push("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile";
      setError(msg);
      notify({ type: "error", message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!userId || !authUser) return;
    setDeleting(true);
    setError("");
    closeDeleteConfirm();
    try {
      await deleteUser({
        id: userId,
        mobile: authUser.mobile || undefined,
        name: authUser.name,
        user: { name: authUser.name, role: "user" },
      });
      notify({ type: "success", message: "Account deleted successfully." });
      await logout();
      router.push("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete account";
      setError(msg);
      notify({ type: "error", message: msg });
    } finally {
      setDeleting(false);
    }
  };

  const cityOptions: SelectOption[] = useMemo(
    () => cities.map((c) => ({ value: c.id, label: c.name })),
    [cities],
  );

  if (!authReady || loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const avatarSrc = getBuySellImageUrl(profileImage);

  const textFieldSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: T.radius.md,
    },
    "& .MuiInputLabel-root": {
      fontWeight: 600,
      color: T.color.textSecondary,
    },
    "& .MuiInputLabel-root.Mui-focused": {
      color: INFO,
    },
  };

  return (
    <Box>
      <Typography sx={{ fontWeight: 800, fontSize: { xs: 22, md: 28 }, color: T.color.textPrimary }}>
        My Profile
      </Typography>
      <Typography sx={{ color: T.color.textSecondary, mb: 3, mt: 0.5 }}>
        Update your details and profile photo.
      </Typography>

      <Box
        component="form"
        onSubmit={handleSave}
        sx={{
          maxWidth: 640,
          mx: "auto",
          p: { xs: 2.5, md: 4 },
          borderRadius: T.radius.lg,
          border: `1px solid ${T.color.border}`,
          bgcolor: T.color.surface,
          boxShadow: T.shadow.card,
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
        }}
      >
        {error ? <Alert severity="error" sx={{ mb: 1.25 }}>{error}</Alert> : null}

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 0.5 }}>
          <Box sx={{ position: "relative" }}>
            <Avatar
              src={avatarSrc || undefined}
              slotProps={{ img: { onError: handleBuySellImageError } }}
              sx={{ width: 88, height: 88, bgcolor: INFO, fontSize: 32, fontWeight: 700 }}
            >
              {(name || "U").charAt(0).toUpperCase()}
            </Avatar>
            <Button
              type="button"
              size="small"
              variant="contained"
              disabled={uploading || saving}
              onClick={() => fileRef.current?.click()}
              sx={{
                position: "absolute",
                right: -4,
                bottom: -4,
                minWidth: 0,
                width: 34,
                height: 34,
                borderRadius: "50%",
                p: 0,
                bgcolor: INFO,
              }}
              aria-label="Change profile photo"
            >
              {uploading ? <CircularProgress size={16} color="inherit" /> : <CameraAltOutlinedIcon sx={{ fontSize: 16 }} />}
            </Button>
            <input
              ref={fileRef}
              type="file"
              hidden
              accept="image/*"
              onChange={handleImagePick}
            />
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <Typography sx={{ fontWeight: 700, fontSize: 16, lineHeight: 1.3 }}>{name || "Your name"}</Typography>
            <Typography sx={{ fontSize: 13, color: T.color.textSecondary, lineHeight: 1.3 }}>
              Tap the camera icon to change your photo
            </Typography>
          </Box>
        </Box>

        <TextField
          label="Name"
          required
          fullWidth
          size="small"
          sx={textFieldSx}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={saving}
        />
        <TextField
          label="Mobile number"
          fullWidth
          size="small"
          sx={textFieldSx}
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          disabled={saving}
          inputProps={{ inputMode: "tel" }}
        />
        <TextField
          label="Email"
          fullWidth
          size="small"
          sx={textFieldSx}
          value={email}
          disabled
          helperText={email ? "Email from your account" : "Email not set for OTP accounts"}
        />
        <TextField
          label="Company name"
          fullWidth
          size="small"
          sx={textFieldSx}
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          disabled={saving}
        />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.25 }}>
          <SearchableSelect
            label="City"
            value={city}
            onChange={(id) => setCity(id)}
            options={cityOptions}
            disabled={saving || loadingCities}
            loading={loadingCities}
            placeholder="Select city"
            noOptionsText={state ? "No cities found" : "Select state first"}
            slotProps={{ textfield: { sx: textFieldSx } }}
          />
          <TextField
            label="State"
            fullWidth
            size="small"
            sx={textFieldSx}
            value={state}
            onChange={(e) => setState(e.target.value)}
            disabled={saving}
          />
        </Box>
        <TextField
          label="Country"
          fullWidth
          size="small"
          sx={textFieldSx}
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          disabled={saving}
        />

        <Box sx={{ display: "flex", gap: 1.5, mt: 0.5, flexWrap: "wrap" }}>
          <Button
            type="submit"
            variant="contained"
            disabled={saving || uploading}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              bgcolor: T.color.trustNavy,
              "&:hover": { bgcolor: T.color.trustNavyDark },
              px: 3.5,
              py: 1,
              minWidth: 140,
            }}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : "Save profile"}
          </Button>
          <Button
            type="button"
            variant="outlined"
            disabled={saving}
            onClick={() => router.push(userProductRoutes.dashboard())}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              color: T.color.textSecondary,
              borderColor: T.color.border,
              "&:hover": { borderColor: T.color.borderStrong, bgcolor: T.color.surfaceMuted },
              px: 3.5,
              py: 1,
              minWidth: 140,
            }}
          >
            Cancel
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            type="button"
            variant="text"
            color="error"
            disabled={saving || deleting}
            onClick={() => openDeleteConfirm({})}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Delete Account
          </Button>
        </Box>
      </Box>

      <ConfirmDialog
        open={deleteOpen}
        onClose={closeDeleteConfirm}
        onConfirm={handleDeleteAccount}
        title="Delete Account?"
        description="This will deactivate your account and hide all your data. This action cannot be reversed from your side. You will be logged out immediately."
        confirmLabel="Delete"
        confirmColor="error"
        pendingLabel="Deleting…"
      />
    </Box>
  );
}
