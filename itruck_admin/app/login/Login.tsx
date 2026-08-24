"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";

import { sendOtp, verifyOtp } from "@/model/api";
import { routes } from "@/lib/routes";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { WelcomePanel } from "@/components/layout/WelcomePanel";
import { AuthTextField } from "@/components/ui/AuthTextField";
import { GradientButton } from "@/components/ui/GradientButton";

const OTP_LENGTH = 4;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"mobile" | "otp">("mobile");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialMobile = params.get("mobile")?.trim() ?? "";
    const registered = params.get("registered") === "1";
    const existing = params.get("existing") === "1";
    const smsFailed = params.get("smsFailed") === "1";
    if (initialMobile) setMobile(initialMobile);
    if ((registered || existing) && initialMobile) {
      setStep("otp");
      setIsNewUser(registered && !existing);
      if (smsFailed) {
        setInfo("Account ready but SMS could not be sent. Request a new OTP from this screen.");
      } else if (existing) {
        setInfo("This mobile number is already registered. Enter the OTP to sign in.");
      } else {
        setInfo("OTP sent. Enter the code to complete registration and sign in.");
      }
    }
  }, []);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!name.trim()) {
      setError("Enter your name");
      return;
    }
    if (!email.trim()) {
      setError("Enter your email");
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Enter a valid email address");
      return;
    }
    if (!mobile.trim()) {
      setError("Enter mobile number");
      return;
    }

    try {
      setLoading(true);

      const res = await sendOtp(mobile.trim(), {
        name: name.trim(),
        email: email.trim(),
      });
      setIsNewUser(Boolean(res.isNewUser));
      setStep("otp");
      setOtp("");
      setInfo(
        res.isNewUser
          ? "OTP sent. Enter the code to complete registration and sign in."
          : res.otpSentViaSms
            ? "OTP sent to your mobile number."
            : res.message || "OTP request accepted. Enter the code from SMS.",
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send OTP";
      const alreadySent = message.toLowerCase().includes("already sent");
      if (alreadySent) {
        setStep("otp");
        setOtp("");
        setError("");
        setInfo("OTP was already sent. Enter the code from your SMS.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!otp.trim()) {
      setError("Enter OTP");
      return;
    }

    try {
      setLoading(true);

      const res = await verifyOtp(
        mobile.trim(),
        otp.trim()
      );

      if (res.user) {
        router.replace(routes.dashboard());
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid OTP"
      );
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
        Sign In
      </Typography>

      {step === "mobile" ? (
        <form onSubmit={handleSendOtp}>
          <AuthTextField
            label="Name"
            placeholder="Your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            autoComplete="name"
          />

          <AuthTextField
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoComplete="email"
          />

          <AuthTextField
            label="Mobile Number"
            type="tel"
            placeholder="9876543210"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            disabled={loading}
            autoComplete="tel"
          />

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 0.5 }}
          >
            New accounts are created with your name and email. Existing users can still sign in with the same mobile number.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mt: 3 }}>
            <GradientButton
              type="submit"
              disabled={loading}
            >
              {loading ? "Sending..." : "Continue"}
            </GradientButton>
          </Box>

          <Typography
            variant="body2"
            sx={{
              textAlign: "center",
              mt: 3,
            }}
          >
            Don't have an account?{" "}
            <Link
              href="/register"
              style={{
                color: "var(--color-primary)",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Register
            </Link>
          </Typography>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            OTP sent to <strong>{mobile}</strong>
            {isNewUser ? " to complete registration" : ""}. Enter the code from your SMS.
          </Typography>

          {info ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              {info}
            </Alert>
          ) : null}

          <AuthTextField
            label="Enter OTP"
            type="text"
            placeholder={`${OTP_LENGTH}-digit OTP`}
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))
            }
            inputProps={{
              inputMode: "numeric",
              maxLength: OTP_LENGTH,
            }}
            disabled={loading}
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mt: 3 }}>
            <GradientButton
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Verifying..."
                : "Verify & Login"}
            </GradientButton>
          </Box>

          <Typography
            component="button"
            type="button"
            onClick={() => {
              setStep("mobile");
              setOtp("");
              setInfo("");
              setError("");
              setIsNewUser(false);
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
              "&:hover": {
                color: "text.primary",
              },
            }}
          >
            Use different number
          </Typography>
        </form>
      )}
    </Box>
  );

  return (
    <AuthLayout
      leftContent={
        <WelcomePanel
          title="Welcome to iTruck"
          subtitle="Sign in to continue"
          siteUrl="www.itruck.com"
        />
      }
      rightContent={rightContent}
    />
  );
}