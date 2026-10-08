import { NotificationItem } from '../types';

export interface NotificationTargetResult {
  tab: string;
  label: string;
  taskId?: string;
  actionDescription: string;
}

/**
 * Resolves the destination tab and target metadata for a given notification
 */
export function resolveNotificationTarget(
  notif: NotificationItem,
  currentRole: 'member' | 'admin' | 'owner' | string = 'member'
): NotificationTargetResult {
  const title = (notif.title || '').toLowerCase();
  const msg = (notif.message || '').toLowerCase();
  const text = `${title} ${msg}`;

  // 1. Absensi / Presensi / Scan QR / Barcode
  if (
    text.includes('absensi') ||
    text.includes('presensi') ||
    text.includes('scan qr') ||
    text.includes('barcode') ||
    text.includes('kode qr') ||
    text.includes('check-in') ||
    text.includes('hadir') ||
    text.includes('sesi presensi')
  ) {
    return {
      tab: 'absensi',
      label: 'Absensi & Scan QR',
      actionDescription: 'Buka Presensi',
    };
  }

  // 2. Chat / Obrolan / Pesan Langsung
  if (
    notif.type === 'chat' ||
    text.includes('chat') ||
    text.includes('obrolan') ||
    text.includes('pesan dari')
  ) {
    if (currentRole === 'owner') {
      return {
        tab: 'chat',
        label: 'Obrolan Chat',
        actionDescription: 'Buka Chat',
      };
    }
    if (currentRole === 'admin') {
      const isFromOwner = text.includes('owner') || title.includes('owner');
      return {
        tab: isFromOwner ? 'chat_owner' : 'chat_siswa',
        label: isFromOwner ? 'Chat Owner' : 'Chat Siswa',
        actionDescription: 'Buka Chat',
      };
    }
    // Member
    const isFromOwner = text.includes('owner') || title.includes('owner');
    return {
      tab: isFromOwner ? 'chat_owner' : 'chat_admin',
      label: isFromOwner ? 'Chat Owner' : 'Chat Guru / Admin',
      actionDescription: 'Buka Chat',
    };
  }

  // 3. Bank Soal / Ujian / Quiz / Evaluasi
  if (
    text.includes('bank soal') ||
    text.includes('ujian') ||
    text.includes('kuis') ||
    text.includes('quiz') ||
    text.includes('soal baru') ||
    text.includes('evaluasi')
  ) {
    return {
      tab: 'bank_soal',
      label: 'Bank Soal & Ujian',
      actionDescription: 'Buka Bank Soal',
    };
  }

  // 4. Jadwal Pelajaran / Jam Belajar
  if (
    text.includes('jadwal') ||
    text.includes('mata pelajaran') ||
    text.includes('jam pelajaran') ||
    text.includes('jadwal hari')
  ) {
    return {
      tab: currentRole === 'owner' ? 'kelas' : 'jadwal',
      label: 'Jadwal Pelajaran',
      actionDescription: 'Buka Jadwal',
    };
  }

  // 5. Forum / Diskusi Komunitas
  if (
    text.includes('forum') ||
    text.includes('diskusi') ||
    text.includes('postingan') ||
    text.includes('komentar') ||
    text.includes('jasa')
  ) {
    return {
      tab: 'forum',
      label: 'Forum Komunitas',
      actionDescription: 'Buka Forum',
    };
  }

  // 6. Dinding Anonim (Anonymous Wall)
  if (
    text.includes('anonim') ||
    text.includes('anonymous') ||
    text.includes('dinding anonim') ||
    text.includes('wall anonim')
  ) {
    return {
      tab: 'anonwall',
      label: 'Dinding Anonim',
      actionDescription: 'Buka Dinding Anonim',
    };
  }

  // 7. Kotak Saran & Masukan
  if (
    text.includes('saran') ||
    text.includes('masukan') ||
    text.includes('feedback')
  ) {
    return {
      tab: 'saran',
      label: 'Kotak Saran',
      actionDescription: 'Buka Saran',
    };
  }

  // 8. Kalender Tugas
  if (
    text.includes('kalender') ||
    text.includes('agenda')
  ) {
    return {
      tab: 'kalender',
      label: 'Kalender Tugas',
      actionDescription: 'Buka Kalender',
    };
  }

  // 9. Statistik / Analisis
  if (
    text.includes('statistik') ||
    text.includes('analisis') ||
    text.includes('performa') ||
    text.includes('rekap nilai')
  ) {
    return {
      tab: 'statistik',
      label: 'Statistik & Analisis',
      actionDescription: 'Buka Statistik',
    };
  }

  // 10. Tracking User / Manajemen Admin (Owner)
  if (currentRole === 'owner') {
    if (text.includes('suspend') || text.includes('pengguna baru') || text.includes('user baru') || text.includes('tracking')) {
      return {
        tab: 'users',
        label: 'Tracking User',
        actionDescription: 'Buka Tracking User',
      };
    }
    if (text.includes('admin baru') || text.includes('pembimbing')) {
      return {
        tab: 'admins',
        label: 'User Admin',
        actionDescription: 'Buka User Admin',
      };
    }
  }

  // 11. Tugas / Assignments (Default for task_* types or text mentioning tugas)
  if (
    notif.taskId ||
    notif.type === 'task_assigned' ||
    notif.type === 'deadline_soon' ||
    notif.type === 'task_overdue' ||
    notif.type === 'task_approved' ||
    notif.type === 'task_revision' ||
    text.includes('tugas') ||
    text.includes('deadline') ||
    text.includes('tenggat') ||
    text.includes('pr') ||
    text.includes('revisi') ||
    text.includes('pengumpulan') ||
    text.includes('submission')
  ) {
    return {
      tab: 'tugas',
      taskId: notif.taskId,
      label: notif.taskId ? 'Detail Tugas' : 'Daftar Tugas',
      actionDescription: 'Buka Tugas',
    };
  }

  // 12. Broadcast / Pengumuman
  if (notif.type === 'broadcast' || text.includes('pengumuman') || text.includes('broadcast')) {
    return {
      tab: 'dashboard',
      label: 'Pengumuman Kelas',
      actionDescription: 'Buka Dashboard',
    };
  }

  // Default fallback
  return {
    tab: 'dashboard',
    label: 'Dashboard Kelas',
    actionDescription: 'Buka Dashboard',
  };
}

/**
 * Executes direct navigation to the notification's target and triggers state synchronization
 */
export function executeNotificationNavigation(
  notif: NotificationItem,
  currentRole: 'member' | 'admin' | 'owner' | string = 'member',
  callbacks?: {
    closeDrawer?: () => void;
    markAsRead?: (id: string) => void;
    showToast?: (msg: string, type?: 'info' | 'success' | 'warn') => void;
  }
): NotificationTargetResult {
  const target = resolveNotificationTarget(notif, currentRole);

  if (callbacks?.markAsRead) {
    callbacks.markAsRead(notif.id);
  }
  if (callbacks?.closeDrawer) {
    callbacks.closeDrawer();
  }

  // 1. Save active tab to role-specific storage
  try {
    if (currentRole === 'member') {
      localStorage.setItem('rt_member_active_tab', target.tab);
    } else if (currentRole === 'admin') {
      localStorage.setItem('rt_admin_active_tab', target.tab);
    } else if (currentRole === 'owner') {
      localStorage.setItem('rt_owner_active_tab', target.tab);
    }
  } catch {}

  // 2. Update hash
  try {
    const targetHash = `#${target.tab}`;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } catch {}

  // 3. Dispatch custom navigation event
  try {
    window.dispatchEvent(
      new CustomEvent('rt:navigate-tab', {
        detail: {
          tab: target.tab,
          taskId: target.taskId,
          notifId: notif.id,
        },
      })
    );
  } catch {}

  if (callbacks?.showToast) {
    callbacks.showToast(`Membuka ${target.label}...`, 'info');
  }

  return target;
}
