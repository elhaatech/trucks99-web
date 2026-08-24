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
import { stripAppBasePath } from "@/lib/appConfig";

function asRouterPath(path: string | null | undefined): string | null {
  const trimmed = path?.trim();
  if (!trimmed || !trimmed.startsWith("/")) return null;
  return stripAppBasePath(trimmed);
}

function resolveReturnTarget(searchParams: URLSearchParams): string | null {
  return (
    asRouterPath(searchParams.get("returnTo")) ||
    asRouterPath(peekPendingFavorite()?.returnTo) ||
    asRouterPath(peekReturnUrl())
  );
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
      ? "Account created but SMS could not be sent. Tap Resend OTP to receive a new code."
      : "Account created. Enter the OTP sent to your mobile to sign in."
    : undefined;

  const isViewProductReturn = Boolean(returnTo?.startsWith("/viewproduct/"));
  const isMyListingsReturn = Boolean(returnTo?.startsWith("/my-listings"));

  const redirectAfterAuth = useCallback(() => {
    const stored = asRouterPath(consumeReturnUrl());
    const target =
      stored ||
      asRouterPath(searchParams.get("returnTo")) ||
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
            isViewProductReturn
              ? "Sign in to view this vehicle"
              : isMyListingsReturn
                ? "Sign in to view My Listings"
                : "Sign in to TRUCKS99"
          }
          subtitle={
            isPostRegistration
              ? "Verify your mobile number with the OTP we sent you."
              : isViewProductReturn
                ? "Please log in to view vehicle details, photos, and make an offer."
                : isMyListingsReturn
                  ? "Log in to create, edit, and manage your vehicle listings."
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
