"use client";

import { useState, useEffect } from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Skeleton from "@mui/material/Skeleton";
import Chip from "@mui/material/Chip";
import {
  PersonRounded as PersonRoundedIcon,
  PhoneAndroidRounded as PhoneAndroidRoundedIcon,
  BadgeRounded as BadgeRoundedIcon,
  EmailRounded as EmailRoundedIcon,
} from "@mui/icons-material";
import { alpha, useTheme } from "@mui/material/styles";
import { getCurrentUser, type User } from "@/model/api";
import { ModulePageLayout, ViewPageSection, ViewDetailGrid, DetailField } from "@/components/common";
import { AppCard } from "@/components/ui";
import { routes } from "@/lib/routes";

export default function ProfilePage() {
  const theme = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    getCurrentUser()
      .then((u) => setUser(u as User))
      .catch(() => {
        setUser(null);
        setError("We could not load your profile. Please sign in again or refresh the page.");
      })
      .finally(() => setLoading(false));
  }, []);

  const initial = user?.name?.[0]?.toUpperCase() ?? "?";

  return (
    <ModulePageLayout
      title="Profile"
      subtitle="Account details and role for this portal session."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Profile" },
      ]}
      showAds={false}
      maxWidth={720}
      error={error}
      onErrorClose={() => setError("")}
    >
      <AppCard
        accentTop
        sx={{
          mb: 3,
          background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${theme.palette.background.paper} 48%)`,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
          {loading ? (
            <Skeleton variant="circular" width={80} height={80} />
          ) : (
            <Avatar
              sx={{
                width: 80,
                height: 80,
                fontSize: 30,
                fontWeight: 800,
                bgcolor: "primary.main",
                boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            >
              {initial}
            </Avatar>
          )}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h5" fontWeight={800} noWrap>
              {loading ? <Skeleton width={200} /> : user?.name ?? "—"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Signed-in user
            </Typography>
            {!loading && user?.role?.name ? (
              <Chip
                size="small"
                label={user.role.name}
                color="primary"
                variant="outlined"
                sx={{ mt: 1.25, fontWeight: 600 }}
              />
            ) : loading ? (
              <Skeleton width={80} height={24} sx={{ mt: 1.25 }} />
            ) : null}
          </Box>
        </Box>
      </AppCard>

      <ViewPageSection title="Account details" subtitle="Your contact and role information for this session.">
        {loading ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: "10px" }} />
            ))}
          </Box>
        ) : (
          <ViewDetailGrid columns={{ xs: 1, sm: 2 }}>
            <DetailField
              label="Full name"
              value={user?.name?.trim() || "Not provided"}
              icon={<PersonRoundedIcon fontSize="small" />}
            />
            <DetailField
              label="Mobile"
              value={user?.mobile?.trim() || "Not provided"}
              icon={<PhoneAndroidRoundedIcon fontSize="small" />}
            />
            <DetailField
              label="Role"
              value={user?.role?.name?.trim() || "Not provided"}
              icon={<BadgeRoundedIcon fontSize="small" />}
            />
            <DetailField
              label="Email"
              value={(user as { email?: string })?.email?.trim() || "Not provided"}
              icon={<EmailRoundedIcon fontSize="small" />}
            />
          </ViewDetailGrid>
        )}
      </ViewPageSection>
    </ModulePageLayout>
  );
}
