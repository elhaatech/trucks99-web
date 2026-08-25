"use client";

import { Suspense, useEffect, useState } from "react";
import { getCurrentUser, type User } from "@/model/api";
import {
  registerFcmTokenForCurrentUser,
  subscribeToForegroundFcmNotifications,
} from "@/model/services/firebase";
import { notifyNotificationsChanged } from "@/model/services/notification";
import { DashboardLayout } from "@/components/dashboard";
import { GoogleAdsProvider } from "@/components/ads";
import { NavigationProvider } from "@/components/navigation/NavigationProvider";

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then((u) => {
        setUser(u as User);
        return registerFcmTokenForCurrentUser().catch(() => undefined);
      })
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    subscribeToForegroundFcmNotifications(({ title, body }) => {
      notifyNotificationsChanged();
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body });
      }
    })
      .then((fn) => {
        unsubscribe = fn;
      })
      .catch(() => undefined);

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <NavigationProvider>
          <DashboardLayout user={user}>{children}</DashboardLayout>
        </NavigationProvider>
      </Suspense>
      <GoogleAdsProvider />
    </>
  );
}
