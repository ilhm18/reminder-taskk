import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  Crown,
  Database,
  Edit,
  Eye,
  EyeOff,
  Globe,
  History,
  Key,
  ListTodo,
  LogOut,
  Megaphone,
  Menu,
  MessageSquareDashed,
  Plus,
  RefreshCw,
  Search,
  Server,
  Shield,
  Sparkles,
  Trash2,
  TrendingUp,
  UserCheck,
  UserX,
  X,
  Zap,
  MessageSquare,
  Wrench,
  Sliders,
  Bot,
  AlertTriangle,
  HelpCircle,
  QrCode,
  Users,
  LogIn,
  Check,
  Copy,
  ChevronRight,
  User as UserIcon,
  FileText,
  Lock,
  Unlock,
  SlidersHorizontal,
  Settings2,
  FileCode,
  Layers,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ClassItem, Task, User, ActivityLogItem } from '../../types';
import { getTerminology } from '../../utils/terminology';
import { AnalyticsView } from '../analytics/AnalyticsView';
import { CalendarView } from '../calendar/CalendarView';
import { DailyReportModal } from '../modals/DailyReportModal';
import { TaskFormModal } from '../modals/TaskFormModal';
import { BroadcastModal } from '../modals/BroadcastModal';
import { AnonymousWallOwnerView } from './AnonymousWallOwnerView';
import { FeedbackOwnerView } from './FeedbackOwnerView';
import { OwnerChatView } from '../common/OwnerChatView';
import { QuestionBankOwnerView } from './QuestionBankOwnerView';
import { AttendanceOwnerView } from './AttendanceOwnerView';
import { ForumView } from '../forum/ForumView';
import { ThemeToggle } from '../common/ThemeToggle';
import { RealTimeClock } from '../common/RealTimeClock';
import { MaintenanceScreen } from '../maintenance/MaintenanceScreen';
import { FeatureMaintenanceView } from '../maintenance/FeatureMaintenanceView';
import { ProfileAvatarUploader } from '../common/ProfileAvatarUploader';
import { formatIndonesianDate, getTaskDeadlineStatus } from '../../utils/notification';
import { getStoredSupabaseConfig, saveSupabaseConfig, testSupabaseConnection, SUPABASE_SQL_SCHEMA, getSupabaseClient } from '../../services/supabase';
import {
  ADMIN_FEATURE_MENUS,
  MEMBER_FEATURE_MENUS,
  FeatureMenuConfig,
} from '../../constants/featureMenus';

export const FEATURE_MAINTENANCE_SQL = `-- ========================================================
-- REMINDTASK: TABEL & KOLOM KONTROL MAINTENANCE PER FITUR
-- Menambahkan kolom admin_feature_maintenance & member_feature_maintenance
-- ke tabel public.system_settings untuk mengontrol semua fitur menu POV Admin & Member.
-- ========================================================

-- 1. Tambahkan kolom JSONB untuk pengaturan kontrol fitur jika belum ada
ALTER TABLE IF EXISTS public.system_settings 
  ADD COLUMN IF NOT EXISTS admin_feature_maintenance JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS member_feature_maintenance JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS feature_maintenance_custom_messages JSONB DEFAULT '{}'::jsonb;

-- 2. Pastikan baris konfigurasi global 'global_config' tersedia
INSERT INTO public.system_settings (
  id, 
  is_maintenance, 
  is_ai_maintenance, 
  admin_feature_maintenance, 
  member_feature_maintenance, 
  feature_maintenance_custom_messages
)
VALUES (
  'global_config', 
  false, 
  false, 
  '{}'::jsonb, 
  '{}'::jsonb, 
  '{}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 3. Beri izin akses publik untuk realtime & read/update
DROP POLICY IF EXISTS "Akses publik system settings" ON public.system_settings;
CREATE POLICY "Akses publik system settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);

-- 4. Aktifkan Realtime Publikasi
ALTER TABLE public.system_settings REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'system_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings;
  END IF;
END $$;

-- 5. Muat ulang cache schema PostgREST
NOTIFY pgrst, 'reload schema';
`;

const ACCESS_REALTIME_SQL = `-- ========================================================
-- REMINDTASK: SINKRONISASI REALTIME TOTAL AKSES & LOGIN
-- Menjamin tabel class_access_logs & activity_logs tereplikasi
-- secara instan ke Dashboard Owner via Supabase Realtime
-- ========================================================

-- 1. Buat Tabel class_access_logs jika belum ada
CREATE TABLE IF NOT EXISTS public.class_access_logs (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  class_name TEXT,
  class_code TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_email TEXT,
  device_info TEXT DEFAULT 'Desktop/Laptop',
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index untuk query cepat berdasarkan tanggal akses
CREATE INDEX IF NOT EXISTS idx_class_access_logs_accessed_at ON public.class_access_logs(accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_class_access_logs_class_id ON public.class_access_logs(class_id);

-- 3. Pastikan RLS Aktif dan Mengizinkan Pembacaan Realtime
ALTER TABLE public.class_access_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Akses publik class access logs" ON public.class_access_logs;
CREATE POLICY "Akses publik class access logs" ON public.class_access_logs FOR ALL USING (true) WITH CHECK (true);

-- 4. Aktifkan Replica Identity Full untuk Realtime WebSocket
ALTER TABLE public.class_access_logs REPLICA IDENTITY FULL;
ALTER TABLE public.activity_logs REPLICA IDENTITY FULL;

-- 5. Tambahkan Tabel ke Publikasi Realtime Supabase
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'class_access_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.class_access_logs;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'activity_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
  END IF;
END $$;

-- 6. Muat ulang cache schema PostgREST
NOTIFY pgrst, 'reload schema';`;

export const OwnerPanel: React.FC = () => {
  const {
    currentUser,
    logout,
    classes,
    tasks,
    users,
    submissions,
    classAccessLogs,
    deleteMemberUser,
    updateUserDirect,
    forumPosts,
    anonymousMessages,
    feedbacks,
    ownerChats,
    toggleUserStatus,
    deleteTask,
    addAdminUser,
    deleteAdminUser,
    deleteClass,
    onlineUsersCount,
    showToast,
    setIsNotificationDrawerOpen,
    unreadNotifCount,
    isSupabaseConnected,
    syncWithSupabase,
    activityLogs,
    addActivityLog,
    clearActivityLogs,
    cleanStaleCacheAndSync,
    purgeObsoleteDatabaseCache,
    purgeOrphanedClasses,
    systemSettings,
    updateSystemSettings,
    classChats,
  } = useApp();

  type OwnerTab = 'dashboard' | 'admins' | 'users' | 'kelas' | 'tugas' | 'forum' | 'bank_soal' | 'absensi' | 'anonwall' | 'statistik' | 'kalender' | 'aktivitas' | 'supabase' | 'saran' | 'chat' | 'maintenance' | 'settings';

  // Count unread chats for owner
  const unreadOwnerChatsCount = useMemo(() => {
    return classChats.filter(
      (c) =>
        (c.recipientId === currentUser?.id || c.recipientId === 'owner') &&
        !c.isRead
    ).length;
  }, [classChats, currentUser]);

  // Track unread/new forum posts
  const [lastViewedForumTime, setLastViewedForumTime] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('rt_last_viewed_forum_' + (currentUser?.id || 'owner')) || '0', 10);
    } catch {
      return 0;
    }
  });

  const hasUnreadForum = useMemo(() => {
    if (!forumPosts || forumPosts.length === 0) return false;
    return forumPosts.some((p) => {
      const isNew = new Date(p.createdAt).getTime() > lastViewedForumTime;
      const isNotMe = p.authorId !== currentUser?.id;
      return isNew && isNotMe;
    });
  }, [forumPosts, lastViewedForumTime, currentUser]);

  const getOwnerTabFromUrl = (): OwnerTab => {
    try {
      const hash = window.location.hash.replace('#', '').trim().toLowerCase();
      const pathname = window.location.pathname.toLowerCase();
      const raw = hash || (pathname.startsWith('/owner/') ? pathname.replace('/owner/', '') : '');

      const ALIAS_MAP: Record<string, OwnerTab> = {
        dashboard: 'dashboard',
        admins: 'admins',
        admin: 'admins',
        users: 'users',
        user: 'users',
        tracking: 'users',
        siswa: 'users',
        member: 'users',
        members: 'users',
        'tracking-user': 'users',
        kelas: 'kelas',
        class: 'kelas',
        classes: 'kelas',
        tugas: 'tugas',
        task: 'tugas',
        tasks: 'tugas',
        forum: 'forum',
        'forum-kelas': 'forum',
        'forum-global': 'forum',
        jasa: 'forum',
        market: 'forum',
        marketplace: 'forum',
        bank_soal: 'bank_soal',
        banksoal: 'bank_soal',
        'bank-soal': 'bank_soal',
        absensi: 'absensi',
        absen: 'absensi',
        presensi: 'absensi',
        attendance: 'absensi',
        soal: 'bank_soal',
        ujian: 'bank_soal',
        quiz: 'bank_soal',
        anonwall: 'anonwall',
        wall: 'anonwall',
        'anonymous-wall': 'anonwall',
        anonymous: 'anonwall',
        statistik: 'statistik',
        stats: 'statistik',
        analytics: 'statistik',
        kalender: 'kalender',
        calendar: 'kalender',
        aktivitas: 'aktivitas',
        activity: 'aktivitas',
        log: 'aktivitas',
        logs: 'aktivitas',
        supabase: 'supabase',
        database: 'supabase',
        db: 'supabase',
        saran: 'saran',
        feedback: 'saran',
        suggest: 'saran',
        suggestion: 'saran',
        chat: 'chat',
        chats: 'chat',
        inbox: 'chat',
        pesan: 'chat',
        maintenance: 'maintenance',
        pemeliharaan: 'maintenance',
        server: 'maintenance',
        fitur: 'maintenance',
        settings: 'settings',
        pengaturan: 'settings',
      };

      if (raw && ALIAS_MAP[raw]) {
        return ALIAS_MAP[raw];
      }

      const saved = localStorage.getItem('rt_owner_active_tab');
      if (saved && ALIAS_MAP[saved]) {
        return ALIAS_MAP[saved];
      }
    } catch {}
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState<OwnerTab>(getOwnerTabFromUrl);

  // Maintenance Settings Form State
  const [maintenanceForm, setMaintenanceForm] = useState({
    isMaintenance: systemSettings?.isMaintenance || false,
    maintenanceTitle: systemSettings?.maintenanceTitle || 'Pemeliharaan Server & Pembaruan Sistem',
    maintenanceMessage: systemSettings?.maintenanceMessage || 'Kami sedang melakukan peningkatan infrastruktur dan optimalisasi database Supabase untuk menghadirkan performa terbaik. Mohon bersabar, kami akan segera kembali.',
    maintenanceEstimate: systemSettings?.maintenanceEstimate || 'Segera selesai dalam beberapa saat',
    isAiMaintenance: systemSettings?.isAiMaintenance ?? true,
    aiMaintenanceTitle: systemSettings?.aiMaintenanceTitle || 'AI Assistant Sedang Bersiap!',
    aiMaintenanceMessage: systemSettings?.aiMaintenanceMessage || 'Fitur AI Assistant sedang dalam tahap pengembangan developer, mohon ditunggu ya! Kami sedang mematangkan asisten bimbingan belajar cerdas terbaik untuk Anda.',
    aiProgressPercent: systemSettings?.aiProgressPercent ?? 85,
  });

  const [isSavingMaintenance, setIsSavingMaintenance] = useState(false);

  // Granular Feature Maintenance State (Admin & Member POV)
  const [adminFeatureMaintenance, setAdminFeatureMaintenance] = useState<Record<string, boolean>>(
    systemSettings?.adminFeatureMaintenance || {}
  );
  const [memberFeatureMaintenance, setMemberFeatureMaintenance] = useState<Record<string, boolean>>(
    systemSettings?.memberFeatureMaintenance || {}
  );
  const [featureCustomMessages, setFeatureCustomMessages] = useState<Record<string, { message?: string; estimate?: string }>>(
    systemSettings?.featureMaintenanceCustomMessages || {}
  );
  const [featureRoleTab, setFeatureRoleTab] = useState<'global' | 'admin' | 'member' | 'all'>('global');
  const [featureSearchQuery, setFeatureSearchQuery] = useState('');
  const [featureCategoryFilter, setFeatureCategoryFilter] = useState<'all' | 'utama' | 'akademik' | 'komunikasi' | 'hiburan' | 'lainnya'>('all');
  const [editingCustomFeature, setEditingCustomFeature] = useState<{
    role: 'admin' | 'member';
    id: string;
    name: string;
    defaultMessage: string;
    defaultEstimate: string;
  } | null>(null);
  const [customFeatureMessageInput, setCustomFeatureMessageInput] = useState('');
  const [customFeatureEstimateInput, setCustomFeatureEstimateInput] = useState('');
  const [showSqlFeatureModal, setShowSqlFeatureModal] = useState(false);
  const [copiedSqlFeature, setCopiedSqlFeature] = useState(false);
  const [isSavingFeatures, setIsSavingFeatures] = useState(false);
  const [previewFeatureData, setPreviewFeatureData] = useState<{
    name: string;
    categoryLabel: string;
    message: string;
    estimate: string;
    role: 'admin' | 'member';
  } | null>(null);

  // Global Website Maintenance & AI Assistant Config States
  const [showWebsiteConfigModal, setShowWebsiteConfigModal] = useState(false);
  const [showAiConfigModal, setShowAiConfigModal] = useState(false);
  const [showAiPreviewModal, setShowAiPreviewModal] = useState(false);

  const [websiteConfigTitle, setWebsiteConfigTitle] = useState('');
  const [websiteConfigMessage, setWebsiteConfigMessage] = useState('');
  const [websiteConfigEstimate, setWebsiteConfigEstimate] = useState('');

  const [aiConfigTitle, setAiConfigTitle] = useState('');
  const [aiConfigMessage, setAiConfigMessage] = useState('');
  const [aiConfigProgress, setAiConfigProgress] = useState(85);

  useEffect(() => {
    if (systemSettings) {
      setMaintenanceForm({
        isMaintenance: systemSettings.isMaintenance,
        maintenanceTitle: systemSettings.maintenanceTitle,
        maintenanceMessage: systemSettings.maintenanceMessage,
        maintenanceEstimate: systemSettings.maintenanceEstimate,
        isAiMaintenance: systemSettings.isAiMaintenance,
        aiMaintenanceTitle: systemSettings.aiMaintenanceTitle,
        aiMaintenanceMessage: systemSettings.aiMaintenanceMessage,
        aiProgressPercent: systemSettings.aiProgressPercent,
      });
      setAdminFeatureMaintenance(systemSettings.adminFeatureMaintenance || {});
      setMemberFeatureMaintenance(systemSettings.memberFeatureMaintenance || {});
      setFeatureCustomMessages(systemSettings.featureMaintenanceCustomMessages || {});
    }
  }, [systemSettings]);

  const handleToggleAdminFeature = (featureId: string) => {
    setAdminFeatureMaintenance((prev) => ({
      ...prev,
      [featureId]: !prev[featureId],
    }));
  };

  const handleToggleMemberFeature = (featureId: string) => {
    setMemberFeatureMaintenance((prev) => {
      const nextVal = !prev[featureId];
      if (featureId === 'ai_tutor') {
        setMaintenanceForm((mf) => ({ ...mf, isAiMaintenance: nextVal }));
      }
      return {
        ...prev,
        [featureId]: nextVal,
      };
    });
  };

  const handleBulkToggle = (role: 'global' | 'admin' | 'member' | 'all', status: boolean) => {
    if (role === 'global') {
      setMaintenanceForm((prev) => ({
        ...prev,
        isMaintenance: status,
        isAiMaintenance: status,
      }));
      setMemberFeatureMaintenance((prev) => ({
        ...prev,
        ai_tutor: status,
      }));
      showToast(
        status
          ? 'Sistem Website & AI diset ke mode MAINTENANCE (Nonaktif)!'
          : 'Sistem Website & AI dibuka kembali ke mode NORMAL (Aktif)!',
        status ? 'warn' : 'success'
      );
      return;
    }
    if (role === 'all') {
      setMaintenanceForm((prev) => ({
        ...prev,
        isMaintenance: status,
        isAiMaintenance: status,
      }));
      const updatedAdmin: Record<string, boolean> = {};
      ADMIN_FEATURE_MENUS.forEach((f) => {
        updatedAdmin[f.id] = status;
      });
      setAdminFeatureMaintenance(updatedAdmin);
      const updatedMember: Record<string, boolean> = {};
      MEMBER_FEATURE_MENUS.forEach((f) => {
        updatedMember[f.id] = status;
      });
      setMemberFeatureMaintenance(updatedMember);
      showToast(
        status
          ? 'Seluruh Fitur Platform diset ke mode MAINTENANCE (Nonaktif)!'
          : 'Seluruh Fitur Platform dibuka kembali ke mode NORMAL (Aktif)!',
        status ? 'warn' : 'success'
      );
      return;
    }
    const list = role === 'admin' ? ADMIN_FEATURE_MENUS : MEMBER_FEATURE_MENUS;
    const updated: Record<string, boolean> = {};
    list.forEach((f) => {
      updated[f.id] = status;
    });
    if (role === 'admin') {
      setAdminFeatureMaintenance(updated);
    } else {
      setMemberFeatureMaintenance(updated);
      setMaintenanceForm((mf) => ({ ...mf, isAiMaintenance: status }));
    }
    showToast(
      status
        ? `Semua fitur ${role === 'admin' ? 'Admin' : 'Siswa'} diset ke mode MAINTENANCE (Nonaktif)!`
        : `Semua fitur ${role === 'admin' ? 'Admin' : 'Siswa'} dibuka kembali (NORMAL/Aktif)!`,
      status ? 'warn' : 'success'
    );
  };

  const handleSaveFeatureSettings = async () => {
    setIsSavingFeatures(true);
    await updateSystemSettings({
      ...maintenanceForm,
      adminFeatureMaintenance,
      memberFeatureMaintenance,
      featureMaintenanceCustomMessages: featureCustomMessages,
    });
    setIsSavingFeatures(false);
    showToast('Pengaturan kontrol fitur & sistem berhasil disimpan ke Supabase & LocalStorage!', 'success');
  };

  const handleOpenCustomMessageModal = (role: 'admin' | 'member', feature: FeatureMenuConfig) => {
    const key = `${role}_${feature.id}`;
    const existing = featureCustomMessages[key];
    setEditingCustomFeature({
      role,
      id: feature.id,
      name: feature.name,
      defaultMessage: feature.defaultMessage,
      defaultEstimate: feature.defaultEstimate,
    });
    setCustomFeatureMessageInput(existing?.message || feature.defaultMessage);
    setCustomFeatureEstimateInput(existing?.estimate || feature.defaultEstimate);
  };

  const handleSaveCustomFeatureMessage = () => {
    if (!editingCustomFeature) return;
    const key = `${editingCustomFeature.role}_${editingCustomFeature.id}`;
    setFeatureCustomMessages((prev) => ({
      ...prev,
      [key]: {
        message: customFeatureMessageInput.trim() || undefined,
        estimate: customFeatureEstimateInput.trim() || undefined,
      },
    }));
    setEditingCustomFeature(null);
    showToast(`Pesan maintenance untuk fitur "${editingCustomFeature.name}" berhasil diatur!`, 'success');
  };

  const handleResetCustomFeatureMessage = () => {
    if (!editingCustomFeature) return;
    const key = `${editingCustomFeature.role}_${editingCustomFeature.id}`;
    setFeatureCustomMessages((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setEditingCustomFeature(null);
    showToast(`Pesan maintenance untuk fitur "${editingCustomFeature.name}" dikembalikan ke default.`, 'info');
  };

  const handleCopySqlFeature = () => {
    try {
      navigator.clipboard.writeText(FEATURE_MAINTENANCE_SQL);
      setCopiedSqlFeature(true);
      setTimeout(() => setCopiedSqlFeature(false), 3000);
      showToast('Skrip SQL kontrol fitur berhasil disalin ke clipboard!', 'success');
    } catch {
      showToast('Gagal menyalin otomatis, silakan salin teks SQL secara manual.', 'warn');
    }
  };

  const handleOpenWebsiteConfig = () => {
    setWebsiteConfigTitle(maintenanceForm.maintenanceTitle || 'Pemeliharaan Server & Pembaruan Sistem');
    setWebsiteConfigMessage(maintenanceForm.maintenanceMessage || 'Kami sedang melakukan peningkatan infrastruktur dan optimalisasi database Supabase untuk menghadirkan performa terbaik. Mohon bersabar, kami akan segera kembali.');
    setWebsiteConfigEstimate(maintenanceForm.maintenanceEstimate || 'Segera selesai dalam beberapa saat');
    setShowWebsiteConfigModal(true);
  };

  const handleSaveWebsiteConfig = async () => {
    const updated = {
      ...maintenanceForm,
      maintenanceTitle: websiteConfigTitle.trim() || 'Pemeliharaan Server & Pembaruan Sistem',
      maintenanceMessage: websiteConfigMessage.trim() || 'Kami sedang melakukan peningkatan infrastruktur dan optimalisasi database Supabase untuk menghadirkan performa terbaik. Mohon bersabar, kami akan segera kembali.',
      maintenanceEstimate: websiteConfigEstimate.trim() || 'Segera selesai dalam beberapa saat',
    };
    setMaintenanceForm(updated);
    await updateSystemSettings({
      maintenanceTitle: updated.maintenanceTitle,
      maintenanceMessage: updated.maintenanceMessage,
      maintenanceEstimate: updated.maintenanceEstimate,
    });
    setShowWebsiteConfigModal(false);
    showToast('Pengaturan tampilan pemeliharaan website berhasil disimpan!', 'success');
  };

  const handleOpenAiConfig = () => {
    setAiConfigTitle(maintenanceForm.aiMaintenanceTitle || 'AI Assistant Sedang Bersiap!');
    setAiConfigMessage(maintenanceForm.aiMaintenanceMessage || 'Fitur AI Assistant sedang dalam tahap pengembangan developer, mohon ditunggu ya! Kami sedang mematangkan asisten bimbingan belajar cerdas terbaik untuk Anda.');
    setAiConfigProgress(maintenanceForm.aiProgressPercent ?? 85);
    setShowAiConfigModal(true);
  };

  const handleSaveAiConfig = async () => {
    const updated = {
      ...maintenanceForm,
      aiMaintenanceTitle: aiConfigTitle.trim() || 'AI Assistant Sedang Bersiap!',
      aiMaintenanceMessage: aiConfigMessage.trim() || 'Fitur AI Assistant sedang dalam tahap pengembangan developer, mohon ditunggu ya! Kami sedang mematangkan asisten bimbingan belajar cerdas terbaik untuk Anda.',
      aiProgressPercent: aiConfigProgress,
    };
    setMaintenanceForm(updated);
    await updateSystemSettings({
      aiMaintenanceTitle: updated.aiMaintenanceTitle,
      aiMaintenanceMessage: updated.aiMaintenanceMessage,
      aiProgressPercent: updated.aiProgressPercent,
    });
    setShowAiConfigModal(false);
    showToast('Pengaturan mode pengembangan AI Assistant berhasil disimpan!', 'success');
  };

  const handleToggleWebsiteMaintenance = async () => {
    const nextVal = !maintenanceForm.isMaintenance;
    setMaintenanceForm((prev) => ({ ...prev, isMaintenance: nextVal }));
    await updateSystemSettings({ isMaintenance: nextVal });
    showToast(
      nextVal
        ? 'Mode Pemeliharaan Website diaktifkan! Pengunjung akan melihat layar maintenance.'
        : 'Mode Pemeliharaan Website dimatikan! Website berjalan normal kembali.',
      nextVal ? 'warn' : 'success'
    );
  };

  const handleToggleAiMaintenance = async () => {
    const nextVal = !maintenanceForm.isAiMaintenance;
    setMaintenanceForm((prev) => ({ ...prev, isAiMaintenance: nextVal }));
    setMemberFeatureMaintenance((prev) => ({ ...prev, ai_tutor: nextVal }));
    await updateSystemSettings({
      isAiMaintenance: nextVal,
      memberFeatureMaintenance: { ...memberFeatureMaintenance, ai_tutor: nextVal },
    });
    showToast(
      nextVal
        ? 'Fitur AI Assistant diset ke Mode Pengembangan!'
        : 'Fitur AI Assistant dibuka ke mode Normal (Live Chat)!',
      nextVal ? 'warn' : 'success'
    );
  };

  useEffect(() => {
    try {
      localStorage.setItem('rt_owner_active_tab', activeTab);
      const targetUrl = `/owner/#${activeTab}`;
      if (window.location.pathname + window.location.hash !== targetUrl) {
        window.history.replaceState(null, '', targetUrl);
      }
    } catch {}
  }, [activeTab]);

  useEffect(() => {
    const handleUrlSync = () => {
      const newTab = getOwnerTabFromUrl();
      setActiveTab(newTab);
    };

    const handleCustomNavigate = (e: any) => {
      if (e?.detail?.tab) {
        setActiveTab(e.detail.tab as OwnerTab);
      }
    };

    window.addEventListener('popstate', handleUrlSync);
    window.addEventListener('hashchange', handleUrlSync);
    window.addEventListener('rt:navigate-tab', handleCustomNavigate);
    return () => {
      window.removeEventListener('popstate', handleUrlSync);
      window.removeEventListener('hashchange', handleUrlSync);
      window.removeEventListener('rt:navigate-tab', handleCustomNavigate);
    };
  }, []);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add Admin & Class Modal states
  const [newClassName, setNewClassName] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminClassCode, setNewAdminClassCode] = useState('');
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  
  // Edit Admin User Modal states
  const [editingAdmin, setEditingAdmin] = useState<User | null>(null);
  const [editAdminName, setEditAdminName] = useState('');
  const [editAdminPassword, setEditAdminPassword] = useState('');
  const [editAdminClassName, setEditAdminClassName] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  const [adminToDelete, setAdminToDelete] = useState<User | null>(null);
  const [classToDelete, setClassToDelete] = useState<ClassItem | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showMaintenancePreviewModal, setShowMaintenancePreviewModal] = useState(false);
  const [copiedMaintenanceSql, setCopiedMaintenanceSql] = useState(false);

  // Owner settings state
  const [ownerName, setOwnerName] = useState(currentUser?.name || 'Owner');
  const [ownerPassword, setOwnerPassword] = useState(currentUser?.password || 'ilhaM@1810');
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);
  const [isSavingOwnerSettings, setIsSavingOwnerSettings] = useState(false);

  useEffect(() => {
    if (currentUser && currentUser.role === 'owner') {
      setOwnerName(currentUser.name);
      setOwnerPassword(currentUser.password || '');
    }
  }, [currentUser]);

  // Supabase Server View states
  const currentConfig = getStoredSupabaseConfig();
  const [dbUrl, setDbUrl] = useState(currentConfig.url || '');
  const [dbKey, setDbKey] = useState(currentConfig.anonKey || '');
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [isAccessSqlModalOpen, setIsAccessSqlModalOpen] = useState(false);
  const [copiedAccessSql, setCopiedAccessSql] = useState(false);

  const handleCopyAccessSql = () => {
    navigator.clipboard.writeText(ACCESS_REALTIME_SQL);
    setCopiedAccessSql(true);
    showToast('Query SQL Realtime Akses berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedAccessSql(false), 2500);
  };

  const adminUsers = React.useMemo(() => {
    const seen = new Set<string>();
    return users.filter((u) => {
      if (u.role !== 'admin') return false;
      const key = u.id ? u.id.trim() : (u.username || u.name).toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [users]);

  // Combined tracking of all users across the system (Owner, Admin, Siswa)
  const allTrackedUsers = React.useMemo(() => {
    const map = new Map<string, User>();
    users.forEach((u) => {
      const key = u.id || u.username || u.email || u.name;
      map.set(key, u);
    });
    classAccessLogs.forEach((log) => {
      if (log.studentId && !map.has(log.studentId)) {
        map.set(log.studentId, {
          id: log.studentId,
          name: log.studentName,
          email: log.studentEmail,
          role: 'member',
          classId: log.classId,
          className: log.className,
          status: 'active',
          createdAt: log.accessedAt,
        });
      }
    });
    return Array.from(map.values());
  }, [users, classAccessLogs]);

  // Clear any legacy bloated localStorage cache key on mount
  useEffect(() => {
    try {
      localStorage.removeItem('rt_total_overall_logins');
    } catch {}
  }, []);

  // Total logins & accesses calculation (Murni Real-Time dari Database)
  const totalOverallLogins = React.useMemo(() => {
    const accessLogsCount = classAccessLogs.length;
    const authLoginsCount = activityLogs.filter(
      (a) =>
        a.category === 'auth' ||
        a.action?.toLowerCase().includes('login') ||
        a.action?.toLowerCase().includes('masuk')
    ).length;
    return accessLogsCount + authLoginsCount;
  }, [classAccessLogs.length, activityLogs]);

  const totalAccessesToday = React.useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayAccessLogs = classAccessLogs.filter(
      (l) => l.accessedAt && l.accessedAt.startsWith(todayStr)
    ).length;
    const todayAuthLogs = activityLogs.filter(
      (a) =>
        (a.category === 'auth' ||
          a.action?.toLowerCase().includes('login') ||
          a.action?.toLowerCase().includes('masuk')) &&
        a.timestamp &&
        a.timestamp.startsWith(todayStr)
    ).length;
    return todayAccessLogs + todayAuthLogs;
  }, [classAccessLogs, activityLogs]);

  // Tracking Filter States
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'owner' | 'admin' | 'member'>('all');
  const [userClassFilter, setUserClassFilter] = useState<string>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserClassName, setEditUserClassName] = useState('');

  // Filtered tracked users for Tracking Semua User tab
  const filteredTrackedUsers = useMemo(() => {
    return allTrackedUsers.filter((u) => {
      if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
      if (userStatusFilter !== 'all' && (u.status || 'active') !== userStatusFilter) return false;
      if (userClassFilter !== 'all') {
        const userClass = classes.find((c) => c.adminId === u.id || c.id === u.classId);
        if (u.classId !== userClassFilter && userClass?.id !== userClassFilter) return false;
      }
      if (userSearchQuery.trim()) {
        const q = userSearchQuery.toLowerCase();
        const userClass = classes.find((c) => c.adminId === u.id || c.id === u.classId);
        const adminForUser = u.role === 'member'
          ? users.find((adm) => adm.role === 'admin' && (adm.classId === u.classId || classes.some((c) => c.id === u.classId && c.adminId === adm.id)))
          : null;
        const matchesName = u.name?.toLowerCase().includes(q);
        const matchesUsername = u.username?.toLowerCase().includes(q);
        const matchesEmail = u.email?.toLowerCase().includes(q);
        const matchesClass = (u.className?.toLowerCase().includes(q)) || (userClass?.name?.toLowerCase().includes(q)) || (userClass?.code?.toLowerCase().includes(q));
        const matchesAdmin = adminForUser?.name?.toLowerCase().includes(q);
        return matchesName || matchesUsername || matchesEmail || matchesClass || matchesAdmin;
      }
      return true;
    });
  }, [allTrackedUsers, userRoleFilter, userStatusFilter, userClassFilter, userSearchQuery, classes, users]);

  const handleOpenEditUserModal = (u: User) => {
    setUserToEdit(u);
    setEditUserName(u.name);
    setEditUserPassword(u.password || '');
    setEditUserClassName(u.className || '');
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit || !editUserName.trim()) return;

    await updateUserDirect(userToEdit.id, {
      name: editUserName.trim(),
      ...(editUserPassword.trim() ? { password: editUserPassword.trim() } : {}),
      className: editUserClassName.trim() || userToEdit.className,
    });

    addActivityLog(
      currentUser?.name || 'Owner',
      'owner',
      'Pembaruan Data Pengguna',
      `Owner memperbarui profil pengguna ${editUserName.trim()} (${userToEdit.role})`,
      'auth'
    );

    showToast(`Data akun ${editUserName.trim()} berhasil diperbarui!`, 'success');
    setUserToEdit(null);
    syncWithSupabase();
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    const targetName = userToDelete.name;
    const targetId = userToDelete.id;
    const targetRole = userToDelete.role;
    setUserToDelete(null);

    if (targetRole === 'admin') {
      await deleteAdminUser(targetId);
    } else {
      await deleteMemberUser(targetId);
    }

    addActivityLog(
      currentUser?.name || 'Owner',
      'owner',
      'Hapus Akun Pengguna',
      `Owner menghapus pengguna ${targetName} (${targetRole})`,
      'auth'
    );

    showToast(`Pengguna ${targetName} berhasil dihapus dari sistem.`, 'info');
  };

  const handleExportUsersCSV = () => {
    const headers = ['ID Pengguna', 'Nama Lengkap', 'Role', 'Asal Kelas', 'Kode Kelas', 'Admin Kelas', 'Status Akun', 'Tanggal Registrasi'];
    const rows = filteredTrackedUsers.map((u) => {
      const userClass = classes.find((c) => c.adminId === u.id || c.id === u.classId);
      const classAdmin = u.role === 'member'
        ? users.find((adm) => adm.role === 'admin' && (adm.classId === u.classId || classes.some((c) => c.id === u.classId && c.adminId === adm.id)))
        : null;
      return [
        `"${u.id}"`,
        `"${u.name || ''}"`,
        `"${u.role === 'owner' ? 'Owner' : u.role === 'admin' ? 'Admin / Guru' : 'Siswa / Member'}"`,
        `"${u.className || userClass?.name || '-'}"`,
        `"${userClass?.code || '-'}"`,
        `"${classAdmin ? classAdmin.name : u.role === 'admin' ? 'Penanggung Jawab' : '-'}"`,
        `"${u.status === 'suspended' ? 'Ditangguhkan' : 'Aktif'}"`,
        `"${u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : '-'}"`,
      ].join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `remindtask_audit_users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Data tracking pengguna berhasil diekspor ke CSV!', 'success');
  };

  interface OwnerMenuItem {
    id: OwnerTab;
    label: string;
    icon: any;
    badge?: number;
    iconColor?: string;
  }

  interface OwnerMenuGroup {
    title: string;
    items: OwnerMenuItem[];
  }

  useEffect(() => {
    if (activeTab === 'forum') {
      const now = Date.now();
      setLastViewedForumTime(now);
      try {
        localStorage.setItem('rt_last_viewed_forum_' + (currentUser?.id || 'owner'), now.toString());
      } catch {}
    }
  }, [activeTab, currentUser?.id]);

  const ownerMenuGroups: OwnerMenuGroup[] = [
    {
      title: 'Akademik & Kelas',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: Activity },
        { id: 'admins', label: 'User Admin', icon: Shield },
        { id: 'users', label: 'Tracking User', icon: Users, iconColor: 'text-pink-400' },
        { id: 'kelas', label: 'Ruang Kelas', icon: Building2 },
        { id: 'tugas', label: 'Semua Tugas', icon: ListTodo },
        { id: 'absensi', label: 'Rekap Absensi Global', icon: QrCode, iconColor: 'text-emerald-400' },
        { id: 'bank_soal', label: 'Bank Soal & Ujian', icon: HelpCircle, iconColor: 'text-purple-400' },
        { id: 'kalender', label: 'Kalender Tugas', icon: Calendar },
        { id: 'statistik', label: 'Statistik & Analisis', icon: TrendingUp },
      ],
    },
    {
      title: 'Komunikasi & Forum',
      items: [
        { id: 'forum', label: 'Forum & Jasa', icon: Globe, iconColor: 'text-pink-400', badge: hasUnreadForum ? 1 : undefined },
        { id: 'anonwall', label: 'Pesan Anonim Siswa', icon: MessageSquareDashed, iconColor: 'text-amber-400' },
        { id: 'chat', label: 'Chat Masuk / Konsultasi', icon: MessageSquare, badge: unreadOwnerChatsCount || undefined, iconColor: 'text-pink-400' },
        { id: 'saran', label: 'Kritik & Saran', icon: MessageSquare, iconColor: 'text-pink-400' },
      ],
    },
    {
      title: 'Sistem & Infrastruktur',
      items: [
        { id: 'aktivitas', label: 'Log Aktivitas Sistem', icon: History },
        { id: 'supabase', label: 'Server Supabase', icon: Server, iconColor: 'text-emerald-400' },
        { id: 'maintenance', label: 'Kontrol Maintenance', icon: Wrench, iconColor: 'text-amber-400' },
      ],
    },
    {
      title: 'Pengaturan',
      items: [
        { id: 'settings', label: 'Pengaturan Profil', icon: Sliders, iconColor: 'text-amber-400' },
      ],
    },
  ];

  const generateRandomClassCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleOpenAddAdminModal = () => {
    setNewAdminName('');
    setNewAdminPassword('');
    setNewClassName('');
    setNewAdminClassCode(generateRandomClassCode());
    setShowAddClassModal(true);
  };

  const handleOpenEditAdminModal = (admin: User) => {
    const adminClass = classes.find((c) => c.adminId === admin.id || c.id === admin.classId);
    setEditingAdmin(admin);
    setEditAdminName(admin.name);
    setEditAdminPassword(admin.password || 'password123');
    setEditAdminClassName(admin.className || adminClass?.name || '');
    setShowEditPassword(false);
  };

  const handleSaveEditAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin || !editAdminName.trim()) return;

    const updatedUser: User = {
      ...editingAdmin,
      name: editAdminName.trim(),
      password: editAdminPassword.trim() || 'password123',
      className: editAdminClassName.trim() || editingAdmin.className,
    };

    // Update in local state and Supabase profiles table immediately
    await updateUserDirect(editingAdmin.id, {
      name: updatedUser.name,
      password: updatedUser.password,
      className: updatedUser.className,
    });

    // Update class name if changed
    const client = getSupabaseClient();
    if (client && editingAdmin.classId && editAdminClassName.trim()) {
      try {
        await client
          .from('classes')
          .update({
            name: editAdminClassName.trim(),
            admin_name: updatedUser.name,
          })
          .eq('id', editingAdmin.classId);
      } catch (err) {
        console.warn('Supabase update class error:', err);
      }
    }

    addActivityLog(
      currentUser?.name || 'Owner',
      'owner',
      'Pembaruan Akun Admin',
      `Owner memperbarui profil & password admin ${updatedUser.name}`,
      'admin'
    );

    showToast(`Akun admin ${updatedUser.name} berhasil diperbarui!`, 'success');
    setEditingAdmin(null);
    syncWithSupabase();
  };

  const handleSaveOwnerSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerName.trim()) {
      showToast('Nama Owner tidak boleh kosong.', 'warn');
      return;
    }

    setIsSavingOwnerSettings(true);
    const client = getSupabaseClient();
    if (client && currentUser) {
      try {
        const { error } = await client
          .from('profiles')
          .upsert({
            id: currentUser.id,
            name: ownerName.trim(),
            password: ownerPassword.trim() || 'ilhaM@1810',
            role: 'owner',
            status: 'active',
          }, { onConflict: 'id' });

        if (error) throw error;

        showToast('Pengaturan profil Owner berhasil disimpan permanen ke database Supabase!', 'success');
        addActivityLog(ownerName, 'owner', 'Update Profil Owner', `Owner memperbarui nama dan password.`, 'system');
        
        await syncWithSupabase();
      } catch (err: any) {
        console.error('Failed to save owner settings:', err);
        showToast('Gagal menyimpan ke database Supabase. Sesi lokal diperbarui.', 'warn');
      }
    }
    setIsSavingOwnerSettings(false);
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSync = async () => {
    await syncWithSupabase();
    addActivityLog(
      currentUser?.name || 'Owner',
      'owner',
      'Sinkronisasi Database',
      'Owner menyinkronkan data dengan server Supabase realtime.',
      'system'
    );
    showToast('Berhasil disinkronkan. Data mutakhir.', 'success');
  };

  const handlePurgeOrphans = async () => {
    const deletedCount = await purgeOrphanedClasses();
    if (deletedCount > 0) {
      addActivityLog(
        currentUser?.name || 'Owner',
        'owner',
        'Pembersihan Kelas Sampah',
        `Owner menghapus ${deletedCount} kelas tidak terpakai dari server Supabase.`,
        'system'
      );
      showToast(`Berhasil membersihkan ${deletedCount} kelas sampah dari Supabase! Total admin & kelas sekarang sinkron 1:1.`, 'success');
    } else {
      showToast('Database server sudah bersih! Seluruh kelas terikat dengan admin aktif.', 'info');
    }
  };

  const handleCreateNewAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName.trim() || !newClassName.trim()) {
      showToast('Harap lengkapi nama admin dan nama kelas.', 'warn');
      return;
    }

    const finalCode = newAdminClassCode.trim() || generateRandomClassCode();
    const cleanUsername = (newAdminUsername.trim() || newAdminName.trim().toLowerCase().replace(/\s+/g, '')).toLowerCase().replace(/[^a-z0-9_]/g, '');

    try {
      await addAdminUser({
        name: newAdminName.trim(),
        username: cleanUsername,
        password: newAdminPassword.trim() || 'password123',
        className: newClassName.trim(),
        classCode: finalCode,
      });

      addActivityLog(
        currentUser?.name || 'Owner',
        'owner',
        'Admin & Kelas Baru Dibuat',
        `Owner membuat admin ${newAdminName} (@${cleanUsername}) untuk kelas ${newClassName} (Kode: ${finalCode})`,
        'admin'
      );

      setNewAdminName('');
      setNewAdminUsername('');
      setNewAdminPassword('');
      setNewClassName('');
      setNewAdminClassCode('');
      setShowAddClassModal(false);
    } catch (err: any) {
      showToast(err?.message || 'Gagal membuat admin baru. Username mungkin sudah digunakan.', 'warn');
    }
  };

  const handleSaveDbConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTestingDb(true);
    setDbTestResult(null);
    const res = await testSupabaseConnection(dbUrl.trim(), dbKey.trim());
    setIsTestingDb(false);
    setDbTestResult(res);
    if (res.success) {
      saveSupabaseConfig(dbUrl.trim(), dbKey.trim());
      addActivityLog(
        currentUser?.name || 'Owner',
        'owner',
        'Konfigurasi Database Diperbarui',
        'Owner memperbarui koneksi URL & Anon Key Supabase.',
        'system'
      );
      showToast('Koneksi Supabase berhasil disimpan!', 'success');
      syncWithSupabase();
    }
  };

  // Real device visitor metrics
  const totalDeviceAccesses = classes.reduce((acc, c) => acc + (c.memberCount || 0), 0);
  const realOnlineUsers = Math.max(1, onlineUsersCount);

  return (
    <div className="min-h-screen bg-[#0c0a15] text-white flex flex-col md:flex-row antialiased">
      {/* MOBILE TOPBAR (Visible only on mobile/tablet) */}
      <div className="md:hidden px-4 py-3 bg-[#110e22]/95 border-b border-[#221c3d] flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center shadow-md shadow-pink-500/25 shrink-0">
            <CheckCircle2 className="w-4.5 h-4.5 text-white stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-extrabold text-xs text-white tracking-tight">REMINDTASK</h1>
            <span className="text-[9px] font-bold text-pink-400 block uppercase">
              OWNER CONTROL
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setIsNotificationDrawerOpen(true)}
            className="relative p-2 rounded-xl bg-[#1a1433] text-slate-300 hover:text-white border border-[#2b224d]"
            title="Notifikasi"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-500 text-white font-mono text-[9px] font-bold flex items-center justify-center">
                {unreadNotifCount}
              </span>
            )}
          </button>
          {/* 3-LINE HAMBURGER MENU BUTTON */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-xl bg-[#1f173d] text-white border border-[#382b60] flex items-center justify-center cursor-pointer"
            title="Menu Owner"
            aria-label="Toggle Menu Owner"
          >
            <Menu className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* MOBILE SIDEBAR DRAWER OVERLAY */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-4/5 max-w-xs bg-[#110e22] border-r border-[#221c3d] h-full flex flex-col justify-between p-4 z-10 overflow-y-auto">
            <div>
              {/* Header inside drawer */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#221c3d]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
                    <Crown className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-white">Owner Control</h3>
                    <p className="text-[10px] text-slate-400 truncate max-w-[150px]">Owner Administrator</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#20183b]"
                >
                  <X className="w-5 h-5 text-pink-400" />
                </button>
              </div>

              {/* Mobile navigation links organized into sub-menus */}
              <div className="space-y-4">
                {ownerMenuGroups.map((group, gIdx) => (
                  <div key={gIdx} className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 block">
                      {group.title}
                    </span>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveTab(item.id as typeof activeTab);
                              setMobileSidebarOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                              isActive
                                ? item.id === 'supabase'
                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-sm'
                                  : 'bg-pink-500/10 border-pink-500/30 text-pink-300 shadow-sm'
                                : 'text-slate-300 hover:text-white hover:bg-[#161131] border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon className={`w-4 h-4 transition-colors ${
                                isActive 
                                  ? item.id === 'supabase' ? 'text-emerald-300' : 'text-pink-300'
                                  : item.iconColor || 'text-slate-400'
                              }`} />
                              <span>{item.label}</span>
                            </div>
                            {item.badge && item.badge > 0 ? (
                              <span className="w-5 h-5 rounded-full bg-pink-500 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                                {item.badge}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile drawer footer */}
            <div className="pt-3 border-t border-[#221c3d] space-y-2">

              <button
                onClick={logout}
                className="w-full py-2 rounded-xl bg-[#1b1533] text-red-400 text-xs font-bold flex items-center justify-center gap-1.5 border border-red-500/20"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR (Hidden on Mobile) */}
      <aside className="hidden md:flex w-64 bg-[#110e22] border-r border-[#221c3d] flex-col justify-between shrink-0 p-4 min-h-screen sticky top-0">
        <div>
          {/* Logo & Brand Header */}
          <div className="flex items-center justify-between gap-2 px-2 py-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/25">
                <CheckCircle2 className="w-6 h-6 text-white stroke-[2.5]" />
              </div>
              <div>
                <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                  REMINDTASK
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400">
                  OWNER PANEL
                </span>
              </div>
            </div>
            <ThemeToggle />
          </div>

          {/* User Profile Card */}
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#191433] border border-[#2b224d] mb-5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Crown className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-white truncate">
                {currentUser?.name || 'OWNER REMINDTASK'}
              </h4>
              <p className="text-[10px] text-pink-400 font-mono truncate">
                Owner Administrator
              </p>
            </div>
          </div>

          {/* MAIN MENU ORGANIZED INTO CATEGORIES & SUB-MENUS */}
          <div className="space-y-4">
            {ownerMenuGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 block">
                  {group.title}
                </span>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as typeof activeTab)}
                        className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          isActive
                            ? item.id === 'supabase'
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-sm'
                              : 'bg-pink-500/10 border-pink-500/30 text-pink-300 shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-[#161131] border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 transition-colors ${
                            isActive 
                              ? item.id === 'supabase' ? 'text-emerald-300' : 'text-pink-300'
                              : item.iconColor || 'text-slate-400'
                          }`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && item.badge > 0 ? (
                          <span className="w-5 h-5 rounded-full bg-pink-500 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                            {item.badge}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Footer: Logout */}
        <div className="pt-4 border-t border-[#221c3d] space-y-2">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1b1533] hover:bg-[#271f48] text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 md:overflow-y-auto">
        {/* Top Header Bar */}
        <header className="px-6 py-4 border-b border-[#201a3b] bg-[#110e22]/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400 block">
              WEBSITE MANAGEMENT
            </span>
            <div className="flex items-baseline gap-3">
              <h2 className="text-2xl font-black text-white tracking-tight capitalize">
                {activeTab === 'supabase'
                  ? 'Server Supabase PostgreSQL'
                  : activeTab === 'aktivitas'
                  ? 'Log Aktivitas Sistem'
                  : activeTab === 'absensi'
                  ? 'Rekap Absensi Seluruh Kelas (Owner View)'
                  : activeTab === 'bank_soal'
                  ? 'Bank Soal & Ujian Seluruh Kelas'
                  : activeTab === 'saran'
                  ? 'Kritik & Saran Anggota'
                  : activeTab}
              </h2>
              <span className="text-xs text-slate-400 hidden sm:inline">
                Control center untuk mengelola seluruh ekosistem RemindTask.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <RealTimeClock />
            <button
              onClick={() => setIsNotificationDrawerOpen(true)}
              className="relative p-2 rounded-xl bg-[#1a1433] hover:bg-[#251e47] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Notifikasi"
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-500 text-white font-mono text-[9px] font-bold flex items-center justify-center">
                  {unreadNotifCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setIsBroadcastModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-pink-500/20"
              title="Kirim Broadcast Siaran Global atau Khusus Admin"
            >
              <Megaphone className="w-3.5 h-3.5 text-white" />
              <span>Broadcast</span>
            </button>
            <button
              onClick={handleSync}
              className="px-3.5 py-2 rounded-xl bg-[#221a42] hover:bg-[#2f245c] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-pink-400" />
              <span>Sinkronkan</span>
            </button>
          </div>
        </header>

        {/* SECONDARY SUB-MENU BAR (Desktop & Tablet Quick Navigation) */}
        <div className="bg-[#110e25]/90 border-b border-[#231b42] backdrop-blur-md px-6 py-2 sticky top-[73px] z-10 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none shadow-xs">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            {ownerMenuGroups.map((group, idx) => (
              <div key={idx} className="flex items-center gap-1.5 shrink-0 pr-3 border-r border-[#261d47] last:border-r-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden xl:inline">
                  {group.title}:
                </span>
                <div className="flex items-center gap-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                          isActive
                            ? 'bg-gradient-to-r from-pink-500/20 to-purple-600/20 border border-pink-500/40 text-pink-300 font-black shadow-xs'
                            : 'text-slate-400 hover:text-white hover:bg-[#1c153a] border border-transparent'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-pink-400' : item.iconColor || 'text-slate-400'}`} />
                        <span>{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="w-4 h-4 rounded-full bg-pink-500 text-white font-mono text-[9px] font-bold flex items-center justify-center">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* View Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Owner Control Center Hero Card */}
              <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-gradient-to-r dark:from-[#20153f] dark:via-[#1a1233] dark:to-[#120f26] border border-slate-200 dark:border-[#34275a] p-8 shadow-sm">
                <div className="absolute right-0 top-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                      Owner Control Center
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-xl font-medium">
                      Selamat datang, {currentUser?.name || 'Owner'}. Kelola seluruh server, user admin, dan tugas kelas secara realtime.
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
                    <button
                      onClick={handleSync}
                      className="px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-pink-500/25 transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4 stroke-[2.5]" />
                      <span>Sinkronkan Data Server</span>
                    </button>
                    <button
                      onClick={() => setIsAccessSqlModalOpen(true)}
                      className="px-4 py-3 rounded-2xl bg-[#1d163a] hover:bg-[#281e4f] text-amber-300 hover:text-white font-bold text-xs flex items-center gap-2 border border-amber-500/40 transition-all cursor-pointer shadow-sm"
                      title="Lihat query SQL untuk memastikan replikasi realtime class_access_logs aktif"
                    >
                      <Database className="w-4 h-4 text-amber-400" />
                      <span>Query SQL Realtime Akses</span>
                    </button>
                    <button
                      onClick={handlePurgeOrphans}
                      className="px-4 py-3 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white font-bold text-xs flex items-center gap-2 border border-rose-500/30 transition-all cursor-pointer shadow-sm"
                      title="Hapus otomatis seluruh kelas di Supabase yang sudah tidak memiliki admin aktif"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                      <span>Bersihkan Kelas Sampah</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 6 KPI Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* 1. Total Akses & Login Keseluruhan (Murni Realtime Database) */}
                <div 
                  onClick={() => setActiveTab('users')}
                  className="p-5 rounded-3xl bg-[#141126] border border-[#272144] hover:border-pink-500/50 transition-all cursor-pointer group"
                  title="Klik untuk melihat rincian tracking akses semua user secara realtime dari database"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                      <LogIn className="w-5 h-5" />
                    </div>
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-bold border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live DB
                    </span>
                  </div>
                  <span className="text-3xl font-extrabold text-white font-mono tabular-nums block">
                    {totalOverallLogins}
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-400">Total Akses / Login</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      +{totalAccessesToday} hari ini
                    </span>
                  </div>
                </div>

                {/* 2. Total Semua User (Request 4) */}
                <div 
                  onClick={() => setActiveTab('users')}
                  className="p-5 rounded-3xl bg-[#141126] border border-[#272144] hover:border-pink-500/50 transition-all cursor-pointer group"
                  title="Klik untuk melihat data tracking seluruh user"
                >
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white mb-3 shadow-md shadow-pink-500/20 group-hover:scale-105 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-3xl font-extrabold text-white font-mono tabular-nums block">
                    {allTrackedUsers.length}
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-400">Total User</span>
                    <span className="text-[10px] text-pink-400 font-mono font-bold">
                      {allTrackedUsers.filter((u) => u.role === 'member').length} Siswa
                    </span>
                  </div>
                </div>

                {/* 3. Total Admin */}
                <div className="p-5 rounded-3xl bg-[#141126] border border-[#272144] hover:border-[#3d3266] transition-all">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-rose-600 flex items-center justify-center text-white mb-3 shadow-md shadow-purple-500/20">
                    <Shield className="w-5 h-5" />
                  </div>
                  <span className="text-3xl font-extrabold text-white font-mono tabular-nums block">
                    {adminUsers.length}
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">Total Admin</span>
                </div>

                {/* 4. Total Kelas */}
                <div className="p-5 rounded-3xl bg-[#141126] border border-[#272144] hover:border-[#3d3266] transition-all">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center text-white mb-3 shadow-md shadow-pink-500/20">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="text-3xl font-extrabold text-white font-mono tabular-nums block">
                    {classes.length}
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">Total Kelas</span>
                </div>

                {/* 5. Total Tugas */}
                <div className="p-5 rounded-3xl bg-[#141126] border border-[#272144] hover:border-[#3d3266] transition-all">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-fuchsia-600 flex items-center justify-center text-white mb-3 shadow-md shadow-pink-500/20">
                    <ListTodo className="w-5 h-5" />
                  </div>
                  <span className="text-3xl font-extrabold text-white font-mono tabular-nums block">
                    {tasks.length}
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">Total Tugas</span>
                </div>

                {/* 6. Status Server Supabase */}
                <div className="p-5 rounded-3xl bg-[#141126] border border-[#272144] hover:border-[#3d3266] transition-all">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white mb-3 shadow-md shadow-emerald-500/20">
                    <Server className="w-5 h-5" />
                  </div>
                  <span className="text-3xl font-extrabold text-emerald-400 tracking-wider block font-mono">
                    ONLINE
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">Supabase Realtime</span>
                </div>
              </div>

              {/* Quick Maintenance & AI Controls Banner */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-[#17112d] via-[#1c1438] to-[#141026] border border-amber-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                    systemSettings?.isMaintenance
                      ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400 animate-pulse'
                      : 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                  }`}>
                    <Wrench className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-white">
                        Status Pemeliharaan Sistem (Maintenance)
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        systemSettings?.isMaintenance
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse'
                          : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      }`}>
                        {systemSettings?.isMaintenance ? '🔴 Maintenance Aktif' : '🟢 Website Normal (Online)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      {systemSettings?.isMaintenance
                        ? 'Website sedang ditutup dengan tampilan layar maintenance untuk seluruh siswa/member.'
                        : 'Seluruh siswa & admin dapat mengakses platform RemindTask secara normal.'}
                      {' • '}
                      <span className="font-semibold text-purple-300">
                        Status AI: {systemSettings?.isAiMaintenance ? '🟡 Mode Pengembangan' : '🟢 Fitur AI Aktif'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    onClick={async () => {
                      await updateSystemSettings({ isMaintenance: !systemSettings?.isMaintenance });
                    }}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                      systemSettings?.isMaintenance
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>{systemSettings?.isMaintenance ? 'Buka Website (Matikan Maintenance)' : 'Tutup Website (Aktifkan Maintenance)'}</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('maintenance')}
                    className="px-4 py-2.5 rounded-xl bg-[#261c47] hover:bg-[#34275e] text-pink-300 font-bold text-xs flex items-center gap-1.5 transition-colors border border-pink-500/20 cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Atur Detail & AI</span>
                  </button>
                </div>
              </div>

              {/* KATEGORI & SUB-MENU OWNER (Navigasi Terstruktur seperti Member & Admin) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-pink-400" />
                      <span>Kategori &amp; Sub-Menu Owner</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Pusat navigasi terstruktur untuk mengakses seluruh modul akademik, komunikasi, server, dan pengaturan.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Kategori 1: Akademik & Kelas */}
                  <div className="p-5 rounded-3xl bg-gradient-to-br from-[#1d143c] via-[#161033] to-[#100d24] border border-purple-500/35 hover:border-pink-500/60 transition-all shadow-lg flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                          8 Modul
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-white">Akademik &amp; Kelas</h4>
                      <p className="text-[11px] text-slate-400 mt-1 mb-3">
                        Kelola data guru admin, ruang kelas siswa, distribusi tugas, absensi, dan bank soal.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-purple-500/20">
                      <button
                        onClick={() => setActiveTab('admins')}
                        className="px-2 py-1.5 rounded-xl bg-[#140e2b] hover:bg-purple-600/30 text-purple-200 text-[10px] font-bold text-left transition-colors cursor-pointer truncate"
                      >
                        🛡️ User Admin
                      </button>
                      <button
                        onClick={() => setActiveTab('kelas')}
                        className="px-2 py-1.5 rounded-xl bg-[#140e2b] hover:bg-purple-600/30 text-purple-200 text-[10px] font-bold text-left transition-colors cursor-pointer truncate"
                      >
                        🏫 Ruang Kelas
                      </button>
                      <button
                        onClick={() => setActiveTab('tugas')}
                        className="px-2 py-1.5 rounded-xl bg-[#140e2b] hover:bg-purple-600/30 text-purple-200 text-[10px] font-bold text-left transition-colors cursor-pointer truncate"
                      >
                        📝 Semua Tugas
                      </button>
                      <button
                        onClick={() => setActiveTab('absensi')}
                        className="px-2 py-1.5 rounded-xl bg-[#140e2b] hover:bg-purple-600/30 text-purple-200 text-[10px] font-bold text-left transition-colors cursor-pointer truncate"
                      >
                        📋 Absensi
                      </button>
                      <button
                        onClick={() => setActiveTab('bank_soal')}
                        className="px-2 py-1.5 rounded-xl bg-[#140e2b] hover:bg-purple-600/30 text-purple-200 text-[10px] font-bold text-left transition-colors cursor-pointer truncate"
                      >
                        💡 Bank Soal
                      </button>
                      <button
                        onClick={() => setActiveTab('statistik')}
                        className="px-2 py-1.5 rounded-xl bg-[#140e2b] hover:bg-purple-600/30 text-purple-200 text-[10px] font-bold text-left transition-colors cursor-pointer truncate"
                      >
                        📊 Statistik
                      </button>
                    </div>
                  </div>

                  {/* Kategori 2: Komunikasi & Forum */}
                  <div className="p-5 rounded-3xl bg-gradient-to-br from-[#251336] via-[#1c0f2b] to-[#120b1e] border border-pink-500/35 hover:border-pink-400/60 transition-all shadow-lg flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white flex items-center justify-center shadow-md">
                          <Globe className="w-5 h-5" />
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[10px] font-bold border border-pink-500/30">
                          4 Modul
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-white">Komunikasi &amp; Forum</h4>
                      <p className="text-[11px] text-slate-400 mt-1 mb-3">
                        Interaksi sosial siswa, forum jasa, pesan anonim, live chat, dan saran.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-pink-500/20">
                      <button
                        onClick={() => setActiveTab('forum')}
                        className="px-2 py-1.5 rounded-xl bg-[#1a0f26] hover:bg-pink-600/30 text-pink-200 text-[10px] font-bold text-left transition-colors cursor-pointer truncate"
                      >
                        🌐 Forum &amp; Jasa
                      </button>
                      <button
                        onClick={() => setActiveTab('anonwall')}
                        className="px-2 py-1.5 rounded-xl bg-[#1a0f26] hover:bg-pink-600/30 text-pink-200 text-[10px] font-bold text-left transition-colors cursor-pointer truncate"
                      >
                        💬 Pesan Anonim
                      </button>
                      <button
                        onClick={() => setActiveTab('chat')}
                        className="px-2 py-1.5 rounded-xl bg-[#1a0f26] hover:bg-pink-600/30 text-pink-200 text-[10px] font-bold text-left transition-colors cursor-pointer truncate"
                      >
                        ✉️ Chat Masuk
                      </button>
                      <button
                        onClick={() => setActiveTab('saran')}
                        className="px-2 py-1.5 rounded-xl bg-[#1a0f26] hover:bg-pink-600/30 text-pink-200 text-[10px] font-bold text-left transition-colors cursor-pointer truncate"
                      >
                        📢 Kritik Saran
                      </button>
                    </div>
                  </div>

                  {/* Kategori 3: Sistem & Server */}
                  <div className="p-5 rounded-3xl bg-gradient-to-br from-[#102422] via-[#0d1c1a] to-[#081211] border border-emerald-500/35 hover:border-emerald-400/60 transition-all shadow-lg flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
                          <Server className="w-5 h-5" />
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                          Infrastruktur
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-white">Sistem &amp; Server</h4>
                      <p className="text-[11px] text-slate-400 mt-1 mb-3">
                        Koneksi database Supabase, audit log aktivitas sistem, dan mode pemeliharaan.
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-emerald-500/20">
                      <button
                        onClick={() => setActiveTab('aktivitas')}
                        className="w-full px-2 py-1.5 rounded-xl bg-[#0a1816] hover:bg-emerald-600/30 text-emerald-200 text-[10px] font-bold text-left transition-colors cursor-pointer truncate"
                      >
                        📜 Log Aktivitas Sistem
                      </button>
                      <button
                        onClick={() => setActiveTab('supabase')}
                        className="w-full px-2 py-1.5 rounded-xl bg-[#0a1816] hover:bg-emerald-600/30 text-emerald-200 text-[10px] font-bold text-left transition-colors cursor-pointer truncate"
                      >
                        ⚡ Server Supabase PostgreSQL
                      </button>
                      <button
                        onClick={() => setActiveTab('maintenance')}
                        className="w-full px-2 py-1.5 rounded-xl bg-[#0a1816] hover:bg-emerald-600/30 text-emerald-200 text-[10px] font-bold text-left transition-colors cursor-pointer truncate"
                      >
                        🔧 Kontrol Mode Maintenance
                      </button>
                    </div>
                  </div>

                  {/* Kategori 4: Pengaturan & Profil */}
                  <div className="p-5 rounded-3xl bg-gradient-to-br from-[#291e12] via-[#1f170e] to-[#140e09] border border-amber-500/35 hover:border-amber-400/60 transition-all shadow-lg flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-slate-950 flex items-center justify-center shadow-md">
                          <Sliders className="w-5 h-5" />
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                          Konfigurasi
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-white">Pengaturan &amp; Akun</h4>
                      <p className="text-[11px] text-slate-400 mt-1 mb-3">
                        Kelola kredensial Owner, nama tampilan, dan keamanan sistem.
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-amber-500/20">
                      <button
                        onClick={() => setActiveTab('settings')}
                        className="w-full px-2 py-1.5 rounded-xl bg-[#1c130b] hover:bg-amber-600/30 text-amber-200 text-[10px] font-bold text-left transition-colors cursor-pointer truncate"
                      >
                        ⚙️ Pengaturan Profil Owner
                      </button>
                      <button
                        onClick={() => setIsBroadcastModalOpen(true)}
                        className="w-full px-2 py-1.5 rounded-xl bg-[#1c130b] hover:bg-amber-600/30 text-amber-200 text-[10px] font-bold text-left transition-colors cursor-pointer truncate"
                      >
                        📢 Kirim Broadcast Pengumuman
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions & Recent Platform Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* All Classes Summary */}
                <div className="p-6 rounded-3xl bg-[#141126] border border-[#272144]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-white text-base">Daftar Kelas Aktif</h3>
                    <button
                      onClick={() => setActiveTab('kelas')}
                      className="text-xs text-pink-400 hover:text-pink-300 font-semibold cursor-pointer"
                    >
                      Lihat Semua →
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {classes.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-xs">
                        Belum ada kelas yang terdaftar. Klik "Tambah Admin & Kelas" di samping.
                      </div>
                    ) : (
                      classes.slice(0, 4).map((c) => (
                        <div key={c.id} className="p-3 rounded-2xl bg-[#191433] border border-[#2c2350] flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs">{c.name}</span>
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 font-bold">
                                {c.code}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 mt-0.5 block">
                              Admin: {c.adminName} • Total Anggota: {c.memberCount || 0} Siswa
                            </span>
                          </div>
                          <span className="text-xs font-mono text-purple-300 font-bold">
                            {tasks.filter((t) => t.classId === c.id).length} Tugas
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Platform Overview */}
                <div className="p-6 rounded-3xl bg-[#141126] border border-[#272144] flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-white text-base mb-2">Aksi Pengelolaan Cepat</h3>
                    <p className="text-xs text-slate-400 mb-4">
                      Tindakan administratif global sistem RemindTask
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={handleOpenAddAdminModal}
                        className="p-3.5 rounded-2xl bg-[#1b1536] hover:bg-[#251e4b] border border-[#2d2352] text-left transition-colors cursor-pointer"
                      >
                        <Building2 className="w-5 h-5 text-pink-400 mb-2" />
                        <h4 className="text-xs font-bold text-white">Tambah Admin & Kelas</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Generate kode unik & tunjuk admin</p>
                      </button>
                      <button
                        onClick={() => {
                          setEditingTask(null);
                          setIsTaskModalOpen(true);
                        }}
                        className="p-3.5 rounded-2xl bg-[#1b1536] hover:bg-[#251e4b] border border-[#2d2352] text-left transition-colors cursor-pointer"
                      >
                        <Plus className="w-5 h-5 text-purple-400 mb-2" />
                        <h4 className="text-xs font-bold text-white">Buat Tugas Global</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Tugaskan ke salah satu kelas</p>
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 p-3.5 rounded-2xl bg-[#191433] border border-[#2b224d]">
                    <span className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Hak Akses Penuh Owner
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Sebagai Owner, Anda berhak mereset password admin, mengedit nama & kelas, memoderasi semua konten tugas, serta mengekspor seluruh data.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER ADMIN (DENGAN FITUR EDIT & RESET PASSWORD) */}
          {activeTab === 'admins' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141126] border border-[#272144] p-5 rounded-3xl">
                <div>
                  <h3 className="text-lg font-bold text-white">Manajemen Akun Admin</h3>
                  <p className="text-xs text-slate-400">
                    Atur hak akses admin, reset password, dan pantau status akun secara realtime
                  </p>
                </div>
                <button
                  onClick={handleOpenAddAdminModal}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-pink-500/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Admin & Kelas</span>
                </button>
              </div>

              <div className="bg-[#141126] border border-[#272144] rounded-3xl p-6 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#261f44] text-slate-400">
                      <th className="pb-3 font-semibold">Nama Admin</th>
                      <th className="pb-3 font-semibold">Username Admin</th>
                      <th className="pb-3 font-semibold">Password</th>
                      <th className="pb-3 font-semibold">Kelas & Kode</th>
                      <th className="pb-3 font-semibold">Status Akun</th>
                      <th className="pb-3 font-semibold text-right">Aksi Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#201938]">
                    {adminUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                          Belum ada user admin terdaftar. Klik tombol "+ Tambah Admin & Kelas" di atas untuk menambahkan.
                        </td>
                      </tr>
                    ) : (
                      adminUsers.map((admin) => {
                        const adminClass = classes.find((c) => c.adminId === admin.id || c.id === admin.classId);
                        const isPwdVisible = !!showPasswordMap[admin.id];
                        const pwd = admin.password || 'password123';
                        return (
                          <tr key={admin.id} className="hover:bg-[#1a1436] transition-colors">
                            <td className="py-3.5 flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center shrink-0">
                                {admin.name.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-white block">{admin.name}</span>
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                                    {getTerminology(admin.educatorType || adminClass?.educatorType).educatorTitle}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-500">ID: {admin.id}</span>
                              </div>
                            </td>
                            <td className="py-3.5 font-mono text-slate-300">
                              <span className="text-pink-400 font-semibold block">@{admin.username || (admin.email ? admin.email.split('@')[0] : admin.name.toLowerCase().replace(/\s+/g, ''))}</span>
                            </td>
                            <td className="py-3.5">
                              <div className="flex items-center gap-1.5 font-mono text-slate-300">
                                <span>{isPwdVisible ? pwd : '••••••••'}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowPasswordMap((prev) => ({
                                      ...prev,
                                      [admin.id]: !prev[admin.id],
                                    }))
                                  }
                                  className="text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                                  title={isPwdVisible ? 'Sembunyikan password' : 'Lihat password'}
                                >
                                  {isPwdVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                            <td className="py-3.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-pink-300 truncate max-w-[120px]">
                                  {admin.className || adminClass?.name || 'Kelas Terkait'}
                                </span>
                                {adminClass && (
                                  <span className="px-1.5 py-0.5 rounded bg-pink-500/15 text-pink-400 font-mono text-[10px] font-bold border border-pink-500/30">
                                    {adminClass.code}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5">
                              {admin.status === 'active' ? (
                                <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-bold font-mono text-[10px] border border-emerald-500/30">
                                  AKTIF
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 font-bold font-mono text-[10px] border border-red-500/30">
                                  DITANGGUHKAN
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 text-right space-x-1.5">
                              {/* Edit & Reset Password Button */}
                              <button
                                onClick={() => handleOpenEditAdminModal(admin)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border border-purple-500/30 transition-colors cursor-pointer inline-flex items-center gap-1"
                                title="Edit profil & reset password admin"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Edit / Reset</span>
                              </button>
                              <button
                                onClick={() => toggleUserStatus(admin.id)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1 ${
                                  admin.status === 'active'
                                    ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30'
                                    : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30'
                                }`}
                                title={admin.status === 'active' ? 'Tangguhkan akun admin' : 'Aktifkan akun admin'}
                              >
                                {admin.status === 'active' ? (
                                  <>
                                    <UserX className="w-3.5 h-3.5" />
                                    <span>Suspend</span>
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-3.5 h-3.5" />
                                    <span>Aktifkan</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => setAdminToDelete(admin)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 transition-colors cursor-pointer inline-flex items-center gap-1"
                                title="Hapus akun admin"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: TRACKING SEMUA USER (REQUEST 4 & 5) */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Header Box */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141126] border border-[#272144] p-5 sm:p-6 rounded-3xl">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="p-1.5 rounded-xl bg-pink-500/20 text-pink-400">
                      <Users className="w-5 h-5" />
                    </span>
                    <h3 className="text-xl font-bold text-white">Tracking User</h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    Lacak identitas seluruh user, asal kelas, admin pembimbing terkait, serta kontrol status akun (aktif / suspend)
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleExportUsersCSV}
                    className="px-3.5 py-2 rounded-xl bg-[#1d1736] hover:bg-[#28204b] border border-[#312558] text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Unduh file spreadsheet CSV data semua user"
                  >
                    <FileText className="w-4 h-4 text-pink-400" />
                    <span>Ekspor CSV</span>
                  </button>
                  <button
                    onClick={handleOpenAddAdminModal}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-pink-500/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Akun Baru</span>
                  </button>
                </div>
              </div>

              {/* 4 Summary Stat Mini-Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-[#141126] border border-[#272144]">
                  <span className="text-xs text-slate-400 block mb-1">Total Semua User</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-white font-mono">{allTrackedUsers.length}</span>
                    <span className="text-[10px] font-mono text-purple-400 font-bold">100% Terdaftar</span>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#141126] border border-[#272144]">
                  <span className="text-xs text-slate-400 block mb-1">Siswa / Member</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-pink-400 font-mono">
                      {allTrackedUsers.filter((u) => u.role === 'member').length}
                    </span>
                    <span className="text-[10px] font-mono text-pink-300 font-bold">Siswa Aktif</span>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#141126] border border-[#272144]">
                  <span className="text-xs text-slate-400 block mb-1">Guru & Admin Kelas</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-purple-300 font-mono">
                      {allTrackedUsers.filter((u) => u.role === 'admin').length}
                    </span>
                    <span className="text-[10px] font-mono text-purple-400 font-bold">Pengelola</span>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#141126] border border-[#272144]">
                  <span className="text-xs text-slate-400 block mb-1">Akun Ditangguhkan</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-red-400 font-mono">
                      {allTrackedUsers.filter((u) => (u.status || 'active') === 'suspended').length}
                    </span>
                    <span className="text-[10px] font-mono text-red-300 font-bold">Suspended</span>
                  </div>
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div className="bg-[#141126] border border-[#272144] p-4 rounded-3xl flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Cari nama siswa/admin, username, email, nama kelas, atau nama pembimbing..."
                    className="w-full bg-[#1b1533] border border-[#2b214d] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-pink-500 transition-colors"
                  />
                  {userSearchQuery && (
                    <button
                      onClick={() => setUserSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Role Filter */}
                  <select
                    value={userRoleFilter}
                    onChange={(e: any) => setUserRoleFilter(e.target.value)}
                    className="bg-[#1b1533] border border-[#2b214d] rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-pink-500 cursor-pointer"
                  >
                    <option value="all">Semua Peran (Role)</option>
                    <option value="member">Siswa / Member</option>
                    <option value="admin">Admin / Guru</option>
                    <option value="owner">Owner Platform</option>
                  </select>

                  {/* Class Filter */}
                  <select
                    value={userClassFilter}
                    onChange={(e) => setUserClassFilter(e.target.value)}
                    className="bg-[#1b1533] border border-[#2b214d] rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-pink-500 cursor-pointer max-w-[180px] truncate"
                  >
                    <option value="all">Semua Kelas</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.code})
                      </option>
                    ))}
                  </select>

                  {/* Status Filter */}
                  <select
                    value={userStatusFilter}
                    onChange={(e: any) => setUserStatusFilter(e.target.value)}
                    className="bg-[#1b1533] border border-[#2b214d] rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-pink-500 cursor-pointer"
                  >
                    <option value="all">Semua Status</option>
                    <option value="active">Aktif</option>
                    <option value="suspended">Ditangguhkan</option>
                  </select>

                  {(userSearchQuery || userRoleFilter !== 'all' || userClassFilter !== 'all' || userStatusFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setUserSearchQuery('');
                        setUserRoleFilter('all');
                        setUserClassFilter('all');
                        setUserStatusFilter('all');
                      }}
                      className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold transition-colors"
                      title="Reset filter"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Tracking Table */}
              <div className="bg-[#141126] border border-[#272144] rounded-3xl p-5 overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#261f44] text-slate-400">
                      <th className="pb-3 font-semibold">Identitas Pengguna</th>
                      <th className="pb-3 font-semibold">Peran (Role)</th>
                      <th className="pb-3 font-semibold">Asal Kelas &amp; Kode</th>
                      <th className="pb-3 font-semibold">Admin / Pembimbing</th>
                      <th className="pb-3 font-semibold">Akses / Sesi</th>
                      <th className="pb-3 font-semibold">Status Akun</th>
                      <th className="pb-3 font-semibold text-right">Aksi Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#201938]">
                    {filteredTrackedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-slate-500 text-xs">
                          Tidak ditemukan pengguna dengan filter pencarian tersebut.
                        </td>
                      </tr>
                    ) : (
                      filteredTrackedUsers.map((u) => {
                        const userClass = classes.find(
                          (c) => c.adminId === u.id || c.id === u.classId
                        );
                        const classAdmin =
                          u.role === 'member'
                            ? users.find(
                                (adm) =>
                                  adm.role === 'admin' &&
                                  (adm.classId === u.classId ||
                                    classes.some(
                                      (c) => c.id === u.classId && c.adminId === adm.id
                                    ))
                              )
                            : null;

                        const isSuspended = u.status === 'suspended';
                        const accessCount = classAccessLogs.filter(
                          (l) => l.studentId === u.id
                        ).length;

                        return (
                          <tr key={u.id} className="hover:bg-[#1a1436] transition-colors">
                            {/* 1. Identitas Pengguna */}
                            <td className="py-3.5 pr-3">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                    u.role === 'owner'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : u.role === 'admin'
                                      ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                                      : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  }`}
                                >
                                  {u.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-white block truncate max-w-[150px]">
                                      {u.name}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-400 font-mono block truncate max-w-[160px]">
                                    {u.username ? `@${u.username}` : u.email || 'Tanpa Email'}
                                  </span>
                                  <span className="text-[9px] text-slate-500 font-mono">
                                    ID: {u.id}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* 2. Peran / Role */}
                            <td className="py-3.5 pr-3">
                              {u.role === 'owner' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold text-[10px]">
                                  <Crown className="w-3 h-3 text-amber-400" />
                                  <span>Owner Platform</span>
                                </span>
                              ) : u.role === 'admin' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-pink-500/15 text-pink-300 border border-pink-500/30 font-bold text-[10px]">
                                  <Shield className="w-3 h-3 text-pink-400" />
                                  <span>
                                    {getTerminology(u.educatorType || userClass?.educatorType).educatorTitle}
                                  </span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold text-[10px]">
                                  <UserIcon className="w-3 h-3 text-purple-400" />
                                  <span>Siswa / Member</span>
                                </span>
                              )}
                            </td>

                            {/* 3. Asal Kelas & Kode */}
                            <td className="py-3.5 pr-3">
                              {u.role === 'owner' ? (
                                <span className="text-slate-500 italic text-[11px]">Semua Kelas (Global)</span>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="font-semibold text-slate-200 block truncate max-w-[140px]">
                                    {u.className || userClass?.name || 'Belum Terdaftar Kelas'}
                                  </span>
                                  {userClass?.code && (
                                    <span className="px-1.5 py-0.5 rounded bg-pink-500/15 text-pink-400 font-mono text-[9px] font-bold border border-pink-500/30 inline-block">
                                      Kode: {userClass.code}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* 4. Admin / Pembimbing Terkait */}
                            <td className="py-3.5 pr-3">
                              {u.role === 'owner' ? (
                                <span className="text-slate-400 text-[11px]">-</span>
                              ) : u.role === 'admin' ? (
                                <span className="text-pink-300 font-semibold text-[11px] flex items-center gap-1">
                                  <Shield className="w-3 h-3 text-pink-400" />
                                  <span>Penanggung Jawab</span>
                                </span>
                              ) : classAdmin ? (
                                <div className="space-y-0.5">
                                  <span className="font-bold text-white block truncate max-w-[130px]">
                                    {classAdmin.name}
                                  </span>
                                  <span className="text-[10px] text-pink-400 font-mono block">
                                    @{classAdmin.username || classAdmin.name.toLowerCase().replace(/\s+/g, '')}
                                  </span>
                                </div>
                              ) : userClass?.adminName ? (
                                <span className="text-slate-300 font-medium text-[11px]">
                                  {userClass.adminName}
                                </span>
                              ) : (
                                <span className="text-slate-500 italic text-[11px]">Tidak Diketahui</span>
                              )}
                            </td>

                            {/* 5. Akses / Sesi */}
                            <td className="py-3.5 pr-3">
                              <div className="space-y-0.5">
                                <span className="font-mono text-slate-300 text-[11px] block">
                                  {accessCount > 0 ? `${accessCount}x Akses` : 'Akses Tersimpan'}
                                </span>
                                <span className="text-[9px] text-slate-500 block">
                                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : 'Aktif'}
                                </span>
                              </div>
                            </td>

                            {/* 6. Status Akun */}
                            <td className="py-3.5 pr-3">
                              {isSuspended ? (
                                <span className="px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 font-bold font-mono text-[10px] border border-red-500/30 inline-flex items-center gap-1">
                                  <UserX className="w-3 h-3" />
                                  <span>DITANGGUHKAN</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-bold font-mono text-[10px] border border-emerald-500/30 inline-flex items-center gap-1">
                                  <UserCheck className="w-3 h-3" />
                                  <span>AKTIF</span>
                                </span>
                              )}
                            </td>

                            {/* 7. Aksi Owner */}
                            <td className="py-3.5 text-right space-x-1.5 whitespace-nowrap">
                              {u.role !== 'owner' && (
                                <>
                                  <button
                                    onClick={() => handleOpenEditUserModal(u)}
                                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border border-purple-500/30 transition-colors cursor-pointer inline-flex items-center gap-1"
                                    title="Edit data pengguna"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    onClick={() => toggleUserStatus(u.id)}
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1 ${
                                      isSuspended
                                        ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30'
                                        : 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30'
                                    }`}
                                    title={isSuspended ? 'Aktifkan akun pengguna ini' : 'Tangguhkan akun pengguna ini'}
                                  >
                                    {isSuspended ? (
                                      <>
                                        <UserCheck className="w-3.5 h-3.5" />
                                        <span>Aktifkan</span>
                                      </>
                                    ) : (
                                      <>
                                        <UserX className="w-3.5 h-3.5" />
                                        <span>Suspend</span>
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => setUserToDelete(u)}
                                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 transition-colors cursor-pointer inline-flex items-center gap-1"
                                    title="Hapus pengguna ini"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Hapus</span>
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: KELAS (TERINTEGRASI CASCASE KE ADMIN & STATISTIK) */}
          {activeTab === 'kelas' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141126] border border-[#272144] p-5 rounded-3xl">
                <div>
                  <h3 className="text-lg font-bold text-white">Semua Kelas RemindTask</h3>
                  <p className="text-xs text-slate-400">
                    Daftar seluruh ruang kelas terdaftar, kode akses, dan sinkronisasi anggota
                  </p>
                </div>
                <div className="px-3.5 py-1.5 rounded-xl bg-[#1b1533] border border-[#2d2550] text-xs font-mono font-bold text-pink-300">
                  Total {classes.length} Kelas
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.length === 0 ? (
                  <div className="col-span-full py-16 text-center text-slate-500 text-xs">
                    Belum ada kelas yang terdaftar. Kelas akan muncul di sini secara otomatis saat akun admin baru dibuat.
                  </div>
                ) : (
                  classes.map((cls) => {
                    const classTasksCount = tasks.filter((t) => t.classId === cls.id).length;
                    return (
                      <div key={cls.id} className="p-5 rounded-3xl bg-white dark:bg-[#141126] border border-slate-200 dark:border-[#272144] hover:border-pink-300 dark:hover:border-[#3c3166] transition-all flex flex-col justify-between shadow-xs">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400">
                              KODE KELAS
                            </span>
                            <span className="text-xs font-mono font-black text-pink-700 dark:text-pink-300 px-2 py-0.5 rounded-lg bg-pink-50 dark:bg-[#271d44] border border-pink-200 dark:border-[#3f2e6e]">
                              {cls.code}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-slate-900 dark:text-white">{cls.name}</h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                            {cls.description || 'Tidak ada deskripsi'}
                          </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#231d3d] flex items-center justify-between text-xs">
                          <span className="text-slate-600 dark:text-slate-400">
                            Admin: <strong className="text-slate-900 dark:text-white">{cls.adminName}</strong>
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-purple-700 dark:text-purple-300 font-mono font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800/40 text-[11px]">
                              {classTasksCount} Tugas
                            </span>
                            <button
                              type="button"
                              onClick={() => setClassToDelete(cls)}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all cursor-pointer active:scale-95"
                              title={`Hapus Kelas ${cls.name}`}
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
            </div>
          )}

          {/* TAB 4: SEMUA TUGAS */}
          {activeTab === 'tugas' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141126] border border-[#272144] p-5 rounded-3xl">
                <div>
                  <h3 className="text-lg font-bold text-white">Semua Tugas di Seluruh Kelas</h3>
                  <p className="text-xs text-slate-400">
                    Pantau, edit, atau hapus tugas dari setiap ruang kelas
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari tugas..."
                      className="bg-[#1b1633] border border-[#2d2550] rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-pink-500 w-44 sm:w-56"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setEditingTask(null);
                      setIsTaskModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-pink-500/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Buat Tugas</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTasks.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-slate-500 text-xs">
                    Belum ada tugas yang dibuat.
                  </div>
                ) : (
                  filteredTasks.map((t) => {
                    const targetClass = classes.find((c) => c.id === t.classId);
                    const deadlineStatus = getTaskDeadlineStatus(t.dueDate);
                    return (
                      <div key={t.id} className="p-5 rounded-3xl bg-[#141126] border border-[#272144] flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                              {targetClass?.name || 'Kelas'} ({targetClass?.code})
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${deadlineStatus.badgeClass}`}>
                              {deadlineStatus.label}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white">{t.title}</h4>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{t.description}</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#231d40] flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-mono">
                            Tenggat: {formatIndonesianDate(t.dueDate)}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingTask(t);
                                setIsTaskModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-[#20183b] text-purple-300 hover:text-white transition-colors cursor-pointer"
                              title="Edit Tugas"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteTask(t.id)}
                              className="p-1.5 rounded-lg bg-[#20183b] text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                              title="Hapus Tugas"
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
            </div>
          )}

          {/* TAB: FORUM KELAS & GLOBAL + MARKETPLACE */}
          {activeTab === 'forum' && (
            <ForumView />
          )}

          {/* TAB: REKAP ABSENSI KELAS (INTEGRASI OWNER) */}
          {activeTab === 'absensi' && (
            <AttendanceOwnerView />
          )}

          {/* TAB: BANK SOAL & UJIAN (INTEGRASI OWNER) */}
          {activeTab === 'bank_soal' && (
            <QuestionBankOwnerView />
          )}

          {/* TAB 5: STATISTIK (TERINTEGRASI) */}
          {activeTab === 'statistik' && (
            <AnalyticsView onOpenReportModal={() => setIsReportModalOpen(true)} />
          )}

          {/* TAB 6: KALENDER PROYEK */}
          {activeTab === 'kalender' && (
            <CalendarView
              onOpenAddTaskModal={() => {
                setEditingTask(null);
                setIsTaskModalOpen(true);
              }}
            />
          )}

          {/* TAB 7: LOG AKTIVITAS (FITUR BARU) */}
          {activeTab === 'aktivitas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 rounded-3xl bg-[#141126] border border-[#272144]">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-pink-400" />
                    <span>Log Aktivitas & Audit Perubahan Sistem</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Riwayat real-time setiap penambahan admin, pembuatan tugas, perubahan password, dan sinkronisasi database
                  </p>
                </div>
                <button
                  onClick={clearActivityLogs}
                  className="px-3 py-1.5 rounded-xl bg-[#20183b] hover:bg-red-500/20 text-slate-300 hover:text-red-300 text-xs font-semibold border border-[#2e2652] transition-colors cursor-pointer"
                >
                  Bersihkan Log
                </button>
              </div>

              <div className="bg-[#141126] border border-[#272144] rounded-3xl p-6">
                <div className="max-h-[550px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                  {activityLogs.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs">
                      <History className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                      Belum ada log aktivitas sistem saat ini.
                    </div>
                  ) : (
                    activityLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-4 rounded-2xl bg-[#181330] border border-[#2c224e] flex items-start justify-between gap-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-300 flex items-center justify-center shrink-0 mt-0.5">
                            <Activity className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs">{log.action}</span>
                              <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 text-[10px] font-mono uppercase">
                                {log.category}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-1">{log.details}</p>
                            <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                              Oleh: {log.actorName} • {formatIndonesianDate(log.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: SERVER SUPABASE POSTGRESQL (FITUR BARU) */}
          {activeTab === 'supabase' && (
            <div className="space-y-6">
              {/* Server Status Header */}
              <div className="p-6 rounded-3xl bg-white dark:bg-gradient-to-r dark:from-[#172620] dark:via-[#141d28] dark:to-[#120f26] border border-emerald-200 dark:border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Server className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-slate-900 dark:text-white">Server Supabase Global</h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40 text-xs font-bold font-mono">
                        POSTGRESQL LIVE
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                      Seluruh perangkat terhubung ke server database yang sama secara realtime.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSync}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Uji & Sinkronkan Sekarang</span>
                </button>
              </div>

              {/* Database Config Form */}
              <div className="bg-[#141126] border border-[#272144] rounded-3xl p-6">
                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>Kredensial API Server Supabase</span>
                </h4>
                <form onSubmit={handleSaveDbConfig} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Project URL Supabase
                    </label>
                    <input
                      type="url"
                      value={dbUrl}
                      onChange={(e) => setDbUrl(e.target.value)}
                      placeholder="https://xyz.supabase.co"
                      required
                      className="w-full bg-[#100d20] border border-[#342e5a] rounded-xl px-4 py-2.5 text-white font-mono outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Anon Public API Key
                    </label>
                    <input
                      type="text"
                      value={dbKey}
                      onChange={(e) => setDbKey(e.target.value)}
                      placeholder="eyJhbGciOi..."
                      required
                      className="w-full bg-[#100d20] border border-[#342e5a] rounded-xl px-4 py-2.5 text-white font-mono outline-none focus:border-emerald-500 text-ellipsis"
                    />
                  </div>

                  {dbTestResult && (
                    <div
                      className={`p-3.5 rounded-2xl border text-xs ${
                        dbTestResult.success
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          : 'bg-red-500/15 border-red-500/30 text-red-300'
                      }`}
                    >
                      {dbTestResult.message}
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isTestingDb}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-500/25 cursor-pointer disabled:opacity-50"
                    >
                      <Zap className="w-4 h-4" />
                      <span>{isTestingDb ? 'Menguji...' : 'Simpan & Hubungkan Database'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* SQL Schema Script Box */}
              <div className="bg-[#141126] border border-[#272144] rounded-3xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white">Skrip SQL Tabel Lengkap</h4>
                    <p className="text-xs text-slate-400">Jalankan di Supabase SQL Editor jika ingin mereset/membuat tabel baru</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
                      setCopiedSchema(true);
                      setTimeout(() => setCopiedSchema(false), 2500);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#221a42] hover:bg-[#2e2358] text-pink-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>{copiedSchema ? '✓ Tersalin!' : 'Salin Skrip SQL'}</span>
                  </button>
                </div>
                <div className="p-4 rounded-2xl bg-[#0e0b1c] border border-[#271e44] font-mono text-[11px] text-slate-300 max-h-64 overflow-y-auto leading-relaxed select-all">
                  <pre>{SUPABASE_SQL_SCHEMA}</pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PESAN ANONIM SELURUH KELAS */}
          {activeTab === 'anonwall' && (
            <AnonymousWallOwnerView />
          )}

          {/* TAB: KRITIK & SARAN ANGGOTA */}
          {activeTab === 'saran' && (
            <FeedbackOwnerView />
          )}

          {/* TAB: CHAT MASUK */}
          {activeTab === 'chat' && (
            <OwnerChatView />
          )}

          {/* TAB: KONTROL PEMELIHARAAN (MAINTENANCE) & STATUS FITUR */}
          {activeTab === 'maintenance' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header Hero */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#20153f] via-[#1a1233] to-[#120f26] border border-[#372861] p-8 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-extrabold uppercase tracking-wider mb-3">
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Sistem Kontrol Pemeliharaan Owner</span>
                    </div>
                    <h2 className="text-3xl font-black text-white tracking-tight">
                      Kontrol Pemeliharaan & Status Fitur
                    </h2>
                    <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
                      Atur apakah seluruh sistem sedang dalam status pemeliharaan (maintenance) dan kelola mode pengembangan untuk fitur AI Assistant secara realtime.
                    </p>
                  </div>

                  <button
                    onClick={async () => {
                      setIsSavingMaintenance(true);
                      await updateSystemSettings(maintenanceForm);
                      setIsSavingMaintenance(false);
                    }}
                    disabled={isSavingMaintenance}
                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-extrabold text-sm shadow-xl shadow-pink-500/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSavingMaintenance ? 'Menyimpan ke Server...' : 'Simpan Semua Pengaturan'}</span>
                  </button>
                </div>
              </div>

              {/* ======================================================== */}
              {/* KONTROL MAINTENANCE PER FITUR MENU (POV SISTEM, ADMIN, SISWA) */}
              {/* ======================================================== */}
              <div className="rounded-3xl border border-[#31255e] bg-[#140f2b] p-6 sm:p-8 space-y-6 shadow-2xl">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#251b47]">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white flex items-center justify-center shadow-lg shadow-pink-500/20 shrink-0">
                      <SlidersHorizontal className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold text-white text-lg sm:text-xl">
                          Kontrol Maintenance Per Fitur Menu
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 font-mono text-[10px] font-bold">
                          Sistem, Admin &amp; Siswa POV
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Kunci atau buka akses menu &amp; modul platform secara granular tanpa mematikan seluruh aplikasi.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowSqlFeatureModal(true)}
                      className="px-3.5 py-2.5 rounded-xl bg-[#1d1538] hover:bg-[#2a1e50] text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      <FileCode className="w-4 h-4 text-purple-400" />
                      <span>Skrip SQL Supabase</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSavingFeatures}
                      onClick={handleSaveFeatureSettings}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:opacity-90 disabled:opacity-50 text-white text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-pink-500/25 active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isSavingFeatures ? 'Menyimpan ke Cloud...' : 'Simpan Semua Fitur'}</span>
                    </button>
                  </div>
                </div>

                {/* Sub-Kontrol Switcher Tabs */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="inline-flex flex-wrap p-1.5 rounded-2xl bg-[#0c081e] border border-[#231845] gap-1">
                    <button
                      type="button"
                      onClick={() => setFeatureRoleTab('global')}
                      className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                        featureRoleTab === 'global'
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>🌐 Sistem &amp; Website (2)</span>
                      {((maintenanceForm.isMaintenance ? 1 : 0) + (maintenanceForm.isAiMaintenance ? 1 : 0)) > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-black font-black text-[9px]">
                          {(maintenanceForm.isMaintenance ? 1 : 0) + (maintenanceForm.isAiMaintenance ? 1 : 0)} Maint
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setFeatureRoleTab('admin')}
                      className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                        featureRoleTab === 'admin'
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>👨‍🏫 Menu Guru / Admin (18)</span>
                      {Object.values(adminFeatureMaintenance).filter(Boolean).length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-black font-black text-[9px]">
                          {Object.values(adminFeatureMaintenance).filter(Boolean).length} Maint
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setFeatureRoleTab('member')}
                      className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                        featureRoleTab === 'member'
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>🎓 Menu Siswa / Member (19)</span>
                      {Object.values(memberFeatureMaintenance).filter(Boolean).length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-black font-black text-[9px]">
                          {Object.values(memberFeatureMaintenance).filter(Boolean).length} Maint
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setFeatureRoleTab('all')}
                      className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                        featureRoleTab === 'all'
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>📑 Semua Sub Kontrol</span>
                    </button>
                  </div>

                  {/* Bulk Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleBulkToggle(featureRoleTab, true)}
                      className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                      title="Kunci semua fitur dalam role/sub-kontrol ini ke mode maintenance (nonaktif)"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>
                        Kunci Semua ({featureRoleTab === 'global' ? 'Sistem' : featureRoleTab === 'admin' ? 'Admin' : featureRoleTab === 'member' ? 'Siswa' : 'Platform'})
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBulkToggle(featureRoleTab, false)}
                      className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                      title="Buka semua fitur dalam role/sub-kontrol ini ke mode normal (aktif)"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Buka Semua</span>
                    </button>
                  </div>
                </div>

                {/* Filter & Search Toolbar */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-5 relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={featureSearchQuery}
                      onChange={(e) => setFeatureSearchQuery(e.target.value)}
                      placeholder="Cari fitur (misal: website, ai, absensi, kuis, tugas, forum)..."
                      className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-[#0b081c] border border-[#261b47] text-xs text-white placeholder-slate-500 outline-none focus:border-pink-500 transition-colors"
                    />
                    {featureSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setFeatureSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="md:col-span-7 flex flex-wrap items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
                    {[
                      { id: 'all', label: 'Semua Kategori' },
                      { id: 'utama', label: 'Menu Utama' },
                      { id: 'akademik', label: 'Akademik' },
                      { id: 'komunikasi', label: 'Komunikasi' },
                      { id: 'hiburan', label: 'Hiburan & AI' },
                      { id: 'lainnya', label: 'Utilitas' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFeatureCategoryFilter(cat.id as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                          featureCategoryFilter === cat.id
                            ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                            : 'bg-[#0e0a24] text-slate-400 hover:text-white border-[#241a45]'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stats Summary Bar */}
                {(() => {
                  let total = 0;
                  let maintCount = 0;
                  let labelTotal = 'TOTAL FITUR';
                  let unit = 'Menu';

                  if (featureRoleTab === 'global') {
                    total = 2;
                    maintCount = (maintenanceForm.isMaintenance ? 1 : 0) + (maintenanceForm.isAiMaintenance ? 1 : 0);
                    labelTotal = 'TOTAL KONTROL SISTEM GLOBAL';
                    unit = 'Kontrol';
                  } else if (featureRoleTab === 'admin') {
                    total = ADMIN_FEATURE_MENUS.length;
                    maintCount = ADMIN_FEATURE_MENUS.filter((f) => Boolean(adminFeatureMaintenance[f.id])).length;
                    labelTotal = 'TOTAL MENU GURU / ADMIN';
                    unit = 'Menu';
                  } else if (featureRoleTab === 'member') {
                    total = MEMBER_FEATURE_MENUS.length;
                    maintCount = MEMBER_FEATURE_MENUS.filter((f) => Boolean(memberFeatureMaintenance[f.id])).length;
                    labelTotal = 'TOTAL MENU SISWA / MEMBER';
                    unit = 'Menu';
                  } else {
                    const adminMaint = ADMIN_FEATURE_MENUS.filter((f) => Boolean(adminFeatureMaintenance[f.id])).length;
                    const memberMaint = MEMBER_FEATURE_MENUS.filter((f) => Boolean(memberFeatureMaintenance[f.id])).length;
                    const globalMaint = (maintenanceForm.isMaintenance ? 1 : 0) + (maintenanceForm.isAiMaintenance ? 1 : 0);
                    total = 2 + ADMIN_FEATURE_MENUS.length + MEMBER_FEATURE_MENUS.length;
                    maintCount = globalMaint + adminMaint + memberMaint;
                    labelTotal = 'TOTAL SELURUH KONTROL PLATFORM';
                    unit = 'Modul';
                  }

                  const onlineCount = total - maintCount;

                  return (
                    <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-[#0b071c] border border-[#231744] text-center shadow-inner">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{labelTotal}</span>
                        <span className="text-base font-black text-white">{total} {unit}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">ONLINE / NORMAL (AKTIF)</span>
                        <span className="text-base font-black text-emerald-300">{onlineCount} Aktif</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">SEDANG MAINTENANCE (NONAKTIF)</span>
                        <span className="text-base font-black text-amber-300">{maintCount} Terkunci</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Sub-Kontrol Contents */}
                {(() => {
                  // Reusable feature card renderer
                  const renderFeatureCard = (
                    feature: FeatureMenuConfig,
                    role: 'admin' | 'member'
                  ) => {
                    const isMaint = role === 'admin'
                      ? Boolean(adminFeatureMaintenance[feature.id])
                      : Boolean(memberFeatureMaintenance[feature.id]);
                    const isFeatureActive = !isMaint;
                    const customDetail = featureCustomMessages[`${role}_${feature.id}`];
                    const hasCustom = Boolean(customDetail?.message || customDetail?.estimate);

                    return (
                      <div
                        key={`${role}_${feature.id}`}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-3.5 shadow-lg ${
                          !isFeatureActive
                            ? 'bg-[#18102b] border-amber-500/40 shadow-amber-950/20'
                            : 'bg-[#100c26] border-[#251b47] hover:border-[#382b68]'
                        }`}
                      >
                        <div className="space-y-2.5">
                          {/* Top Bar: Category Pill & Status Badge */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/25 text-purple-300 text-[10px] font-bold">
                              {feature.categoryLabel}
                            </span>

                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${
                                !isFeatureActive
                                  ? 'bg-amber-500/15 border-amber-500/35 text-amber-300 animate-pulse'
                                  : 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                              }`}
                            >
                              <span>{!isFeatureActive ? '🟡 Maint' : '🟢 Normal'}</span>
                            </span>
                          </div>

                          {/* Title & Description */}
                          <div>
                            <h4 className="text-sm font-black text-white leading-tight">
                              {feature.name}
                            </h4>
                            <span className="text-[10px] font-mono text-slate-500 block">
                              id: {feature.id}
                            </span>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
                              {feature.description}
                            </p>
                          </div>

                          {/* Custom Message preview note if configured */}
                          {hasCustom && (
                            <div className="p-2 rounded-xl bg-purple-950/30 border border-purple-500/20 text-[10px] text-purple-300">
                              <span className="font-bold block">Pesan Kustom Aktif:</span>
                              <span className="truncate block opacity-85">{customDetail?.message || feature.defaultMessage}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions: Toggle Switch & Config Button */}
                        <div className="pt-2 border-t border-[#231945] flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenCustomMessageModal(role, feature)}
                              className="p-1.5 rounded-lg bg-[#191238] hover:bg-[#261c52] border border-[#312363] text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                              title="Atur pesan kustom & estimasi waktu untuk fitur ini"
                            >
                              <Settings2 className="w-3.5 h-3.5 text-pink-400" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewFeatureData({
                                  name: feature.name,
                                  categoryLabel: feature.categoryLabel,
                                  message: customDetail?.message || feature.defaultMessage,
                                  estimate: customDetail?.estimate || feature.defaultEstimate,
                                  role: role,
                                })
                              }
                              className="p-1.5 rounded-lg bg-[#191238] hover:bg-[#261c52] border border-[#312363] text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                              title="Uji tampilan layar pemeliharaan fitur ini"
                            >
                              <Eye className="w-3.5 h-3.5 text-purple-400" />
                            </button>
                          </div>

                          {/* Toggle Button: Touch geser kanan (Aktif: Hijau), geser kiri (Nonaktif: Default Abu-Abu) */}
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold ${isFeatureActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                              {isFeatureActive ? 'Aktif' : 'Nonaktif'}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                role === 'admin'
                                  ? handleToggleAdminFeature(feature.id)
                                  : handleToggleMemberFeature(feature.id)
                              }
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                                isFeatureActive ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-slate-700 hover:bg-slate-600'
                              }`}
                              title={isFeatureActive ? 'Fitur aktif (klik untuk kunci ke maintenance)' : 'Fitur nonaktif (klik untuk aktifkan)'}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                                  isFeatureActive ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  };

                  // Render 2 Global System Cards (Website & AI Assistant)
                  const renderGlobalCards = () => {
                    const isWebsiteActive = !maintenanceForm.isMaintenance;
                    const isAiActive = !maintenanceForm.isAiMaintenance;

                    const matchesSearch = (text: string) =>
                      !featureSearchQuery.trim() ||
                      text.toLowerCase().includes(featureSearchQuery.toLowerCase());

                    const showWebsite =
                      (featureCategoryFilter === 'all' || featureCategoryFilter === 'utama' || featureCategoryFilter === 'lainnya') &&
                      (matchesSearch('Mode Pemeliharaan Website') || matchesSearch('website_global') || matchesSearch('server') || matchesSearch('pemeliharaan'));

                    const showAi =
                      (featureCategoryFilter === 'all' || featureCategoryFilter === 'hiburan' || featureCategoryFilter === 'lainnya') &&
                      (matchesSearch('Status Fitur AI Assistant') || matchesSearch('ai_tutor') || matchesSearch('kecerdasan buatan') || matchesSearch('tutor'));

                    if (!showWebsite && !showAi) {
                      return (
                        <div className="py-10 text-center rounded-2xl bg-[#0c081e] border border-[#241a45] space-y-2 col-span-full">
                          <AlertTriangle className="w-7 h-7 text-slate-500 mx-auto" />
                          <h4 className="text-sm font-bold text-white">Tidak ada kontrol sistem yang cocok</h4>
                          <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian atau reset filter kategori.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. Global Website Maintenance Card */}
                        {showWebsite && (
                          <div
                            className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-3.5 shadow-lg ${
                              !isWebsiteActive
                                ? 'bg-[#18102b] border-amber-500/40 shadow-amber-950/20'
                                : 'bg-[#100c26] border-[#251b47] hover:border-[#382b68]'
                            }`}
                          >
                            <div className="space-y-2.5">
                              {/* Top Bar: Category Pill & Status Badge */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/25 text-purple-300 text-[10px] font-bold">
                                  Server &amp; Website Global
                                </span>

                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${
                                    !isWebsiteActive
                                      ? 'bg-amber-500/15 border-amber-500/35 text-amber-300 animate-pulse'
                                      : 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                                  }`}
                                >
                                  <span>{!isWebsiteActive ? '🟡 Maint' : '🟢 Normal'}</span>
                                </span>
                              </div>

                              {/* Title & Description */}
                              <div>
                                <h4 className="text-sm font-black text-white leading-tight">
                                  Mode Pemeliharaan Website
                                </h4>
                                <span className="text-[10px] font-mono text-slate-500 block">
                                  id: website_global
                                </span>
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
                                  Tampilan halaman pemeliharaan layar penuh saat situs diakses pengunjung, guru, dan siswa.
                                </p>
                              </div>

                              {/* Custom Message preview note */}
                              <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/20 text-[10px] text-purple-300 space-y-0.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-white truncate max-w-[200px]">
                                    {maintenanceForm.maintenanceTitle || 'Pemeliharaan Server & Pembaruan Sistem'}
                                  </span>
                                  <span className="text-[9px] font-mono text-pink-300">
                                    {maintenanceForm.maintenanceEstimate || 'Segera selesai'}
                                  </span>
                                </div>
                                <span className="truncate block opacity-85 text-slate-300">
                                  {maintenanceForm.maintenanceMessage || 'Sedang dalam peningkatan sistem...'}
                                </span>
                              </div>
                            </div>

                            {/* Actions: Toggle Switch & Config Button */}
                            <div className="pt-2 border-t border-[#231945] flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={handleOpenWebsiteConfig}
                                  className="p-1.5 rounded-lg bg-[#191238] hover:bg-[#261c52] border border-[#312363] text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                                  title="Atur judul, pesan & estimasi waktu pemeliharaan website"
                                >
                                  <Settings2 className="w-3.5 h-3.5 text-pink-400" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowMaintenancePreviewModal(true)}
                                  className="p-1.5 rounded-lg bg-[#191238] hover:bg-[#261c52] border border-[#312363] text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                                  title="Uji tampilan layar pemeliharaan website"
                                >
                                  <Eye className="w-3.5 h-3.5 text-purple-400" />
                                </button>
                              </div>

                              {/* Toggle Button: Touch geser kanan (Aktif: Hijau), geser kiri (Nonaktif: Default Abu-Abu) */}
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold ${isWebsiteActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                                  {isWebsiteActive ? 'Aktif' : 'Nonaktif'}
                                </span>
                                <button
                                  type="button"
                                  onClick={handleToggleWebsiteMaintenance}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                                    isWebsiteActive ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-slate-700 hover:bg-slate-600'
                                  }`}
                                  title={isWebsiteActive ? 'Website aktif normal (klik untuk kunci ke maintenance)' : 'Website sedang maintenance (klik untuk aktifkan kembali)'}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                                      isWebsiteActive ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 2. AI Assistant Feature Mode Card */}
                        {showAi && (
                          <div
                            className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-3.5 shadow-lg ${
                              !isAiActive
                                ? 'bg-[#18102b] border-amber-500/40 shadow-amber-950/20'
                                : 'bg-[#100c26] border-[#251b47] hover:border-[#382b68]'
                            }`}
                          >
                            <div className="space-y-2.5">
                              {/* Top Bar: Category Pill & Status Badge */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/25 text-purple-300 text-[10px] font-bold">
                                  Kecerdasan Buatan (AI)
                                </span>

                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${
                                    !isAiActive
                                      ? 'bg-amber-500/15 border-amber-500/35 text-amber-300 animate-pulse'
                                      : 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                                  }`}
                                >
                                  <span>{!isAiActive ? '🟡 Pengemb.' : '🟢 Normal'}</span>
                                </span>
                              </div>

                              {/* Title & Description */}
                              <div>
                                <h4 className="text-sm font-black text-white leading-tight">
                                  Status Fitur AI Assistant
                                </h4>
                                <span className="text-[10px] font-mono text-slate-500 block">
                                  id: ai_tutor
                                </span>
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
                                  Buka obrolan tutor cerdas atau kunci ke layar tahap pengembangan siswa.
                                </p>
                              </div>

                              {/* Custom Message preview note */}
                              <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/20 text-[10px] text-purple-300 space-y-0.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-white truncate max-w-[200px]">
                                    {maintenanceForm.aiMaintenanceTitle || 'AI Assistant Sedang Bersiap!'}
                                  </span>
                                  <span className="text-[9px] font-mono text-amber-300">
                                    Progress: {maintenanceForm.aiProgressPercent}%
                                  </span>
                                </div>
                                <span className="truncate block opacity-85 text-slate-300">
                                  {maintenanceForm.aiMaintenanceMessage || 'Sedang tahap pengembangan developer...'}
                                </span>
                              </div>
                            </div>

                            {/* Actions: Toggle Switch & Config Button */}
                            <div className="pt-2 border-t border-[#231945] flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={handleOpenAiConfig}
                                  className="p-1.5 rounded-lg bg-[#191238] hover:bg-[#261c52] border border-[#312363] text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                                  title="Atur judul, pesan & progress persentase AI"
                                >
                                  <Settings2 className="w-3.5 h-3.5 text-pink-400" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowAiPreviewModal(true)}
                                  className="p-1.5 rounded-lg bg-[#191238] hover:bg-[#261c52] border border-[#312363] text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                                  title="Uji tampilan layar pemeliharaan AI Assistant"
                                >
                                  <Eye className="w-3.5 h-3.5 text-purple-400" />
                                </button>
                              </div>

                              {/* Toggle Button: Touch geser kanan (Aktif: Hijau), geser kiri (Nonaktif: Default Abu-Abu) */}
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold ${isAiActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                                  {isAiActive ? 'Aktif' : 'Nonaktif'}
                                </span>
                                <button
                                  type="button"
                                  onClick={handleToggleAiMaintenance}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                                    isAiActive ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-slate-700 hover:bg-slate-600'
                                  }`}
                                  title={isAiActive ? 'AI Assistant aktif normal (klik untuk kunci ke pengembangan)' : 'AI sedang nonaktif (klik untuk aktifkan)'}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                                      isAiActive ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  };

                  const filterList = (list: FeatureMenuConfig[]) =>
                    list.filter((f) => {
                      const matchesSearch =
                        !featureSearchQuery.trim() ||
                        f.name.toLowerCase().includes(featureSearchQuery.toLowerCase()) ||
                        f.description.toLowerCase().includes(featureSearchQuery.toLowerCase()) ||
                        f.id.toLowerCase().includes(featureSearchQuery.toLowerCase());
                      const matchesCat = featureCategoryFilter === 'all' || f.category === featureCategoryFilter;
                      return matchesSearch && matchesCat;
                    });

                  // Mode 1: Sub-Kontrol Global (2 Kolom Website & AI)
                  if (featureRoleTab === 'global') {
                    return renderGlobalCards();
                  }

                  // Mode 2: Sub-Kontrol Admin (18 Menu)
                  if (featureRoleTab === 'admin') {
                    const filteredAdmin = filterList(ADMIN_FEATURE_MENUS);
                    if (filteredAdmin.length === 0) {
                      return (
                        <div className="py-12 text-center rounded-2xl bg-[#0c081e] border border-[#241a45] space-y-2">
                          <AlertTriangle className="w-8 h-8 text-slate-500 mx-auto" />
                          <h4 className="text-sm font-bold text-white">Tidak ada fitur Admin yang cocok</h4>
                          <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian atau ganti filter kategori.</p>
                        </div>
                      );
                    }
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredAdmin.map((feature) => renderFeatureCard(feature, 'admin'))}
                      </div>
                    );
                  }

                  // Mode 3: Sub-Kontrol Member / Siswa (19 Menu)
                  if (featureRoleTab === 'member') {
                    const filteredMember = filterList(MEMBER_FEATURE_MENUS);
                    if (filteredMember.length === 0) {
                      return (
                        <div className="py-12 text-center rounded-2xl bg-[#0c081e] border border-[#241a45] space-y-2">
                          <AlertTriangle className="w-8 h-8 text-slate-500 mx-auto" />
                          <h4 className="text-sm font-bold text-white">Tidak ada fitur Siswa yang cocok</h4>
                          <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian atau ganti filter kategori.</p>
                        </div>
                      );
                    }
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredMember.map((feature) => renderFeatureCard(feature, 'member'))}
                      </div>
                    );
                  }

                  // Mode 4: Tampilkan Semua Sub Kontrol (Global, Admin, Siswa)
                  const filteredAdmin = filterList(ADMIN_FEATURE_MENUS);
                  const filteredMember = filterList(MEMBER_FEATURE_MENUS);

                  return (
                    <div className="space-y-8">
                      {/* Section 1: Sub Kontrol Sistem Global */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-[#251b47]">
                          <Globe className="w-4 h-4 text-purple-400" />
                          <h4 className="text-sm font-black text-white">1. Sub Kontrol: Sistem &amp; Website Utama (2 Kolom)</h4>
                        </div>
                        {renderGlobalCards()}
                      </div>

                      {/* Section 2: Sub Kontrol Menu Admin */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-[#251b47]">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-pink-400" />
                            <h4 className="text-sm font-black text-white">2. Sub Kontrol: Menu Guru &amp; Admin ({filteredAdmin.length})</h4>
                          </div>
                        </div>
                        {filteredAdmin.length === 0 ? (
                          <p className="text-xs text-slate-500 italic">Tidak ada fitur admin yang sesuai filter.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredAdmin.map((feature) => renderFeatureCard(feature, 'admin'))}
                          </div>
                        )}
                      </div>

                      {/* Section 3: Sub Kontrol Menu Siswa */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-[#251b47]">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-emerald-400" />
                            <h4 className="text-sm font-black text-white">3. Sub Kontrol: Menu Siswa &amp; Member ({filteredMember.length})</h4>
                          </div>
                        </div>
                        {filteredMember.length === 0 ? (
                          <p className="text-xs text-slate-500 italic">Tidak ada fitur siswa yang sesuai filter.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredMember.map((feature) => renderFeatureCard(feature, 'member'))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Bottom Quick Save Sticky Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1f1545] to-[#150f2e] border border-pink-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-pink-400 shrink-0" />
                    <span className="text-xs text-slate-300">
                      Perubahan kontrol maintenance tersimpan secara instan di lokal dan tersinkronisasi via Supabase Realtime saat Anda menekan tombol simpan.
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isSavingFeatures}
                    onClick={handleSaveFeatureSettings}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs shrink-0 cursor-pointer shadow-lg shadow-pink-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSavingFeatures ? 'Menyimpan...' : 'Terapkan Pengaturan Fitur'}</span>
                  </button>
                </div>
              </div>


            </div>
          )}

          {/* TAB: OWNER PROFILE SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-200">
              <ProfileAvatarUploader
                title="Foto Profil Owner Platform"
                subtitle="Unggah foto profil pengelola pusat platform agar dikenali oleh seluruh admin dan peserta didik"
              />

              <div className="bg-[#141126] border border-[#272144] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <div>
                <h3 className="text-lg font-extrabold text-white">Pengaturan Profil Owner</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Kelola nama lengkap dan password keamanan Owner platform.
                </p>
              </div>

              <form onSubmit={handleSaveOwnerSettings} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Nama Lengkap Owner</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    required
                    className="w-full bg-[#1b1633] border border-[#342a5a] rounded-xl px-4 py-2.5 text-white outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Password Owner</label>
                  <div className="relative">
                    <input
                      type={showOwnerPassword ? 'text' : 'password'}
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      required
                      className="w-full bg-[#1b1633] border border-[#342a5a] rounded-xl pl-4 pr-10 py-2.5 text-white outline-none focus:border-pink-500 font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer p-1"
                    >
                      {showOwnerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#261f42] flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingOwnerSettings}
                    className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-black rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2"
                  >
                    {isSavingOwnerSettings ? 'Menyimpan...' : 'Simpan Pengaturan Profil'}
                  </button>
                </div>
              </form>
            </div>
            </div>
          )}
        </div>

        {/* Live Footer Strip (Realtime) */}
        <footer className="px-6 py-3 border-t border-[#201a3b] bg-[#0f0d1e] flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-emerald-400">LIVE</span>
            <span className="font-mono text-slate-400">
              Online sekarang: {realOnlineUsers} • Total Akses Perangkat: {totalDeviceAccesses} • Sinkronisasi Supabase Realtime Aktif
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            RemindTask Engine v2.4 • All Rights Reserved
          </span>
        </footer>
      </main>

      {/* Edit Admin User Modal (Fitur Reset Password & Profil) */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#141126] border border-[#2e2652] rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#251e44]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
                  <Key className="w-4 h-4 text-pink-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Edit & Reset Password Admin</h3>
                  <p className="text-xs text-slate-400">Perbarui kredensial akun pengelola</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAdmin(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAdmin} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Lengkap Admin</label>
                <input
                  type="text"
                  value={editAdminName}
                  onChange={(e) => setEditAdminName(e.target.value)}
                  required
                  className="w-full bg-[#1b1633] border border-[#342a5a] rounded-xl px-3.5 py-2 text-white outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Reset Password Admin</label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editAdminPassword}
                    onChange={(e) => setEditAdminPassword(e.target.value)}
                    required
                    placeholder="Masukkan password baru"
                    className="w-full bg-[#1b1633] border border-[#342a5a] rounded-xl pl-3.5 pr-10 py-2 text-white outline-none focus:border-pink-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showEditPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Kelas Dikelola</label>
                <input
                  type="text"
                  value={editAdminClassName}
                  onChange={(e) => setEditAdminClassName(e.target.value)}
                  placeholder="Contoh: Kelas XII RPL 1"
                  className="w-full bg-[#1b1633] border border-[#342a5a] rounded-xl px-3.5 py-2 text-white outline-none focus:border-pink-500"
                />
              </div>

              <div className="pt-3 border-t border-[#261f42] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-3.5 py-2 text-slate-300 hover:bg-[#25203f] rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold rounded-xl shadow-md cursor-pointer transition-all"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals */}
      <TaskFormModal
        key={editingTask ? editingTask.id : 'new-task'}
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        initialTask={editingTask}
      />
      <DailyReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSelectTask={(taskId) => {
          setIsReportModalOpen(false);
          const taskObj = tasks.find((t) => t.id === taskId);
          if (taskObj) {
            setEditingTask(taskObj);
            setIsTaskModalOpen(true);
          }
        }}
      />

      {/* Add Admin & Class Modal for Owner */}
      {showAddClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#141126] border border-[#2e2652] rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#251e44]">
              <div>
                <h3 className="text-base font-bold text-white">Tambah User Admin Baru</h3>
                <p className="text-xs text-slate-400">
                  Buat akun admin untuk mengelola kelas dan siswa
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddClassModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewAdmin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Admin</label>
                <input
                  type="text"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder="Masukkan nama admin"
                  required
                  className="w-full bg-[#1b1633] border border-[#342a5a] rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-pink-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Username Admin (Harus Unik)</label>
                <input
                  type="text"
                  value={newAdminUsername}
                  onChange={(e) => setNewAdminUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  placeholder="Contoh: bu_siti / pak_budi"
                  className="w-full bg-[#1b1633] border border-[#342a5a] rounded-xl px-3.5 py-2 text-xs text-pink-300 font-mono outline-none focus:border-pink-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Akan dibuat otomatis dari Nama Admin jika dikosongkan.
                </span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password Admin</label>
                <input
                  type="text"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="Masukkan password admin"
                  required
                  className="w-full bg-[#1b1633] border border-[#342a5a] rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-pink-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Kelas Dikelola</label>
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Masukkan nama kelas"
                  required
                  className="w-full bg-[#1b1633] border border-[#342a5a] rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-pink-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Kode Akses Kelas (Dibuat Otomatis)
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewAdminClassCode(generateRandomClassCode())}
                    className="text-[11px] text-pink-400 hover:text-pink-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Acak Ulang</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={newAdminClassCode}
                  onChange={(e) => setNewAdminClassCode(e.target.value.toUpperCase())}
                  className="w-full bg-[#1b1633] border border-[#342a5a] rounded-xl px-3.5 py-2 text-xs text-pink-400 font-mono font-bold tracking-widest outline-none focus:border-pink-500"
                />
              </div>
              <div className="pt-3 border-t border-[#261f42] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddClassModal(false)}
                  className="px-3.5 py-2 text-xs text-slate-300 hover:bg-[#25203f] rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                >
                  Simpan Admin & Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Class Confirmation Modal */}
      {classToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-[#141126] border border-red-500/30 rounded-3xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mb-3 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white text-center mb-1">Hapus Ruang Kelas?</h3>
            <p className="text-xs text-slate-300 text-center mb-4 leading-relaxed">
              Yakin ingin menghapus kelas <strong className="text-white font-semibold">{classToDelete.name}</strong> ({classToDelete.code})? Seluruh data tugas dan bukti tugas terkait kelas ini akan dihapus permanen secara realtime.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setClassToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#1d1736] text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  const targetId = classToDelete.id;
                  const className = classToDelete.name;
                  setClassToDelete(null);
                  await deleteClass(targetId);
                  showToast(`Kelas "${className}" berhasil dihapus dari database!`, 'success');
                  addActivityLog(currentUser?.name || 'Owner', 'owner', 'Hapus Ruang Kelas', `Owner menghapus ruang kelas ${className}`, 'class');
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/30 cursor-pointer"
              >
                Ya, Hapus Kelas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Admin Confirmation Modal */}
      {adminToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-[#141126] border border-red-500/30 rounded-3xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mb-3 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white text-center mb-1">Hapus Akun Admin?</h3>
            <p className="text-xs text-slate-300 text-center mb-4">
              Yakin ingin menghapus admin <strong className="text-white font-semibold">{adminToDelete.name}</strong>? Akun dan akses kelas terkait akan dihapus secara terintegrasi.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAdminToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#1d1736] text-slate-300 hover:text-white text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const adminName = adminToDelete.name;
                  deleteAdminUser(adminToDelete.id);
                  addActivityLog(currentUser?.name || 'Owner', 'owner', 'Hapus Akun Admin', `Owner menghapus akun admin ${adminName}`, 'admin');
                  setAdminToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/30"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {userToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#141126] border border-[#2e2652] rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#251e44]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
                  <Edit className="w-4 h-4 text-pink-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Edit Profil Pengguna</h3>
                  <p className="text-xs text-slate-400">ID: {userToEdit.id} ({userToEdit.role})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUserToEdit(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  required
                  className="w-full bg-[#1b1633] border border-[#342a5a] rounded-xl px-3.5 py-2 text-white outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Kelas Terkait</label>
                <input
                  type="text"
                  value={editUserClassName}
                  onChange={(e) => setEditUserClassName(e.target.value)}
                  placeholder="Contoh: XII IPA 1"
                  className="w-full bg-[#1b1633] border border-[#342a5a] rounded-xl px-3.5 py-2 text-white outline-none focus:border-pink-500"
                />
              </div>

              {userToEdit.role === 'admin' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Reset Password</label>
                  <input
                    type="text"
                    value={editUserPassword}
                    onChange={(e) => setEditUserPassword(e.target.value)}
                    placeholder="Kosongkan jika tidak diubah"
                    className="w-full bg-[#1b1633] border border-[#342a5a] rounded-xl px-3.5 py-2 text-white outline-none focus:border-pink-500 font-mono"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-[#261f42] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUserToEdit(null)}
                  className="px-3.5 py-2 text-xs text-slate-300 hover:bg-[#25203f] rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-[#141126] border border-red-500/30 rounded-3xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mb-3 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white text-center mb-1">Hapus Pengguna?</h3>
            <p className="text-xs text-slate-300 text-center mb-4">
              Yakin ingin menghapus <strong className="text-white font-semibold">{userToDelete.name}</strong> ({userToDelete.role === 'admin' ? 'Admin' : 'Siswa'}) dari platform?
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#1d1736] text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/30 cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SQL Realtime Access Schema Modal */}
      {isAccessSqlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#141026] border border-[#3b2d61] rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2e234e]">
              <div className="flex items-center gap-2 text-white">
                <Database className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Query SQL Supabase - Realtime Total Akses & Login</h3>
              </div>
              <button
                onClick={() => setIsAccessSqlModalOpen(false)}
                className="p-1 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Jalankan query SQL ini di <strong>Supabase Dashboard → SQL Editor</strong> untuk memastikan tabel <code>class_access_logs</code> dan <code>activity_logs</code> terdaftar di publikasi Realtime Supabase, sehingga setiap akses atau login siswa dan admin langsung terefleksikan detik itu juga ke Dashboard Owner.
            </p>

            <div className="relative">
              <pre className="p-4 rounded-2xl bg-[#0a0714] border border-[#2a1d48] text-[11px] font-mono text-amber-300 overflow-x-auto max-h-60 custom-scrollbar whitespace-pre">
                {ACCESS_REALTIME_SQL}
              </pre>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsAccessSqlModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white cursor-pointer"
              >
                Tutup
              </button>
              <button
                onClick={handleCopyAccessSql}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer"
              >
                {copiedAccessSql ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedAccessSql ? 'Tersalin ke Clipboard!' : 'Salin Query SQL'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SQL Feature Maintenance Schema Modal */}
      {showSqlFeatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-[#141026] border border-[#3b2d61] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#2e234e] shrink-0">
              <div className="flex items-center gap-2.5 text-white">
                <FileCode className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="font-extrabold text-base">Skrip SQL Supabase — Kontrol Maintenance Fitur</h3>
                  <p className="text-[11px] text-slate-400">Kontrol granular per menu fitur untuk POV Guru/Admin dan Siswa/Member</p>
                </div>
              </div>
              <button
                onClick={() => setShowSqlFeatureModal(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed shrink-0">
              Jalankan query SQL ini di <strong>Supabase Dashboard → SQL Editor</strong> untuk menambahkan kolom kontrol fitur <code>admin_feature_maintenance</code>, <code>member_feature_maintenance</code>, dan <code>feature_maintenance_custom_messages</code> pada tabel <code>system_settings</code> serta mengaktifkan sinkronisasi <strong>Supabase Realtime</strong> ke seluruh perangkat admin dan siswa secara instan.
            </p>

            <div className="relative flex-1 overflow-hidden rounded-2xl border border-[#2a1d48] bg-[#0a0714]">
              <pre className="p-4 text-[11px] font-mono text-purple-300 overflow-y-auto max-h-[380px] custom-scrollbar whitespace-pre">
                {FEATURE_MAINTENANCE_SQL}
              </pre>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 shrink-0 border-t border-[#231742]">
              <div className="text-[11px] text-slate-400">
                <span>Status: </span>
                <span className="text-emerald-400 font-bold">Siap dijalankan di SQL Editor</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSqlFeatureModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleCopySqlFeature}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:opacity-90 text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-purple-500/25 cursor-pointer active:scale-95 transition-all"
                >
                  {copiedSqlFeature ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSqlFeature ? 'Tersalin ke Clipboard!' : 'Salin Skrip SQL'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Feature Maintenance Message Modal */}
      {editingCustomFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#141026] border border-[#3b2d61] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2e234e]">
              <div className="flex items-center gap-2.5 text-white">
                <Settings2 className="w-5 h-5 text-pink-400" />
                <div>
                  <h3 className="font-extrabold text-base">Atur Pesan Kustom Fitur</h3>
                  <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                    {editingCustomFeature.role === 'admin' ? 'POV Guru / Admin' : 'POV Siswa / Member'} • {editingCustomFeature.name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCustomFeature(null)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Tentukan pesan khusus dan estimasi penyelesaian saat pengguna membuka fitur <strong>{editingCustomFeature.name}</strong> yang sedang berstatus pemeliharaan.
            </p>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Pesan Pemeliharaan (Maintenance Message)
                </label>
                <textarea
                  rows={3}
                  value={customFeatureMessageInput}
                  onChange={(e) => setCustomFeatureMessageInput(e.target.value)}
                  placeholder={editingCustomFeature.defaultMessage}
                  className="w-full p-3 rounded-xl bg-[#0b081c] border border-[#2a1e4e] text-xs text-white placeholder-slate-500 outline-none focus:border-pink-500 transition-colors"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  Default: {editingCustomFeature.defaultMessage}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Estimasi Waktu Penyelesaian
                </label>
                <input
                  type="text"
                  value={customFeatureEstimateInput}
                  onChange={(e) => setCustomFeatureEstimateInput(e.target.value)}
                  placeholder={editingCustomFeature.defaultEstimate}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b081c] border border-[#2a1e4e] text-xs text-white placeholder-slate-500 outline-none focus:border-pink-500 transition-colors"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  Contoh: &quot;Estimasi 20 Menit&quot;, &quot;Pukul 14:00 WIB&quot;, atau &quot;Segera kembali&quot;
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#231742]">
              <button
                type="button"
                onClick={handleResetCustomFeatureMessage}
                className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold cursor-pointer transition-all active:scale-95"
              >
                Reset ke Default
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomFeature(null)}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomFeatureMessage}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 text-xs font-bold text-white shadow-md shadow-pink-500/20 cursor-pointer active:scale-95 transition-all"
                >
                  Terapkan Pesan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feature Maintenance Live Preview Modal */}
      {previewFeatureData && (
        <div className="fixed inset-0 z-[99999] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-3xl flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 font-bold text-xs">
                Simulasi Pratinjau Tampilan • {previewFeatureData.role === 'admin' ? 'Guru / Admin' : 'Siswa / Member'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPreviewFeatureData(null)}
              className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center gap-2 shadow-2xl cursor-pointer active:scale-95 transition-all"
            >
              <X className="w-4 h-4" />
              <span>Tutup Pratinjau</span>
            </button>
          </div>

          <div className="w-full max-w-2xl">
            <FeatureMaintenanceView
              featureName={previewFeatureData.name}
              categoryLabel={previewFeatureData.categoryLabel}
              customMessage={previewFeatureData.message}
              customEstimate={previewFeatureData.estimate}
              onBackToDashboard={() => {
                showToast('Simulasi tombol "Kembali ke Beranda" ditekan.', 'info');
                setPreviewFeatureData(null);
              }}
              role={previewFeatureData.role}
            />
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      <BroadcastModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
      />

      {/* Maintenance Screen Live Simulation / Preview Modal */}
      {showMaintenancePreviewModal && (
        <div className="fixed inset-0 z-[99999] bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="absolute top-4 right-4 z-[100000]">
            <button
              onClick={() => setShowMaintenancePreviewModal(false)}
              className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center gap-2 shadow-2xl cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Tutup Pratinjau</span>
            </button>
          </div>
          <MaintenanceScreen
            title={maintenanceForm.maintenanceTitle}
            message={maintenanceForm.maintenanceMessage}
            estimate={maintenanceForm.maintenanceEstimate}
            onBypass={() => {
              showToast('Simulasi bypass berhasil (Mode Owner).', 'info');
              setShowMaintenancePreviewModal(false);
            }}
          />
        </div>
      )}

      {/* Website Maintenance Configuration Modal */}
      {showWebsiteConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#141026] border border-[#3b2d61] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2e234e]">
              <div className="flex items-center gap-2.5 text-white">
                <Settings2 className="w-5 h-5 text-pink-400" />
                <div>
                  <h3 className="font-extrabold text-base">Atur Pemeliharaan Website</h3>
                  <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                    Server &amp; Website Global (Seluruh Pengguna)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWebsiteConfigModal(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Atur judul, pesan pengumuman, dan estimasi waktu yang muncul di layar penuh saat website berada dalam status pemeliharaan.
            </p>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Judul Layar Pemeliharaan
                </label>
                <input
                  type="text"
                  value={websiteConfigTitle}
                  onChange={(e) => setWebsiteConfigTitle(e.target.value)}
                  placeholder="Contoh: Pemeliharaan Server & Pembaruan Sistem"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b081c] border border-[#2a1e4e] text-xs text-white placeholder-slate-500 outline-none focus:border-pink-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Pesan Deskripsi untuk Pengguna
                </label>
                <textarea
                  rows={3}
                  value={websiteConfigMessage}
                  onChange={(e) => setWebsiteConfigMessage(e.target.value)}
                  placeholder="Ketikkan pesan pemeliharaan untuk pengguna..."
                  className="w-full p-3 rounded-xl bg-[#0b081c] border border-[#2a1e4e] text-xs text-white placeholder-slate-500 outline-none focus:border-pink-500 transition-colors resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Estimasi Waktu Pengerjaan
                </label>
                <input
                  type="text"
                  value={websiteConfigEstimate}
                  onChange={(e) => setWebsiteConfigEstimate(e.target.value)}
                  placeholder="Contoh: Segera selesai dalam beberapa saat / Estimasi 30 Menit"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b081c] border border-[#2a1e4e] text-xs text-white placeholder-slate-500 outline-none focus:border-pink-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#231742]">
              <button
                type="button"
                onClick={() => {
                  setWebsiteConfigTitle('Pemeliharaan Server & Pembaruan Sistem');
                  setWebsiteConfigMessage('Kami sedang melakukan peningkatan infrastruktur dan optimalisasi database Supabase untuk menghadirkan performa terbaik. Mohon bersabar, kami akan segera kembali.');
                  setWebsiteConfigEstimate('Segera selesai dalam beberapa saat');
                  showToast('Form dikembalikan ke pesan default.', 'info');
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold cursor-pointer transition-all active:scale-95"
              >
                Reset Default
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowWebsiteConfigModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveWebsiteConfig}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 text-xs font-bold text-white shadow-md shadow-pink-500/20 cursor-pointer active:scale-95 transition-all"
                >
                  Terapkan &amp; Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Assistant Configuration Modal */}
      {showAiConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#141026] border border-[#3b2d61] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2e234e]">
              <div className="flex items-center gap-2.5 text-white">
                <Settings2 className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-extrabold text-base">Konfigurasi Mode AI Assistant</h3>
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                    Asisten AI &amp; Tutor Belajar
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiConfigModal(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Atur judul status, pengumuman pengembangan, dan persentase kesiapan yang ditampilkan saat fitur AI Assistant dikunci ke mode pengembangan.
            </p>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Judul Status AI
                </label>
                <input
                  type="text"
                  value={aiConfigTitle}
                  onChange={(e) => setAiConfigTitle(e.target.value)}
                  placeholder="Contoh: AI Assistant Sedang Bersiap!"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b081c] border border-[#2a1e4e] text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Pesan Deskripsi Mode Pengembangan
                </label>
                <textarea
                  rows={3}
                  value={aiConfigMessage}
                  onChange={(e) => setAiConfigMessage(e.target.value)}
                  placeholder="Ketikkan pesan pengembangan AI..."
                  className="w-full p-3 rounded-xl bg-[#0b081c] border border-[#2a1e4e] text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 transition-colors resize-none leading-relaxed"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Progress Indikator Pengembangan (%)
                  </label>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    {aiConfigProgress}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={aiConfigProgress}
                  onChange={(e) => setAiConfigProgress(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#231742]">
              <button
                type="button"
                onClick={() => {
                  setAiConfigTitle('AI Assistant Sedang Bersiap!');
                  setAiConfigMessage('Fitur AI Assistant sedang dalam tahap pengembangan developer, mohon ditunggu ya! Kami sedang mematangkan asisten bimbingan belajar cerdas terbaik untuk Anda.');
                  setAiConfigProgress(85);
                  showToast('Form dikembalikan ke default AI.', 'info');
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold cursor-pointer transition-all active:scale-95"
              >
                Reset Default
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAiConfigModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveAiConfig}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-purple-600 hover:opacity-90 text-xs font-bold text-white shadow-md shadow-amber-500/20 cursor-pointer active:scale-95 transition-all"
                >
                  Terapkan &amp; Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Assistant Maintenance Preview Modal */}
      {showAiPreviewModal && (
        <div className="fixed inset-0 z-[99999] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs">
                Simulasi Pratinjau • Layar AI Assistant (Tahap Pengembangan)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAiPreviewModal(false)}
              className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center gap-2 shadow-2xl cursor-pointer active:scale-95 transition-all"
            >
              <X className="w-4 h-4" />
              <span>Tutup Pratinjau</span>
            </button>
          </div>

          <div className="w-full max-w-2xl bg-[#141126] border border-[#3b2d61] rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6 relative overflow-hidden">
            <div className="relative inline-block mb-2">
              <div className="w-24 h-24 mx-auto rounded-3xl bg-[#1e173b] border border-amber-500/40 shadow-xl flex items-center justify-center text-amber-400">
                <Bot className="w-12 h-12 animate-bounce duration-1000" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tahap Pengembangan Developer</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {maintenanceForm.aiMaintenanceTitle || 'AI Assistant Sedang Bersiap!'}
              </h2>
              <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                {maintenanceForm.aiMaintenanceMessage || 'Fitur AI Assistant sedang dalam tahap pengembangan developer...'}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="max-w-md mx-auto space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-400">Tingkat Kesiapan Fitur</span>
                <span className="text-amber-400 font-mono font-bold">{maintenanceForm.aiProgressPercent}%</span>
              </div>
              <div className="w-full h-3 bg-[#0c0919] rounded-full overflow-hidden p-0.5 border border-[#2b224d]">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${maintenanceForm.aiProgressPercent}%` }}
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAiPreviewModal(false)}
                className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer transition-all"
              >
                Tutup Simulasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
