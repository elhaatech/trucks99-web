"use client";

import { Suspense } from "react";
import { BuySellShell } from "@/app/common/components/buysell";
import { NavigationProvider } from "@/components/navigation/NavigationProvider";
import { MarketplaceAuthProvider } from "@/components/marketplace/MarketplaceAuthProvider";

/** Client providers + shell for marketplace routes (auth uses localStorage JWT). */
export function PortalProviders({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <MarketplaceAuthProvider>
        <NavigationProvider>
          <BuySellShell>{children}</BuySellShell>
        </NavigationProvider>
      </MarketplaceAuthProvider>
    </Suspense>
  );
}
