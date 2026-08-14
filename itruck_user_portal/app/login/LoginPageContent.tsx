"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { WelcomePanel } from "@/components/layout/WelcomePanel";
import { MarketplaceLoginPanel } from "@/app/common/components/buysell/MarketplaceLoginPanel";
import { consumeReturnUrl, peekReturnUrl } from "@/lib/navigation/navigation";
import { peekPendingFavorite } from "@/lib/pendingFavorite";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { isMarketplaceUserLoggedIn } from "@/lib/requireMarketplaceLogin";

function resolveReturnTarget(searchParams: URLSearchParams): string | null {
  const fromQuery = searchParams.get("returnTo")?.trim();
  if (fromQuery && fromQuery.startsWith("/")) return fromQuery;
  const pendingFavorite = peekPendingFavorite();
  if (pendingFavorite?.returnTo?.startsWith("/")) return pendingFavorite.returnTo;
  return peekReturnUrl();
}

export default function MarketplaceLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const returnTo = useMemo(
    () => resolveReturnTarget(searchParams),
    [searchParams],
  );

  const registerHref = useMemo(
    () => userProductRoutes.register(returnTo ?? undefined),
    [returnTo],
  );

  const initialMobile = searchParams.get("mobile")?.trim() ?? "";
  const isPostRegistration = searchParams.get("registered") === "1";
  const smsFailedOnRegister = searchParams.get("smsFailed") === "1";
  const registeredSuccess = isPostRegistration
    ? smsFailedOnRegister
      ? "Account created but SMS could not be sent. Use Resend OTP below or try again shortly."
      : "Account created. Enter the OTP sent to your mobile to sign in."
    : undefined;

  const isViewProductReturn = Boolean(returnTo?.startsWith("/viewproduct/"));

  const redirectAfterAuth = useCallback(() => {
    const stored = consumeReturnUrl();
    const target =
      stored ||
      searchParams.get("returnTo")?.trim() ||
      userProductRoutes.dashboard();
    router.replace(target.startsWith("/") ? target : userProductRoutes.dashboard());
  }, [router, searchParams]);

  useEffect(() => {
    void isMarketplaceUserLoggedIn().then((loggedIn) => {
      if (loggedIn) redirectAfterAuth();
    });
  }, [redirectAfterAuth]);

  const handleCancel = () => {
    router.replace(userProductRoutes.dashboard());
  };

  return (
    <AuthLayout
      leftContent={
        <WelcomePanel
          title="TRUCKS99 Marketplace"
          subtitle={
            isViewProductReturn
              ? "Sign in to view full vehicle details, offers, and seller contact."
              : "Buy and sell commercial vehicles with confidence."
          }
          siteUrl="truck.elhaa.com"
        />
      }
      rightContent={
        <MarketplaceLoginPanel
          title={
            isViewProductReturn ? "Sign in to view this vehicle" : "Sign in to TRUCKS99"
          }
          subtitle={
            isPostRegistration
              ? "Verify your mobile number with the OTP we sent you."
              : isViewProductReturn
                ? "Please log in to view vehicle details, photos, and make an offer."
                : "Enter your mobile number to receive a one-time password."
          }
          onSuccess={redirectAfterAuth}
          onCancel={handleCancel}
          registerHref={registerHref}
          initialMobile={initialMobile}
          successMessage={registeredSuccess}
          startOnOtpStep={isPostRegistration && Boolean(initialMobile)}
        />
      }
    />
  );
}
