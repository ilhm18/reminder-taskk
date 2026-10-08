// RemindTask Service Worker for Background Notifications and Caching
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Periodic background deadline checker when browser is running but RemindTask tab is not active
const checkUpcomingDeadlinesInBackground = async () => {
  try {
    const res = await fetch('/api/check-upcoming-deadlines');
    if (!res.ok) return;
    const data = await res.json();
    if (data && Array.isArray(data.upcomingTasks) && data.upcomingTasks.length > 0) {
      for (const task of data.upcomingTasks) {
        const cacheName = 'remindtask-deadline-alerts-v1';
        const cache = await caches.open(cacheName);
        const cacheKey = `/deadline-alert-${task.id}`;
        const alreadyShown = await cache.match(cacheKey);

        if (!alreadyShown) {
          await self.registration.showNotification(`⏰ Pengingat Tugas (H-1): ${task.title}`, {
            body: `Tugas "${task.title}" tersisa kurang dari 24 jam! Segera periksa dan selesaikan sebelum batas waktu.`,
            icon: 'https://api.iconify.design/heroicons:bell-20-solid.svg?color=%23ec4899',
            badge: 'https://api.iconify.design/heroicons:bell-20-solid.svg?color=%23ec4899',
            vibrate: [250, 100, 250],
            tag: `deadline-${task.id}`,
            data: `/`,
          });
          await cache.put(cacheKey, new Response('1', { headers: { 'Content-Type': 'text/plain' } }));
        }
      }
    }
  } catch (err) {
    // Network offline or quiet
  }
};

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      // Run once immediately
      checkUpcomingDeadlinesInBackground();
      // Run periodically every 60 seconds
      setInterval(() => {
        checkUpcomingDeadlinesInBackground();
      }, 60000);
    })()
  );
});

// Listen for periodic sync if supported by browser
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-deadlines') {
    event.waitUntil(checkUpcomingDeadlinesInBackground());
  }
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
