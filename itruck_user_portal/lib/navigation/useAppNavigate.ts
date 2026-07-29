"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { pushNavStack, saveScrollPosition, setReturnUrl } from "./navigation";

type NavigateOptions = {
  /** Replace current history entry instead of pushing a new one. */
  replace?: boolean;
  /** Store the current page as the explicit return target for the next back action. */
  rememberReturn?: boolean;
};

/**
 * Client navigation that preserves scroll position and return context for back navigation.
 */
export function useAppNavigate() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    (href: string, options?: NavigateOptions) => {
      const search = searchParams.toString();
      const current = pathname + (search ? `?${search}` : "");

      if (options?.rememberReturn !== false) {
        setReturnUrl(current);
      }
      saveScrollPosition(current);

      if (options?.replace) {
        router.replace(href);
      } else {
        pushNavStack(href);
        router.push(href);
      }
    },
    [router, pathname, searchParams],
  );
}
