"use client";

import { useEffect, useRef, useState } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "@/lib/firebase";
import { useNotification } from "@/hooks/useNotification";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { APP_BASE_PATH, stripAppBasePath, withAppBasePath } from "@/lib/appConfig";

export function useFirebasePush() {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const { notify } = useNotification();
  const router = useRouter();
  const notifyRef = useRef(notify);
  const routerRef = useRef(router);
  notifyRef.current = notify;
  routerRef.current = router;

  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "OPEN_ROUTE_FROM_PUSH" && event.data.route) {
        console.log("[FCM][web] navigating from push click:", event.data.route);
        routerRef.current.push(stripAppBasePath(String(event.data.route)));
      }
    };

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    }

    let unsubscribe: (() => void) | undefined;

    const setupFirebase = async () => {
      try {
        console.log("[FCM][web] setup starting…");

        const messaging = await getFirebaseMessaging();
        if (!messaging) {
          console.warn("[FCM][web] SKIP — Firebase messaging not supported or config missing");
          return;
        }

        console.log("[FCM][web] messaging ready");

        const permission = await Notification.requestPermission();
        console.log("[FCM][web] notification permission:", permission);
        if (permission !== "granted") {
          console.warn("[FCM][web] SKIP — notification permission denied");
          return;
        }

        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
          console.warn("[FCM][web] SKIP — NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set");
          return;
        }

        const registration = await navigator.serviceWorker.register(
          withAppBasePath("/firebase-messaging-sw.js"),
          { scope: APP_BASE_PATH ? `${APP_BASE_PATH}/` : "/" },
        );
        console.log("[FCM][web] service worker registered:", registration.scope);

        await navigator.serviceWorker.ready;
        console.log("[FCM][web] service worker active");

        const currentToken = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: registration,
        });

        if (currentToken) {
          console.log("[FCM][web] FCM token obtained:", `${currentToken.slice(0, 12)}...`);
          setFcmToken(currentToken);

          const saveResult = await api("/api/firebase/save-token", {
            method: "POST",
            body: JSON.stringify({
              token: currentToken,
              device: "web",
              platform: navigator?.userAgent || "web",
            }),
          }).catch((err) => {
            console.error("[FCM][web] save-token FAILED:", err);
            return null;
          });

          console.log("[FCM][web] save-token response:", saveResult);
        } else {
          console.warn("[FCM][web] no FCM token returned from getToken()");
        }

        unsubscribe = onMessage(messaging, (payload) => {
          console.log("[FCM][web] foreground message received:", payload);
          console.log("[FCM][web] notification:", payload.notification);
          console.log("[FCM][web] data:", payload.data);

          const { title, body } = payload.notification || {};
          const data = payload.data || {};

          if (title || body) {
            const fcmType = String(data.type || "");
            notifyRef.current({
              type:
                fcmType === "featured_free_plan_approved" ||
                fcmType === "FEATURED_FREE_PLAN_APPROVED"
                  ? "success"
                  : fcmType === "featured_free_plan_rejected" ||
                      fcmType === "FEATURED_FREE_PLAN_REJECTED"
                    ? "error"
                    : "info",
              message: `${title || ""}: ${body || ""}`.replace(/^:\s*/, ""),
            });
          }

          if (data.route && typeof data.route === "string") {
            console.log("[FCM][web] route in payload (foreground):", data.route);
          }
        });

        console.log("[FCM][web] setup complete — listening for foreground messages");
      } catch (error) {
        console.error("[FCM][web] setup FAILED:", error);
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
  }, []);

  return { fcmToken };
}
