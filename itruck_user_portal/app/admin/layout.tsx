"use client";

import { Suspense, useEffect, useState } from "react";
import { getCurrentUser, getNotifications, type User } from "@/model/api";
import {
  registerFcmTokenForCurrentUser,
  subscribeToForegroundFcmNotifications,
} from "@/model/services/firebase";
import { DashboardLayout } from "@/components/dashboard";
import { GoogleAdsProvider } from "@/components/common";
import { NavigationProvider } from "@/components/navigation/NavigationProvider";

export default function AdminRootLayout({
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
