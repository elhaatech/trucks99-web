"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentUser } from "@/model/api";
import type { Role } from "@/model/api";
import { canAccess, type AccessAction } from "@/lib/permissions";

/** Dot-notation keys mapped to role permission title + CRUD action (see NAV_PERMISSION_MAP / server titles). */
const PERMISSION_RULES: Record<string, { title: string; action: AccessAction }> = {
  "load.create": { title: "Loader", action: "create" },
  "load.view": { title: "Loader", action: "view" },
  "load.edit": { title: "Loader", action: "update" },
  "load.delete": { title: "Loader", action: "delete" },
};

export interface UsePermissionsReturn {
  can: (key: string) => boolean;
  role: Role | null;
  loading: boolean;
}

export function usePermissions(): UsePermissionsReturn {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((u) => {
        if (!cancelled) setRole((u?.role as Role | undefined) ?? null);
      })
      .catch(() => {
        if (!cancelled) setRole(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const can = useCallback(
    (key: string) => {
      const rule = PERMISSION_RULES[key];
      if (!rule) return true;
      return canAccess(role, rule.title, rule.action);
    },
    [role]
  );

  return { can, role, loading };
}
