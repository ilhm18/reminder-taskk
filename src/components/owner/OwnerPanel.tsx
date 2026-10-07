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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ClassItem, Task, User, ActivityLogItem } from '../../types';
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
import { ProfileAvatarUploader } from '../common/ProfileAvatarUploader';
import { formatIndonesianDate, getTaskDeadlineStatus } from '../../utils/notification';
import { getStoredSupabaseConfig, saveSupabaseConfig, testSupabaseConnection, SUPABASE_SQL_SCHEMA, getSupabaseClient } from '../../services/supabase';

export const OwnerPanel: React.FC = () => {
  const {
    currentUser,
    logout,
    classes,
    tasks,
    users,
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

  type OwnerTab = 'dashboard' | 'admins' | 'kelas' | 'tugas' | 'forum' | 'bank_soal' | 'absensi' | 'anonwall' | 'statistik' | 'kalender' | 'aktivitas' | 'supabase' | 'saran' | 'chat' | 'maintenance' | 'settings';

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
    }
  }, [systemSettings]);

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
    window.addEventListener('popstate', handleUrlSync);
    window.addEventListener('hashchange', handleUrlSync);
    return () => {
      window.removeEventListener('popstate', handleUrlSync);
      window.removeEventListener('hashchange', handleUrlSync);
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
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminClassCode, setNewAdminClassCode] = useState('');
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  
  // Edit Admin User Modal states
  const [editingAdmin, setEditingAdmin] = useState<User | null>(null);
  const [editAdminName, setEditAdminName] = useState('');
  const [editAdminEmail, setEditAdminEmail] = useState('');
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
  const [ownerEmail, setOwnerEmail] = useState(currentUser?.email || 'ilhamramaaadan18@gmail.com');
  const [ownerPassword, setOwnerPassword] = useState(currentUser?.password || 'ilhaM@1810');
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);
  const [isSavingOwnerSettings, setIsSavingOwnerSettings] = useState(false);

  useEffect(() => {
    if (currentUser && currentUser.role === 'owner') {
      setOwnerName(currentUser.name);
      setOwnerEmail(currentUser.email || '');
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

    // Update in Supabase
    const client = getSupabaseClient();
    if (client) {
      try {
        await client
          .from('profiles')
          .update({
            name: updatedUser.name,
            password: updatedUser.password,
            class_name: updatedUser.className,
          })
          .eq('id', editingAdmin.id);

        if (editingAdmin.classId && editAdminClassName.trim()) {
          await client
            .from('classes')
            .update({
              name: editAdminClassName.trim(),
              admin_name: updatedUser.name,
            })
            .eq('id', editingAdmin.classId);
        }
      } catch (err) {
        console.warn('Supabase update admin error:', err);
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
    const cleanUsername = newAdminName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

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
      `Owner membuat admin ${newAdminName} untuk kelas ${newClassName} (Kode: ${finalCode})`,
      'admin'
    );

    setNewAdminName('');
    setNewAdminPassword('');
    setNewClassName('');
    setNewAdminClassCode('');
    setShowAddClassModal(false);
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

              {/* 5 KPI Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {/* 1. Total Admin */}
                <div className="p-5 rounded-3xl bg-[#141126] border border-[#272144] hover:border-[#3d3266] transition-all">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-white mb-3 shadow-md shadow-pink-500/20">
                    <Shield className="w-5 h-5" />
                  </div>
                  <span className="text-3xl font-extrabold text-white font-mono tabular-nums block">
                    {adminUsers.length}
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">Total Admin</span>
                </div>

                {/* 2. Total Kelas */}
                <div className="p-5 rounded-3xl bg-[#141126] border border-[#272144] hover:border-[#3d3266] transition-all">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white mb-3 shadow-md shadow-pink-500/20">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="text-3xl font-extrabold text-white font-mono tabular-nums block">
                    {classes.length}
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">Total Kelas</span>
                </div>

                {/* 3. Total Tugas */}
                <div className="p-5 rounded-3xl bg-[#141126] border border-[#272144] hover:border-[#3d3266] transition-all">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-fuchsia-600 flex items-center justify-center text-white mb-3 shadow-md shadow-pink-500/20">
                    <ListTodo className="w-5 h-5" />
                  </div>
                  <span className="text-3xl font-extrabold text-white font-mono tabular-nums block">
                    {tasks.length}
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">Total Tugas</span>
                </div>

                {/* 4. Online Sekarang */}
                <div className="p-5 rounded-3xl bg-[#141126] border border-[#272144] hover:border-[#3d3266] transition-all">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white mb-3 shadow-md shadow-purple-500/20">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <span className="text-3xl font-extrabold text-white font-mono tabular-nums block">
                    {realOnlineUsers}
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">Online Sekarang</span>
                </div>

                {/* 5. Status Server Supabase */}
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
                                <span className="font-bold text-white block">{admin.name}</span>
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

              {/* Grid 2 Columns: 1. Global System Maintenance, 2. AI Assistant Feature Mode */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Global System Maintenance Card */}
                <div className={`rounded-3xl border p-6 space-y-5 transition-all shadow-xl ${
                  maintenanceForm.isMaintenance
                    ? 'bg-[#181024] border-rose-500/50 shadow-rose-950/30'
                    : 'bg-[#141126] border-[#29224d]'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        maintenanceForm.isMaintenance
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}>
                        <Wrench className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-white text-lg">
                          Mode Pemeliharaan Website
                        </h3>
                        <p className="text-xs text-slate-400">
                          Tampilan halaman maintenance saat diakses pengunjung & siswa
                        </p>
                      </div>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                      maintenanceForm.isMaintenance
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse'
                        : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    }`}>
                      {maintenanceForm.isMaintenance ? '🔴 Aktif (Maintenance)' : '🟢 Normal (Online)'}
                    </span>
                  </div>

                  {/* Toggle Switch Button */}
                  <div className="p-4 rounded-2xl bg-[#0f0c1e] border border-[#261f47] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Status Saklar Maintenance</div>
                      <div className="text-[11px] text-slate-400">
                        {maintenanceForm.isMaintenance
                          ? 'Pengunjung & member melihat layar pemeliharaan server.'
                          : 'Website berjalan normal untuk seluruh pengguna.'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMaintenanceForm((prev) => ({ ...prev, isMaintenance: !prev.isMaintenance }))}
                      className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors cursor-pointer ${
                        maintenanceForm.isMaintenance ? 'bg-rose-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                          maintenanceForm.isMaintenance ? 'translate-x-8' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Customization Inputs */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Judul Layar Pemeliharaan
                      </label>
                      <input
                        type="text"
                        value={maintenanceForm.maintenanceTitle}
                        onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, maintenanceTitle: e.target.value }))}
                        placeholder="Contoh: Pemeliharaan Server & Pembaruan Sistem"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#0d0a1a] border border-[#2e2652] focus:border-pink-500 text-xs text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Pesan Deskripsi untuk Pengguna
                      </label>
                      <textarea
                        rows={3}
                        value={maintenanceForm.maintenanceMessage}
                        onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, maintenanceMessage: e.target.value }))}
                        placeholder="Ketikkan pesan pemeliharaan untuk pengguna..."
                        className="w-full px-4 py-2.5 rounded-xl bg-[#0d0a1a] border border-[#2e2652] focus:border-pink-500 text-xs text-white outline-none resize-none leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Estimasi Waktu Pengerjaan
                      </label>
                      <input
                        type="text"
                        value={maintenanceForm.maintenanceEstimate}
                        onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, maintenanceEstimate: e.target.value }))}
                        placeholder="Contoh: Segera selesai dalam beberapa saat / Estimasi 30 Menit"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#0d0a1a] border border-[#2e2652] focus:border-pink-500 text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                  {/* Quick Save Card Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={async () => {
                        setIsSavingMaintenance(true);
                        await updateSystemSettings({
                          isMaintenance: maintenanceForm.isMaintenance,
                          maintenanceTitle: maintenanceForm.maintenanceTitle,
                          maintenanceMessage: maintenanceForm.maintenanceMessage,
                          maintenanceEstimate: maintenanceForm.maintenanceEstimate,
                        });
                        setIsSavingMaintenance(false);
                      }}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:opacity-90 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      Terapkan Status Maintenance Website
                    </button>
                  </div>
                </div>

                {/* 2. AI Assistant Feature Mode Card */}
                <div className={`rounded-3xl border p-6 space-y-5 transition-all shadow-xl ${
                  maintenanceForm.isAiMaintenance
                    ? 'bg-[#181428] border-amber-500/40 shadow-amber-950/20'
                    : 'bg-[#141126] border-[#29224d]'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        maintenanceForm.isAiMaintenance
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                      }`}>
                        <Bot className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-white text-lg">
                          Status Fitur AI Assistant
                        </h3>
                        <p className="text-xs text-slate-400">
                          Buka obrolan tutor cerdas atau kunci ke layar tahap pengembangan
                        </p>
                      </div>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                      maintenanceForm.isAiMaintenance
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                    }`}>
                      {maintenanceForm.isAiMaintenance ? '🟡 Mode Pengembangan' : '🟢 AI Aktif (Live Chat)'}
                    </span>
                  </div>

                  {/* Toggle Switch Button */}
                  <div className="p-4 rounded-2xl bg-[#0f0c1e] border border-[#261f47] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Mode Fitur AI Assistant</div>
                      <div className="text-[11px] text-slate-400">
                        {maintenanceForm.isAiMaintenance
                          ? 'Siswa melihat layar "AI Assistant Sedang Bersiap! (Tahap Pengembangan)".'
                          : 'Siswa dapat langsung membuka dan berinteraksi dengan AI Chat Tutor.'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMaintenanceForm((prev) => ({ ...prev, isAiMaintenance: !prev.isAiMaintenance }))}
                      className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors cursor-pointer ${
                        maintenanceForm.isAiMaintenance ? 'bg-amber-500' : 'bg-purple-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                          maintenanceForm.isAiMaintenance ? 'translate-x-8' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Customization Inputs */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Judul Status AI
                      </label>
                      <input
                        type="text"
                        value={maintenanceForm.aiMaintenanceTitle}
                        onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, aiMaintenanceTitle: e.target.value }))}
                        placeholder="Contoh: AI Assistant Sedang Bersiap!"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#0d0a1a] border border-[#2e2652] focus:border-pink-500 text-xs text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Pesan Deskripsi Mode Pengembangan
                      </label>
                      <textarea
                        rows={3}
                        value={maintenanceForm.aiMaintenanceMessage}
                        onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, aiMaintenanceMessage: e.target.value }))}
                        placeholder="Ketikkan pesan pengembangan AI..."
                        className="w-full px-4 py-2.5 rounded-xl bg-[#0d0a1a] border border-[#2e2652] focus:border-pink-500 text-xs text-white outline-none resize-none leading-relaxed"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-300">
                          Progress Indikator Pengembangan (%)
                        </label>
                        <span className="text-xs font-mono font-bold text-amber-400">
                          {maintenanceForm.aiProgressPercent}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={maintenanceForm.aiProgressPercent}
                        onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, aiProgressPercent: Number(e.target.value) }))}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Quick Save Card Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={async () => {
                        setIsSavingMaintenance(true);
                        await updateSystemSettings({
                          isAiMaintenance: maintenanceForm.isAiMaintenance,
                          aiMaintenanceTitle: maintenanceForm.aiMaintenanceTitle,
                          aiMaintenanceMessage: maintenanceForm.aiMaintenanceMessage,
                          aiProgressPercent: maintenanceForm.aiProgressPercent,
                        });
                        setIsSavingMaintenance(false);
                      }}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-purple-600 hover:opacity-90 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      Terapkan Status Fitur AI Assistant
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Preview Screens */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl bg-[#141126] border border-[#272144]">
                <div>
                  <h4 className="text-sm font-bold text-white">Uji & Pratinjau Tampilan Pengguna</h4>
                  <p className="text-xs text-slate-400">Lihat simulasi persis bagaimana siswa/member melihat halaman pemeliharaan.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowMaintenancePreviewModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#20183b] hover:bg-[#2c2250] text-pink-300 border border-pink-500/30 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Pratinjau Layar Maintenance</span>
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
    </div>
  );
};
