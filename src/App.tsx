import React, { useState } from 'react';
import { AuthScreens } from './components/auth/AuthScreens';
import { AdminPanel } from './components/admin/AdminPanel';
import { MemberView } from './components/member/MemberView';
import { OwnerPanel } from './components/owner/OwnerPanel';
import { NotificationCenterModal } from './components/modals/NotificationCenterModal';
import { SupabaseTutorialModal } from './components/modals/SupabaseTutorialModal';
import { IOSNotificationBanner } from './components/notifications/IOSNotificationBanner';
import { MaintenanceScreen } from './components/maintenance/MaintenanceScreen';
import { AppProvider, useApp } from './context/AppContext';

const MainAppContent: React.FC = () => {
  const [bypassedMaintenance, setBypassedMaintenance] = useState(() => {
    try {
      return localStorage.getItem('rt_maintenance_bypass') === 'true';
    } catch {
      return false;
    }
  });

  const {
    currentUser,
    currentRole,
    toastMessage,
    isSupabaseModalOpen,
    setIsSupabaseModalOpen,
    systemSettings,
    theme,
  } = useApp();

  const isMaintenanceActive = systemSettings?.isMaintenance && currentRole !== 'owner' && !bypassedMaintenance;

  return (
    <div
      className="min-h-screen bg-[#0c0a15] text-white flex flex-col font-sans relative selection:bg-pink-500 selection:text-white"
    >
      {/* Dynamic Global Maintenance Mode Screen Controlled by Owner */}
      {isMaintenanceActive && (
        <MaintenanceScreen
          title={systemSettings.maintenanceTitle}
          message={systemSettings.maintenanceMessage}
          estimate={systemSettings.maintenanceEstimate}
          onBypass={() => {
            try { localStorage.setItem('rt_maintenance_bypass', 'true'); } catch {}
            setBypassedMaintenance(true);
          }}
        />
      )}

      {/* iOS Lock Screen Style Floating Push Notification Banner */}
      <IOSNotificationBanner />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-2xl flex items-center gap-2 border ${
              toastMessage.type === 'success'
                ? 'bg-[#182a20] border-emerald-500/40 text-emerald-300'
                : toastMessage.type === 'warn'
                ? 'bg-[#2f2214] border-amber-500/40 text-amber-300'
                : 'bg-[#1b1536] border-purple-500/40 text-purple-200'
            }`}
          >
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main View Router based on user role and authentication */}
      {!currentUser ? (
        <AuthScreens />
      ) : currentRole === 'owner' ? (
        <OwnerPanel />
      ) : currentRole === 'admin' ? (
        <AdminPanel />
      ) : (
        <MemberView />
      )}

      {/* Global Notification Drawer Modal */}
      <NotificationCenterModal />

      {/* Supabase Setup Modal (Accessible only from Owner Panel) */}
      <SupabaseTutorialModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
