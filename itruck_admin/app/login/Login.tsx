"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";

import { getCurrentUser, loginWithPassword } from "@/model/api";
import { PRODUCTION_HOSTS } from "@/lib/appConfig";
import { isAdminLikeRole } from "@/lib/permissions";
import { routes } from "@/lib/routes";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { WelcomePanel } from "@/components/layout/WelcomePanel";
import { AuthTextField } from "@/components/ui/AuthTextField";
import { GradientButton } from "@/components/ui/GradientButton";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function goToAdminDashboard(router: ReturnType<typeof useRouter>) {
  const dest = routes.dashboard();
  if (typeof window !== "undefined" && PRODUCTION_HOSTS.has(window.location.hostname)) {
    window.location.replace(dest);
    return;
  }
  router.replace(dest);
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        if (user && isAdminLikeRole(user.role)) goToAdminDashboard(router);
      })
      .catch(() => undefined);
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Enter your email");
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Enter a valid email address");
      return;
    }
    if (!password) {
      setError("Enter your password");
      return;
    }

    try {
      setLoading(true);
      const res = await loginWithPassword(email.trim(), password);
      if (res.user) {
        goToAdminDashboard(router);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
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
        Admin Sign In
      </Typography>

      <form onSubmit={handleLogin}>
        <AuthTextField
          label="Email"
          type="email"
          placeholder="admin@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          autoComplete="email"
        />

        <AuthTextField
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          autoComplete="current-password"
        />

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 3 }}>
          <GradientButton type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </GradientButton>
        </Box>
      </form>
    </Box>
  );

  return (
    <AuthLayout
      leftContent={
        <WelcomePanel
          title="Welcome to iTruck"
          subtitle="Sign in to the Admin Portal"
          siteUrl="www.itruck.com"
        />
      }
      rightContent={rightContent}
    />
  );
}
