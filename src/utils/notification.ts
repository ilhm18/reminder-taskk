/**
 * Audio synthesizer for notification alerts without external asset dependencies
 */
export function playNotificationSound(type: 'beep' | 'chime' | 'success' = 'chime') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'chime') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.35); // D6

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start(ctx.currentTime + 0.15);
      osc1.stop(ctx.currentTime + 0.5);
      osc2.stop(ctx.currentTime + 0.5);
    } else if (type === 'success') {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C, E, G, C
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
        gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.25);
      });
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (err) {
    console.warn('AudioContext notification alert skipped:', err);
  }
}

/**
 * Play sound exactly once per unique notification ID to eliminate double/triple echo sound spam
 */
export function playNotificationSoundOnce(notificationId: string, type: 'beep' | 'chime' | 'success' = 'chime') {
  if (typeof window === 'undefined' || !notificationId) return;
  const win = window as any;
  if (!win.__playedNotificationSounds) {
    win.__playedNotificationSounds = new Set<string>();
  }
  if (win.__playedNotificationSounds.has(notificationId)) {
    return;
  }
  win.__playedNotificationSounds.add(notificationId);
  playNotificationSound(type);
}

/**
 * Register background service worker for push notifications
 */
export async function registerServiceWorkerForNotifications(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch (err) {
      console.warn('SW register warning:', err);
    }
  }
}

/**
 * Request browser push notification permission
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  await registerServiceWorkerForNotifications();
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch {
    return 'denied';
  }
}

/**
 * Dispatch desktop and background push notification with sound feedback
 */
export function sendBrowserPushNotification(title: string, body: string, tag?: string) {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    // Try Service Worker registration showNotification first (Works when tab is minimised/background)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((registration) => {
          registration.showNotification(title, {
            body,
            icon: 'https://api.iconify.design/heroicons:bell-20-solid.svg?color=%23ec4899',
            badge: 'https://api.iconify.design/heroicons:bell-20-solid.svg?color=%23ec4899',
            tag: tag || 'remindtask-' + Date.now(),
          });
        })
        .catch(() => {
          try {
            new Notification(title, {
              body,
              icon: 'https://api.iconify.design/heroicons:bell-20-solid.svg?color=%23ec4899',
              tag: tag || 'remindtask-' + Date.now(),
            });
          } catch {}
        });
    } else {
      try {
        new Notification(title, {
          body,
          icon: 'https://api.iconify.design/heroicons:bell-20-solid.svg?color=%23ec4899',
          tag: tag || 'remindtask-' + Date.now(),
        });
      } catch {}
    }
  }
}

/**
 * Format date to Indonesian locale with detailed hours/minutes
 */
export function formatIndonesianDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}.${minutes}`;
  } catch {
    return dateString;
  }
}

/**
 * Check deadline status: 'overdue' | 'due-today' | 'upcoming'
 */
export function getTaskDeadlineStatus(dueDate: string): {
  status: 'overdue' | 'due-today' | 'upcoming';
  label: string;
  badgeClass: string;
} {
  const now = new Date();
  const target = new Date(dueDate);

  if (target.getTime() < now.getTime()) {
    return {
      status: 'overdue',
      label: 'TERLAMBAT',
      badgeClass: 'bg-red-500/15 text-red-400 border border-red-500/30',
    };
  }

  const isToday =
    target.getDate() === now.getDate() &&
    target.getMonth() === now.getMonth() &&
    target.getFullYear() === now.getFullYear();

  if (isToday) {
    return {
      status: 'due-today',
      label: 'HARI INI',
      badgeClass: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    };
  }

  return {
    status: 'upcoming',
    label: 'AKTIF',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  };
}
