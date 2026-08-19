"use client";

import { Suspense, useEffect, useState } from "react";
import { getCurrentUser, getNotifications, type User } from "@/model/api";
import {
  registerFcmTokenForCurrentUser,
  subscribeToForegroundFcmNotifications,
} from "@/model/services/firebase";
import { DashboardLayout } from "@/components/dashboard";
import { GoogleAdsProvider } from "@/components/ads";
import { NavigationProvider } from "@/components/navigation/NavigationProvider";

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    getCurrentUser()
      .then((u) => {
        setUser(u as User);
        return registerFcmTokenForCurrentUser().catch(() => undefined);
      })
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    let lastFetchAt = 0;
    const MIN_VISIBLE_REFETCH_MS = 60_000;

    const refreshNotifications = (force = false) => {
      const now = Date.now();
      if (!force && now - lastFetchAt < MIN_VISIBLE_REFETCH_MS) return;
      lastFetchAt = now;
      getNotifications()
        .then((list) => setNotificationCount(list.filter((n) => !n.read).length))
        .catch(() => setNotificationCount(0));
    };

    refreshNotifications(true);

    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshNotifications(false);
    };
    document.addEventListener("visibilitychange", onVisibility);

    let unsubscribe: (() => void) | null = null;
    subscribeToForegroundFcmNotifications(({ title, body }) => {
      refreshNotifications(true);
      // Browser notifications are shown by OS while app is closed; this handles active tab state.
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body });
      }
    })
      .then((fn) => {
        unsubscribe = fn;
      })
      .catch(() => undefined);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <NavigationProvider>
          <DashboardLayout user={user} notificationCount={notificationCount}>
            {children}
          </DashboardLayout>
        </NavigationProvider>
      </Suspense>
      <GoogleAdsProvider />
    </>
  );
}
