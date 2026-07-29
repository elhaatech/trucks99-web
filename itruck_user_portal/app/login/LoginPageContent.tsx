"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { WelcomePanel } from "@/components/layout/WelcomePanel";
import { MarketplaceLoginPanel } from "@/app/common/components/buysell/MarketplaceLoginPanel";
import { consumeReturnUrl, peekReturnUrl } from "@/lib/navigation/navigation";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { isMarketplaceUserLoggedIn } from "@/lib/requireMarketplaceLogin";

function resolveReturnTarget(searchParams: URLSearchParams): string | null {
  const fromQuery = searchParams.get("returnTo")?.trim();
  if (fromQuery && fromQuery.startsWith("/")) return fromQuery;
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
  const registeredSuccess =
    searchParams.get("registered") === "1"
      ? "Account created. We sent an OTP to your mobile — tap Send OTP if you need a new code."
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
          title="TRUCK99 Marketplace"
          subtitle={
            isViewProductReturn
              ? "Sign in to view full vehicle details, offers, and seller contact."
              : "Buy and sell commercial vehicles with confidence."
          }
          siteUrl="www.truck99.com"
        />
      }
      rightContent={
        <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
          <MarketplaceLoginPanel
            title={
              isViewProductReturn ? "Sign in to view this vehicle" : "Sign in to TRUCK99"
            }
            subtitle={
              isViewProductReturn
                ? "Please log in to view vehicle details, photos, and make an offer."
                : "Enter your mobile number to receive a one-time password."
            }
            onSuccess={redirectAfterAuth}
            onCancel={handleCancel}
            registerHref={registerHref}
            initialMobile={initialMobile}
            successMessage={registeredSuccess}
          />
        </Box>
      }
    />
  );
}
