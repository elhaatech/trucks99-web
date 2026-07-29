"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  consumeReturnUrl,
  getPreviousInternalPath,
  hasInternalHistory,
} from "./navigation";

/**
 * Navigate back using browser history when available, otherwise fall back to a safe route.
 */
export function useSmartBack(fallback: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(() => {
    const search = searchParams.toString();
    const current = pathname + (search ? `?${search}` : "");

    const returnUrl = consumeReturnUrl();
    if (returnUrl && returnUrl !== current) {
      router.push(returnUrl);
      return;
    }

    const previous = getPreviousInternalPath(current);
    if (previous || hasInternalHistory(current)) {
      router.back();
      return;
    }

    router.push(fallback);
  }, [router, pathname, searchParams, fallback]);
}
