import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Clock,
  Copy,
  Dice5,
  Download,
  Edit,
  ExternalLink,
  Eye,
  FileCheck2,
  FileCode,
  FileDown,
  FileSpreadsheet,
  FileText,
  Globe,
  GraduationCap,
  Heart,
  HelpCircle,
  Image as ImageIcon,
  Key,
  Layers,
  LayoutDashboard,
  Link2,
  ListTodo,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  MessageSquare,
  MessageSquareDashed,
  MessageSquarePlus,
  Paperclip,
  Plus,
  Presentation,
  QrCode,
  RefreshCw,
  Search,
  School,
  Settings,
  Shield,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  User,
  Users,
  Video,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ClassMaterial, Task, TaskSubmission, EducatorType } from '../../types';
import { AnalyticsView } from '../analytics/AnalyticsView';
import { CalendarView } from '../calendar/CalendarView';
import { DailyReportModal } from '../modals/DailyReportModal';
import { ModerationModal } from '../modals/ModerationModal';
import { TaskFormModal, calculateAutoPriority } from '../modals/TaskFormModal';
import { MaterialFormModal } from '../modals/MaterialFormModal';
import { BroadcastModal } from '../modals/BroadcastModal';
import { CreatorDonationCard } from '../common/CreatorDonationCard';
import { FeedbackView } from '../common/FeedbackView';
import { OwnerChatView } from '../common/OwnerChatView';
import { SpinWheelView } from './SpinWheelView';
import { ScheduleManagementView } from './ScheduleManagementView';
import { AnonymousWallAdminView } from './AnonymousWallAdminView';
import { AdminMemberChatView } from './AdminMemberChatView';
import { QuestionBankAdminView } from './QuestionBankAdminView';
import { AttendanceAdminView } from './AttendanceAdminView';
import { ForumView } from '../forum/ForumView';
import { ThemeToggle } from '../common/ThemeToggle';
import { RealTimeClock } from '../common/RealTimeClock';
import { formatIndonesianDate, getTaskDeadlineStatus, playNotificationSound } from '../../utils/notification';
import { downloadEvidenceFile, getFileCategory } from '../../utils/fileEvidence';
import { getSupabaseClient } from '../../services/supabase';
import { ProfileAvatarUploader } from '../common/ProfileAvatarUploader';
import { AdminEducatorTypeModal } from '../modals/AdminEducatorTypeModal';
import { getTerminology, resolveEducatorType } from '../../utils/terminology';

export const AdminPanel: React.FC = () => {
  const {
    currentUser,
    currentClass,
    logout,
    tasks,
    submissions,
    updateTask,
    deleteTask,
    materials,
    deleteMaterial,
    deleteClass,
    showToast,
    confirmAdminEducatorType,
    setIsNotificationDrawerOpen,
    unreadNotifCount,
    onlineUsersCount,
    syncWithSupabase,
    cleanStaleCacheAndSync,
    classAccessLogs,
    classChats,
    users,
    deleteMemberUser,
    questionBanks,
    moderateSubmission,
    forumPosts,
  } = useApp();

  const educatorType = resolveEducatorType(currentUser, currentClass);
  const terms = getTerminology(educatorType);

  const hasConfirmedEducator = useMemo(() => {
    if (currentUser?.educatorType) return true;
    if (currentClass?.educatorType) return true;
    if (!currentUser?.id) return true;
    if (localStorage.getItem('rt_confirmed_educator_' + currentUser.id) !== null) return true;
    if (currentUser.username && localStorage.getItem('rt_confirmed_educator_' + currentUser.username.toLowerCase()) !== null) return true;
    if (currentUser.classId && localStorage.getItem('rt_confirmed_educator_' + currentUser.classId) !== null) return true;
    if (currentClass?.id && localStorage.getItem('rt_confirmed_educator_' + currentClass.id) !== null) return true;
    if (currentClass?.code && localStorage.getItem('rt_confirmed_educator_' + currentClass.code) !== null) return true;
    return false;
  }, [currentUser?.id, currentUser?.username, currentUser?.classId, currentUser?.educatorType, currentClass?.id, currentClass?.code, currentClass?.educatorType]);

  const [preservedScrollPos, setPreservedScrollPos] = useState<number | null>(null);

  const handleQuickApproveSubmission = (e: React.MouseEvent, submissionId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const mainEl = document.querySelector('main');
    const mainScroll = mainEl ? mainEl.scrollTop : 0;
    const winScroll =
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    moderateSubmission(submissionId, 'completed', 'Disetujui langsung oleh Pengajar/Admin.');
    playNotificationSound('success');
    showToast(`Tugas ${terms.memberTitle.toLowerCase()} berhasil disetujui (Approved)!`, 'success');

    const doRestore = () => {
      const el = document.querySelector('main');
      if (el && mainScroll > 0) {
        el.scrollTop = mainScroll;
      }
      if (winScroll > 0) {
        window.scrollTo({ top: winScroll, behavior: 'instant' });
      }
    };

    doRestore();
    requestAnimationFrame(doRestore);
    setTimeout(doRestore, 30);
    setTimeout(doRestore, 100);
    setTimeout(doRestore, 250);
  };

  type AdminTab =
    | 'dashboard'
    | 'kelas'
    | 'tugas'
    | 'absensi'
    | 'bank_soal'
    | 'jadwal'
    | 'forum'
    | 'spin'
    | 'anonwall'
    | 'moderasi'
    | 'statistik'
    | 'kalender'
    | 'pengaturan'
    | 'donasi'
    | 'saran'
    | 'chat_siswa'
    | 'chat_owner';

  const unreadMemberChatsCount = useMemo(() => {
    if (!currentClass) return 0;
    return classChats.filter(
      (c) =>
        (c.classId === currentClass.id || c.classId === currentClass.code) &&
        c.senderRole === 'member' &&
        !c.isRead
    ).length;
  }, [classChats, currentClass]);

  const getAdminTabFromUrl = (): AdminTab => {
    try {
      const hash = window.location.hash.replace('#', '').trim().toLowerCase();
      const pathname = window.location.pathname.toLowerCase();
      const raw = hash || (pathname.startsWith('/admin/') ? pathname.replace('/admin/', '') : '');

      const ALIAS_MAP: Record<string, AdminTab> = {
        dashboard: 'dashboard',
        kelas: 'kelas',
        class: 'kelas',
        classes: 'kelas',
        tugas: 'tugas',
        task: 'tugas',
        tasks: 'tugas',
        materi: 'tugas',
        materials: 'tugas',
        'materi-tugas': 'tugas',
        absensi: 'absensi',
        absen: 'absensi',
        presensi: 'absensi',
        attendance: 'absensi',
        bank_soal: 'bank_soal',
        banksoal: 'bank_soal',
        soal: 'bank_soal',
        ujian: 'bank_soal',
        quiz: 'bank_soal',
        'bank-soal': 'bank_soal',
        jadwal: 'jadwal',
        schedule: 'jadwal',
        forum: 'forum',
        'forum-kelas': 'forum',
        'forum-global': 'forum',
        jasa: 'forum',
        market: 'forum',
        marketplace: 'forum',
        spin: 'spin',
        wheel: 'spin',
        'spin-wheel': 'spin',
        anonwall: 'anonwall',
        wall: 'anonwall',
        'anonymous-wall': 'anonwall',
        anonymous: 'anonwall',
        moderasi: 'moderasi',
        moderation: 'moderasi',
        statistik: 'statistik',
        stats: 'statistik',
        analytics: 'statistik',
        kalender: 'kalender',
        calendar: 'kalender',
        pengaturan: 'pengaturan',
        settings: 'pengaturan',
        donasi: 'donasi',
        donation: 'donasi',
        donate: 'donasi',
        saran: 'saran',
        feedback: 'saran',
        suggest: 'saran',
        suggestion: 'saran',
        chat_siswa: 'chat_siswa',
        chatsiswa: 'chat_siswa',
        student_chat: 'chat_siswa',
        chat_owner: 'chat_siswa',
        chat: 'chat_siswa',
        chats: 'chat_siswa',
      };

      if (raw && ALIAS_MAP[raw]) {
        return ALIAS_MAP[raw];
      }

      const saved = localStorage.getItem('rt_admin_active_tab');
      if (saved && ALIAS_MAP[saved]) {
        return ALIAS_MAP[saved];
      }
    } catch {}
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState<AdminTab>(getAdminTabFromUrl);

  // Track unread/new forum posts
  const [lastViewedForumTime, setLastViewedForumTime] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('rt_last_viewed_forum_' + (currentUser?.id || 'admin')) || '0', 10);
    } catch {
      return 0;
    }
  });

  const hasUnreadForum = useMemo(() => {
    if (!forumPosts || forumPosts.length === 0) return false;
    return forumPosts.some((p) => {
      const isForClass = p.scope === 'global' || p.classId === currentClass?.id;
      const isNew = new Date(p.createdAt).getTime() > lastViewedForumTime;
      const isNotMe = p.authorId !== currentUser?.id;
      return isForClass && isNew && isNotMe;
    });
  }, [forumPosts, lastViewedForumTime, currentClass, currentUser]);

  useEffect(() => {
    if (activeTab === 'forum') {
      const now = Date.now();
      setLastViewedForumTime(now);
      try {
        localStorage.setItem('rt_last_viewed_forum_' + (currentUser?.id || 'admin'), now.toString());
      } catch {}
    }
  }, [activeTab, currentUser?.id]);

  useEffect(() => {
    try {
      localStorage.setItem('rt_admin_active_tab', activeTab);
      const targetUrl = `/admin/#${activeTab}`;
      if (window.location.pathname + window.location.hash !== targetUrl) {
        window.history.replaceState(null, '', targetUrl);
      }
    } catch {}
  }, [activeTab]);

  useEffect(() => {
    const handleUrlSync = () => {
      const newTab = getAdminTabFromUrl();
      setActiveTab(newTab);
    };

    const handleCustomNavigate = (e: any) => {
      if (e?.detail?.tab) {
        setActiveTab(e.detail.tab as AdminTab);
        if (e.detail.taskId) {
          setTimeout(() => {
            const el = document.getElementById(`task-${e.detail.taskId}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('ring-2', 'ring-pink-500');
              setTimeout(() => el.classList.remove('ring-2', 'ring-pink-500'), 3000);
            }
          }, 350);
        }
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
  const [preselectedDate, setPreselectedDate] = useState<string | undefined>();
  const [moderatingSubmission, setModeratingSubmission] = useState<TaskSubmission | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'all' | 'active' | 'priority' | 'overdue'>('all');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Materi & Tugas sub-tab state
  const [subTabMateriTugas, setSubTabMateriTugas] = useState<'materi' | 'tugas'>('materi');
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<ClassMaterial | null>(null);
  const [materialSearch, setMaterialSearch] = useState('');
  const [selectedMaterialCategory, setSelectedMaterialCategory] = useState<string>('all');

  // Settings tab form states
  const [adminNameInput, setAdminNameInput] = useState(currentUser?.name || '');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminClassNameInput, setAdminClassNameInput] = useState(currentClass?.name || '');
  const [adminClassDescInput, setAdminClassDescInput] = useState(currentClass?.description || '');
  const [adminEducatorTypeSetting, setAdminEducatorTypeSetting] = useState<EducatorType>(
    currentUser?.educatorType || currentClass?.educatorType || 'dosen'
  );
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (currentUser?.name) setAdminNameInput(currentUser.name);
    if (currentClass?.name) setAdminClassNameInput(currentClass.name);
    if (currentClass?.description) setAdminClassDescInput(currentClass.description);
    if (currentUser?.educatorType || currentClass?.educatorType) {
      setAdminEducatorTypeSetting(currentUser?.educatorType || currentClass?.educatorType || 'dosen');
    }
  }, [currentUser, currentClass]);

  // Access Logs filtering & mapping
  const [accessLogSearch, setAccessLogSearch] = useState('');

  const currentClassLogs = useMemo(() => {
    if (!currentClass) return [];
    const explicit = classAccessLogs.filter(
      (l) => l.classId === currentClass.id || l.classCode === currentClass.code
    );

    const logMap = new Map<string, typeof explicit[0]>();
    explicit.forEach((l) => logMap.set(l.studentId, l));

    // Fallback: Map registered members in this class if not already logged
    const classMembers = users.filter((u) => u.role === 'member' && u.classId === currentClass.id);
    classMembers.forEach((m) => {
      if (!logMap.has(m.id)) {
        logMap.set(m.id, {
          id: 'user-' + m.id,
          classId: currentClass.id,
          className: currentClass.name,
          classCode: currentClass.code,
          studentId: m.id,
          studentName: m.name,
          studentEmail: m.email || `${m.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@siswa.remindtask.com`,
          accessedAt: m.createdAt,
          deviceInfo: 'Perangkat Web',
        });
      }
    });

    return Array.from(logMap.values()).sort(
      (a, b) => new Date(b.accessedAt).getTime() - new Date(a.accessedAt).getTime()
    );
  }, [classAccessLogs, users, currentClass]);

  const filteredAccessLogs = useMemo(() => {
    const q = accessLogSearch.trim().toLowerCase();
    if (!q) return currentClassLogs;
    return currentClassLogs.filter(
      (l) => l.studentName.toLowerCase().includes(q)
    );
  }, [currentClassLogs, accessLogSearch]);

  // Tasks and Materials for current class
  const classTasks = tasks.filter((t) => t.classId === currentClass?.id);
  const classSubmissions = submissions.filter((s) => s.classId === currentClass?.id);
  const classMaterials = useMemo(() => {
    if (!currentClass) return [];
    return materials.filter(
      (m) =>
        m.classId === currentClass.id ||
        (currentClass.code && m.classId === currentClass.code) ||
        (currentClass.name && m.classId === currentClass.name)
    );
  }, [materials, currentClass]);

  const filteredClassMaterials = useMemo(() => {
    return classMaterials.filter((m) => {
      const q = materialSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        m.tags?.some((tag) => tag.toLowerCase().includes(q));
      const matchesCat =
        selectedMaterialCategory === 'all' || m.category === selectedMaterialCategory;
      return matchesSearch && matchesCat;
    });
  }, [classMaterials, materialSearch, selectedMaterialCategory]);

  const handleQuickExtendTask = (task: Task, daysToAdd: number) => {
    const now = new Date();
    const baseDate = new Date(task.dueDate).getTime() > now.getTime() ? new Date(task.dueDate) : now;
    const newDate = new Date(baseDate);
    newDate.setDate(newDate.getDate() + daysToAdd);
    newDate.setHours(23, 59, 0, 0);
    const newDueDate = newDate.toISOString();
    const priority = calculateAutoPriority(newDueDate).priority;

    updateTask(task.id, {
      dueDate: newDueDate,
      priority,
    });
    showToast(`Tenggat tugas "${task.title}" diperpanjang ${daysToAdd} hari (s/d ${formatIndonesianDate(newDueDate)})!`, 'success');
  };

  // Real statistics
  const totalTugas = classTasks.length;
  const completedCount = classSubmissions.filter((s) => s.status === 'completed').length;
  const activeTasks = classTasks.filter((t) => {
    const isCompleted = classSubmissions.some((s) => s.taskId === t.id && s.status === 'completed');
    return !isCompleted;
  });
  const priorityCount = classTasks.filter((t) => t.priority === 'tinggi').length;
  const moderatableSubmissions = classSubmissions.filter((sub) => {
    const task = tasks.find((t) => t.id === sub.taskId);
    if (task && task.requiresUpload === false) return false;
    return true;
  });
  const pendingModeration = moderatableSubmissions.filter((s) => s.status === 'pending_review');
  const realOnlineUsers = Math.max(1, onlineUsersCount);

  interface AdminMenuItem {
    id: AdminTab;
    label: string;
    icon: any;
    badge?: number;
    iconColor?: string;
  }

  interface AdminMenuGroup {
    title: string;
    items: AdminMenuItem[];
  }

  const adminMenuGroups: AdminMenuGroup[] = [
    {
      title: 'Akademik & Kelas',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'kelas', label: 'Ruang Kelas', icon: Layers },
        { id: 'tugas', label: 'Materi & Tugas', icon: BookOpen },
        { id: 'absensi', label: `Absensi ${terms.memberTitlePlural}`, icon: QrCode, iconColor: 'text-emerald-400' },
        { id: 'bank_soal', label: terms.isCollege ? 'Bank Soal Perkuliahan' : 'Bank Soal & Ujian', icon: HelpCircle },
        { id: 'jadwal', label: terms.isCollege ? 'Jadwal Perkuliahan' : 'Jadwal Pelajaran', icon: CalendarDays, iconColor: 'text-pink-400' },
        { id: 'kalender', label: 'Kalender', icon: Calendar },
        { id: 'statistik', label: `Statistik ${terms.memberTitlePlural}`, icon: BarChart3 },
      ],
    },
    {
      title: 'Aktivitas & Interaksi',
      items: [
        { id: 'forum', label: 'Forum & Jasa', icon: Globe, iconColor: 'text-pink-400', badge: hasUnreadForum ? 1 : undefined },
        { id: 'spin', label: 'Roda Spin & Kelompok', icon: Dice5, iconColor: 'text-purple-400' },
        { id: 'anonwall', label: 'Pesan Anonim', icon: MessageSquareDashed, iconColor: 'text-amber-400' },
      ],
    },
    {
      title: 'Komunikasi & Moderasi',
      items: [
        { id: 'moderasi', label: 'Pemeriksaan Tugas', icon: FileCheck2, badge: pendingModeration.length || undefined },
        { id: 'chat_siswa', label: 'Chat & Pesan', icon: MessageSquare, badge: unreadMemberChatsCount || undefined, iconColor: 'text-pink-400' },
        { id: 'saran', label: 'Kritik & Saran', icon: MessageSquarePlus, iconColor: 'text-pink-400' },
      ],
    },
    {
      title: 'Pengaturan',
      items: [
        { id: 'pengaturan', label: 'Pengaturan', icon: Settings },
        { id: 'donasi', label: 'Creator & Donasi', icon: Heart, iconColor: 'text-pink-400' },
      ],
    },
  ];

  const copyClassCode = () => {
    if (!currentClass?.code) return;
    navigator.clipboard.writeText(currentClass.code);
    setCopiedCode(true);
    playNotificationSound('beep');
    showToast(`Kode kelas ${currentClass.code} berhasil disalin!`, 'success');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleRefresh = async () => {
    await syncWithSupabase();
    showToast('Data kelas telah diperbarui ke status server terkini.', 'info');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSavingSettings(true);

    try {
      await confirmAdminEducatorType(adminEducatorTypeSetting);

      const client = getSupabaseClient();
      if (client) {
        const profileUpdates: any = {
          name: adminNameInput.trim(),
          class_name: adminClassNameInput.trim(),
          educator_type: adminEducatorTypeSetting,
        };
        if (adminNewPassword.trim()) {
          profileUpdates.password = adminNewPassword.trim();
        }

        await client.from('profiles').update(profileUpdates).eq('id', currentUser.id);

        if (currentClass?.id) {
          await client.from('classes').update({
            name: adminClassNameInput.trim(),
            description: adminClassDescInput.trim(),
            admin_name: adminNameInput.trim(),
            educator_type: adminEducatorTypeSetting,
          }).eq('id', currentClass.id);
        }
      }

      showToast('Pengaturan profil & identitas admin berhasil disimpan!', 'success');
      setAdminNewPassword('');
      await syncWithSupabase();
    } catch (err) {
      console.warn('Save settings error:', err);
      showToast('Gagal menyimpan pengaturan.', 'warn');
    }
    setIsSavingSettings(false);
  };

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
            <span className="text-[9px] font-bold text-purple-400 block uppercase">
              ADMIN: {currentClass?.name || 'Ruang Kelas'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setIsNotificationDrawerOpen(true)}
            className="relative p-2 rounded-xl bg-[#1b1536] text-slate-300 hover:text-white border border-[#2b224d]"
            title="Notifikasi"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-500 text-white font-mono text-[9px] font-bold flex items-center justify-center">
                {unreadNotifCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-xl bg-[#1f173d] text-white border border-[#382b60] flex items-center justify-center cursor-pointer"
            title="Menu Admin"
            aria-label="Toggle Menu Admin"
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
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-xs text-white truncate max-w-[120px]">{currentUser?.name || 'Admin'}</h3>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {terms.educatorTitle}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{currentClass?.name || 'Ruang Kelas'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#20183b]"
                >
                  <X className="w-5 h-5 text-pink-400" />
                </button>
              </div>

              {/* Class Code pill in drawer */}
              <div className="p-3 mb-4 rounded-xl bg-[#181330] border border-[#2e2454] flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-400 font-mono block">KODE KELAS:</span>
                  <span className="text-sm font-black font-mono text-pink-400">{currentClass?.code || '------'}</span>
                </div>
                <button
                  onClick={copyClassCode}
                  className="px-2.5 py-1 rounded-lg bg-[#271d47] text-pink-300 text-xs font-bold flex items-center gap-1 border border-[#3d2b6b]"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedCode ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>

              {/* Mobile navigation links */}
              <div className="space-y-4">
                {adminMenuGroups.map((group, gIdx) => (
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
                                ? 'bg-pink-500/10 border-pink-500/30 text-pink-300 shadow-sm'
                                : 'text-slate-300 hover:text-white hover:bg-[#161131] border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-pink-300' : item.iconColor || 'text-slate-400'}`} />
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
                onClick={() => {
                  setIsReportModalOpen(true);
                  setMobileSidebarOpen(false);
                }}
                className="w-full py-2 rounded-xl bg-[#20183b] text-pink-300 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Laporan Harian</span>
              </button>
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

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-64 bg-[#110e22] border-r border-[#221c3d] flex-col justify-between shrink-0 p-4 min-h-screen sticky top-0">
        <div>
          {/* Top Logo */}
          <div className="flex items-center justify-between gap-2 px-2 py-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/25">
                <CheckCircle2 className="w-6 h-6 text-white stroke-[2.5]" />
              </div>
              <div>
                <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                  REMINDTASK
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                  ADMIN PANEL
                </span>
              </div>
            </div>
            <ThemeToggle />
          </div>

          {/* User Profile Card */}
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#191433] border border-[#2b224d] mb-5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Shield className="w-5 h-5 text-pink-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-white truncate">
                  {currentUser?.name || 'Admin'}
                </h4>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                  {terms.educatorTitle}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                {currentClass?.name || 'Ruang Kelas'}
              </p>
            </div>
          </div>

          {/* MAIN MENU */}
          <div className="space-y-4">
            {adminMenuGroups.map((group, gIdx) => (
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
                        className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          isActive
                            ? 'bg-pink-500/10 border-pink-500/30 text-pink-300 shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-[#161131] border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-pink-300' : item.iconColor || 'text-slate-400'}`} />
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

          {/* KODE KELAS Sidebar Box */}
          <div className="mt-5 p-4 rounded-2xl bg-[#181330] border border-[#2b224d]">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
              <Key className="w-3.5 h-3.5 text-pink-400" />
              <span>KODE KELAS</span>
            </div>
            <div className="text-2xl font-black font-mono tracking-widest text-white mb-3">
              {currentClass?.code || '------'}
            </div>
            <button
              onClick={copyClassCode}
              className="w-full py-2 rounded-xl bg-[#241c44] hover:bg-[#32265e] text-pink-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedCode ? 'Tersalin!' : 'Salin kode'}</span>
            </button>
          </div>
        </div>

        {/* Sidebar Footer: Notifikasi & Logout */}
        <div className="pt-4 border-t border-[#221c3d] space-y-2">
          <button
            onClick={() => setIsNotificationDrawerOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#17132e] hover:bg-[#251e47] text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-pink-400" />
              <span>Notifikasi</span>
            </div>
            {unreadNotifCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-pink-500 text-white font-mono text-[9px] flex items-center justify-center">
                {unreadNotifCount}
              </span>
            )}
          </button>
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
        {/* Header Bar */}
        <header className="px-6 py-4 border-b border-[#201a3b] bg-[#110e22]/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400 block">
              CLASS MANAGEMENT
            </span>
            <div className="flex items-baseline gap-3">
              <h2 className="text-2xl font-black text-white tracking-tight capitalize">
                {activeTab === 'donasi'
                  ? 'Creator & Donasi'
                  : activeTab === 'pengaturan'
                  ? 'Pengaturan Akun & Kelas'
                  : activeTab === 'absensi'
                  ? 'Presensi Kelas (Kode QR Real-Time)'
                  : activeTab === 'bank_soal'
                  ? 'Bank Soal & Ujian'
                  : activeTab === 'jadwal'
                  ? 'Jadwal Mata Pelajaran / Kuliah'
                  : activeTab === 'spin'
                  ? 'Roda Spin & Acak Kelompok'
                  : activeTab === 'anonwall'
                  ? 'Papan Pesan Anonim (Anonymous Wall)'
                  : activeTab}
              </h2>
              <span className="text-xs text-slate-400 hidden sm:inline">
                Kode kelas, informasi kelas, dan tugas terbaru.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <RealTimeClock />
            <button
              onClick={() => setIsNotificationDrawerOpen(true)}
              className="relative p-2.5 rounded-xl bg-[#1d1738] hover:bg-[#2a2250] text-slate-300 hover:text-white border border-[#2e2652] transition-colors cursor-pointer flex items-center justify-center"
              title="Pusat Notifikasi"
            >
              <Bell className="w-4 h-4 text-pink-400" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-pink-500 text-white font-mono text-[9px] font-black animate-pulse shadow-sm shadow-pink-500/50">
                  {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsBroadcastModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-pink-500/20"
              title="Kirim Broadcast Siaran Kelas"
            >
              <Megaphone className="w-3.5 h-3.5 text-white" />
              <span>Broadcast</span>
            </button>
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#20183b] hover:bg-[#2c2252] text-pink-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Laporan Harian</span>
            </button>
            <button
              onClick={handleRefresh}
              className="px-3.5 py-2 rounded-xl bg-[#1d1738] hover:bg-[#2a2250] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-[#2e2652]"
            >
              <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* TAB 1: KELAS */}
          {activeTab === 'kelas' && (
            <div className="space-y-6">
              {/* Class Space Hero Banner */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#20153f] via-[#1a1233] to-[#120f26] border border-[#34275a] p-8 shadow-xl">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-pink-400 block mb-1">
                      CLASS SPACE
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      {currentClass?.name || 'Ruang Kelas'}
                    </h2>
                    <p className="text-sm text-slate-300 mt-2 max-w-xl">
                      Informasi kelas, kode akses, dan ringkasan tugas kelas.
                    </p>
                  </div>

                  {/* KODE KELAS Card */}
                  <div className="p-4 rounded-2xl bg-[#181230]/80 border border-[#382b5c] backdrop-blur-md text-center min-w-[180px]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      KODE KELAS
                    </span>
                    <span className="text-3xl font-black font-mono text-white tracking-widest block mb-2">
                      {currentClass?.code || '------'}
                    </span>
                    <button
                      onClick={copyClassCode}
                      className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-pink-500/20 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedCode ? 'Tersalin!' : 'Salin Kode'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 6 Metric Cards Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {/* 1. Total Tugas */}
                <div className="p-4 rounded-2xl bg-[#141126] border border-[#272144]">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                    <ListTodo className="w-3.5 h-3.5 text-pink-400" />
                    <span>Total Tugas</span>
                  </div>
                  <span className="text-2xl font-black text-white font-mono tabular-nums">
                    {totalTugas}
                  </span>
                </div>

                {/* 2. Tugas Aktif */}
                <div className="p-4 rounded-2xl bg-[#141126] border border-[#272144]">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                    <Zap className="w-3.5 h-3.5 text-purple-400" />
                    <span>Tugas Aktif</span>
                  </div>
                  <span className="text-2xl font-black text-white font-mono tabular-nums">
                    {activeTasks.length}
                  </span>
                </div>

                {/* 3. Selesai */}
                <div className="p-4 rounded-2xl bg-[#141126] border border-[#272144]">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Selesai</span>
                  </div>
                  <span className="text-2xl font-black text-white font-mono tabular-nums">
                    {completedCount}
                  </span>
                </div>

                {/* 4. Prioritas */}
                <div className="p-4 rounded-2xl bg-[#141126] border border-[#272144]">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    <span>Prioritas</span>
                  </div>
                  <span className="text-2xl font-black text-white font-mono tabular-nums">
                    {priorityCount}
                  </span>
                </div>

                {/* 5. Total Akses anggota (Realtime dari Database) */}
                <div className="p-4 rounded-2xl bg-[#141126] border border-[#272144]">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                    <Users className="w-3.5 h-3.5 text-pink-300" />
                    <span>Total Akses anggota</span>
                  </div>
                  <span className="text-2xl font-black text-white font-mono tabular-nums">
                    {currentClass?.memberCount || 0}
                  </span>
                </div>

                {/* 6. Online Sekarang (Realtime per Kode Kelas) */}
                <div className="p-4 rounded-2xl bg-[#141126] border border-[#272144] relative overflow-hidden group">
                  <div className="flex items-center justify-between gap-1.5 text-xs text-slate-400 font-medium mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span>Online Sekarang</span>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase">
                      Live
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white font-mono tabular-nums">
                      {realOnlineUsers}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{terms.memberTitle} / User</span>
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-1 font-mono truncate">
                    Aktif di kode kelas: {currentClass?.code || '---'}
                  </span>
                </div>
              </div>

              {/* Two Columns: Detail Kelas & Tugas Terbaru */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: INFORMASI - Detail Kelas */}
                <div className="p-6 rounded-3xl bg-[#141126] border border-[#272144] flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400 block mb-1">
                      INFORMASI
                    </span>
                    <h3 className="text-lg font-bold text-white mb-4">Detail Kelas</h3>
                    <div className="space-y-3.5 text-xs">
                      <div className="flex items-center justify-between py-2 border-b border-[#231d3d]">
                        <span className="text-slate-400">Nama Kelas</span>
                        <span className="font-bold text-white">{currentClass?.name || ' '}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-[#231d3d]">
                        <span className="text-slate-400">Peran Admin ({terms.educatorTitle})</span>
                        <span className="font-bold text-white">{currentUser?.name || currentClass?.adminName || ' '}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-[#231d3d]">
                        <span className="text-slate-400">Kode Akses {terms.memberTitle}</span>
                        <span className="font-mono font-bold text-pink-400">{currentClass?.code || ' '}</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-slate-400">Total {terms.memberTitlePlural} Terdaftar</span>
                        <span className="font-bold text-white">
                          {currentClass?.memberCount || 0} {terms.memberTitlePlural}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#231d3d] space-y-2.5">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingTask(null);
                          setIsTaskModalOpen(true);
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-pink-500/20 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Buat Tugas Baru</span>
                      </button>
                      <button
                        onClick={copyClassCode}
                        className="px-4 py-2.5 rounded-xl bg-[#211a3d] hover:bg-[#2e2456] text-pink-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Kode</span>
                      </button>
                    </div>

                    <button
                      onClick={async () => {
                        if (!currentClass) return;
                        if (window.confirm(`PERHATIAN: Apakah Anda yakin ingin menghapus kelas "${currentClass.name}" beserta seluruh tugas, data ${terms.memberTitlePlural.toLowerCase()}, dan akun ${terms.educatorTitle.toLowerCase()} terkait secara permanen?`)) {
                          await deleteClass(currentClass.id);
                          showToast('Kelas dan data terkait berhasil dihapus.', 'success');
                          logout();
                        }
                      }}
                      className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                      <span>Hapus Ruang Kelas Ini</span>
                    </button>
                  </div>
                </div>

                {/* Right Column: AKTIVITAS - Tugas Terbaru */}
                <div className="p-6 rounded-3xl bg-[#141126] border border-[#272144] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400 block mb-1">
                          AKTIVITAS
                        </span>
                        <h3 className="text-lg font-bold text-white">Tugas Terbaru</h3>
                      </div>
                      <button
                        onClick={() => setActiveTab('tugas')}
                        className="text-xs text-pink-400 hover:text-pink-300 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <span>Kelola tugas</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {classTasks.slice(0, 3).map((task) => {
                        const deadlineStatus = getTaskDeadlineStatus(task.dueDate);
                        return (
                          <div
                            key={task.id}
                            className="p-3.5 rounded-2xl bg-[#1a1433] border border-[#2c2350] hover:border-pink-500/50 transition-all flex items-center justify-between gap-3 group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                                <AlertTriangle className="w-4 h-4 text-pink-400" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-white truncate group-hover:text-pink-300 transition-colors">
                                  {task.title}
                                </h4>
                                <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                                  {formatIndonesianDate(task.dueDate)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${deadlineStatus.badgeClass}`}
                              >
                                {deadlineStatus.label}
                              </span>
                              {deadlineStatus.status === 'overdue' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTask(task);
                                    setIsTaskModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 hover:text-white text-[10px] font-bold border border-pink-500/35 flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Edit tugas dan perpanjang waktu deadline"
                                >
                                  <Clock className="w-3 h-3" />
                                  <span>Perpanjang</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#231d3d] flex items-center justify-between text-xs text-slate-400">
                    <span>{classTasks.length} tugas terdaftar di kelas</span>
                    <button
                      onClick={() => setActiveTab('moderasi')}
                      className="text-purple-300 hover:text-white font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Lihat Unggahan {terms.memberTitle}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* DAFTAR & RIWAYAT PENGAKSES KODE KELAS */}
              <div className="p-6 rounded-3xl bg-[#141126] border border-[#272144] shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#231d3e]">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Key className="w-5 h-5 text-pink-400" />
                      <h3 className="text-lg font-extrabold text-white">Daftar &amp; Riwayat Pengakses Kode Kelas</h3>
                    </div>
                    <p className="text-xs text-slate-400">
                      Pantau siapa saja {terms.memberTitlePlural.toLowerCase()} yang memasukkan kode kelas <span className="font-mono text-pink-300 font-bold">({currentClass?.code})</span> beserta waktu akses secara realtime.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-300 font-mono text-xs font-bold shrink-0">
                      {currentClassLogs.length} {terms.memberTitlePlural} Terdaftar
                    </span>
                  </div>
                </div>

                {/* Filter Search */}
                <div className="relative max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={accessLogSearch}
                    onChange={(e) => setAccessLogSearch(e.target.value)}
                    placeholder={`Cari berdasarkan nama ${terms.memberTitle.toLowerCase()}...`}
                    className="w-full bg-[#0f0c1f] border border-[#271e42] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-pink-500 transition-colors font-medium"
                  />
                </div>

                {/* Table of Access Logs */}
                <div className="overflow-x-auto">
                  {filteredAccessLogs.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-xs">
                      Belum ada riwayat {terms.memberTitlePlural.toLowerCase()} yang mengakses kode kelas ini.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#241c42] text-slate-400">
                          <th className="pb-3 font-bold uppercase tracking-wider text-[10px]">Nama {terms.memberTitle}</th>
                          <th className="pb-3 font-bold uppercase tracking-wider text-[10px]">Kode Kelas</th>
                          <th className="pb-3 font-bold uppercase tracking-wider text-[10px]">Waktu Akses</th>
                          <th className="pb-3 font-bold uppercase tracking-wider text-[10px]">Perangkat</th>
                          <th className="pb-3 font-bold uppercase tracking-wider text-[10px] text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e1738]">
                        {filteredAccessLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-[#1a1438] transition-colors group">
                            <td className="py-3.5 font-bold text-white">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-sm shrink-0">
                                  {log.studentName.charAt(0).toUpperCase()}
                                </div>
                                <span className="truncate max-w-[150px] sm:max-w-xs">{log.studentName}</span>
                              </div>
                            </td>
                            <td className="py-3.5 font-mono font-bold text-pink-400">
                              {log.classCode}
                            </td>
                            <td className="py-3.5 text-slate-400 font-mono">
                              {formatIndonesianDate(log.accessedAt)}
                            </td>
                            <td className="py-3.5">
                              <span className="px-2 py-0.5 rounded-full bg-[#231a40] text-purple-300 border border-[#34275d] text-[10px] font-semibold">
                                {log.deviceInfo || 'Desktop / Laptop'}
                              </span>
                            </td>
                            <td className="py-3.5 text-right flex items-center justify-end gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Hapus ${terms.memberTitle.toLowerCase()} "${log.studentName}" dari kelas ini?`)) {
                                    await deleteMemberUser(log.studentId);
                                    showToast(`${terms.memberTitle} "${log.studentName}" berhasil dihapus dari kelas.`, 'info');
                                  }
                                }}
                                className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-[10px] font-bold border border-red-500/30 transition-colors inline-flex items-center gap-1 cursor-pointer relative z-20"
                                title={`Hapus ${terms.memberTitle} dari Kelas`}
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                                <span>Hapus</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-gradient-to-r from-[#20153f] via-[#1a1233] to-[#120f26] border border-[#34275a] flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white">Dashboard {terms.educatorTitle}</h2>
                  <p className="text-xs text-slate-300 mt-1">
                    Kelola tenggat waktu, buat instruksi baru, dan periksa penyerahan tugas {terms.memberTitlePlural.toLowerCase()}.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingTask(null);
                    setIsTaskModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-pink-500/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Tugas Baru</span>
                </button>
              </div>

              {/* Task table */}
              <div className="bg-[#141126] border border-[#272144] rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white text-base">Daftar Semua Tugas Kelas</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTaskFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                        taskFilter === 'all' ? 'bg-pink-500 text-white' : 'bg-[#1e183a] text-slate-300'
                      }`}
                    >
                      Semua ({classTasks.length})
                    </button>
                    <button
                      onClick={() => setTaskFilter('priority')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                        taskFilter === 'priority' ? 'bg-pink-500 text-white' : 'bg-[#1e183a] text-slate-300'
                      }`}
                    >
                      Prioritas Tinggi ({priorityCount})
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-[#231c40]">
                  {classTasks.map((t) => {
                    const status = getTaskDeadlineStatus(t.dueDate);
                    const subCount = classSubmissions.filter((s) => s.taskId === t.id).length;
                    return (
                      <div key={t.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white text-sm">{t.title}</h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.badgeClass}`}>
                              {status.label}
                            </span>
                            <span className="text-[10px] font-semibold text-purple-300 bg-[#251d45] px-2 py-0.5 rounded">
                              {t.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 max-w-xl">{t.description}</p>
                          <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                            Tenggat: {formatIndonesianDate(t.dueDate)} • {subCount} {terms.memberTitlePlural.toLowerCase()} mengumpulkan
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingTask(t);
                              setIsTaskModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#20183b] text-purple-300 hover:text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => deleteTask(t.id)}
                            className="p-1.5 rounded-lg bg-[#20183b] text-red-400 hover:text-red-300 text-xs cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MATERI & TUGAS */}
          {activeTab === 'tugas' && (
            <div className="space-y-5">
              {/* Header Card */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141126] border border-[#272144] p-5 sm:p-6 rounded-3xl">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-5 h-5 text-pink-400" />
                    <h3 className="text-lg sm:text-xl font-extrabold text-white">Materi & Tugas Kelas</h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    Kelola modul pembelajaran, materi belajar, dan penugasan kelas dalam satu tempat
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {subTabMateriTugas === 'materi' ? (
                    <button
                      onClick={() => {
                        setEditingMaterial(null);
                        setIsMaterialModalOpen(true);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-pink-500/25 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Upload / Buat Materi</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingTask(null);
                        setIsTaskModalOpen(true);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-pink-500/25 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Buat Tugas Baru</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Sub-Tab Navigation Toggle */}
              <div className="flex items-center justify-between gap-2 p-1.5 bg-[#120e24] border border-[#261e44] rounded-2xl">
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <button
                    onClick={() => setSubTabMateriTugas('materi')}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      subTabMateriTugas === 'materi'
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/25'
                        : 'text-slate-400 hover:text-white hover:bg-[#1c1638]'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Materi Pembelajaran</span>
                    <span className="px-2 py-0.5 rounded-full bg-black/30 font-mono text-[10px]">
                      {classMaterials.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setSubTabMateriTugas('tugas')}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      subTabMateriTugas === 'tugas'
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/25'
                        : 'text-slate-400 hover:text-white hover:bg-[#1c1638]'
                    }`}
                  >
                    <ListTodo className="w-4 h-4" />
                    <span>Tugas Kelas</span>
                    <span className="px-2 py-0.5 rounded-full bg-black/30 font-mono text-[10px]">
                      {classTasks.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* SUBTAB 1: MATERI PEMBELAJARAN */}
              {subTabMateriTugas === 'materi' && (
                <div className="space-y-4">
                  {/* Search and Category Filters */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={materialSearch}
                        onChange={(e) => setMaterialSearch(e.target.value)}
                        placeholder="Cari materi, judul, ringkasan, atau tag..."
                        className="w-full bg-[#15112a] border border-[#2d2350] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-pink-500 transition-colors"
                      />
                      {materialSearch && (
                        <button
                          onClick={() => setMaterialSearch('')}
                          className="absolute right-3 top-2 text-slate-400 hover:text-white text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-semibold">
                      {[
                        { id: 'all', label: 'Semua Kategori' },
                        { id: 'Modul / PDF', label: 'Modul/PDF' },
                        { id: 'Slide Presentasi', label: 'Slide' },
                        { id: 'Video Pembelajaran', label: 'Video' },
                        { id: 'Catatan / Ringkasan', label: 'Catatan' },
                        { id: 'Tautan / Referensi', label: 'Tautan' },
                        { id: 'Latihan Soal', label: 'Latihan Soal' },
                      ].map((cat) => {
                        const isSelected = selectedMaterialCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedMaterialCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-pink-500/20 border-pink-500 text-pink-300 font-bold'
                                : 'bg-[#15112a] border-[#2d2350] text-slate-400 hover:text-white hover:bg-[#1d173a]'
                            }`}
                          >
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Materials Grid */}
                  {filteredClassMaterials.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredClassMaterials.map((m) => {
                        const getCategoryBadge = (cat: string) => {
                          switch (cat) {
                            case 'Modul / PDF':
                              return { bg: 'bg-rose-500/15 text-rose-300 border-rose-500/30', icon: FileText };
                            case 'Slide Presentasi':
                              return { bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30', icon: Presentation };
                            case 'Video Pembelajaran':
                              return { bg: 'bg-sky-500/15 text-sky-300 border-sky-500/30', icon: Video };
                            case 'Catatan / Ringkasan':
                              return { bg: 'bg-purple-500/15 text-purple-300 border-purple-500/30', icon: BookOpen };
                            case 'Tautan / Referensi':
                              return { bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: Link2 };
                            default:
                              return { bg: 'bg-pink-500/15 text-pink-300 border-pink-500/30', icon: CheckSquare };
                          }
                        };
                        const badge = getCategoryBadge(m.category);
                        const CategoryIcon = badge.icon;

                        return (
                          <div
                            key={m.id}
                            className="p-5 rounded-3xl bg-[#141126] border border-[#272144] hover:border-[#3d2e68] transition-all flex flex-col justify-between group shadow-md"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-3">
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${badge.bg}`}>
                                  <CategoryIcon className="w-3 h-3" />
                                  <span>{m.category}</span>
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {formatIndonesianDate(m.createdAt)}
                                </span>
                              </div>

                              <h4 className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors line-clamp-2">
                                {m.title}
                              </h4>

                              {m.description && (
                                <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                                  {m.description}
                                </p>
                              )}

                              {/* Tags */}
                              {m.tags && m.tags.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                                  {m.tags.map((tag, idx) => (
                                    <span
                                      key={idx}
                                      className="text-[9px] font-semibold px-2 py-0.5 rounded-lg bg-[#1f173d] text-purple-300 border border-[#33265a]"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Attachment preview / download link */}
                              {(m.fileName || m.externalLink) && (
                                <div className="mt-3.5 pt-3 border-t border-[#221a3d]">
                                  {m.fileUrl ? (
                                    <a
                                      href={m.fileUrl}
                                      download={m.fileName || 'materi-belajar'}
                                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#1b1535] hover:bg-[#261d4b] border border-[#372a60] text-pink-300 hover:text-white transition-all group/att"
                                      title="Klik untuk mengunduh berkas"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <FileCode className="w-4 h-4 text-pink-400 shrink-0" />
                                        <div className="min-w-0">
                                          <p className="text-xs font-bold text-white truncate group-hover/att:text-pink-300">
                                            {m.fileName}
                                          </p>
                                          {m.fileSize && (
                                            <p className="text-[9px] text-slate-400">{m.fileSize}</p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 text-[10px] font-bold text-pink-400 bg-pink-500/20 px-2 py-1 rounded-lg shrink-0">
                                        <Download className="w-3 h-3" />
                                        <span>Unduh</span>
                                      </div>
                                    </a>
                                  ) : m.externalLink ? (
                                    <a
                                      href={m.externalLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#1b1535] hover:bg-[#261d4b] border border-[#372a60] text-emerald-300 hover:text-white transition-all group/link"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Link2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                        <span className="text-xs font-bold truncate">Buka Tautan Materi</span>
                                      </div>
                                      <ExternalLink className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    </a>
                                  ) : null}
                                </div>
                              )}
                            </div>

                            {/* Card Footer Actions */}
                            <div className="mt-4 pt-3 border-t border-[#231d40] flex items-center justify-between text-xs">
                              <span className="text-[10px] text-slate-400 truncate">
                                Oleh: <strong className="text-slate-300">{m.authorName}</strong>
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingMaterial(m);
                                    setIsMaterialModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#20183b] hover:bg-[#2f2255] text-purple-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs"
                                  title="Edit materi"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => deleteMaterial(m.id)}
                                  className="p-1.5 rounded-lg bg-[#20183b] text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors cursor-pointer"
                                  title="Hapus materi"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-12 text-center bg-[#141126] border border-[#272144] rounded-3xl space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-[#1f173d] text-pink-400 flex items-center justify-center mx-auto border border-[#34275a]">
                        <BookOpen className="w-7 h-7" />
                      </div>
                      <h4 className="text-base font-bold text-white">Belum Ada Materi Pembelajaran</h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        {materialSearch || selectedMaterialCategory !== 'all'
                          ? 'Tidak ada materi yang sesuai dengan filter pencarian.'
                          : `Bagikan modul pembelajaran, slide presentasi, dokumen, atau video referensi untuk membantu ${terms.memberTitlePlural.toLowerCase()} belajar.`}
                      </p>
                      <button
                        onClick={() => {
                          setEditingMaterial(null);
                          setIsMaterialModalOpen(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-pink-500/20 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Upload / Buat Materi Baru</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB 2: TUGAS KELAS */}
              {subTabMateriTugas === 'tugas' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {classTasks.map((t) => {
                      const deadlineStatus = getTaskDeadlineStatus(t.dueDate);
                      return (
                        <div key={t.id} className="p-5 rounded-3xl bg-[#141126] border border-[#272144] flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">
                                {t.category}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${deadlineStatus.badgeClass}`}>
                                {deadlineStatus.label}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-white">{t.title}</h4>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{t.description}</p>

                            {/* Overdue Warning & Quick Duration Extension */}
                            {deadlineStatus.status === 'overdue' && (
                              <div className="mt-3 p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 font-bold text-[11px]">
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                    <span>Tugas Berakhir (Terkunci)</span>
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-semibold">Perpanjang:</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleQuickExtendTask(t, 1)}
                                    className="px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[10px] font-bold border border-red-500/30 transition-colors cursor-pointer"
                                    title="Perpanjang 1 hari dari sekarang"
                                  >
                                    +1 Hari
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickExtendTask(t, 3)}
                                    className="px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[10px] font-bold border border-red-500/30 transition-colors cursor-pointer"
                                    title="Perpanjang 3 hari"
                                  >
                                    +3 Hari
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickExtendTask(t, 7)}
                                    className="px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[10px] font-bold border border-red-500/30 transition-colors cursor-pointer"
                                    title="Perpanjang 1 minggu"
                                  >
                                    +1 Minggu
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingTask(t);
                                      setIsTaskModalOpen(true);
                                    }}
                                    className="px-2 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 text-[10px] font-bold border border-purple-500/30 transition-colors cursor-pointer ml-auto flex items-center gap-1"
                                    title="Atur tanggal dan waktu spesifik"
                                  >
                                    <CalendarPlus className="w-3 h-3" />
                                    <span>Atur Waktu</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 pt-3 border-t border-[#231d40] flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-mono">
                              {formatIndonesianDate(t.dueDate)}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingTask(t);
                                  setIsTaskModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-[#20183b] hover:bg-[#2f2255] text-purple-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs"
                                title="Edit tugas & atur waktu"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => deleteTask(t.id)}
                                className="p-1.5 rounded-lg bg-[#20183b] text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                                title="Hapus tugas"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {classTasks.length === 0 && (
                    <div className="p-10 text-center bg-[#141126] border border-[#272144] rounded-3xl space-y-2">
                      <p className="text-slate-400 text-xs">Belum ada tugas untuk kelas ini.</p>
                      <button
                        onClick={() => {
                          setEditingTask(null);
                          setIsTaskModalOpen(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-pink-500 text-white font-bold text-xs inline-flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Buat Tugas</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: ABSENSI KELAS (ANTI-SABOTASE) */}
          {activeTab === 'absensi' && (
            <AttendanceAdminView />
          )}

          {/* TAB: BANK SOAL & UJIAN */}
          {activeTab === 'bank_soal' && (
            <QuestionBankAdminView />
          )}

          {/* TAB: JADWAL PELAJARAN / MATA KULIAH */}
          {activeTab === 'jadwal' && (
            <ScheduleManagementView />
          )}

          {/* TAB: FORUM KELAS & GLOBAL + MARKETPLACE */}
          {activeTab === 'forum' && (
            <ForumView />
          )}

          {/* TAB: RODA SPIN & ACAK KELOMPOK */}
          {activeTab === 'spin' && (
            <SpinWheelView />
          )}

          {/* TAB: PESAN ANONIM (ANONYMOUS WALL) */}
          {activeTab === 'anonwall' && (
            <AnonymousWallAdminView />
          )}

          {/* TAB 4: PEMERIKSAAN KONTEN & TUGAS */}
          {activeTab === 'moderasi' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141126] border border-[#272144] p-5 rounded-3xl">
                <div>
                  <h3 className="text-lg font-bold text-white">Pemeriksaan & Penilaian Tugas {terms.memberTitlePlural}</h3>
                  <p className="text-xs text-slate-400">
                    Tinjau berkas, setujui (Approve), atau berikan catatan revisi kepada {terms.memberTitlePlural.toLowerCase()}
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-pink-300 px-3 py-1.5 rounded-xl bg-[#23193f] border border-[#3b2a64]">
                  {pendingModeration.length} Menunggu Pemeriksaan
                </span>
              </div>

              <div className="bg-[#141126] border border-[#272144] rounded-3xl p-6 overflow-x-auto">
                {moderatableSubmissions.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    Belum ada pengumpulan tugas yang memerlukan pemeriksaan berkas di kelas ini.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#261f44] text-slate-400">
                        <th className="pb-3 font-semibold">Nama {terms.memberTitle}</th>
                        <th className="pb-3 font-semibold">Tugas</th>
                        <th className="pb-3 font-semibold">Berkas Unggahan</th>
                        <th className="pb-3 font-semibold">Waktu Kirim</th>
                        <th className="pb-3 font-semibold">Status Pemeriksaan</th>
                        <th className="pb-3 font-semibold text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#201938]">
                      {moderatableSubmissions.map((sub) => {
                        const task = tasks.find((t) => t.id === sub.taskId);
                        return (
                          <tr key={sub.id} className="hover:bg-[#1a1436] transition-colors">
                            <td className="py-3.5 font-bold text-white flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-300 flex items-center justify-center text-[10px]">
                                {sub.memberName.charAt(0)}
                              </div>
                              <span>{sub.memberName}</span>
                            </td>
                            <td className="py-3.5 text-slate-300 font-medium">
                              {task?.title || 'Tugas Terkait'}
                            </td>
                            <td className="py-3.5">
                              {(() => {
                                const cat = getFileCategory(sub.fileName || '', sub.fileUrl || '');
                                const ext = (sub.fileName || 'file').split('.').pop()?.toUpperCase() || 'FILE';
                                return (
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-[#20183e] border border-[#34275c] flex items-center justify-center shrink-0">
                                      {cat === 'image' ? (
                                        <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                                      ) : cat === 'pdf' ? (
                                        <FileText className="w-3.5 h-3.5 text-rose-400" />
                                      ) : (
                                        <FileText className="w-3.5 h-3.5 text-purple-300" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-mono text-purple-200 text-xs truncate max-w-[160px] sm:max-w-xs" title={sub.fileName}>
                                        {sub.fileName || 'Dokumen.pdf'}
                                      </p>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        .{ext} • {sub.fileSize || '1.8 MB'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="py-3.5 font-mono text-slate-400">
                              {formatIndonesianDate(sub.submittedAt)}
                            </td>
                            <td className="py-3.5">
                              {sub.status === 'completed' && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 text-[10px]">
                                  DISETUJUI
                                </span>
                              )}
                              {sub.status === 'pending_review' && (
                                <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 font-bold border border-purple-500/30 text-[10px]">
                                  MENUNGGU REVIEW
                                </span>
                              )}
                              {sub.status === 'revision' && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30 text-[10px]">
                                  PERLU REVISI
                                </span>
                              )}
                              {sub.status === 'rejected' && (
                                <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-bold border border-red-500/30 text-[10px]">
                                  DITOLAK
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {sub.status !== 'completed' && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleQuickApproveSubmission(e, sub.id)}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-white font-bold text-xs border border-emerald-500/35 transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                                    title="Setujui (Approve) langsung tanpa membuka modal"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="hidden sm:inline">Setujui</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const success = downloadEvidenceFile(sub.fileName || 'bukti_tugas', sub.fileUrl || '', {
                                      studentName: sub.memberName,
                                      taskTitle: task?.title || ('Tugas ' + terms.memberTitle),
                                      submittedAt: formatIndonesianDate(sub.submittedAt),
                                      note: sub.submissionNote,
                                    });
                                    if (success) {
                                      showToast(`Mengunduh berkas: ${sub.fileName || 'bukti_tugas'}`, 'success');
                                    }
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#241a45] hover:bg-[#342464] text-pink-300 hover:text-white font-semibold text-xs border border-[#3c2a6d] transition-colors cursor-pointer flex items-center gap-1"
                                  title="Unduh berkas langsung"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Unduh</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setModeratingSubmission(sub)}
                                  className="px-3 py-1.5 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 hover:text-white font-bold text-xs border border-pink-500/35 transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                                  title="Baca dan tinjau berkas"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Tinjau</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: STATISTIK */}
          {activeTab === 'statistik' && (
            <AnalyticsView onOpenReportModal={() => setIsReportModalOpen(true)} />
          )}

          {/* TAB 6: KALENDER */}
          {activeTab === 'kalender' && (
            <CalendarView
              onOpenAddTaskModal={(date) => {
                setPreselectedDate(date);
                setEditingTask(null);
                setIsTaskModalOpen(true);
              }}
            />
          )}

          {/* TAB 7: PENGATURAN ADMIN (FITUR BARU) */}
          {activeTab === 'pengaturan' && (
            <div className="space-y-6">
              <ProfileAvatarUploader
                title="Foto Profil Admin"
                subtitle="Unggah foto profil pengelola kelas agar dikenali oleh seluruh peserta didik dan Owner"
              />

              {/* Member Management Box in Settings */}
              <div className="p-6 rounded-3xl bg-[#141126] border border-[#272144] shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#231d3e] pb-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-pink-400" />
                      <span>Kelola &amp; Hapus Anggota Kelas</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Hapus anggota atau {terms.memberTitlePlural.toLowerCase()} yang sudah tidak aktif / salah masuk kelas.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-pink-500/20 text-pink-300 border border-pink-500/30 text-xs font-mono font-bold">
                    {currentClassLogs.length} Anggota
                  </span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {currentClassLogs.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-3 text-center">
                      Belum ada {terms.memberTitlePlural.toLowerCase()} terdaftar di kelas ini.
                    </p>
                  ) : (
                    currentClassLogs.map((m) => (
                      <div
                        key={m.studentId}
                        className="p-3 rounded-2xl bg-[#191436] border border-[#2b214d] flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white flex items-center justify-center font-black text-xs shadow-sm shrink-0">
                            {m.studentName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-white block">{m.studentName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">ID: {m.studentId}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(`Yakin ingin menghapus ${terms.memberTitle.toLowerCase()} "${m.studentName}" dari kelas?`)) {
                              await deleteMemberUser(m.studentId);
                              showToast(`${terms.memberTitle} "${m.studentName}" telah dihapus dari kelas.`, 'info');
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 border border-rose-500/30 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          title={`Hapus ${terms.memberTitle.toLowerCase()} ini dari kelas`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus {terms.memberTitle}</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-[#141126] border border-[#272144]">
                <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-pink-400" />
                  <span>Pengaturan Profil Admin &amp; Ruang Kelas</span>
                </h3>
                <p className="text-xs text-slate-400 mb-6">
                  Kelola nama akun, reset password, dan informasi kelas Anda
                </p>

                <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">Nama Admin / {terms.educatorTitle}</label>
                    <input
                      type="text"
                      value={adminNameInput}
                      onChange={(e) => setAdminNameInput(e.target.value)}
                      required
                      className="w-full bg-[#1b1633] border border-[#342a5a] rounded-xl px-4 py-2.5 text-white outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">
                      Ganti Password Baru (Kosongkan jika tidak ingin mengubah)
                    </label>
                    <input
                      type="password"
                      value={adminNewPassword}
                      onChange={(e) => setAdminNewPassword(e.target.value)}
                      placeholder="Masukkan password baru..."
                      className="w-full bg-[#1b1633] border border-[#342a5a] rounded-xl px-4 py-2.5 text-white outline-none focus:border-pink-500 font-mono"
                    />
                  </div>

                  {/* Educator Role Selection Setting */}
                  <div className="pt-2 border-t border-[#251e44] space-y-2">
                    <label className="block text-slate-300 font-semibold mb-1">
                      Identitas Peran Admin &amp; Jenis Kelas
                    </label>
                    <span className="text-[11px] text-slate-400 block mb-2">
                      Ubah peran pengelola dan jenis kelas Anda kapan saja untuk menyesuaikan sebutan Dosen/Guru/Pengurus Kelas &amp; Mahasiswa/Siswa secara otomatis.
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* DOSEN */}
                      <button
                        type="button"
                        onClick={() => setAdminEducatorTypeSetting('dosen')}
                        className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                          adminEducatorTypeSetting === 'dosen'
                            ? 'bg-pink-500/20 border-pink-500 text-white font-bold'
                            : 'bg-[#1b1633] border-[#342a5a] text-slate-400 hover:text-white'
                        }`}
                      >
                        <GraduationCap className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs block text-white font-bold">Dosen</span>
                          <span className="text-[10px] text-slate-400 font-normal">Mengampu Perkuliahan • Anggota: Mahasiswa</span>
                        </div>
                      </button>

                      {/* GURU */}
                      <button
                        type="button"
                        onClick={() => setAdminEducatorTypeSetting('guru')}
                        className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                          adminEducatorTypeSetting === 'guru'
                            ? 'bg-pink-500/20 border-pink-500 text-white font-bold'
                            : 'bg-[#1b1633] border-[#342a5a] text-slate-400 hover:text-white'
                        }`}
                      >
                        <School className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs block text-white font-bold">Guru</span>
                          <span className="text-[10px] text-slate-400 font-normal">Mengajar Sekolah • Anggota: Siswa</span>
                        </div>
                      </button>

                      {/* PENGURUS KELAS MAHASISWA */}
                      <button
                        type="button"
                        onClick={() => setAdminEducatorTypeSetting('pengurus_mahasiswa')}
                        className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                          adminEducatorTypeSetting === 'pengurus_mahasiswa'
                            ? 'bg-pink-500/20 border-pink-500 text-white font-bold'
                            : 'bg-[#1b1633] border-[#342a5a] text-slate-400 hover:text-white'
                        }`}
                      >
                        <Users className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs block text-white font-bold">Pengurus (Kuliah)</span>
                          <span className="text-[10px] text-slate-400 font-normal">Kelas Kuliah • Anggota: Mahasiswa</span>
                        </div>
                      </button>

                      {/* PENGURUS KELAS SEKOLAH */}
                      <button
                        type="button"
                        onClick={() => setAdminEducatorTypeSetting('pengurus_sekolah')}
                        className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                          adminEducatorTypeSetting === 'pengurus_sekolah'
                            ? 'bg-pink-500/20 border-pink-500 text-white font-bold'
                            : 'bg-[#1b1633] border-[#342a5a] text-slate-400 hover:text-white'
                        }`}
                      >
                        <Users className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs block text-white font-bold">Pengurus (Sekolah)</span>
                          <span className="text-[10px] text-slate-400 font-normal">Kelas Sekolah • Anggota: Siswa</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#251e44]">
                    <label className="block text-slate-300 font-semibold mb-1.5">Nama Ruang Kelas</label>
                    <input
                      type="text"
                      value={adminClassNameInput}
                      onChange={(e) => setAdminClassNameInput(e.target.value)}
                      required
                      className="w-full bg-[#1b1633] border border-[#342a5a] rounded-xl px-4 py-2.5 text-white outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">Deskripsi / Keterangan Kelas</label>
                    <textarea
                      rows={3}
                      value={adminClassDescInput}
                      onChange={(e) => setAdminClassDescInput(e.target.value)}
                      placeholder="Tuliskan petunjuk umum atau info mata pelajaran..."
                      className="w-full bg-[#1b1633] border border-[#342a5a] rounded-xl px-4 py-2.5 text-white outline-none focus:border-pink-500 resize-none"
                    />
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold rounded-xl shadow-lg shadow-pink-500/25 cursor-pointer disabled:opacity-50"
                    >
                      {isSavingSettings ? 'Menyimpan ke Server...' : 'Simpan Pengaturan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 8: CREATOR & DONASI (FITUR BARU) */}
          {activeTab === 'donasi' && (
            <div className="space-y-6">
              <CreatorDonationCard variant="full" />
            </div>
          )}

          {/* TAB 9: KRITIK & SARAN OWNER */}
          {activeTab === 'saran' && (
            <FeedbackView />
          )}

          {/* TAB 9B: CHAT & PESAN (Siswa, Admin, Owner) */}
          {(activeTab === 'chat_siswa' || (activeTab as string) === 'chat_owner') && (
            <AdminMemberChatView />
          )}
        </div>
      </main>

      {/* Modals */}
      <MaterialFormModal
        key={editingMaterial ? editingMaterial.id : 'new-material'}
        isOpen={isMaterialModalOpen}
        onClose={() => {
          setIsMaterialModalOpen(false);
          setEditingMaterial(null);
        }}
        initialMaterial={editingMaterial}
      />
      <TaskFormModal
        key={editingTask ? editingTask.id : 'new-task'}
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
          setPreselectedDate(undefined);
        }}
        initialTask={editingTask}
        targetDate={preselectedDate}
      />
      <DailyReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSelectTask={(taskId, sub) => {
          setIsReportModalOpen(false);
          if (sub) {
            setModeratingSubmission(sub);
          } else {
            const matchSub = submissions.find((s) => s.taskId === taskId && s.classId === currentClass?.id);
            if (matchSub) {
              setModeratingSubmission(matchSub);
            } else {
              const taskObj = tasks.find((t) => t.id === taskId);
              if (taskObj) {
                setEditingTask(taskObj);
                setIsTaskModalOpen(true);
              }
            }
          }
        }}
      />
      <ModerationModal
        isOpen={!!moderatingSubmission}
        onClose={() => setModeratingSubmission(null)}
        submission={moderatingSubmission}
        task={tasks.find((t) => t.id === moderatingSubmission?.taskId)}
      />
      <BroadcastModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
      />
      <AdminEducatorTypeModal
        isOpen={currentUser?.role === 'admin' && !hasConfirmedEducator}
      />

    </div>
  );
};
