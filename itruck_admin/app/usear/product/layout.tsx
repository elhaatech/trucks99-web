"use client";

import { Suspense } from "react";
import { BuySellShell } from "@/app/common/components/buysell";
import { NavigationProvider } from "@/components/navigation/NavigationProvider";

export default function UserProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <NavigationProvider>
        <BuySellShell>{children}</BuySellShell>
      </NavigationProvider>
    </Suspense>
  );
}
