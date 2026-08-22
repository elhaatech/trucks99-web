"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import {
  OtpError,
  resendOtp,
  sendOtp,
  verifyOtp,
} from "@/model/services/user";
import { AuthTextField } from "@/components/ui/AuthTextField";
import { GradientButton } from "@/components/ui/GradientButton";
import { PRODUCT_THEME as T } from "@/lib/theme";
import { userProductRoutes } from "@/lib/userProductRoutes";

const OTP_LENGTH = 4;
const RESEND_COOLDOWN_SEC = 60;

type MarketplaceLoginPanelProps = {
  title?: string;
  subtitle?: string;
  onSuccess: () => void;
  onCancel?: () => void;
  registerHref?: string;
  initialMobile?: string;
  successMessage?: string;
  /** After signup, OTP is already sent — show OTP entry immediately */
  startOnOtpStep?: boolean;
};

export function MarketplaceLoginPanel({
  title = "Sign in to TRUCK99",
  subtitle = "Enter your mobile number to receive a one-time password.",
  onSuccess,
  onCancel,
  registerHref,
  initialMobile = "",
  successMessage,
  startOnOtpStep = false,
}: MarketplaceLoginPanelProps) {
  const [mobile, setMobile] = useState(initialMobile);
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"mobile" | "otp">(
    startOnOtpStep && initialMobile.trim() ? "otp" : "mobile",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [otpSentViaSms, setOtpSentViaSms] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (initialMobile.trim()) {
      setMobile(initialMobile.trim());
    }
  }, [initialMobile]);

  useEffect(() => {
    if (!startOnOtpStep || !initialMobile.trim()) return;
    setStep("otp");
    setOtpSentViaSms(true);
    setOtp("");
    setInfo("Enter the OTP sent to your mobile number.");
    startResendCooldown(RESEND_COOLDOWN_SEC);
  }, [startOnOtpStep, initialMobile]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  function startResendCooldown(seconds = RESEND_COOLDOWN_SEC) {
    setResendCooldown(Math.max(0, seconds));
  }

  function applySendResponse(res: {
    message?: string;
    otpSentViaSms?: boolean;
    otpForDev?: string;
    retryAfterSeconds?: number;
  }) {
    setOtpSentViaSms(Boolean(res.otpSentViaSms));
    setOtp("");
    setInfo(
      res.otpSentViaSms
        ? "OTP sent to your mobile number."
        : res.message || "OTP request accepted.",
    );
    startResendCooldown(res.retryAfterSeconds ?? RESEND_COOLDOWN_SEC);
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!mobile.trim()) {
      setError("Enter your mobile number.");
      return;
    }
    try {
      setLoading(true);
      const res = await sendOtp(mobile.trim());
      setStep("otp");
      setOtp("");
      applySendResponse(res);
    } catch (err) {
      if (err instanceof OtpError) {
        if (err.retryAfterSeconds) {
          startResendCooldown(err.retryAfterSeconds);
        }
        const alreadySent = err.message.toLowerCase().includes("already sent");
        if (alreadySent) {
          setStep("otp");
          setOtp("");
          setOtpSentViaSms(true);
          setError("");
          setInfo("OTP was already sent. Enter the code from your SMS.");
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : "Failed to send OTP.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0 || loading) return;
    setError("");
    setInfo("");
    try {
      setLoading(true);
      const res = await resendOtp(mobile.trim());
      setOtp("");
      applySendResponse(res);
    } catch (err) {
      if (err instanceof OtpError && err.retryAfterSeconds) {
        startResendCooldown(err.retryAfterSeconds);
      }
      setError(err instanceof Error ? err.message : "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!otp.trim()) {
      setError("Enter the OTP.");
      return;
    }
    try {
      setLoading(true);
      await verifyOtp(mobile.trim(), otp.trim());
      onSuccess();
    } catch (err) {
      if (err instanceof OtpError) {
        setError(err.message);
        if (
          err.message.toLowerCase().includes("expired") ||
          err.message.toLowerCase().includes("no otp found") ||
          err.message.toLowerCase().includes("maximum verification")
        ) {
          setInfo("Request a new OTP using Resend OTP below.");
        } else if (err.remainingAttempts != null && err.remainingAttempts > 0) {
          setInfo(`${err.remainingAttempts} attempt(s) remaining.`);
        }
      } else {
        setError(err instanceof Error ? err.message : "Invalid OTP. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
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
        {title}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: "center", mb: 3.5, lineHeight: 1.65 }}
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
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {otpSentViaSms ? (
              <>
                OTP sent to <strong>{mobile}</strong>. Enter the code from your
                SMS.
              </>
            ) : (
              <>
                Enter the OTP sent to <strong>{mobile}</strong>.
              </>
            )}
          </Typography>
          <AuthTextField
            label="Enter OTP"
            type="text"
            placeholder={`${OTP_LENGTH}-digit OTP`}
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))
            }
            inputProps={{ inputMode: "numeric", maxLength: OTP_LENGTH }}
            disabled={loading}
            autoComplete="one-time-code"
          />
          {info ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              {info}
            </Alert>
          ) : null}
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
          <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
            <Button
              type="button"
              variant="outlined"
              disabled={loading || resendCooldown > 0}
              onClick={handleResendOtp}
              sx={{ textTransform: "none" }}
            >
              {resendCooldown > 0
                ? `Resend OTP in ${resendCooldown}s`
                : "Resend OTP"}
            </Button>
            <Typography
              component="button"
              type="button"
              onClick={() => {
                setStep("mobile");
                setOtp("");
                setError("");
                setInfo("");
                setResendCooldown(0);
                setOtpSentViaSms(false);
              }}
              sx={{
                display: "block",
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
          </Box>
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

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mt: 3, textAlign: "center" }}
      >
        By continuing, you agree to use TRUCKS99 marketplace services securely.
      </Typography>
    </Box>
  );
}
