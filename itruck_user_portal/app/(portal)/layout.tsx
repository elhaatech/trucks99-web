"use client";

import { Suspense } from "react";
import { BuySellShell } from "@/app/common/components/buysell";
import { NavigationProvider } from "@/components/navigation/NavigationProvider";
import { MarketplaceAuthProvider } from "@/components/marketplace/MarketplaceAuthProvider";

export default function UserProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
