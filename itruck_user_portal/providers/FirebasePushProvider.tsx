"use client";

import { useFirebasePush } from "@/hooks/useFirebasePush";
import { ReactNode } from "react";

export function FirebasePushProvider({ children }: { children: ReactNode }) {
  useFirebasePush();
  return <>{children}</>;
}
