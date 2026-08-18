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

  const refreshNotifications = () => {
    getNotifications()
      .then((list) => setNotificationCount(list.filter((n) => !n.read).length))
      .catch(() => setNotificationCount(0));
  };

  useEffect(() => {
    refreshNotifications();
  }, []);

  useEffect(() => {
    const onFocus = () => refreshNotifications();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    subscribeToForegroundFcmNotifications(({ title, body }) => {
      refreshNotifications();
      // Browser notifications are shown by OS while app is closed; this handles active tab state.
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body });
      }
    })
      .then((fn) => {
        unsubscribe = fn;
      })
      .catch(() => undefined);

    const onServiceWorkerMessage = () => refreshNotifications();
    if (typeof navigator !== "undefined" && navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", onServiceWorkerMessage);
    }
    return () => {
      if (unsubscribe) unsubscribe();
      if (typeof navigator !== "undefined" && navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener("message", onServiceWorkerMessage);
      }
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
