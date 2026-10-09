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

// Periodic background notification checker for general notifications when website is closed
const checkNewNotificationsInBackground = async () => {
  try {
    // 1. Read user context from cache
    const contextCache = await caches.open('remindtask-user-context-v1');
    const cachedResponse = await contextCache.match('/sw-user-context.json');
    if (!cachedResponse) return;
    const userContext = await cachedResponse.json();

    const { userId, role, classId } = userContext;
    if (!userId) return;

    // 2. Fetch new notifications from the server endpoint
    const url = `/api/check-user-notifications?userId=${encodeURIComponent(userId)}&role=${encodeURIComponent(role)}&classId=${encodeURIComponent(classId)}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();

    if (data && Array.isArray(data.notifications)) {
      const alertCache = await caches.open('remindtask-notifications-alerts-v1');
      for (const notif of data.notifications) {
        const cacheKey = `/notif-alert-${notif.id}`;
        const alreadyShown = await alertCache.match(cacheKey);

        if (!alreadyShown) {
          // Show the push notification
          await self.registration.showNotification(notif.title, {
            body: notif.message,
            icon: 'https://api.iconify.design/heroicons:bell-20-solid.svg?color=%23ec4899',
            badge: 'https://api.iconify.design/heroicons:bell-20-solid.svg?color=%23ec4899',
            vibrate: [200, 100, 200],
            tag: `notif-${notif.id}`,
            data: `/`,
          });
          // Mark as shown in SW Cache
          await alertCache.put(cacheKey, new Response('1', { headers: { 'Content-Type': 'text/plain' } }));
        }
      }
    }
  } catch (err) {
    // Ignore network errors in background
  }
};

const runAllBackgroundChecks = async () => {
  await checkUpcomingDeadlinesInBackground();
  await checkNewNotificationsInBackground();
};

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      // Run immediately on activation
      await runAllBackgroundChecks();
      // Keep checking every 45 seconds while service worker is active
      setInterval(async () => {
        await runAllBackgroundChecks();
      }, 45000);
    })()
  );
});

// Listen for periodic sync if supported by browser
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-deadlines' || event.tag === 'check-notifications') {
    event.waitUntil(runAllBackgroundChecks());
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
