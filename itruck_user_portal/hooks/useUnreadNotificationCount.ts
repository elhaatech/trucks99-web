"use client";

import { useEffect, useState } from "react";
import { getNotifications } from "@/model/api";
import { NOTIFICATIONS_CHANGED_EVENT } from "@/model/services/notification";

const MIN_VISIBLE_REFETCH_MS = 60_000;

let sharedCount = 0;
let lastFetchAt = 0;
let inflight: Promise<void> | null = null;
const listeners = new Set<(count: number) => void>();

function emit(next: number) {
  if (sharedCount === next) return;
  sharedCount = next;
  listeners.forEach((fn) => fn(next));
}

async function loadUnread(force: boolean): Promise<void> {
  const now = Date.now();
  if (!force && now - lastFetchAt < MIN_VISIBLE_REFETCH_MS) return;
  if (inflight) return inflight;
  lastFetchAt = now;
  inflight = getNotifications()
    .then((list) => {
      emit(list.filter((n) => n.read !== true).length);
    })
    .catch(() => undefined)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function setUnreadNotificationCount(next: number | ((current: number) => number)) {
  const resolved = typeof next === "function" ? next(sharedCount) : next;
  emit(Math.max(0, resolved));
}

/** Unread badge count. Shared across navbar/sidebar so only those widgets re-render. */
export function useUnreadNotificationCount(): number {
  const [count, setCount] = useState(sharedCount);

  useEffect(() => {
    listeners.add(setCount);
    void loadUnread(true);

    const onVisibility = () => {
      if (document.visibilityState === "visible") void loadUnread(false);
    };
    const onChanged = () => {
      lastFetchAt = 0;
      void loadUnread(true);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
    return () => {
      listeners.delete(setCount);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
    };
  }, []);

  return count;
}
