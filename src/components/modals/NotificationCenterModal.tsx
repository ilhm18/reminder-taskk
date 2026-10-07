import React, { useState } from 'react';
import { AlertTriangle, Bell, Check, CheckCheck, Clock, Mail, RefreshCw, ShieldCheck, Sparkles, Trash2, Volume2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatIndonesianDate, playNotificationSound } from '../../utils/notification';
import { getStoredSupabaseConfig } from '../../services/supabase';

export const NotificationCenterModal: React.FC = () => {
  const {
    notifications,
    currentClass,
    currentRole,
    currentUser,
    isNotificationDrawerOpen,
    setIsNotificationDrawerOpen,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications,
    pushPermission,
    requestPushPermission,
    sendTestPushAlert,
    cleanStaleCacheAndSync,
    showToast,
    isNotificationReadLocally,
    setActiveTab,
  } = useApp();

  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  if (!isNotificationDrawerOpen) return null;

  const activeClassId = currentClass?.id || currentUser?.classId;
  const activeClassCode = currentClass?.code;

  // Filter notifications strictly for this class and role (or all if Owner)
  const classNotifications = notifications.filter((n) => {
    // 1. Direct Recipient Check: If sent to a specific user, must match currentUser.id
    if (n.recipientId && currentUser) {
      if (n.recipientId !== currentUser.id) return false;
    }

    // 2. Owner sees all system & broadcast notifications
    if (currentRole === 'owner') return true;

    // 3. STRICT CLASS ISOLATION: If notification belongs to a specific class, it MUST match current user's class!
    if (n.classId) {
      const matchesMyClass =
        (activeClassId && n.classId === activeClassId) ||
        (activeClassCode && n.classId === activeClassCode);
      if (!matchesMyClass) return false;
    }

    // 4. Admin Role Filtering
    if (currentRole === 'admin') {
      // Hide older historical notifications created before this admin account was registered
      const regTimeStr = (currentUser && localStorage.getItem(`rt_admin_reg_time_${currentUser.id}`)) || currentUser?.createdAt;
      if (regTimeStr) {
        const adminCreated = new Date(regTimeStr).getTime();
        const notifTime = new Date(n.timestamp).getTime();
        if (!isNaN(adminCreated) && !isNaN(notifTime) && notifTime < adminCreated - 1000) {
          return false;
        }
      }

      if (n.targetRole && n.targetRole !== 'admin' && n.targetRole !== 'all') {
        if (n.type === 'broadcast' && n.classId && activeClassId && n.classId === activeClassId) {
          return true;
        }
        return false;
      }
      return true;
    }

    // 5. Member Role Filtering
    if (currentRole === 'member') {
      if (n.targetRole && n.targetRole !== 'member' && n.targetRole !== 'all') {
        return false;
      }
      return true;
    }

    return false;
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#131024] border-l border-[#272144] h-full flex flex-col shadow-2xl overflow-hidden">
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#25203f] flex items-center justify-between bg-[#17132e]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <Bell className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-white text-base">Pusat Notifikasi</h2>
                {currentClass && currentRole !== 'owner' && (
                  <span className="px-2 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 text-[10px] font-bold">
                    {currentClass.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {currentRole === 'owner' ? 'Seluruh notifikasi sistem' : `Pemberitahuan khusus ${currentClass?.name || 'kelas'}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsNotificationDrawerOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#25203f] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Unified Compact Notification Bar */}
        <div className="p-3.5 mx-4 mt-3 rounded-2xl bg-gradient-to-br from-[#1b1530] to-[#151126] border border-[#2f224f] flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8.5 h-8.5 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-white text-xs">Aktifkan Notifikasi</h4>
              <p className="text-[10px] text-slate-300 leading-snug">
                {pushPermission === 'granted'
                  ? 'Notifikasi real-time aktif untuk menerima pemberitahuan secara langsung.'
                  : 'Aktifkan notifikasi untuk menerima pemberitahuan secara real-time.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {pushPermission !== 'granted' && (
              <button
                onClick={requestPushPermission}
                className="px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[10px] font-bold shadow transition-all cursor-pointer"
              >
                Aktifkan Notifikasi
              </button>
            )}
            <button
              onClick={sendTestPushAlert}
              className="px-2.5 py-1.5 rounded-lg bg-[#2b2247] hover:bg-[#382d5a] text-purple-200 text-[10px] font-semibold transition-colors cursor-pointer"
              title="Uji Coba Suara & Push"
            >
              Uji
            </button>
          </div>
        </div>

        {/* Sub-actions */}
        <div className="px-5 py-3 flex items-center justify-between text-xs text-slate-400 border-b border-[#201b38] gap-2">
          <span>{classNotifications.length} Pesan Notifikasi</span>
          {classNotifications.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={markAllNotificationsAsRead}
                disabled={!classNotifications.some((n) => !n.read && !isNotificationReadLocally(n.id, currentUser?.id))}
                className={`font-semibold flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 rounded-lg text-xs ${
                  classNotifications.some((n) => !n.read && !isNotificationReadLocally(n.id, currentUser?.id))
                    ? 'text-pink-400 hover:text-pink-300 hover:bg-pink-500/10'
                    : 'text-slate-500 cursor-not-allowed opacity-50'
                }`}
                title="Tandai semua notifikasi telah dibaca"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>{classNotifications.some((n) => !n.read && !isNotificationReadLocally(n.id, currentUser?.id)) ? 'Tandai Dibaca' : 'Sudah Dibaca'}</span>
              </button>

              {confirmDeleteAll ? (
                <div className="flex items-center gap-1 animate-in fade-in duration-150">
                  <button
                    onClick={() => {
                      const ids = classNotifications.map((n) => n.id);
                      clearAllNotifications(ids);
                      setConfirmDeleteAll(false);
                    }}
                    className="font-bold flex items-center gap-1 cursor-pointer px-2.5 py-1 rounded-lg text-xs bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/25 transition-all"
                    title="Konfirmasi hapus seluruh notifikasi"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yakin Hapus?</span>
                  </button>
                  <button
                    onClick={() => setConfirmDeleteAll(false)}
                    className="font-semibold text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setConfirmDeleteAll(true);
                    setTimeout(() => setConfirmDeleteAll(false), 5000);
                  }}
                  className="font-semibold flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 rounded-lg text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  title="Hapus seluruh notifikasi"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Semua</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {classNotifications.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
              Belum ada notifikasi untuk kelas ini
            </div>
          ) : (
            classNotifications.map((notif) => {
              const isRead = notif.read || isNotificationReadLocally(notif.id, currentUser?.id);
              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    markNotificationAsRead(notif.id);
                    playNotificationSound('beep');
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                    isRead
                      ? 'bg-[#18181a]/80 border-white/5 text-slate-400'
                      : 'bg-[#222226]/95 border-white/10 text-white shadow-lg'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* iOS App Icon Tile (Identical to uploaded screenshot style) */}
                    <div className="shrink-0 mt-0.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                        <CheckCheck className="w-5 h-5 stroke-[2.2]" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className={`text-xs font-bold truncate ${isRead ? 'text-slate-300' : 'text-white'}`}>
                          {notif.title}
                        </h3>
                        <span className="text-[10px] text-slate-400 font-medium shrink-0 font-mono">
                          {formatIndonesianDate(notif.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notif.id);
                        }}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Hapus notifikasi ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-[#110e21] border-t border-[#201b38] text-center">
          <p className="text-[11px] text-slate-500">
            Sistem pengingat otomatis berjalan real-time
          </p>
        </div>
      </div>
    </div>
  );
};
