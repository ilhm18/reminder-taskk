// RemindTask Service Worker for Background Notifications and Caching
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle push events
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || 'RemindTask - Pengingat Tugas';
    const options = {
      body: data.body || 'Ada pembaruan tugas baru!',
      icon: 'https://api.iconify.design/heroicons:bell-20-solid.svg?color=%23ec4899',
      badge: 'https://api.iconify.design/heroicons:bell-20-solid.svg?color=%23ec4899',
      vibrate: [200, 100, 200],
      data: data.url || '/',
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.warn('Push parse error in SW:', err);
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        const client = clientList[0];
        client.focus();
        return;
      }
      return self.clients.openWindow('/');
    })
  );
});
