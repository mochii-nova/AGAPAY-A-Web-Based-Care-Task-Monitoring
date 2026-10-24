// AGAPAY service worker: shows pop-up notifications and opens the right page when one is clicked.
// The backend sends JSON like { "title": "A task is overdue", "body": "Morning Walk", "url": "/tasks?open=12", "tag": "overdue-12" }
// (see design-reference/WEB-PUSH-FOR-AERON.md). Kept tiny on purpose: no caching, no offline mode.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'AGAPAY', {
      body: data.body || 'Open AGAPAY to see what’s new.',
      tag: data.tag || undefined, // same tag = replaces the older pop-up instead of stacking
      renotify: Boolean(data.tag),
      data: { url: data.url || '/dashboard' },
    })
  );
});

// Clicking the pop-up: reuse an open AGAPAY tab if there is one, otherwise open a new one
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Only open pages of this site, never an outside address
  const target = new URL(event.notification.data?.url || '/dashboard', self.location.origin);
  const url = target.origin === self.location.origin ? target.href : self.location.origin + '/dashboard';

  event.waitUntil(
    (async () => {
      const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const tab = tabs.find((c) => new URL(c.url).origin === self.location.origin);
      if (tab) {
        await tab.focus();
        return tab.navigate(url).catch(() => self.clients.openWindow(url));
      }
      return self.clients.openWindow(url);
    })()
  );
});
