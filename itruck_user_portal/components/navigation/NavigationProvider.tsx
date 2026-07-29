"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  pushNavStack,
  restoreScrollPosition,
  saveScrollPosition,
  trimNavStackTo,
} from "@/lib/navigation";

/**
 * Tracks in-app navigation, scroll positions, and browser back/forward events.
 * Mount once inside the admin layout.
 */
export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prevPathRef = useRef("");
  const isPopStateRef = useRef(false);

  useEffect(() => {
    const onPopState = () => {
      isPopStateRef.current = true;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const search = searchParams.toString();
    const currentPath = pathname + (search ? `?${search}` : "");
    const previousPath = prevPathRef.current;

    if (isPopStateRef.current) {
      isPopStateRef.current = false;
      trimNavStackTo(currentPath);
      restoreScrollPosition(currentPath);
      prevPathRef.current = currentPath;
      return;
    }

    if (previousPath && previousPath !== currentPath) {
      saveScrollPosition(previousPath);
    }

    pushNavStack(currentPath);
    prevPathRef.current = currentPath;
  }, [pathname, searchParams]);

  return <>{children}</>;
}
