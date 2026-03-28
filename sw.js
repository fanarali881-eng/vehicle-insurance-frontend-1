// Service Worker for Admin Dashboard PWA
const CACHE_NAME = 'admin-pwa-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

// Push notifications
self.addEventListener('push', (event) => {
  let data = { title: 'لوحة التحكم', body: 'إشعار جديد' };
  if (event.data) {
    try { data = event.data.json(); } catch (e) { data.body = event.data.text(); }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'لوحة التحكم', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'default',
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      dir: 'rtl',
      lang: 'ar',
      data: data.data || {}
    })
  );
});

// Notification click - focus or open app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow('/admin.html');
    })
  );
});

// Message from main thread to show notification
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag } = event.data;
    self.registration.showNotification(title || 'لوحة التحكم', {
      body: body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: tag || 'event-' + Date.now(),
      renotify: true,
      vibrate: [200, 100, 200],
      dir: 'rtl',
      lang: 'ar'
    });
  }
});
