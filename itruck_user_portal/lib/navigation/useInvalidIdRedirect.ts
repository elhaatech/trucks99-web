"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect away from dynamic routes when the id param is missing.
 * Must be used in useEffect — never call router.replace during render.
 */
export function useInvalidIdRedirect(id: string | undefined, fallback: string) {
  const router = useRouter();

  useEffect(() => {
    if (!id) {
      router.replace(fallback);
    }
  }, [id, fallback, router]);

  return Boolean(id);
}
