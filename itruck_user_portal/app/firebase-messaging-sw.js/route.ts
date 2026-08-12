import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function buildServiceWorkerScript() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  };

  return `/* Firebase Cloud Messaging service worker — generated at runtime */
self.addEventListener("install", () => {
  console.log("[FCM][SW] install");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[FCM][SW] activate");
  event.waitUntil(self.clients.claim());
});

importScripts("https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js");

const firebaseConfig = ${JSON.stringify(config)};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log("[FCM][SW] background message received:", payload);
    console.log("[FCM][SW] notification:", payload.notification);
    console.log("[FCM][SW] data:", payload.data);

    const title = payload.notification?.title || payload.data?.title || "Trucks99";
    const body = payload.notification?.body || payload.data?.body || "";
    const route = payload.data?.route || "/admin/portal/notifications";

    return self.registration.showNotification(title, {
      body,
      icon: "/favicon.ico",
      data: { route, ...payload.data },
    });
  });

  console.log("[FCM][SW] Firebase messaging initialized for project:", firebaseConfig.projectId || "(missing)");
} catch (error) {
  console.error("[FCM][SW] Firebase init failed:", error);
}

self.addEventListener("notificationclick", (event) => {
  console.log("[FCM][SW] notification click:", event.notification?.data);
  event.notification.close();
  const route = event?.notification?.data?.route || "/admin/portal";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url && client.url.includes(self.location.origin)) {
          client.postMessage({ type: "OPEN_ROUTE_FROM_PUSH", route });
          return client.focus();
        }
      }
      return self.clients.openWindow(route);
    })
  );
});
`;
}

export async function GET() {
  return new NextResponse(buildServiceWorkerScript(), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
