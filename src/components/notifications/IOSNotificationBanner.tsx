import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, ChevronRight, Sparkles, Megaphone, BellRing, ExternalLink } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NotificationItem } from '../../types';
import { resolveNotificationTarget, executeNotificationNavigation } from '../../utils/notificationTarget';

export const IOSNotificationBanner: React.FC = () => {
  const {
    liveBannerNotification,
    setLiveBannerNotification,
    unreadNotifCount,
    setIsNotificationDrawerOpen,
    markNotificationAsRead,
    currentRole,
    currentUser,
    showToast,
  } = useApp();

  const [activeNotif, setActiveNotif] = useState<NotificationItem | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const touchStartY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  // Synchronize banner with AppContext live reactive insert stream (Strictly Once in a Session!)
  useEffect(() => {
    if (liveBannerNotification) {
      // 1. Recipient check: if sent to specific user, current user must match
      if (liveBannerNotification.recipientId && (!currentUser || currentUser.id !== liveBannerNotification.recipientId)) {
        setLiveBannerNotification(null);
        return;
      }

      // 2. Role check: if not logged in or role mismatch, do not display
      if (liveBannerNotification.targetRole === 'owner' && currentRole !== 'owner') {
        setLiveBannerNotification(null);
        return;
      }
      if (liveBannerNotification.targetRole === 'admin' && currentRole !== 'admin') {
        setLiveBannerNotification(null);
        return;
      }
      if (liveBannerNotification.targetRole === 'member' && currentRole !== 'member') {
        setLiveBannerNotification(null);
        return;
      }
      if (!currentRole && liveBannerNotification.targetRole && liveBannerNotification.targetRole !== 'all') {
        setLiveBannerNotification(null);
        return;
      }

      setActiveNotif(liveBannerNotification);
      setIsVisible(true);
      setTranslateY(0);

      // Haptic vibration feedback for mobile (Android & iOS Web)
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([45, 65, 45]);
        } catch {}
      }

      // Automatically hide and clear after 6 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setLiveBannerNotification(null);
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [liveBannerNotification, setLiveBannerNotification, currentRole, currentUser]);

  if (!activeNotif || !isVisible) return null;

  // Render-time guard
  if (activeNotif.recipientId && (!currentUser || currentUser.id !== activeNotif.recipientId)) return null;
  if (activeNotif.targetRole === 'owner' && currentRole !== 'owner') return null;
  if (activeNotif.targetRole === 'admin' && currentRole !== 'admin') return null;
  if (activeNotif.targetRole === 'member' && currentRole !== 'member') return null;
  if (!currentRole && activeNotif.targetRole && activeNotif.targetRole !== 'all') return null;

  const handleDismiss = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    markNotificationAsRead(activeNotif.id);
    setIsVisible(false);
    setLiveBannerNotification(null);
  };

  const handleBannerClick = () => {
    executeNotificationNavigation(activeNotif, currentRole || 'member', {
      markAsRead: markNotificationAsRead,
      closeDrawer: () => {
        setIsVisible(false);
        setLiveBannerNotification(null);
      },
      showToast,
    });
  };

  // Touch Swipe Up Gesture to Dismiss (Native iOS / Android Push Notification Behavior)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    if (diff < 0) {
      setTranslateY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (translateY < -40) {
      handleDismiss();
    } else {
      setTranslateY(0);
    }
  };

  return (
    <div
      style={{
        transform: `translate(-50%, ${translateY}px)`,
        transition: isDragging.current ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="fixed top-2 sm:top-5 left-1/2 -translate-x-1/2 z-50 w-[94%] sm:w-[480px] md:w-[520px] max-w-[95vw] pt-[env(safe-area-inset-top,0px)] animate-in slide-in-from-top-8 fade-in duration-300 select-none"
    >
      {/* iOS Lockscreen Push Notification Card (Responsive for Mobile/Tablet/Desktop/iOS/Android) */}
      <div
        onClick={handleBannerClick}
        className="relative bg-[#1c1c1e]/95 hover:bg-[#26262a]/95 backdrop-blur-2xl border border-white/12 rounded-3xl p-3.5 sm:p-4 shadow-2xl shadow-black/80 transition-all cursor-pointer group active:scale-[0.98] overflow-hidden"
      >
        {/* Top Swipe Bar Indicator for Mobile */}
        <div className="w-8 h-1 bg-white/20 rounded-full mx-auto mb-2 sm:hidden" />

        <div className="flex items-start gap-3 sm:gap-3.5">
          {/* iOS App Icon Tile with Badge */}
          <div className="relative shrink-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-orange-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-orange-500/30">
              {activeNotif.type === 'broadcast' ? (
                <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
              ) : activeNotif.type === 'task_assigned' ? (
                <BellRing className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2] animate-pulse" />
              ) : (
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
              )}
            </div>
            {unreadNotifCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white font-mono text-[10px] font-bold flex items-center justify-center border-2 border-[#1c1c1e] shadow-sm">
                {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
              </span>
            )}
          </div>

          {/* Content Body */}
          <div className="flex-1 min-w-0 pr-5 sm:pr-6">
            <div className="flex items-baseline justify-between gap-1.5">
              <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate leading-tight">
                {activeNotif.title}
              </h4>
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium shrink-0">
                Baru saja
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 mt-1 leading-relaxed line-clamp-2">
              {activeNotif.message}
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 sm:top-3.5 right-3 sm:right-3.5 p-1 sm:p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Tutup (Atau Usap ke Atas)"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Bottom indicator */}
        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400">
          <span className="flex items-center gap-1 text-pink-400 font-semibold truncate">
            <Sparkles className="w-3 h-3 shrink-0 text-amber-300" />
            <span className="truncate">Tujuan: {resolveNotificationTarget(activeNotif, currentRole || 'member').label}</span>
          </span>
          <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-pink-300 font-bold shrink-0">
            <span>Buka Target</span>
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );
};
