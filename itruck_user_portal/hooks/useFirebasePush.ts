"use client";

import { useEffect, useState } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "@/lib/firebase";
import { useNotification } from "@/hooks/useNotification";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export function useFirebasePush() {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const { notify } = useNotification();
  const router = useRouter();


  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "OPEN_ROUTE_FROM_PUSH" && event.data.route) {
        router.push(event.data.route);
      }
    };

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    }

    let unsubscribe: (() => void) | undefined;

    const setupFirebase = async () => {
      try {
        const messaging = await getFirebaseMessaging();
        if (!messaging) return;

        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.log("Notification permission denied");
          return;
        }

        // Get token (requires registered service worker for web push)
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
          console.warn("NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set; skipping FCM token registration");
          return;
        }

        const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        const currentToken = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: registration,
        });
        
        if (currentToken) {
          setFcmToken(currentToken);
          // Save token to backend
          await api("/api/firebase/save-token", {
            method: "POST",
            body: JSON.stringify({
              token: currentToken,
              device: "web",
              platform: navigator?.userAgent || "web",
            }),
          }).catch(console.error);
        }

        // Listen for foreground messages
        unsubscribe = onMessage(messaging, (payload) => {
          console.log("Foreground message received:", payload);
          const { title, body } = payload.notification || {};
          const data = payload.data || {};
          
          if (title || body) {
            // Display toast with action to navigate
            notify({
              type: "info",
              message: `${title || ""}: ${body || ""}`,
            });
            
            // Optionally could render a custom toast that is clickable, but for now we just show a toast.
            // If the user is on the site, they can just click it or we can add a way to click through the toast.
            // But since notify doesn't support onClick easily, we rely on the in-app notification center for history.
          }
        });
      } catch (error) {
        console.error("Error setting up Firebase push notifications:", error);
      }
    };

    setupFirebase();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
      }
    };
  }, [notify, router]);

  return { fcmToken };
}
