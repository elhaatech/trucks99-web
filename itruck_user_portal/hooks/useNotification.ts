"use client";

import { useCallback, useMemo, useRef } from "react";
import { useToast } from "@/lib/toast";

export type NotifyPayload =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | { type: "info"; message: string }
  | { type: "warning"; message: string }
  | { type: "danger"; message: string };

export interface UseNotificationReturn {
  notify: (payload: NotifyPayload) => void;
}

/** Thin wrapper over the global toast context for a consistent API. */
export function useNotification(): UseNotificationReturn {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const notify = useCallback((payload: NotifyPayload) => {
    const t = toastRef.current;
    switch (payload.type) {
      case "success":
        t.success(payload.message);
        break;
      case "error":
        t.error(payload.message);
        break;
      case "info":
        t.info(payload.message);
        break;
      case "warning":
        t.warning(payload.message);
        break;
      case "danger":
        t.danger(payload.message);
        break;
    }
  }, []);

  return useMemo(() => ({ notify }), [notify]);
}
