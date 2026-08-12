"use client";

import { doc, getFirestore, onSnapshot } from "firebase/firestore";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { getFirebaseApp } from "@/lib/firebase";
import { api } from "./common_fixed";

export async function registerFcmTokenForCurrentUser(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    console.warn("[FCM][web] SKIP register — Notification or serviceWorker unavailable");
    return;
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "";
  if (!vapidKey) {
    console.warn("[FCM][web] SKIP register — VAPID key missing");
    return;
  }
  const app = getFirebaseApp();
  if (!app) {
    console.warn("[FCM][web] SKIP register — Firebase app config missing");
    return;
  }

  const supported = await isSupported().catch(() => false);
  if (!supported) {
    console.warn("[FCM][web] SKIP register — messaging not supported");
    return;
  }

  console.log("[FCM][web] registering FCM token (admin)…");
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

  const permission = await Notification.requestPermission();
  console.log("[FCM][web] permission (admin):", permission);
  if (permission !== "granted") return;

  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    console.warn("[FCM][web] no token from getToken (admin)");
    return;
  }

  console.log("[FCM][web] token (admin):", `${token.slice(0, 12)}...`);

  await api("/api/firebase/save-token", {
    method: "POST",
    body: JSON.stringify({
      token,
      device: "web",
      platform: "web",
    }),
  });
  console.log("[FCM][web] token saved (admin)");
}

export async function subscribeToForegroundFcmNotifications(
  onNotification: (payload: { title: string; body: string }) => void
): Promise<() => void> {
  if (typeof window === "undefined") return () => {};
  const app = getFirebaseApp();
  if (!app) return () => {};
  const supported = await isSupported().catch(() => false);
  if (!supported) return () => {};

  const messaging = getMessaging(app);
  const unsubscribe = onMessage(messaging, (payload) => {
    console.log("[FCM][web] foreground message (admin):", payload);
    const title = payload.notification?.title || payload.data?.title || "Notification";
    const body = payload.notification?.body || payload.data?.body || "";
    onNotification({ title, body });
  });
  return unsubscribe;
}

export type RealtimeLoadBidEvent = {
  loadId?: string;
  eventType?: string;
  bitRecordId?: string;
  bidAmount?: number | null;
  bidderUserId?: string | null;
  bidderName?: string | null;
  status?: "pending" | "accept" | "reject" | null;
  updatedAt?: unknown;
};

export function subscribeToLoadBidRealtime(
  loadId: string,
  onChange: (event: RealtimeLoadBidEvent) => void
): () => void {
  const app = getFirebaseApp();
  if (!app || !loadId) return () => {};
  const db = getFirestore(app);
  const ref = doc(db, "realtime_load_bids", String(loadId));
  return onSnapshot(ref, (snapshot) => {
    if (!snapshot.exists()) return;
    const data = snapshot.data() as RealtimeLoadBidEvent;
    onChange(data);
  });
}

