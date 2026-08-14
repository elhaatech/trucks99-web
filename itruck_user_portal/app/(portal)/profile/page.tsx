"use client";

import { useEffect, useRef, useState } from "react";
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
import { getBuySellImageUrl } from "@/lib/buysellUtils";
import { uploadFile } from "@/model/services/uploadapi";
import {
  getCurrentUser,
  updateUser,
  invalidateCurrentUserCache,
  type User,
} from "@/model/services/user";
import { useMarketplaceAuth } from "@/components/marketplace/MarketplaceAuthProvider";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { useNotification } from "@/hooks/useNotification";

export default function ProfilePage() {
  const router = useRouter();
  const { user: authUser, authReady, isLoggedIn, refresh } = useMarketplaceAuth();
  const { notify } = useNotification();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("India");
  const [profileImage, setProfileImage] = useState<string | null>(null);
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

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadFile(file, "user_profile");
      setProfileImage(url);
      notify({ type: "success", message: "Photo uploaded. Save profile to apply." });
    } catch (err: unknown) {
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
      await updateUser(userId, {
        name: name.trim(),
        mobile: mobile.trim() || undefined,
        company_name: companyName.trim(),
        city: city.trim(),
        state: state.trim(),
        country: country.trim() || "India",
        profileImage,
        user: {
          name: authUser.name,
          role: typeof authUser.role === "object" ? authUser.role?.name : authUser.role,
        },
      });
      invalidateCurrentUserCache();
      await refresh();
      notify({ type: "success", message: "Profile updated successfully." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile";
      setError(msg);
      notify({ type: "error", message: msg });
    } finally {
      setSaving(false);
    }
  };

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
          <TextField
            label="City"
            fullWidth
            size="small"
            sx={textFieldSx}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={saving}
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
        </Box>
      </Box>
    </Box>
  );
}
