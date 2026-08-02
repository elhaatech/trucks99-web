"use client";

import { initializeApp, getApps } from "firebase/app";
import { doc, getFirestore, onSnapshot } from "firebase/firestore";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { api } from "./common_fixed";

type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function readFirebaseConfig(): FirebaseWebConfig | null {
  const config: FirebaseWebConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  };

  const hasMissing = Object.values(config).some((v) => !v);
  return hasMissing ? null : config;
}

function getFirebaseApp() {
  const firebaseConfig = readFirebaseConfig();
  if (!firebaseConfig) return null;
  return getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
}

export async function registerFcmTokenForCurrentUser(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "";
  if (!vapidKey) return;
  const app = getFirebaseApp();
  if (!app) return;

  const supported = await isSupported().catch(() => false);
  if (!supported) return;

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return;

  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  if (!token) return;

  await api("/api/firebase/save-token", {
    method: "POST",
    body: JSON.stringify({
      token,
      device: "web",
      platform: "web",
    }),
  });
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

