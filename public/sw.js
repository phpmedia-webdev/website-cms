/**
 * Service worker for PWA (admin Status app).
 * Handles push: show notification; on click open action URL.
 * Served at /sw.js so registration from /status works.
 */
self.addEventListener("push", function (event) {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Notification", body: "", url: "/status" };
  }
  const title = payload.title || "Site Status";
  const body = payload.body || "";
  const url = payload.url || "/status";

  const options = {
    body,
    icon: "/pwa-icon-192.png",
    badge: "/pwa-icon-192.png",
    data: { url },
    tag: payload.tag || "status-push",
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = event.notification.data?.url || "/status";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
