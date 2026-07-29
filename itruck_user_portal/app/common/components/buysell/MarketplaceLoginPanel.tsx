"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { sendOtp, verifyOtp } from "@/model/services/user";
import { AuthTextField } from "@/components/ui/AuthTextField";
import { GradientButton } from "@/components/ui/GradientButton";
import { PRODUCT_THEME as T } from "@/lib/theme";
import { userProductRoutes } from "@/lib/userProductRoutes";

/** Local/dev default when API returns otpForDev (matches server TEMP_OTP). */
const DEFAULT_DEV_OTP =
  process.env.NEXT_PUBLIC_DEFAULT_OTP?.trim() || "123456";

type MarketplaceLoginPanelProps = {
  title?: string;
  subtitle?: string;
  onSuccess: () => void;
  onCancel?: () => void;
  registerHref?: string;
  initialMobile?: string;
  successMessage?: string;
};

export function MarketplaceLoginPanel({
  title = "Sign in to TRUCK99",
  subtitle = "Enter your mobile number to receive a one-time password.",
  onSuccess,
  onCancel,
  registerHref,
  initialMobile = "",
  successMessage,
}: MarketplaceLoginPanelProps) {
  const [mobile, setMobile] = useState(initialMobile);
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpForDev, setOtpForDev] = useState<string | null>(null);

  useEffect(() => {
    if (initialMobile.trim()) {
      setMobile(initialMobile.trim());
    }
  }, [initialMobile]);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!mobile.trim()) {
      setError("Enter your mobile number.");
      return;
    }
    try {
      setLoading(true);
      const res = await sendOtp(mobile.trim());
      setStep("otp");
      if (res.otpForDev) {
        setOtpForDev(res.otpForDev);
        setOtp(res.otpForDev);
      } else if (process.env.NODE_ENV !== "production") {
        setOtpForDev(DEFAULT_DEV_OTP);
        setOtp(DEFAULT_DEV_OTP);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!otp.trim()) {
      setError("Enter the OTP.");
      return;
    }
    try {
      setLoading(true);
      await verifyOtp(mobile.trim(), otp.trim());
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ width: "100%", maxWidth: 420 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, textAlign: "center", mb: 1 }}>
        {title}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: "center", mb: 3, lineHeight: 1.6 }}
      >
        {subtitle}
      </Typography>

      {successMessage ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      ) : null}

      {step === "mobile" ? (
        <form onSubmit={handleSendOtp}>
          <AuthTextField
            label="Mobile number"
            type="tel"
            placeholder="9876543210"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            disabled={loading}
          />
          {error ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          ) : null}
          <Box sx={{ mt: 3 }}>
            <GradientButton type="submit" disabled={loading}>
              {loading ? "Sending…" : "Send OTP"}
            </GradientButton>
          </Box>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp}>
          {otpForDev ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              Development mode: OTP is pre-filled. Tap Verify &amp; continue.
            </Alert>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              OTP sent to <strong>{mobile}</strong>
            </Typography>
          )}
          <AuthTextField
            label="Enter OTP"
            type="text"
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputProps={{ inputMode: "numeric", maxLength: 6 }}
            disabled={loading}
          />
          {error ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          ) : null}
          <Box sx={{ mt: 3 }}>
            <GradientButton type="submit" disabled={loading}>
              {loading ? "Verifying…" : "Verify & continue"}
            </GradientButton>
          </Box>
          <Typography
            component="button"
            type="button"
            onClick={() => {
              setStep("mobile");
              setOtp("");
              setOtpForDev(null);
              setError("");
            }}
            sx={{
              display: "block",
              mt: 2,
              mx: "auto",
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "text.secondary",
              fontSize: "0.875rem",
              "&:hover": { color: "text.primary" },
            }}
          >
            Use a different number
          </Typography>
        </form>
      )}

      {onCancel ? (
        <Button
          fullWidth
          variant="text"
          onClick={onCancel}
          sx={{ mt: 2, textTransform: "none", color: T.color.textSecondary }}
        >
          Continue browsing without signing in
        </Button>
      ) : null}

      <Typography variant="body2" sx={{ textAlign: "center", mt: 2 }}>
        Don&apos;t have an account?{" "}
        <Link
          href={registerHref ?? userProductRoutes.register()}
          style={{ fontWeight: 600, textDecoration: "none" }}
        >
          Register
        </Link>
      </Typography>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 3, textAlign: "center" }}>
        By continuing, you agree to use TRUCK99 marketplace services securely.
      </Typography>
    </Box>
  );
}
