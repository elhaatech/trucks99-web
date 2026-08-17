/* eslint-disable no-undef */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
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

