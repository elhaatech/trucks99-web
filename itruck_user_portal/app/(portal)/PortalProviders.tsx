"use client";

import { Suspense } from "react";
import { BuySellShell } from "@/app/common/components/buysell";
import { NavigationProvider } from "@/components/navigation/NavigationProvider";
import { MarketplaceAuthProvider } from "@/components/marketplace/MarketplaceAuthProvider";
import { MarketplaceFavoritesProvider } from "@/components/marketplace/MarketplaceFavoritesProvider";

/** Client providers + shell for marketplace routes (auth uses localStorage JWT). */
export function PortalProviders({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <MarketplaceAuthProvider>
        <MarketplaceFavoritesProvider>
          <NavigationProvider>
            <BuySellShell>{children}</BuySellShell>
          </NavigationProvider>
        </MarketplaceFavoritesProvider>
      </MarketplaceAuthProvider>
    </Suspense>
  );
}
