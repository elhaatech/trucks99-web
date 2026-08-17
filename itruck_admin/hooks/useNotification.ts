"use client";

import { useCallback } from "react";
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
  const notify = useCallback(
    (payload: NotifyPayload) => {
      switch (payload.type) {
        case "success":
          toast.success(payload.message);
          break;
        case "error":
          toast.error(payload.message);
          break;
        case "info":
          toast.info(payload.message);
          break;
        case "warning":
          toast.warning(payload.message);
          break;
        case "danger":
          toast.danger(payload.message);
          break;
      }
    },
    [toast]
  );
  return { notify };
}
