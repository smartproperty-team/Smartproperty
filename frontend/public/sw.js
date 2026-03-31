// Service Worker for Web Push Notifications
// SmartProperty Push Notification Handler

console.log('Service Worker: Script loaded');

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('Service Worker: Push event received', event);

  let notificationData = {
    title: 'SmartProperty Notification',
    body: 'You have a new notification',
    icon: '/icon2104-ggf.svg',
    badge: '/icon2104-ggf.svg',
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        data: data.data || {},
      };
      console.log('Service Worker: Push data parsed:', notificationData);
    } catch (e) {
      console.error('Service Worker: Failed to parse push data:', e);
      notificationData.body = event.data.text();
    }
  }

  const uniqueTag = `smartproperty-${Date.now()}`;

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      data: notificationData.data,
      tag: uniqueTag,
      requireInteraction: false,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  event.notification.close();

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there is already a window/tab with the target URL open
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window/tab with the target URL
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      }),
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('Service Worker: Notification closed');
});

// Handle messages from the client
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
