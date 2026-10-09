import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  BookOpen,
  Calendar,
  CalendarDays,
  Cat,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileCode,
  FileSpreadsheet,
  FileText,
  Gamepad2,
  Heart,
  Key,
  LayoutDashboard,
  Link2,
  ListTodo,
  Lock,
  LogOut,
  Menu,
  MessageSquare,
  MessageSquarePlus,
  Presentation,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Trash2,
  UploadCloud,
  Users,
  Video,
  X,
  BarChart3,
  Waves,
  Fish,
  HelpCircle,
  QrCode,
  Globe,
  MessageSquareDashed,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Task, ClassMaterial } from '../../types';
import { getTerminology, resolveEducatorType } from '../../utils/terminology';
import { AnalyticsView } from '../analytics/AnalyticsView';
import { CalendarView } from '../calendar/CalendarView';
import { DailyReportModal } from '../modals/DailyReportModal';
import { SubmissionModal } from '../modals/SubmissionModal';
import { AIChatTutor } from './AIChatTutor';
import { StudyFocusTools } from './StudyFocusTools';
import { StudentMiniGame } from './StudentMiniGame';
import { VirtualPetView } from './VirtualPetView';
import { ScheduleMemberView } from './ScheduleMemberView';
import { AnonymousWallSection } from './AnonymousWallSection';
import { CreatorDonationCard } from '../common/CreatorDonationCard';
import { FeedbackView } from '../common/FeedbackView';
import { OwnerChatView } from '../common/OwnerChatView';
import { MemberSettingsView } from './MemberSettingsView';
import { MemberAdminChatView } from './MemberAdminChatView';
import { QuestionBankMemberView } from './QuestionBankMemberView';
import { AttendanceMemberView } from './AttendanceMemberView';
import { ForumView } from '../forum/ForumView';
import { ThemeToggle } from '../common/ThemeToggle';
import { RealTimeClock } from '../common/RealTimeClock';
import { formatIndonesianDate, getTaskDeadlineStatus, playNotificationSound } from '../../utils/notification';
import { FeatureMaintenanceView } from '../maintenance/FeatureMaintenanceView';
import { getMemberFeatureConfig, MEMBER_FEATURE_MENUS } from '../../constants/featureMenus';

export const MemberView: React.FC = () => {
  const {
    currentUser,
    currentClass,
    classes,
    selectClass,
    logout,
    tasks,
    materials,
    submissions,
    toggleTaskCompleteDirect,
    getMemberSubmissionForTask,
    setIsNotificationDrawerOpen,
    unreadNotifCount,
    showToast,
    cleanStaleCacheAndSync,
    addFeedback,
    systemSettings,
    classChats,
    questionBanks,
    attendanceSessions,
    forumPosts,
    schedules,
  } = useApp();

  const educatorType = resolveEducatorType(currentUser, currentClass);
  const terms = getTerminology(educatorType);

  // Count today's schedules
  const todaySchedulesCount = useMemo(() => {
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const todayName = dayNames[new Date().getDay()];
    return schedules.filter(
      (s) =>
        (!currentClass ||
          s.classId === currentClass.id ||
          s.classId === currentClass.code ||
          (currentClass.name && s.classId === currentClass.name) ||
          s.classId === 'global') &&
        s.day === todayName
    ).length;
  }, [schedules, currentClass]);

  type MemberTab = 'dashboard' | 'tugas' | 'absensi' | 'bank_soal' | 'kuis_live' | 'jadwal' | 'forum' | 'ai_tutor' | 'fokus' | 'game' | 'pet' | 'statistik' | 'kalender' | 'creator' | 'anonwall' | 'saran' | 'chat_admin' | 'chat_owner' | 'setting';

  // Count unread chats from admin, other students, or owner
  const unreadChatsCount = useMemo(() => {
    return classChats.filter(
      (c) =>
        (c.recipientId === currentUser?.id || (currentUser?.role === 'member' && c.recipientId === 'member')) &&
        !c.isRead
    ).length;
  }, [classChats, currentUser]);

  // Track unread/new forum posts
  const [lastViewedForumTime, setLastViewedForumTime] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('rt_last_viewed_forum_' + (currentUser?.id || 'member')) || '0', 10);
    } catch {
      return 0;
    }
  });

  const hasUnreadForum = useMemo(() => {
    if (!forumPosts || forumPosts.length === 0) return false;
    return forumPosts.some((p) => {
      const isForClass = p.scope === 'global' || p.classId === currentClass?.id || (currentUser?.classId && p.classId === currentUser.classId);
      const isNew = new Date(p.createdAt).getTime() > lastViewedForumTime;
      const isNotMe = p.authorId !== currentUser?.id;
      return isForClass && isNew && isNotMe;
    });
  }, [forumPosts, lastViewedForumTime, currentClass, currentUser]);

  const getMemberTabFromUrl = (): MemberTab => {
    try {
      const hash = window.location.hash.replace('#', '').trim().toLowerCase();
      const pathname = window.location.pathname.toLowerCase();
      const raw = hash || (pathname.startsWith('/member/') ? pathname.replace('/member/', '') : '');

      const ALIAS_MAP: Record<string, MemberTab> = {
        dashboard: 'dashboard',
        tugas: 'tugas',
        task: 'tugas',
        tasks: 'tugas',
        materi: 'tugas',
        materials: 'tugas',
        'materi-tugas': 'tugas',
        absensi: 'absensi',
        absen: 'absensi',
        presensi: 'absensi',
        scan: 'absensi',
        attendance: 'absensi',
        bank_soal: 'bank_soal',
        banksoal: 'bank_soal',
        'bank-soal': 'bank_soal',
        soal: 'bank_soal',
        ujian: 'bank_soal',
        quiz: 'bank_soal',
        jadwal: 'jadwal',
        schedule: 'jadwal',
        forum: 'forum',
        'forum-kelas': 'forum',
        'forum-global': 'forum',
        jasa: 'forum',
        market: 'forum',
        marketplace: 'forum',
        feed: 'forum',
        ai_tutor: 'ai_tutor',
        ai: 'ai_tutor',
        chat: 'ai_tutor',
        fokus: 'fokus',
        focus: 'fokus',
        game: 'game',
        games: 'game',
        pet: 'pet',
        virtualpet: 'pet',
        hewan: 'pet',
        peliharaan: 'pet',
        statistik: 'statistik',
        stats: 'statistik',
        analytics: 'statistik',
        kalender: 'kalender',
        calendar: 'kalender',
        creator: 'creator',
        donasi: 'creator',
        anonwall: 'anonwall',
        wall: 'anonwall',
        'anonymous-wall': 'anonwall',
        anonymous: 'anonwall',
        pesan: 'anonwall',
        saran: 'saran',
        feedback: 'saran',
        suggest: 'saran',
        suggestion: 'saran',
        chat_admin: 'chat_admin',
        chat_to_admin: 'chat_admin',
        chatadmin: 'chat_admin',
        chat_owner: 'chat_admin',
        chat_to_owner: 'chat_admin',
        setting: 'setting',
        settings: 'setting',
        pengaturan: 'setting',
      };

      if (raw && ALIAS_MAP[raw]) {
        return ALIAS_MAP[raw];
      }

      const saved = localStorage.getItem('rt_member_active_tab');
      if (saved && ALIAS_MAP[saved]) {
        return ALIAS_MAP[saved];
      }
    } catch {}
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState<MemberTab>(getMemberTabFromUrl);

  const isCurrentTabMaintenance = useMemo(() => {
    const maintMap = systemSettings?.memberFeatureMaintenance || {};
    if (activeTab === 'ai_tutor') {
      return Boolean(systemSettings?.isAiMaintenance || maintMap['ai_tutor']);
    }
    if (activeTab === 'kuis_live' && (maintMap['kuis_live'] || maintMap['kuis'])) return true;
    if (activeTab === 'bank_soal' && (maintMap['bank_soal'] || maintMap['kuis'])) return true;
    return Boolean(maintMap[activeTab]);
  }, [systemSettings?.memberFeatureMaintenance, systemSettings?.isAiMaintenance, activeTab]);

  const handleBackFromMaintenance = () => {
    // If dashboard is also under maintenance, redirect to first available non-maintenance feature
    if (systemSettings?.memberFeatureMaintenance?.['dashboard']) {
      const available = MEMBER_FEATURE_MENUS.find((f) => !systemSettings?.memberFeatureMaintenance?.[f.id]);
      if (available) {
        setActiveTab(available.id as MemberTab);
        return;
      }
    }
    setActiveTab('dashboard');
  };

  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) return 'Selamat pagi';
    if (hour >= 11 && hour < 15) return 'Selamat siang';
    if (hour >= 15 && hour < 18) return 'Selamat sore';
    return 'Selamat malam';
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('rt_member_active_tab', activeTab);
      const targetUrl = `/member/#${activeTab}`;
      if (window.location.pathname + window.location.hash !== targetUrl) {
        window.history.replaceState(null, '', targetUrl);
      }
    } catch {}
  }, [activeTab]);

  useEffect(() => {
    const handleUrlSync = () => {
      const newTab = getMemberTabFromUrl();
      setActiveTab(newTab);
    };

    const handleCustomNavigate = (e: any) => {
      if (e?.detail?.tab) {
        setActiveTab(e.detail.tab as MemberTab);
        if (e.detail.taskId) {
          const t = tasks.find((tk) => tk.id === e.detail.taskId);
          if (t) {
            setSelectedTaskForUpload(t);
          }
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
  }, [tasks]);

  const [selectedTaskForUpload, setSelectedTaskForUpload] = useState<Task | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed' | 'priority'>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showEncourageModal, setShowEncourageModal] = useState(false);
  const [encourageMessage, setEncourageMessage] = useState('Semangat terus mengembangkan asisten belajar cerdas RemindTask! Kami siap menunggu! 🚀🔥');

  // Filter tasks strictly belonging to member's active class
  const classTasks = tasks.filter((t) => {
    if (!currentClass?.id) return true;
    return t.classId === currentClass.id || (currentUser?.classId && t.classId === currentUser.classId);
  });

  // Calculate member's completion status
  const completedTasksCount = classTasks.filter((t) => {
    const sub = getMemberSubmissionForTask(t.id);
    return sub && sub.status === 'completed';
  }).length;

  const totalTasksCount = classTasks.length;
  const activeTasksCount = totalTasksCount - completedTasksCount;
  const priorityCount = classTasks.filter((t) => t.priority === 'tinggi').length;
  const completionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  // Published Question Banks strictly for member (Hidden ones are completely hidden from member)
  const publishedQuizzesCount = useMemo(() => {
    return questionBanks.filter((qb) => {
      const isForClass = !currentClass?.id || qb.classId === currentClass.id;
      return isForClass && qb.status === 'published';
    }).length;
  }, [questionBanks, currentClass]);

  const getCategoryForTab = (tab: MemberTab): 'akademik' | 'hiburan' | 'komunikasi' | 'lainnya' => {
    if (['dashboard', 'tugas', 'absensi', 'bank_soal', 'kuis_live', 'jadwal', 'kalender', 'statistik', 'fokus'].includes(tab)) return 'akademik';
    if (['ai_tutor', 'game', 'pet'].includes(tab)) return 'hiburan';
    if (['forum', 'anonwall', 'saran', 'chat_admin', 'chat_owner'].includes(tab)) return 'komunikasi';
    return 'lainnya';
  };

  const [activeCategory, setActiveCategory] = useState<'akademik' | 'hiburan' | 'komunikasi' | 'lainnya'>(() => getCategoryForTab(activeTab));

  useEffect(() => {
    setActiveCategory(getCategoryForTab(activeTab));
  }, [activeTab]);

  interface CategoryTabItem {
    id: MemberTab;
    label: string;
    icon: any;
    badge?: number;
    iconColor?: string;
  }

  interface MenuCategory {
    id: 'akademik' | 'hiburan' | 'komunikasi' | 'lainnya';
    label: string;
    icon: any;
    tabs: CategoryTabItem[];
  }

  // Check if there is an active attendance session for this class
  const hasActiveAttendance = useMemo(() => {
    const targetClassId = currentClass?.id || currentUser?.classId || '';
    return attendanceSessions.some((s) => {
      const match = !targetClassId || s.classId === targetClassId || (currentClass?.code && s.classId === currentClass.code);
      return match && s.isActive;
    });
  }, [attendanceSessions, currentClass, currentUser]);

  // When activeTab changes to 'forum', mark forum as viewed
  useEffect(() => {
    if (activeTab === 'forum') {
      const now = Date.now();
      setLastViewedForumTime(now);
      try {
        localStorage.setItem('rt_last_viewed_forum_' + (currentUser?.id || 'member'), now.toString());
      } catch {}
    }
  }, [activeTab, currentUser?.id]);

  const categories: MenuCategory[] = [
    {
      id: 'akademik',
      label: 'Akademik',
      icon: BookOpen,
      tabs: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'absensi', label: 'Absensi Kelas', icon: QrCode, iconColor: 'text-emerald-400' },
        { id: 'tugas', label: 'Materi & Tugas', icon: BookOpen },
        { id: 'bank_soal', label: 'Soal & Ujian', icon: HelpCircle },
        { id: 'kuis_live', label: 'Kuis Live', icon: Sparkles, iconColor: 'text-purple-400' },
        { id: 'jadwal', label: 'Jadwal Pelajaran', icon: CalendarDays, iconColor: 'text-pink-400' },
        { id: 'kalender', label: 'Kalender', icon: Calendar },
        { id: 'statistik', label: 'Statistik', icon: BarChart3 },
        { id: 'fokus', label: 'Zona Fokus', icon: Clock },
      ],
    },
    {
      id: 'komunikasi',
      label: 'Komunikasi & Forum',
      icon: Globe,
      tabs: [
        { id: 'forum', label: 'Forum & Jasa', icon: Globe, iconColor: 'text-pink-400', badge: hasUnreadForum ? 1 : undefined },
        { id: 'anonwall', label: 'Pesan Anonim', icon: MessageSquareDashed, iconColor: 'text-amber-400' },
        { id: 'chat_admin', label: 'Chat & Pesan', icon: MessageSquare, badge: unreadChatsCount > 0 ? unreadChatsCount : undefined, iconColor: 'text-pink-400' },
        { id: 'saran', label: 'Kritik & Saran', icon: MessageSquarePlus },
      ],
    },
    {
      id: 'hiburan',
      label: 'AI, Game & Pet',
      icon: Sparkles,
      tabs: [
        {
          id: 'ai_tutor',
          label: systemSettings?.isAiMaintenance ? 'AI (Maintenance)' : 'AI Assistant',
          icon: Sparkles,
          iconColor: systemSettings?.isAiMaintenance ? 'text-amber-400' : 'text-amber-300',
        },
        { id: 'pet', label: 'Virtual Pet', icon: Heart, iconColor: 'text-pink-400' },
        { id: 'game', label: 'Arena Game', icon: Gamepad2, iconColor: 'text-amber-400' },
      ],
    },
    {
      id: 'lainnya',
      label: 'Pengaturan',
      icon: Settings,
      tabs: [
        { id: 'setting', label: 'Pengaturan Profil', icon: Settings },
        { id: 'creator', label: 'Developer & Donasi', icon: Heart, iconColor: 'text-pink-400' },
      ],
    },
  ];

  const handleSelectCategory = (catId: 'akademik' | 'hiburan' | 'komunikasi' | 'lainnya') => {
    setActiveCategory(catId);
    const cat = categories.find((c) => c.id === catId);
    if (cat && cat.tabs.length > 0) {
      const isAlreadyInCat = cat.tabs.some((t) => t.id === activeTab);
      if (!isAlreadyInCat) {
        setActiveTab(cat.tabs[0].id);
      }
    }
  };

  // Subtab for Materi & Tugas in Member View
  const [subTabMateriTugas, setSubTabMateriTugas] = useState<'materi' | 'tugas'>('materi');
  const [materialSearch, setMaterialSearch] = useState('');
  const [selectedMaterialCategory, setSelectedMaterialCategory] = useState<string>('all');

  // Filter materials strictly belonging to member's active class
  const classMaterials = useMemo(() => {
    if (!currentClass?.id) return [];
    return materials.filter(
      (m) =>
        m.classId === currentClass.id ||
        (currentClass.code && m.classId === currentClass.code) ||
        (currentClass.name && m.classId === currentClass.name) ||
        (currentUser?.classId && m.classId === currentUser.classId) ||
        (currentUser?.className && m.classId === currentUser.className)
    );
  }, [materials, currentClass?.id, currentClass?.code, currentClass?.name, currentUser?.classId, currentUser?.className]);

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

  const copyCode = () => {
    if (!currentClass?.code) return;
    navigator.clipboard.writeText(currentClass.code);
    setCopiedCode(true);
    playNotificationSound('beep');
    showToast(`Kode ${currentClass.code} berhasil disalin!`, 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Filtered task list
  const filteredTasks = classTasks.filter((task) => {
    const sub = getMemberSubmissionForTask(task.id);
    const isCompleted = sub && sub.status === 'completed';

    if (taskFilter === 'pending') return !isCompleted;
    if (taskFilter === 'completed') return isCompleted;
    if (taskFilter === 'priority') return task.priority === 'tinggi';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0c0a15] text-white flex flex-col antialiased">
      {/* TOP BAR */}
      <header className="px-4 sm:px-6 py-3.5 border-b border-[#201a3b] bg-[#110e22]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Class Space Logo & Class Switcher */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-500/25 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0 max-w-[140px] sm:max-w-[210px]">
              <h1 className="font-extrabold text-xs sm:text-sm text-white tracking-tight leading-tight flex items-center gap-1.5">
                <span>Class Space</span>
              </h1>
              {/* Member Active Class Indicator (Strictly Isolated to Member's Class) */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="px-2 py-0.5 rounded-md bg-pink-500/15 border border-pink-500/30 text-pink-300 font-bold text-[11px] truncate max-w-[180px]">
                  {currentClass?.name || 'Ruang Kelas Anda'}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Main Categories Navigation (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1.5 p-1 bg-[#141028]/95 border border-[#2b214d] rounded-2xl shadow-inner">
            {categories.map((cat) => {
              const CatIcon = cat.icon;
              const isCatActive = activeCategory === cat.id;
              const hasBadge =
                cat.id === 'komunikasi' && (unreadChatsCount > 0 || hasUnreadForum);
              return (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer relative ${
                    isCatActive
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/25 scale-[1.02]'
                      : 'text-slate-400 hover:text-white hover:bg-[#1f173d]'
                  }`}
                >
                  <CatIcon className={`w-3.5 h-3.5 ${isCatActive ? 'text-white' : 'text-purple-400'}`} />
                  <span>{cat.label}</span>
                  {hasBadge && (
                    <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse ml-0.5 ring-2 ring-[#141028]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            <RealTimeClock />
            {/* Dark/Light Mode Theme Toggle */}
            <ThemeToggle />

            <button
              onClick={() => setIsNotificationDrawerOpen(true)}
              className="relative p-2 sm:p-2.5 rounded-xl bg-[#1b1536] hover:bg-[#28204c] text-slate-300 hover:text-white transition-colors cursor-pointer border border-[#2b224d] shrink-0"
              title="Notifikasi"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-500 text-white font-mono text-[9px] font-bold flex items-center justify-center">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {/* Key Pill */}
            <button
              onClick={copyCode}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1e173a] hover:bg-[#2b2150] border border-[#34275a] text-xs font-mono font-bold text-white transition-colors cursor-pointer shrink-0"
              title="Klik untuk salin kode kelas"
            >
              <Key className="w-3.5 h-3.5 text-pink-400" />
              <span>Kode</span>
              <span className="text-pink-300 font-black">{currentClass?.code || '------'}</span>
              <Copy className="w-3 h-3 text-slate-400 ml-0.5" />
            </button>

            {/* Keluar Button */}
            <button
              onClick={logout}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#201838] hover:bg-[#2f224e] border border-[#302450] text-xs font-bold text-slate-200 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>

            {/* 3-LINE HAMBURGER MENU BUTTON */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-[#1f173d] hover:bg-[#2c2154] text-white border border-[#382b60] flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Menu Navigasi"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-pink-400" /> : <Menu className="w-5 h-5 text-white" />}
            </button>
          </div>
        </div>

        {/* MOBILE NAVIGATION DROPDOWN MENU */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-[#231b40] animate-in fade-in slide-in-from-top-2 duration-200 bg-[#14102b] rounded-2xl p-3 border border-[#2d2252] shadow-2xl">
            {/* Class Code & Member info on mobile */}
            <div className="p-3 mb-3 rounded-xl bg-[#1b1538] border border-[#302456] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-mono block">KODE KELAS:</span>
                <span className="text-sm font-black font-mono text-pink-400">{currentClass?.code || '------'}</span>
              </div>
              <button
                onClick={copyCode}
                className="px-2.5 py-1.5 rounded-lg bg-[#271d47] text-pink-300 text-xs font-bold flex items-center gap-1 border border-[#3d2b6b] hover:bg-[#32255b] transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedCode ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>

            {/* Mobile Categorized Sub-Menu Groups */}
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {categories.map((cat) => {
                const CatIcon = cat.icon;
                const isCurrentCat = activeCategory === cat.id;
                return (
                  <div key={cat.id} className="bg-[#181338] border border-[#2b214d] rounded-2xl p-3">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#281f47]">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isCurrentCat ? 'bg-pink-500/20 text-pink-400' : 'bg-purple-500/20 text-purple-400'}`}>
                          <CatIcon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-black text-white tracking-wide">{cat.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">{cat.tabs.length} Menu</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {cat.tabs.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveTab(item.id as typeof activeTab);
                              setActiveCategory(cat.id);
                              setMobileMenuOpen(false);
                            }}
                            className={`p-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer border ${
                              isActive
                                ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-pink-500/40 text-pink-300 shadow-sm'
                                : 'bg-[#120e29] border-[#241a45] text-slate-300 hover:text-white hover:bg-[#1a143b]'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-pink-300' : item.iconColor || 'text-slate-400'}`} />
                              <span className="truncate">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-1.5 ml-1 shrink-0">
                              {((item.id === 'ai_tutor' && systemSettings?.isAiMaintenance) || systemSettings?.memberFeatureMaintenance?.[item.id]) && (
                                <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono text-[9px] font-bold">
                                  Maint
                                </span>
                              )}
                              {item.badge !== undefined && item.badge > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full bg-pink-500 text-white text-[9px] font-black font-mono">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Actions in Mobile Drawer */}
            <div className="flex items-center gap-2 pt-3 mt-3 border-t border-[#231b40]">
              <button
                onClick={logout}
                className="w-full py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-semibold flex items-center justify-center gap-1 border border-red-500/25 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* SECONDARY SUB-MENU BAR (Desktop) */}
      <div className="hidden lg:block bg-[#110e25]/90 border-b border-[#231b42] backdrop-blur-md px-4 sm:px-6 py-2.5 sticky top-[61px] z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold border-r border-[#2b224e] pr-3 shrink-0">
              <span className="text-pink-400 font-bold uppercase tracking-wider text-[10px]">Sub-Menu:</span>
              <span className="text-white font-extrabold">{categories.find((c) => c.id === activeCategory)?.label}</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              {categories.find((c) => c.id === activeCategory)?.tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as MemberTab)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer relative ${
                      isActive
                        ? 'bg-gradient-to-r from-pink-500/20 to-purple-600/20 border border-pink-500/40 text-pink-300 shadow-sm font-black'
                        : 'text-slate-400 hover:text-white hover:bg-[#1c153a] border border-transparent'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-pink-400' : tab.iconColor || 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-pink-500 text-white text-[10px] font-black font-mono ml-0.5">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE SUB-MENU QUICK SWITCHER BAR */}
      <div className="lg:hidden bg-[#110e25] border-b border-[#231b42] px-4 py-2 sticky top-[61px] z-20 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 min-w-max">
          <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider mr-1 shrink-0">
            {categories.find((c) => c.id === activeCategory)?.label}:
          </span>
          {categories.find((c) => c.id === activeCategory)?.tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as MemberTab)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                  isActive
                    ? 'bg-pink-500/25 text-pink-300 border border-pink-500/40'
                    : 'text-slate-400 bg-[#191336] border border-[#271d47]'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{tab.label}</span>
                {((tab.id === 'ai_tutor' && systemSettings?.isAiMaintenance) || systemSettings?.memberFeatureMaintenance?.[tab.id]) && (
                  <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono text-[9px] font-bold">
                    Maint
                  </span>
                )}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN VIEW */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {isCurrentTabMaintenance ? (
          <FeatureMaintenanceView
            featureName={getMemberFeatureConfig(activeTab)?.name || activeTab}
            categoryLabel={getMemberFeatureConfig(activeTab)?.categoryLabel || 'Fitur Siswa'}
            customMessage={systemSettings?.featureMaintenanceCustomMessages?.[`member_${activeTab}`]?.message || getMemberFeatureConfig(activeTab)?.defaultMessage}
            customEstimate={systemSettings?.featureMaintenanceCustomMessages?.[`member_${activeTab}`]?.estimate || getMemberFeatureConfig(activeTab)?.defaultEstimate}
            onBackToDashboard={handleBackFromMaintenance}
            role="member"
          />
        ) : (
          <>
            {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* ACTIVE ATTENDANCE ALERT BANNER */}
            {hasActiveAttendance && (
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-[#16132b] border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl shadow-emerald-500/10">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/30 border border-emerald-500/50 flex items-center justify-center text-emerald-300 shrink-0 shadow-md">
                    <QrCode className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                      <span>Sesi Presensi Kelas Sedang Dibuka!</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white font-mono text-[10px] font-black uppercase tracking-wider animate-pulse">
                        LIVE
                      </span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {terms.educatorTitle} Anda sedang membuka sesi presensi kelas. Segera scan QR code presensi sekarang.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('absensi')}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0 active:scale-95"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Scan Barcode Presensi</span>
                </button>
              </div>
            )}

            {/* HERO CARD */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#20153f] via-[#1a1233] to-[#120f26] border border-[#34275a] p-6 sm:p-8 shadow-xl">
              <div className="absolute right-0 top-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-pink-400 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-pink-400" />
                    <span>CLASS SPACE</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsNotificationDrawerOpen(true)}
                      className="p-2 rounded-xl bg-[#291e4a] text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Notifikasi"
                    >
                      <Bell className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1b1533] border border-[#322656] text-xs font-medium text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Siswa Aktif: <strong className="text-white">{currentUser?.name || 'Siswa'}</strong></span>
                    </div>
                  </div>
                </div>

                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                  {currentClass?.name || 'Kelas Anda'}
                </h2>

                {/* Engaging Dynamic Welcome Description & Micro-Stats */}
                <div className="mt-3 max-w-2xl space-y-2">
                  <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-medium">
                    {timeGreeting},{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-300 font-bold">
                      {currentUser?.name || 'Siswa'}
                    </span>
                    ! 👋 Selamat datang di ruang kolaborasi belajar{' '}
                    <strong className="text-white font-bold">{currentClass?.name || 'Kelas Anda'}</strong>.
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-slate-300">
                    {activeTasksCount > 0 ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 font-semibold shadow-xs">
                        <Sparkles className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                        <span>{activeTasksCount} tugas aktif menantimu</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Seluruh tugas tuntas dikerjakan!</span>
                      </div>
                    )}

                    {priorityCount > 0 && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold shadow-xs">
                        <span>🔥 {priorityCount} prioritas tinggi</span>
                      </div>
                    )}

                    <span className="text-slate-400 hidden sm:inline">•</span>
                    <span className="text-slate-300">
                      Pantau tugas kelas, isi presensi realtime, dan selesaikan target belajarmu dengan semangat hari ini! 🚀
                    </span>
                  </div>
                </div>

                {/* Stat Boxes Row */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mt-8">
                  {/* KODE KELAS box */}
                  <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-[#17122e] border border-[#2d2350] flex flex-col justify-center text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      KODE KELAS
                    </span>
                    <span className="text-xl sm:text-2xl font-black font-mono tracking-widest text-white">
                      {currentClass?.code || '------'}
                    </span>
                  </div>

                  {/* Total */}
                  <div className="p-4 rounded-2xl bg-[#17122e] border border-[#2d2350]">
                    <span className="text-3xl font-black text-white font-mono tabular-nums block">
                      {totalTasksCount}
                    </span>
                    <span className="text-xs text-slate-400 mt-1 block">Total</span>
                  </div>

                  {/* Aktif */}
                  <div className="p-4 rounded-2xl bg-[#17122e] border border-[#2d2350]">
                    <span className="text-3xl font-black text-purple-300 font-mono tabular-nums block">
                      {activeTasksCount}
                    </span>
                    <span className="text-xs text-slate-400 mt-1 block">Aktif</span>
                  </div>

                  {/* Selesai */}
                  <div className="p-4 rounded-2xl bg-[#17122e] border border-[#2d2350]">
                    <span className="text-3xl font-black text-emerald-400 font-mono tabular-nums block">
                      {completedTasksCount}
                    </span>
                    <span className="text-xs text-slate-400 mt-1 block">Selesai</span>
                  </div>

                  {/* Prioritas */}
                  <div className="p-4 rounded-2xl bg-[#17122e] border border-[#2d2350]">
                    <span className="text-3xl font-black text-red-400 font-mono tabular-nums block">
                      {priorityCount}
                    </span>
                    <span className="text-xs text-slate-400 mt-1 block">Prioritas</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CLASS PULSE CARD */}
            <div className="p-6 sm:p-7 rounded-3xl bg-[#141126] border border-[#272144] flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-lg">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-pink-400 block mb-1">
                  CLASS PULSE
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Progress kelas hari ini
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Pantau tugasmu dalam satu pandangan.
                </p>
              </div>

              <div className="flex-1 max-w-md space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-300">Tingkat penyelesaian</span>
                  <span className="text-base font-black text-white font-mono tabular-nums">
                    {completionRate}%
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="h-2.5 w-full bg-[#1c1638] rounded-full overflow-hidden p-0.5 border border-[#2a2250]">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(4, completionRate)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>{completedTasksCount} dari {totalTasksCount} tugas selesai</span>
                  <span>{activeTasksCount} tugas tersisa</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => setActiveTab('tugas')}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-pink-500/20 transition-all cursor-pointer"
                >
                  <span>Lihat tugas</span>
                  <span> </span>
                </button>

                <button
                  onClick={() => setActiveTab('statistik')}
                  className="px-4 py-2.5 rounded-xl bg-[#1f183d] hover:bg-[#2b2252] border border-[#30265a] text-purple-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <BarChart3 className="w-4 h-4 text-pink-400" />
                  <span>Statistik</span>
                </button>
              </div>
            </div>

            {/* 4 FEATURE CARDS: AI ASSISTANT, VIRTUAL PET, JADWAL PELAJARAN, ZONA FOKUS & GAMES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: RemindAI Personal Assistant */}
              {(() => {
                const isAiMaint = Boolean(systemSettings?.isAiMaintenance || systemSettings?.memberFeatureMaintenance?.['ai_tutor']);
                return (
                  <div
                    onClick={() => setActiveTab('ai_tutor')}
                    className="group relative p-5 rounded-3xl bg-gradient-to-br from-[#1c143d] via-[#161033] to-[#110d24] border border-purple-500/35 hover:border-pink-500/70 transition-all cursor-pointer shadow-lg overflow-hidden flex flex-col justify-between"
                  >
                    <div className="absolute top-0 right-0 w-28 h-28 bg-pink-500/10 rounded-full blur-2xl group-hover:bg-pink-500/20 transition-colors pointer-events-none" />
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/25">
                          <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                        </div>
                        {isAiMaint ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[9px] font-bold text-amber-300 flex items-center gap-1 shadow-sm shadow-amber-500/10 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Maintenance
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-bold text-emerald-400 flex items-center gap-1 shadow-sm shadow-emerald-500/10">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Aktif &amp; Siap ⚡
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-black text-white group-hover:text-pink-300 transition-colors">
                        AI Personal Assistant
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                        {isAiMaint
                          ? (systemSettings?.aiMaintenanceTitle || 'AI Assistant Sedang Bersiap!') + ' • Sedang tahap perbaikan & pengembangan.'
                          : 'Teman ngobrol pintar & santai. Siap bantu bedah rumus, kodingan, atau curhat belajar kapan saja!'}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-pink-400 group-hover:text-pink-300">
                      <span>{isAiMaint ? 'Lihat Info Maintenance' : 'Mulai Obrolan AI'}</span>
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </div>
                  </div>
                );
              })()}

              {/* Card 2: Forum & Marketplace Jasa */}
              {(() => {
                const isForumMaint = Boolean(systemSettings?.memberFeatureMaintenance?.['forum']);
                return (
                  <div
                    onClick={() => setActiveTab('forum')}
                    className="group relative p-5 rounded-3xl bg-gradient-to-br from-[#251336] via-[#1c0f2b] to-[#130b1f] border border-pink-500/35 hover:border-pink-400/70 transition-all cursor-pointer shadow-lg overflow-hidden flex flex-col justify-between"
                  >
                    <div className="absolute top-0 right-0 w-28 h-28 bg-pink-500/10 rounded-full blur-2xl group-hover:bg-pink-500/20 transition-colors pointer-events-none" />
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/25">
                          <Globe className="w-5 h-5 text-white" />
                        </div>
                        {isForumMaint ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[9px] font-bold text-amber-300 flex items-center gap-1">
                            Maintenance
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-[9px] font-bold text-pink-300">
                            Komunitas &amp; Layanan
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-black text-white group-hover:text-pink-300 transition-colors">
                        Forum Kelas &amp; Global
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                        Wadah publikasi karya siswa, diskusi akademik, pertukaran layanan keahlian, dan komunikasi antarsiswa.
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-pink-400 group-hover:text-pink-300">
                      <span>{isForumMaint ? 'Fitur Maintenance' : 'Buka Forum & Komunitas'}</span>
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </div>
                  </div>
                );
              })()}

              {/* Card 3: Jadwal Pelajaran Hari Ini */}
              {(() => {
                const isJadwalMaint = Boolean(systemSettings?.memberFeatureMaintenance?.['jadwal']);
                return (
                  <div
                    onClick={() => setActiveTab('jadwal')}
                    className="group relative p-5 rounded-3xl bg-gradient-to-br from-[#121938] via-[#0f142e] to-[#0a0d20] border border-blue-500/35 hover:border-cyan-400/70 transition-all cursor-pointer shadow-lg overflow-hidden flex flex-col justify-between"
                  >
                    <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors pointer-events-none" />
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                          <CalendarDays className="w-5 h-5 text-white" />
                        </div>
                        {isJadwalMaint ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[9px] font-bold text-amber-300 flex items-center gap-1">
                            Maintenance
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-[9px] font-bold text-cyan-300">
                            {todaySchedulesCount > 0 ? `📅 ${todaySchedulesCount} Pelajaran Hari Ini` : 'Jadwal Kelas 📅'}
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-black text-white group-hover:text-cyan-300 transition-colors">
                        Jadwal Pelajaran
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                        Lihat jadwal mata pelajaran/kuliah mingguan dan aktifkan alarm pengingat otomatis 2 jam sebelum kelas!
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-cyan-400 group-hover:text-cyan-300">
                      <span>{isJadwalMaint ? 'Fitur Maintenance' : 'Buka Jadwal Kelas'}</span>
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </div>
                  </div>
                );
              })()}

              {/* Card 4: Arena Game & Fokus */}
              {(() => {
                const isGameMaint = Boolean(systemSettings?.memberFeatureMaintenance?.['game']);
                return (
                  <div
                    onClick={() => setActiveTab('game')}
                    className="group relative p-5 rounded-3xl bg-gradient-to-br from-[#181333] via-[#130f2b] to-[#0f0c22] border border-amber-500/35 hover:border-amber-400/70 transition-all cursor-pointer shadow-lg overflow-hidden flex flex-col justify-between"
                  >
                    <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors pointer-events-none" />
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/25">
                          <Gamepad2 className="w-5 h-5 text-amber-200" />
                        </div>
                        {isGameMaint ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[9px] font-bold text-amber-300 flex items-center gap-1">
                            Maintenance
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[9px] font-bold text-amber-300">
                            Asah Otak 🎮
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-black text-white group-hover:text-amber-300 transition-colors">
                        Arena Game &amp; Kuis
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                        Kuis Kilat 20 Detik, Duel Hitung Cepat Turbo, Teka-Teki Nalar, dan raih XP untuk naikkan level akun!
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-amber-400 group-hover:text-amber-300">
                      <span>{isGameMaint ? 'Fitur Maintenance' : 'Masuk Arena Game'}</span>
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Quick List: Urgent Tasks due soon */}
            <div className="p-6 rounded-3xl bg-[#141126] border border-[#272144]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white text-base">Tugas yang Perlu Diselesaikan</h3>
                <button
                  onClick={() => setActiveTab('tugas')}
                  className="text-xs text-pink-400 hover:text-pink-300 font-semibold cursor-pointer"
                >
                  Semua Tugas ({classTasks.length}) 
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classTasks.slice(0, 4).map((task) => {
                  const deadlineStatus = getTaskDeadlineStatus(task.dueDate);
                  const submission = getMemberSubmissionForTask(task.id);
                  const isCompleted = submission && submission.status === 'completed';
                  const isPendingReview = submission && submission.status === 'pending_review';

                  return (
                    <div
                      key={task.id}
                      className="p-4 rounded-2xl bg-[#191433] border border-[#2c2350] hover:border-pink-500/50 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">
                            {task.category}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${deadlineStatus.badgeClass}`}>
                            {deadlineStatus.label}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white">{task.title}</h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{task.description}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#261e47] flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-mono text-[11px]">
                          Tenggat: {formatIndonesianDate(task.dueDate)}
                        </span>

                        {isCompleted ? (
                          <button
                            onClick={() => toggleTaskCompleteDirect(task.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-red-500/20 text-emerald-300 hover:text-red-300 font-bold text-xs border border-emerald-500/30 hover:border-red-500/30 flex items-center gap-1.5 transition-all cursor-pointer group"
                            title="Klik untuk membatalkan (ubah ke belum selesai)"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 group-hover:hidden" />
                            <RotateCcw className="w-3.5 h-3.5 text-red-400 hidden group-hover:block" />
                            <span className="group-hover:hidden">Selesai</span>
                            <span className="hidden group-hover:inline">Batalkan</span>
                          </button>
                        ) : isPendingReview ? (
                          <div className="flex items-center gap-1">
                            <span className="text-purple-300 font-semibold flex items-center gap-1 text-xs">
                              <Clock className="w-3.5 h-3.5" /> Menunggu Review
                            </span>
                            <button
                              onClick={() => toggleTaskCompleteDirect(task.id)}
                              className="p-1 rounded-lg bg-[#251d45] hover:bg-red-500/20 text-slate-400 hover:text-red-300 text-[10px] border border-[#3b2d6a] transition-colors cursor-pointer"
                              title="Batalkan pengiriman"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : deadlineStatus.status === 'overdue' ? (
                          <div
                            className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-not-allowed select-none"
                            title="Batas waktu pengerjaan telah lewat. Tugas ini ditutup dan tidak dapat diselesaikan atau diunggah."
                          >
                            <Lock className="w-3.5 h-3.5 text-red-400" />
                            <span>Tenggat Berakhir</span>
                          </div>
                        ) : task.requiresUpload ? (
                          <button
                            onClick={() => setSelectedTaskForUpload(task)}
                            className="px-3 py-1.5 rounded-lg bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs flex items-center gap-1 shadow-sm cursor-pointer"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Unggah Bukti</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleTaskCompleteDirect(task.id)}
                            className="px-3 py-1.5 rounded-lg bg-[#251d45] hover:bg-[#34285e] text-pink-300 font-semibold text-xs border border-[#3b2d6a] cursor-pointer"
                          >
                            Tandai Selesai
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ANONYMOUS WALL (Papan Pesan Anonim Kelas) */}
            <div id="anonymous-wall" className="pt-2">
              <AnonymousWallSection />
            </div>

            {/* Creator Info & Kotak Donasi (Hanya di Dashboard Paling Bawah) */}
            <div className="pt-2">
              <CreatorDonationCard variant="banner" />
            </div>
          </div>
        )}

        {/* TAB 2: MATERI & TUGAS */}
        {activeTab === 'tugas' && (
          <div className="space-y-5">
            {/* Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141126] border border-[#272144] p-5 sm:p-6 rounded-3xl">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="w-5 h-5 text-pink-400" />
                  <h3 className="text-lg sm:text-xl font-extrabold text-white">Materi & Tugas Kelas</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Pelajari modul & materi pembelajaran dan kumpulkan tugas sebelum batas waktu berakhir
                </p>
              </div>

              {/* Sub-Tab Toggle */}
              <div className="flex items-center gap-1.5 p-1 bg-[#1a1433] rounded-2xl border border-[#2c2550] shrink-0">
                <button
                  onClick={() => setSubTabMateriTugas('materi')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    subTabMateriTugas === 'materi'
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/25'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Materi Pembelajaran</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-black/30 font-mono text-[10px]">
                    {classMaterials.length}
                  </span>
                </button>

                <button
                  onClick={() => setSubTabMateriTugas('tugas')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    subTabMateriTugas === 'tugas'
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/25'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ListTodo className="w-3.5 h-3.5" />
                  <span>Tugas Kelas</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-black/30 font-mono text-[10px]">
                    {classTasks.length}
                  </span>
                </button>
              </div>
            </div>

            {/* SUBTAB 1: MATERI PEMBELAJARAN (MEMBER VIEW) */}
            {subTabMateriTugas === 'materi' && (
              <div className="space-y-4">
                {/* Search & Category Filter */}
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

                  {/* Category Pills */}
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
                            return { bg: 'bg-pink-500/15 text-pink-300 border-pink-500/30', icon: Check };
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
                              <p className="text-xs text-slate-300 mt-2 line-clamp-3 leading-relaxed">
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

                            {/* Attachment button */}
                            {(m.fileName || m.externalLink) && (
                              <div className="mt-3.5 pt-3 border-t border-[#221a3d]">
                                {m.fileUrl ? (
                                  <a
                                    href={m.fileUrl}
                                    download={m.fileName || 'materi-belajar'}
                                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#1b1535] hover:bg-[#261d4b] border border-[#372a60] text-pink-300 hover:text-white transition-all group/att"
                                    title="Klik untuk mengunduh berkas materi"
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
                                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#1b1535] hover:bg-[#261d4b] border border-[#372a60] text-emerald-300 hover:text-white transition-all"
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

                          <div className="mt-4 pt-3 border-t border-[#231d40] flex items-center justify-between text-xs">
                            <span className="text-[10px] text-slate-400 truncate">
                              Pengajar: <strong className="text-slate-300">{m.authorName}</strong>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-12 text-center bg-[#141126] border border-[#272144] rounded-3xl space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-[#1f173d] text-pink-400 flex items-center justify-center mx-auto border border-[#34275a]">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-white">Belum Ada Materi Pembelajaran</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Pengajar belum mengunggah materi atau modul belajar untuk ruang kelas ini.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* SUBTAB 2: TUGAS KELAS (MEMBER VIEW) */}
            {subTabMateriTugas === 'tugas' && (
              <div className="space-y-4">
                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 bg-[#1a1433] p-1 rounded-xl border border-[#2c2550] overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => setTaskFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                      taskFilter === 'all' ? 'bg-pink-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Semua ({classTasks.length})
                  </button>
                  <button
                    onClick={() => setTaskFilter('pending')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                      taskFilter === 'pending' ? 'bg-pink-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Belum Selesai ({activeTasksCount})
                  </button>
                  <button
                    onClick={() => setTaskFilter('completed')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                      taskFilter === 'completed' ? 'bg-pink-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Selesai ({completedTasksCount})
                  </button>
                  <button
                    onClick={() => setTaskFilter('priority')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                      taskFilter === 'priority' ? 'bg-pink-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Prioritas ({priorityCount})
                  </button>
                </div>

                {/* Task Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTasks.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-[#141126] border border-[#272144] rounded-3xl text-slate-500">
                      <ListTodo className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">Tidak ada tugas pada kategori ini.</p>
                    </div>
                  ) : (
                    filteredTasks.map((task) => {
                      const deadlineStatus = getTaskDeadlineStatus(task.dueDate);
                      const submission = getMemberSubmissionForTask(task.id);
                      const isCompleted = submission && submission.status === 'completed';
                      const isPendingReview = submission && submission.status === 'pending_review';
                      const isRevision = submission && submission.status === 'revision';

                      return (
                        <div
                          key={task.id}
                          className="p-5 rounded-3xl bg-[#141126] border border-[#272144] hover:border-[#3d3166] transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">
                                {task.category}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${deadlineStatus.badgeClass}`}>
                                {deadlineStatus.label}
                              </span>
                            </div>

                            <h4 className="text-base font-bold text-white">{task.title}</h4>
                            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                              {task.description}
                            </p>

                            {/* Submission note or admin feedback badge */}
                            {isRevision && (
                              <div className="mt-3 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs">
                                <span className="font-bold block">⚠️ Catatan Revisi Admin:</span>
                                <p>{submission.adminFeedback}</p>
                              </div>
                            )}
                            {submission?.adminFeedback && isCompleted && (
                              <div className="mt-2.5 p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs">
                                <span className="font-bold">Umpan Balik:</span> "{submission.adminFeedback}"
                              </div>
                            )}
                          </div>

                          <div className="mt-5 pt-3 border-t border-[#231d40] flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-mono text-[11px]">
                              Tenggat: {formatIndonesianDate(task.dueDate)}
                            </span>

                            <div className="flex items-center gap-2">
                              {isCompleted ? (
                                <button
                                  onClick={() => toggleTaskCompleteDirect(task.id)}
                                  className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-red-500/20 text-emerald-300 hover:text-red-300 font-bold text-xs border border-emerald-500/30 hover:border-red-500/30 flex items-center gap-1.5 transition-all cursor-pointer group"
                                  title="Klik untuk membatalkan status selesai"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 group-hover:hidden" />
                                  <RotateCcw className="w-3.5 h-3.5 text-red-400 hidden group-hover:block" />
                                  <span className="group-hover:hidden">Selesai</span>
                                  <span className="hidden group-hover:inline">Batalkan</span>
                                </button>
                              ) : isPendingReview ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 flex items-center gap-1 text-xs">
                                    <Clock className="w-3.5 h-3.5" /> Ditinjau Admin
                                  </span>
                                  <button
                                    onClick={() => toggleTaskCompleteDirect(task.id)}
                                    className="p-1.5 rounded-lg bg-[#251d45] hover:bg-red-500/20 text-slate-400 hover:text-red-300 text-xs border border-[#3b2d6a] transition-colors cursor-pointer flex items-center gap-1"
                                    title="Batalkan pengiriman tugas"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Batal</span>
                                  </button>
                                </div>
                              ) : deadlineStatus.status === 'overdue' ? (
                                <div
                                  className="px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-not-allowed select-none"
                                  title="Batas waktu pengerjaan telah lewat. Tugas ini ditutup dan tidak dapat diselesaikan atau diunggah."
                                >
                                  <Lock className="w-3.5 h-3.5 text-red-400" />
                                  <span>Tenggat Berakhir</span>
                                </div>
                              ) : task.requiresUpload || isRevision ? (
                                <button
                                  onClick={() => setSelectedTaskForUpload(task)}
                                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-pink-500/20 cursor-pointer"
                                >
                                  <UploadCloud className="w-3.5 h-3.5" />
                                  <span>{isRevision ? 'Unggah Ulang Revisi' : 'Unggah Bukti'}</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => toggleTaskCompleteDirect(task.id)}
                                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Tandai Selesai</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: ABSENSI KELAS */}
        {activeTab === 'absensi' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <AttendanceMemberView />
          </div>
        )}

        {/* TAB: BANK SOAL & UJIAN */}
        {activeTab === 'bank_soal' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <QuestionBankMemberView initialMode="normal" />
          </div>
        )}

        {/* TAB: REMINDQUIZ LIVE */}
        {activeTab === 'kuis_live' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <QuestionBankMemberView initialMode="live" />
          </div>
        )}

        {/* TAB: JADWAL PELAJARAN */}
        {activeTab === 'jadwal' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <ScheduleMemberView />
          </div>
        )}

        {/* TAB: FORUM KELAS & GLOBAL + MARKETPLACE JASA */}
        {activeTab === 'forum' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <ForumView />
          </div>
        )}

        {/* TAB: PESAN ANONIM */}
        {activeTab === 'anonwall' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <AnonymousWallSection />
          </div>
        )}

        {/* TAB 3: AI PERSONAL ASSISTANT (CONTROLLED BY OWNER) */}
        {activeTab === 'ai_tutor' && (
          systemSettings?.isAiMaintenance ? (
            <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 text-center animate-in fade-in zoom-in-95 duration-500">
              <div className="relative inline-block mb-8">
                {/* Futuristic glowing backdrop effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-500 to-purple-600 rounded-full blur-3xl opacity-20 scale-150 animate-pulse" />
                
                <div className="relative w-28 h-28 mx-auto rounded-3xl bg-[#141126] border border-[#372b62] shadow-2xl flex items-center justify-center text-white">
                  <Lock className="w-12 h-12 text-amber-400 stroke-[1.8] animate-bounce duration-1000" />
                  
                  {/* Glowing tech circles */}
                  <div className="absolute -inset-1.5 border border-dashed border-purple-500/30 rounded-3xl animate-[spin_20s_linear_infinite]" />
                  <div className="absolute -inset-3.5 border border-dashed border-pink-500/15 rounded-3xl animate-[spin_35s_linear_infinite_reverse]" />
                </div>
              </div>

              <div className="space-y-4 max-w-xl mx-auto">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-extrabold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 animate-spin duration-3000" />
                  <span>Tahap Pengembangan Developer</span>
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {systemSettings?.aiMaintenanceTitle || 'AI Assistant Sedang Bersiap!'}
                </h2>

                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                  {systemSettings?.aiMaintenanceMessage || 'Fitur AI Assistant sedang dalam tahap pengembangan developer, mohon ditunggu ya! Kami sedang mematangkan asisten bimbingan belajar cerdas terbaik untuk Anda.'}
                </p>

                <p className="text-xs text-slate-400 leading-relaxed bg-[#141126]/60 p-4 rounded-2xl border border-[#2b2252]/50">
                  📢 <span className="font-semibold text-pink-300">Kabar Baik:</span> Anda tidak perlu khawatir melewatkan rilisnya! Kami akan segera mengirimkan pemberitahuan otomatis ke seluruh HP & perangkat Anda <strong className="text-white">kalo udah selesai tahap pengembangan nya</strong>.
                </p>
              </div>

              {/* Development Progress Simulator */}
              <div className="mt-8 max-w-md mx-auto p-4 rounded-2xl bg-[#0f0b1e]/80 border border-[#231b40] text-left space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  <span>Progress Coding & Integrasi</span>
                  <span className="text-amber-400 font-mono">{systemSettings?.aiProgressPercent ?? 85}% Selesai</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#0a0714] overflow-hidden p-[2px] border border-white/5">
                  <div 
                    className="h-full rounded-full live-progress-line"
                    style={{ width: `${systemSettings?.aiProgressPercent ?? 85}%` }}
                  />
                </div>
                <div className="flex items-center justify-end text-[9px] text-slate-500 font-mono pt-1">
                  <span>Status: Internal Testing</span>
                </div>
              </div>

              {/* Encourage Developer Button */}
              <div className="mt-8 flex justify-center">
                <button
                  onClick={async () => {
                    if ('vibrate' in navigator) {
                      navigator.vibrate(60);
                    }
                    await addFeedback('[Semangat Dev] 💖 Semangat terus mengembangkan aplikasi RemindTask! 🌟🚀');
                    showToast('🚀 Dukungan semangat Anda telah terkirim otomatis ke Owner & Developer!', 'success');
                  }}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-extrabold text-xs shadow-lg shadow-purple-600/20 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2 hover:scale-105"
                >
                  <Heart className="w-4 h-4 fill-white text-white animate-pulse" />
                  <span>Beri Semangat</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-200">
              <AIChatTutor />
            </div>
          )
        )}

        {/* TAB 4: ZONA FOKUS */}
        {activeTab === 'fokus' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <StudyFocusTools
              onAskAIWithNotes={() => {
                setActiveTab('ai_tutor');
              }}
            />
          </div>
        )}

        {/* TAB 5: ARENA GAME SISWA & ASAH OTAK */}
        {activeTab === 'game' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <StudentMiniGame />
          </div>
        )}

        {/* TAB 5B: VIRTUAL PET SAYA */}
        {activeTab === 'pet' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <VirtualPetView />
          </div>
        )}

        {/* TAB 6: STATISTIK */}
        {activeTab === 'statistik' && (
          <AnalyticsView onOpenReportModal={() => setIsReportModalOpen(true)} />
        )}

        {/* TAB 6: KALENDER */}
        {activeTab === 'kalender' && (
          <CalendarView
            onSelectTask={() => {
              setActiveTab('tugas');
            }}
          />
        )}

        {/* TAB 7: CREATOR & INFORMASI PEMBUAT */}
        {activeTab === 'creator' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <CreatorDonationCard variant="full" />
          </div>
        )}

        {/* TAB 8: KRITIK & SARAN OWNER */}
        {activeTab === 'saran' && (
          <FeedbackView />
        )}

        {/* TAB 8B: CHAT & PESAN (Siswa, Admin, Owner) */}
        {(activeTab === 'chat_admin' || (activeTab as string) === 'chat_owner') && (
          <MemberAdminChatView />
        )}

        {/* TAB 10: SETTINGS */}
        {activeTab === 'setting' && (
          <MemberSettingsView />
        )}
          </>
        )}
      </main>

      {/* Submission Modal for Uploads */}
      <SubmissionModal
        isOpen={!!selectedTaskForUpload}
        onClose={() => setSelectedTaskForUpload(null)}
        task={selectedTaskForUpload}
        existingSubmission={
          selectedTaskForUpload
            ? getMemberSubmissionForTask(selectedTaskForUpload.id)
            : undefined
        }
      />

      {/* Daily Report Modal */}
      <DailyReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
};
