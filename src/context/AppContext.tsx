import React, { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react';
import {
  INITIAL_CLASSES,
  INITIAL_MATERIALS,
  INITIAL_NOTIFICATIONS,
  INITIAL_SUBMISSIONS,
  INITIAL_TASKS,
  INITIAL_USERS,
  INITIAL_QUESTION_BANKS,
  INITIAL_QUIZ_SUBMISSIONS,
} from '../services/mockData';
import { getStoredSupabaseConfig, getSupabaseClient } from '../services/supabase';
import { ClassItem, ClassMaterial, NotificationItem, Task, TaskSubmission, User, UserRole, EducatorType, ActivityLogItem, ScheduleItem, DayOfWeek, AnonymousMessage, AnonymousReply, FeedbackItem, OwnerChatItem, SystemSettings, ClassAccessLog, ClassChatItem, QuestionBankItem, QuizSubmission, QuizSubmissionAnswer, QuizStatus, AttendanceSession, AttendanceRecord, AttendanceStatus, AttendanceVerificationMethod, ForumPost, ForumCategory, ForumComment, LiveQuiz, LiveQuizResponse } from '../types';
import {
  formatIndonesianDate,
  getTaskDeadlineStatus,
  playNotificationSound,
  playNotificationSoundOnce,
  registerServiceWorkerForNotifications,
  requestBrowserNotificationPermission,
  sendBrowserPushNotification,
} from '../utils/notification';
import { verifyAttendanceToken, calculateDistanceMeters } from '../utils/attendanceToken';

interface AppContextType {
  currentUser: User | null;
  currentRole: UserRole;
  currentClass: ClassItem | null;
  classes: ClassItem[];
  tasks: Task[];
  submissions: TaskSubmission[];
  notifications: NotificationItem[];
  schedules: ScheduleItem[];
  anonymousMessages: AnonymousMessage[];
  activityLogs: ActivityLogItem[];
  unreadNotifCount: number;
  onlineUsersCount: number;
  pushPermission: NotificationPermission;
  theme: 'dark';
  toggleTheme: () => void;
  activeTab: string;
  isNotificationDrawerOpen: boolean;
  toastMessage: { text: string; type?: 'info' | 'success' | 'warn' } | null;
  isSupabaseConnected: boolean;
  isSupabaseModalOpen: boolean;
  isSyncing: boolean;
  setIsSupabaseModalOpen: (open: boolean) => void;
  syncWithSupabase: () => Promise<void>;
  cleanStaleCacheAndSync: () => Promise<void>;
  purgeOrphanedClasses: () => Promise<number>;
  addActivityLog: (actorName: string, actorRole: UserRole | 'system', action: string, details: string, category: ActivityLogItem['category']) => void;
  clearActivityLogs: () => void;

  // Anonymous Wall Actions
  addAnonymousMessage: (data: Omit<AnonymousMessage, 'id' | 'createdAt' | 'likes' | 'likedByMe'>) => Promise<AnonymousMessage>;
  likeAnonymousMessage: (messageId: string) => void;
  replyToAnonymousMessage: (messageId: string, replyText: string) => void;
  addReplyToAnonymousMessage: (
    messageId: string,
    replyText: string,
    options?: {
      authorName?: string;
      authorEmoji?: string;
      authorRole?: 'member' | 'admin' | 'owner';
      senderId?: string;
      realSenderName?: string;
      senderEmail?: string;
    }
  ) => void;
  togglePinAnonymousMessage: (messageId: string) => void;
  deleteAnonymousMessage: (messageId: string) => void;

  // Navigation & Auth
  setActiveTab: (tab: string) => void;
  setIsNotificationDrawerOpen: (open: boolean) => void;
  showToast: (text: string, type?: 'info' | 'success' | 'warn') => void;
  isNotificationReadLocally: (notifId: string, userId?: string) => boolean;
  loginAsOwner: (usernameOrEmail?: string, password?: string, silent?: boolean) => Promise<{ success: boolean; message: string }>;
  loginAsAdmin: (usernameOrEmail: string, password?: string) => Promise<{ success: boolean; message: string }>;
  enterClassByCode: (code: string, memberName?: string, memberEmail?: string) => Promise<{ success: boolean; message: string }>;
  classAccessLogs: ClassAccessLog[];
  classChats: ClassChatItem[];
  sendClassChatMessage: (recipientId: string, recipientName: string, message: string) => Promise<ClassChatItem>;
  deleteClassChatMessage: (messageId: string) => Promise<void>;
  clearChatThread: (targetUserId: string) => Promise<void>;
  markClassChatsAsRead: (otherUserId: string) => void;
  registerAdmin: (name: string, email: string, className: string) => void;
  addAdminUser: (data: { name: string; username?: string; email?: string; password?: string; className: string; classCode?: string; educatorType?: EducatorType }) => Promise<{ user: User; classItem: ClassItem }>;
  checkUsernameAvailability: (username: string) => Promise<boolean>;
  confirmAdminEducatorType: (educatorType: EducatorType) => Promise<void>;
  deleteAdminUser: (userId: string) => void;
  deleteMemberUser: (userId: string) => Promise<void>;
  logout: () => void;
  switchRoleQuick: (role: UserRole) => void;
  updateMemberProfile: (updates: { name?: string; email?: string; avatar?: string }) => void;
  updateUserProfile: (updates: { name?: string; email?: string; avatar?: string; password?: string }) => void;
  updateUserDirect: (userId: string, updates: Partial<User>) => Promise<void>;

  // Class & Admin Actions
  selectClass: (classId: string) => void;
  createClass: (name: string, adminName: string) => Promise<ClassItem>;
  deleteClass: (classId: string) => Promise<void>;

  // Tasks Actions
  addTask: (data: Omit<Task, 'id' | 'createdAt' | 'createdBy' | 'classId'> & { classId?: string }) => Promise<Task>;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;

  // Learning Materials Actions
  materials: ClassMaterial[];
  addMaterial: (data: Omit<ClassMaterial, 'id' | 'createdAt' | 'authorName'>) => Promise<ClassMaterial>;
  updateMaterial: (materialId: string, updates: Partial<ClassMaterial>) => void;
  deleteMaterial: (materialId: string) => void;

  // Schedules Actions
  addSchedule: (data: Omit<ScheduleItem, 'id' | 'createdAt'>) => Promise<ScheduleItem>;
  updateSchedule: (scheduleId: string, updates: Partial<ScheduleItem>) => void;
  deleteSchedule: (scheduleId: string) => void;
  sendScheduleReminderNotification: (day: DayOfWeek, scheduleId?: string) => void;

  // Submissions & Member Actions
  submitTaskEvidence: (taskId: string, fileName?: string, note?: string, fileUrl?: string, fileSize?: string) => void;
  toggleTaskCompleteDirect: (taskId: string) => void;
  getMemberSubmissionForTask: (taskId: string, memberId?: string) => TaskSubmission | undefined;

  // Moderation
  moderateSubmission: (submissionId: string, status: 'completed' | 'revision' | 'rejected', feedback?: string) => void;

  // Notifications & Push
  requestPushPermission: () => Promise<void>;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: (specificIds?: string[]) => void;
  sendCustomNotification: (
    title: string,
    message: string,
    type?: NotificationItem['type'],
    targetClassId?: string,
    targetTaskId?: string,
    targetRole?: NotificationItem['targetRole'],
    recipientId?: string
  ) => void;
  sendBroadcastMessage: (params: {
    title: string;
    message: string;
    target: 'class_members' | 'all' | 'admins_only';
    classId?: string;
  }) => void;
  sendTestPushAlert: () => void;

  // Owner Management & Audit Cache
  toggleUserStatus: (userId: string) => void;
  users: User[];
  resetToDefaultData: () => void;
  purgeObsoleteDatabaseCache: () => Promise<void>;
  liveBannerNotification: NotificationItem | null;
  setLiveBannerNotification: (notif: NotificationItem | null) => void;
  feedbacks: FeedbackItem[];
  addFeedback: (content: string) => Promise<void>;
  deleteFeedback: (feedbackId: string) => Promise<void>;
  replyToFeedback: (feedbackId: string, replyMessageText: string) => Promise<void>;
  ownerChats: OwnerChatItem[];
  sendOwnerChatMessage: (messageText: string, customSenderRole?: 'admin' | 'member', customSenderId?: string, customSenderName?: string) => Promise<void>;
  deviceAccounts: User[];
  loginAsStoredAccount: (account: User) => Promise<{ success: boolean; message: string }>;
  removeStoredAccount: (accountId: string) => void;
  systemSettings: SystemSettings;
  updateSystemSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;

  // Bank Soal & Ujian
  questionBanks: QuestionBankItem[];
  quizSubmissions: QuizSubmission[];
  addQuestionBank: (data: Omit<QuestionBankItem, 'id' | 'createdAt'>) => Promise<QuestionBankItem>;
  updateQuestionBank: (id: string, updates: Partial<QuestionBankItem>) => Promise<void>;
  toggleQuestionBankStatus: (id: string) => Promise<void>;
  deleteQuestionBank: (id: string) => Promise<void>;
  submitQuizAnswers: (
    quizId: string,
    answers: QuizSubmissionAnswer[],
    durationSecondsUsed?: number,
    overrideStudent?: { id: string; name: string; email?: string }
  ) => Promise<QuizSubmission>;

  // RemindQuiz Live
  liveQuizzes: LiveQuiz[];
  liveQuizResponses: LiveQuizResponse[];
  createLiveQuiz: (quizId: string, title: string) => Promise<LiveQuiz>;
  updateLiveQuizStatus: (id: string, status: 'waiting' | 'active' | 'ended') => Promise<void>;
  nextLiveQuizQuestion: (id: string, newIndex: number) => Promise<void>;
  submitLiveQuizResponse: (liveQuizId: string, questionIndex: number, selectedOptionIndex: number, isCorrect: boolean, pointsEarned: number, responseTimeMs: number, essayAnswer?: string) => Promise<void>;
  setLiveQuizShowAnswers: (id: string, show: boolean) => Promise<void>;
  setLiveQuizTimer: (id: string, seconds: number) => Promise<void>;
  deleteLiveQuiz: (id: string) => Promise<void>;

  // Absensi & Presensi Digital Kelas
  attendanceSessions: AttendanceSession[];
  attendanceRecords: AttendanceRecord[];
  createAttendanceSession: (data: Omit<AttendanceSession, 'id' | 'createdAt' | 'secretToken'>) => Promise<AttendanceSession>;
  toggleAttendanceSession: (sessionId: string) => Promise<void>;
  closeAttendanceSession: (sessionId: string) => Promise<void>;
  reopenAttendanceSession: (sessionId: string) => Promise<void>;
  deleteAttendanceSession: (sessionId: string) => Promise<void>;
  submitAttendance: (data: {
    sessionId: string;
    status: AttendanceStatus;
    latitude?: number;
    longitude?: number;
    proofFileName?: string;
    proofFileUrl?: string;
    note?: string;
    verificationToken?: string;
  }) => Promise<{ success: boolean; message: string }>;
  recordAttendance: (
    sessionId: string,
    status: AttendanceStatus,
    method: AttendanceVerificationMethod,
    note?: string,
    verificationToken?: string,
    coords?: { lat: number; lng: number },
    overrideStudent?: { id: string; name: string; email?: string },
    proofFileUrl?: string,
    proofFileName?: string
  ) => Promise<{ success: boolean; message: string }>;
  updateAttendanceRecord: (recordId: string, status: AttendanceStatus, note?: string) => Promise<void>;
  deleteAttendanceRecord: (recordId: string) => Promise<void>;
  refreshAttendance: (sessionId?: string) => Promise<void>;

  // Forum Kelas & Global
  forumPosts: ForumPost[];
  addForumPost: (post: Omit<ForumPost, 'id' | 'createdAt' | 'likes' | 'likedBy' | 'comments'>) => Promise<ForumPost>;
  likeForumPost: (postId: string) => void;
  addForumComment: (postId: string, content: string) => Promise<void>;
  deleteForumPost: (postId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  CLASSES: 'remindtask_global_v5_classes',
  TASKS: 'remindtask_global_v5_tasks',
  MATERIALS: 'remindtask_global_v5_materials',
  USERS: 'remindtask_global_v5_users',
  SUBMISSIONS: 'remindtask_global_v5_submissions',
  NOTIFS: 'remindtask_global_v5_notifs',
  CURRENT_USER: 'remindtask_global_v5_current_user',
  CURRENT_CLASS: 'remindtask_global_v5_current_class',
  ACTIVE_TAB: 'remindtask_global_v5_active_tab',
  ACCESS_LOGS: 'remindtask_global_v5_access_logs',
  QUESTION_BANKS: 'remindtask_global_v5_question_banks',
  QUIZ_SUBMISSIONS: 'remindtask_global_v5_quiz_submissions',
  ATTENDANCE_SESSIONS: 'remindtask_global_v5_attendance_sessions',
  ATTENDANCE_RECORDS: 'remindtask_global_v5_attendance_records',
  FORUM_POSTS: 'remindtask_global_v5_forum_posts',
  CLASS_CHATS: 'remindtask_global_v5_class_chats',
  LIVE_QUIZZES: 'remindtask_global_v5_live_quizzes',
  LIVE_QUIZ_RESPONSES: 'remindtask_global_v5_live_quiz_responses',
};

const isRealEmail = (email?: string): boolean => {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  return (
    e.includes('@') &&
    e.includes('.') &&
    !e.endsWith('@siswa.remindtask.com') &&
    !e.endsWith('@remindtask.com') &&
    !e.endsWith('@example.com')
  );
};

const parseReplies = (raw: any, replyFromAdmin?: string, replyAt?: string): AnonymousReply[] => {
  let parsed: AnonymousReply[] = [];
  if (Array.isArray(raw)) {
    parsed = raw;
  } else if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) parsed = p;
    } catch {}
  }
  if ((!parsed || parsed.length === 0) && replyFromAdmin) {
    parsed = [
      {
        id: 'legacy-admin-reply',
        authorName: 'Admin Kelas',
        authorEmoji: '🛡️',
        authorRole: 'admin',
        message: replyFromAdmin,
        createdAt: replyAt || new Date().toISOString(),
      },
    ];
  }
  return parsed;
};

const extractSender = (a: any) => {
  let senderId = a.sender_id || a.senderId;
  let senderName = a.sender_name || a.senderName;
  let senderEmail = a.sender_email || a.senderEmail;
  let senderUsername = a.sender_username || a.senderUsername;
  let senderRole = a.sender_role || a.senderRole;

  // Extract from JSONB liked_by_users metadata if dedicated columns are not yet filled or table is pending migration
  if (!senderName && Array.isArray(a.liked_by_users)) {
    const metaObj = a.liked_by_users.find((x: any) => x && typeof x === 'object' && x.__sender);
    if (metaObj && metaObj.__sender) {
      senderId = senderId || metaObj.__sender.id;
      senderName = senderName || metaObj.__sender.name;
      senderEmail = senderEmail || metaObj.__sender.email;
      senderUsername = senderUsername || metaObj.__sender.username;
      senderRole = senderRole || metaObj.__sender.role;
    }
  }

  return { senderId, senderName, senderEmail, senderUsername, senderRole };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mutatingSessionActionsRef = useRef<Record<string, 'closing' | 'reopening' | 'deleting'>>({});

  const [classes, setClasses] = useState<ClassItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLASSES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USERS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    registerServiceWorkerForNotifications().catch(() => {});
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
    } catch {}
  }, [classes]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch {}
  }, [users]);

  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [materials, setMaterials] = useState<ClassMaterial[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MATERIALS);
      return saved ? JSON.parse(saved) : INITIAL_MATERIALS;
    } catch {
      return INITIAL_MATERIALS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(materials));
    } catch {}
  }, [materials]);

  const [submissions, setSubmissions] = useState<TaskSubmission[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTIFS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [liveBannerNotification, setLiveBannerNotification] = useState<NotificationItem | null>(null);

  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>(() => {
    try {
      const saved = localStorage.getItem('remindtask_global_v5_feedbacks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('remindtask_global_v5_feedbacks', JSON.stringify(feedbacks));
    } catch {}
  }, [feedbacks]);

  const [ownerChats, setOwnerChats] = useState<OwnerChatItem[]>(() => {
    try {
      const saved = localStorage.getItem('remindtask_global_v5_owner_chats');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('remindtask_global_v5_owner_chats', JSON.stringify(ownerChats));
    } catch {}
  }, [ownerChats]);

  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => {
    try {
      const saved = localStorage.getItem('remindtask_global_v5_schedules');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [classAccessLogs, setClassAccessLogs] = useState<ClassAccessLog[]>(() => {
    try {
      const saved = localStorage.getItem('rt_class_access_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('rt_class_access_logs', JSON.stringify(classAccessLogs));
    } catch {}
  }, [classAccessLogs]);

  const [classChats, setClassChats] = useState<ClassChatItem[]>(() => {
    try {
      const saved = localStorage.getItem('rt_class_chats');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('rt_class_chats', JSON.stringify(classChats));
    } catch {}
  }, [classChats]);

  const [questionBanks, setQuestionBanks] = useState<QuestionBankItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.QUESTION_BANKS);
      return saved ? JSON.parse(saved) : INITIAL_QUESTION_BANKS;
    } catch {
      return INITIAL_QUESTION_BANKS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.QUESTION_BANKS, JSON.stringify(questionBanks));
    } catch {}
  }, [questionBanks]);

  const [quizSubmissions, setQuizSubmissions] = useState<QuizSubmission[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.QUIZ_SUBMISSIONS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.QUIZ_SUBMISSIONS, JSON.stringify(quizSubmissions));
    } catch {}
  }, [quizSubmissions]);

  // Kuis Live State (Hydrated from localStorage for permanence across sessions)
  const [liveQuizzes, setLiveQuizzes] = useState<LiveQuiz[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LIVE_QUIZZES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LIVE_QUIZZES, JSON.stringify(liveQuizzes));
    } catch {}
  }, [liveQuizzes]);

  const [liveQuizResponses, setLiveQuizResponses] = useState<LiveQuizResponse[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LIVE_QUIZ_RESPONSES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LIVE_QUIZ_RESPONSES, JSON.stringify(liveQuizResponses));
    } catch {}
  }, [liveQuizResponses]);

  // Absensi & Presensi Digital State
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ATTENDANCE_SESSIONS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const attendanceSessionsRef = useRef(attendanceSessions);
  useEffect(() => {
    attendanceSessionsRef.current = attendanceSessions;
    try {
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE_SESSIONS, JSON.stringify(attendanceSessions));
    } catch {}
  }, [attendanceSessions]);

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ATTENDANCE_RECORDS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE_RECORDS, JSON.stringify(attendanceRecords));
    } catch {}
  }, [attendanceRecords]);

  const [forumPosts, setForumPosts] = useState<ForumPost[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FORUM_POSTS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FORUM_POSTS, JSON.stringify(forumPosts));
    } catch {}
  }, [forumPosts]);

  useEffect(() => {
    localStorage.setItem('remindtask_global_v5_schedules', JSON.stringify(schedules));
  }, [schedules]);

  const defaultSystemSettings: SystemSettings = {
    isMaintenance: false,
    maintenanceTitle: 'Pemeliharaan Server & Pembaruan Sistem',
    maintenanceMessage: 'Kami sedang melakukan peningkatan infrastruktur dan optimalisasi database Supabase untuk menghadirkan performa terbaik. Mohon bersabar, kami akan segera kembali.',
    maintenanceEstimate: 'Segera selesai dalam beberapa saat',
    isAiMaintenance: true,
    aiMaintenanceTitle: 'AI Assistant Sedang Bersiap!',
    aiMaintenanceMessage: 'Fitur AI Assistant sedang dalam tahap pengembangan developer, mohon ditunggu ya! Kami sedang mematangkan asisten bimbingan belajar cerdas terbaik untuk Anda.',
    aiProgressPercent: 85,
  };

  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    try {
      const saved = localStorage.getItem('remindtask_global_v5_system_settings');
      return saved ? { ...defaultSystemSettings, ...JSON.parse(saved) } : defaultSystemSettings;
    } catch {
      return defaultSystemSettings;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('remindtask_global_v5_system_settings', JSON.stringify(systemSettings));
    } catch {}
  }, [systemSettings]);

  const [anonymousMessages, setAnonymousMessages] = useState<AnonymousMessage[]>(() => {
    try {
      const saved = localStorage.getItem('remindtask_global_v5_anon_messages');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    localStorage.setItem('remindtask_global_v5_anon_messages', JSON.stringify(anonymousMessages));
  }, [anonymousMessages]);

  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>(() => {
    try {
      const saved = localStorage.getItem('remindtask_activity_logs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'log-init',
        actorName: 'Sistem RemindTask',
        actorRole: 'system',
        action: 'Sistem Terhubung Realtime',
        details: 'Server realtime Supabase dan pusat aktivitas audit siap memantau perubahan.',
        category: 'system',
        timestamp: new Date().toISOString(),
      },
    ];
  });

  // Dark Mode Only (Default Only)
  const theme: 'dark' = 'dark';
  const toggleTheme = () => {};

  useEffect(() => {
    try {
      localStorage.removeItem('remindtask_theme');
    } catch {}
    document.documentElement.classList.remove('light', 'light-theme');
    document.documentElement.classList.add('dark');
    document.body.classList.remove('light', 'light-theme');
    document.body.classList.add('dark');
  }, []);

  const addActivityLog = (
    actorName: string,
    actorRole: UserRole | 'system',
    action: string,
    details: string,
    category: ActivityLogItem['category']
  ) => {
    const newLog: ActivityLogItem = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      actorName: actorName || 'User',
      actorRole: actorRole || 'system',
      action,
      details,
      category,
      timestamp: new Date().toISOString(),
    };
    setActivityLogs((prev) => {
      const updated = [newLog, ...prev.slice(0, 99)];
      try {
        localStorage.setItem('remindtask_activity_logs', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    const client = getSupabaseClient();
    if (client) {
      client
        .from('activity_logs')
        .insert({
          id: newLog.id,
          actor_name: newLog.actorName,
          actor_role: newLog.actorRole,
          action: newLog.action,
          details: newLog.details,
          category: newLog.category,
          timestamp: newLog.timestamp,
        })
        .then(() => {}, () => {});
    }
  };

  const clearActivityLogs = () => {
    const defaultLog: ActivityLogItem = {
      id: 'log-clear-' + Date.now(),
      actorName: currentUser?.name || 'Owner',
      actorRole: 'owner',
      action: 'Log Dibersihkan',
      details: 'Riwayat audit lama telah dibersihkan oleh Owner.',
      category: 'system',
      timestamp: new Date().toISOString(),
    };
    setActivityLogs([defaultLog]);
    try {
      localStorage.setItem('remindtask_activity_logs', JSON.stringify([defaultLog]));
    } catch {}

    const client = getSupabaseClient();
    if (client) {
      client
        .from('activity_logs')
        .delete()
        .neq('id', '_none_')
        .then(() => {
          client
            .from('activity_logs')
            .insert({
              id: defaultLog.id,
              actor_name: defaultLog.actorName,
              actor_role: defaultLog.actorRole,
              action: defaultLog.action,
              details: defaultLog.details,
              category: defaultLog.category,
              timestamp: defaultLog.timestamp,
            })
            .then(() => {}, () => {});
        }, () => {});
    }
    showToast('Riwayat log aktivitas berhasil dibersihkan.', 'info');
  };

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.role) {
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  const [deviceAccounts, setDeviceAccounts] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('remindtask_device_accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter to only keep member/siswa accounts
          return parsed.filter((acc) => acc && acc.role === 'member');
        }
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    if (currentUser && currentUser.role === 'member') {
      setDeviceAccounts((prev) => {
        let updated = prev.filter(
          (acc) =>
            acc.id !== currentUser.id &&
            !(acc.name === currentUser.name && acc.classId === currentUser.classId)
        );
        updated = [currentUser, ...updated];
        const slice = updated.slice(0, 8);
        try {
          localStorage.setItem('remindtask_device_accounts', JSON.stringify(slice));
        } catch {}
        return slice;
      });
    }
  }, [currentUser]);

  const [currentClassId, setCurrentClassId] = useState<string>(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser.classId) return parsedUser.classId;
      }
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_CLASS);
      return saved || '';
    } catch {
      return '';
    }
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB);
      return saved || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(() => {
    return getStoredSupabaseConfig().isConnected;
  });
  const [toastMessage, setToastMessage] = useState<{ text: string; type?: 'info' | 'success' | 'warn' } | null>(null);
  const [onlineUsersCount, setOnlineUsersCount] = useState<number>(1);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(() => {
    return 'Notification' in window ? Notification.permission : 'default';
  });

  // Global sync with Supabase: Loads all classes, profiles, tasks, submissions
  const syncWithSupabase = async () => {
    const client = getSupabaseClient();
    if (!client) {
      setIsSupabaseConnected(false);
      return;
    }

    try {
      setIsSyncing(true);
      setIsSupabaseConnected(true);

      const [classesRes, tasksRes, materialsRes, submissionsRes, notifsRes, profilesRes] = await Promise.all([
        client.from('classes').select('*').order('created_at', { ascending: false }),
        client.from('tasks').select('*').order('created_at', { ascending: false }),
        client.from('materials').select('*').order('created_at', { ascending: false }),
        client.from('submissions').select('*').order('submitted_at', { ascending: false }),
        client.from('notifications').select('*').order('timestamp', { ascending: false }).limit(40),
        client.from('profiles').select('*'),
      ]);

      if (Array.isArray(classesRes.data)) {
        const mappedClasses: ClassItem[] = classesRes.data.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          adminId: c.admin_id,
          adminName: c.admin_name,
          educatorType: (c.educator_type as EducatorType) || undefined,
          description: c.description || '',
          memberCount: c.member_count || 0,
          accessCountToday: c.access_count_today || 0,
          createdAt: c.created_at,
        }));
        setClasses(mappedClasses);
        try { localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(mappedClasses)); } catch {}
      }

      if (Array.isArray(tasksRes.data)) {
        const mappedTasks: Task[] = tasksRes.data.map((t) => ({
          id: t.id,
          classId: t.class_id,
          title: t.title,
          description: t.description || '',
          dueDate: t.due_date,
          priority: t.priority,
          category: t.category,
          requiresUpload: t.requires_upload ?? true,
          createdAt: t.created_at,
          createdBy: t.created_by,
        }));
        setTasks(mappedTasks);
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(mappedTasks));
      }

      // Sync materials with Supabase & Server Store Fallback
      let finalMaterials: ClassMaterial[] = [];
      if (Array.isArray(materialsRes.data) && materialsRes.data.length > 0) {
        finalMaterials = materialsRes.data.map((m: any) => ({
          id: m.id,
          classId: m.class_id,
          title: m.title,
          description: m.description || '',
          category: m.category,
          fileName: m.file_name,
          fileSize: m.file_size,
          fileUrl: m.file_url,
          externalLink: m.external_link,
          authorName: m.author_name || 'Admin Kelas',
          tags: Array.isArray(m.tags) ? m.tags : [],
          createdAt: m.created_at,
        }));
      }

      // Also query server-side material cache
      try {
        const srvRes = await fetch('/api/materials');
        if (srvRes.ok) {
          const srvData = await srvRes.json().catch(() => ({}));
          if (Array.isArray(srvData.materials) && srvData.materials.length > 0) {
            const map = new Map<string, ClassMaterial>();
            finalMaterials.forEach((m) => map.set(m.id, m));
            srvData.materials.forEach((sm: any) => {
              if (!map.has(sm.id)) map.set(sm.id, sm);
            });
            finalMaterials = Array.from(map.values());
          }
        }
      } catch {}

      if (finalMaterials.length > 0) {
        setMaterials((prev) => {
          const map = new Map<string, ClassMaterial>();
          finalMaterials.forEach((m) => map.set(m.id, m));
          prev.forEach((localM) => {
            if (!map.has(localM.id)) map.set(localM.id, localM);
          });
          const merged = Array.from(map.values());
          try { localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(merged)); } catch {}
          return merged;
        });
      }

      if (Array.isArray(submissionsRes.data)) {
        const mappedSubs: TaskSubmission[] = submissionsRes.data.map((s) => ({
          id: s.id,
          taskId: s.task_id,
          classId: s.class_id,
          memberId: s.member_id,
          memberName: s.member_name,
          status: s.status,
          fileName: s.file_name,
          fileSize: s.file_size,
          fileUrl: s.file_url,
          submissionNote: s.submission_note,
          adminFeedback: s.admin_feedback,
          reviewedAt: s.reviewed_at,
          reviewedBy: s.reviewed_by,
          submittedAt: s.submitted_at,
        }));
        setSubmissions(mappedSubs);
        localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(mappedSubs));
      }

      // Fetch notifications safely with fallback for timestamp or created_at column
      let notifsData = notifsRes.data;
      if (!Array.isArray(notifsData) || notifsRes.error) {
        try {
          const fallbackRes = await client.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
          if (Array.isArray(fallbackRes.data)) {
            notifsData = fallbackRes.data;
          }
        } catch {}
      }

      if (Array.isArray(notifsData)) {
        const mappedNotifs: NotificationItem[] = notifsData.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type || 'system',
          read: Boolean(n.read || (typeof window !== 'undefined' && localStorage.getItem(`rt_seen_ios_notif_${n.id}`) === 'true')),
          timestamp: n.timestamp || n.created_at || new Date().toISOString(),
          classId: n.class_id,
          taskId: n.task_id,
          targetRole: n.target_role || 'all',
          recipientId: n.recipient_id,
        }));
        setNotifications(mappedNotifs);
        localStorage.setItem(STORAGE_KEYS.NOTIFS, JSON.stringify(mappedNotifs));
      }

      // Sync schedules from Supabase
      try {
        const schedRes = await client.from('schedules').select('*').order('created_at', { ascending: true });
        if (Array.isArray(schedRes.data)) {
          const mappedSched: ScheduleItem[] = schedRes.data.map((s: any) => ({
            id: s.id,
            classId: s.class_id,
            day: s.day,
            subject: s.subject,
            startTime: s.start_time,
            endTime: s.end_time,
            teacherName: s.teacher_name || '',
            room: s.room_or_link || s.room || '',
            notes: s.notes || '',
            color: s.color_badge || s.color || '',
            createdAt: s.created_at,
          }));
          setSchedules(mappedSched);
          localStorage.setItem('remindtask_global_v5_schedules', JSON.stringify(mappedSched));
        }
      } catch (errSched) {
        console.warn('Sync schedules error:', errSched);
      }

      // Try syncing anonymous wall if table exists
      try {
        const anonRes = await client.from('anonymous_wall').select('*').order('created_at', { ascending: false }).limit(60);
        if (Array.isArray(anonRes.data)) {
          const mappedAnon: AnonymousMessage[] = anonRes.data.map((a: any) => {
            const sender = extractSender(a);
            return {
              id: a.id,
              classId: a.class_id,
              className: a.class_name || 'Ruang Kelas',
              message: a.message,
              tag: a.tag || 'Aspirasi',
              alias: a.alias || 'Siswa Anonim',
              avatarEmoji: a.avatar_emoji || '🎭',
              cardGradient: a.card_gradient || 'from-purple-900/40 to-pink-900/30',
              likes: a.likes || 0,
              replyFromAdmin: a.reply_from_admin || undefined,
              replyAt: a.reply_at || undefined,
              replies: parseReplies(a.replies, a.reply_from_admin, a.reply_at),
              isPinned: a.is_pinned ?? false,
              createdAt: a.created_at,
              senderId: sender.senderId,
              senderName: sender.senderName,
              senderEmail: sender.senderEmail,
              senderUsername: sender.senderUsername,
              senderRole: sender.senderRole,
            };
          });
          setAnonymousMessages(mappedAnon);
          localStorage.setItem('remindtask_global_v5_anon_messages', JSON.stringify(mappedAnon));
        }
      } catch {}

      if (Array.isArray(profilesRes.data)) {
        const loadedUsers: User[] = profilesRes.data.map((p) => {
          const derivedUsername = p.username || (p.email ? p.email.split('@')[0] : p.name.toLowerCase().replace(/\s+/g, ''));
          return {
            id: p.id,
            name: p.name,
            username: derivedUsername,
            email: p.email,
            password: p.password || 'password123',
            role: (p.role as UserRole) || 'member',
            educatorType: (p.educator_type as EducatorType) || (localStorage.getItem('rt_confirmed_educator_' + p.id) as EducatorType) || undefined,
            classId: p.class_id,
            className: p.class_name,
            status: (p.status || 'active') as 'active' | 'suspended',
            avatar: p.avatar_url || p.avatar || undefined,
            createdAt: p.created_at || new Date().toISOString(),
          };
        });

        // Ensure 1:1 binding between Classes and Admins if an admin profile was missing in Supabase
        if (Array.isArray(classesRes.data)) {
          classesRes.data.forEach((c) => {
            const hasAdminProfile = loadedUsers.some((u) => u.role === 'admin' && (u.id === c.admin_id || u.classId === c.id));
            if (!hasAdminProfile && c.admin_id) {
              const cleanAdminName = c.admin_name || 'Admin ' + c.name;
              const cleanEmail = cleanAdminName.toLowerCase().replace(/[^a-z0-9]/g, '') + '@remindtask.com';
              const restoredAdmin: User = {
                id: c.admin_id,
                name: cleanAdminName,
                username: cleanAdminName.toLowerCase().replace(/\s+/g, ''),
                email: cleanEmail,
                password: 'password123',
                role: 'admin',
                classId: c.id,
                className: c.name,
                status: 'active',
                createdAt: c.created_at || new Date().toISOString(),
              };
              loadedUsers.unshift(restoredAdmin);

              // Auto repair missing admin profile in Supabase
              client.from('profiles').upsert({
                id: restoredAdmin.id,
                name: restoredAdmin.name,
                email: restoredAdmin.email,
                role: 'admin',
                class_id: restoredAdmin.classId,
                class_name: restoredAdmin.className,
                status: 'active',
              }, { onConflict: 'id' }).then(() => {}, () => {});
            }
          });
        }

        setUsers(loadedUsers);
        try { localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(loadedUsers)); } catch {}
      }

      // Sync class_access_logs from Supabase
      try {
        const logsRes = await client.from('class_access_logs').select('*').order('accessed_at', { ascending: false });
        if (Array.isArray(logsRes.data)) {
          const mappedLogs: ClassAccessLog[] = logsRes.data.map((l: any) => ({
            id: l.id,
            classId: l.class_id,
            className: l.class_name,
            classCode: l.class_code,
            studentId: l.student_id,
            studentName: l.student_name,
            studentEmail: l.student_email,
            accessedAt: l.accessed_at || l.created_at,
            deviceInfo: l.device_info || 'Smartphone/Desktop',
          }));
          setClassAccessLogs(mappedLogs);
          localStorage.setItem('rt_class_access_logs', JSON.stringify(mappedLogs));
        }
      } catch (err) {
        console.warn('Sync class_access_logs table skipped or failed:', err);
      }

      // Sync class_chats from Supabase
      try {
        const chatsRes = await client.from('class_chats').select('*').order('created_at', { ascending: true });
        if (Array.isArray(chatsRes.data) && chatsRes.data.length > 0) {
          const mappedChats: ClassChatItem[] = chatsRes.data.map((c: any) => ({
            id: c.id,
            classId: c.class_id,
            senderId: c.sender_id,
            senderName: c.sender_name,
            senderRole: c.sender_role,
            recipientId: c.recipient_id,
            recipientName: c.recipient_name,
            message: c.message,
            isRead: Boolean(c.is_read),
            createdAt: c.created_at,
          }));
          setClassChats(mappedChats);
          localStorage.setItem('rt_class_chats', JSON.stringify(mappedChats));
        }
      } catch (err) {
        console.warn('Sync class_chats table skipped or failed:', err);
      }

      // Sync feedbacks from Supabase
      try {
        const feedbacksRes = await client.from('feedbacks').select('*').order('created_at', { ascending: false });
        if (Array.isArray(feedbacksRes.data)) {
          const mappedFeedbacks: FeedbackItem[] = feedbacksRes.data.map((fb: any) => ({
            id: fb.id,
            senderId: fb.sender_id,
            senderName: fb.sender_name,
            senderRole: fb.sender_role,
            classId: fb.class_id,
            className: fb.class_name,
            content: fb.content,
            replyMessage: fb.reply_message || undefined,
            replyAt: fb.reply_at || undefined,
            createdAt: fb.created_at,
          }));
          setFeedbacks(mappedFeedbacks);
          localStorage.setItem('remindtask_global_v5_feedbacks', JSON.stringify(mappedFeedbacks));
        }
      } catch (err) {
        console.warn('Sync feedbacks table skipped or failed:', err);
      }

      // Sync owner_chats from Supabase
      try {
        const chatsRes = await client.from('owner_chats').select('*').order('created_at', { ascending: true });
        if (Array.isArray(chatsRes.data)) {
          const mappedChats: OwnerChatItem[] = chatsRes.data.map((c: any) => ({
            id: c.id,
            senderId: c.sender_id,
            senderName: c.sender_name,
            senderRole: c.sender_role,
            classId: c.class_id,
            className: c.class_name,
            message: c.message,
            isFromOwner: c.is_from_owner,
            createdAt: c.created_at,
          }));
          setOwnerChats(mappedChats);
          localStorage.setItem('remindtask_global_v5_owner_chats', JSON.stringify(mappedChats));
        }
      } catch (err) {
        console.warn('Sync owner_chats table skipped or failed:', err);
      }

      // Sync forum_posts from Supabase
      try {
        const forumRes = await client.from('forum_posts').select('*').order('created_at', { ascending: false });
        if (Array.isArray(forumRes.data) && forumRes.data.length > 0) {
          const mappedPosts: ForumPost[] = forumRes.data.map((p: any) => ({
            id: p.id,
            classId: p.class_id || '',
            className: p.class_name || '',
            scope: p.scope || 'class',
            category: p.category || 'diskusi',
            authorId: p.author_id,
            authorName: p.author_name,
            authorRole: p.author_role,
            authorAvatar: p.author_avatar || undefined,
            authorClass: p.author_class || undefined,
            title: p.title,
            content: p.content,
            price: p.price || undefined,
            contact: p.contact || undefined,
            imageUrl: p.image_url || undefined,
            imageFileName: p.image_file_name || undefined,
            tags: Array.isArray(p.tags) ? p.tags : (typeof p.tags === 'string' ? JSON.parse(p.tags) : []),
            likes: p.likes || 0,
            likedBy: Array.isArray(p.liked_by) ? p.liked_by : (typeof p.liked_by === 'string' ? JSON.parse(p.liked_by) : []),
            comments: Array.isArray(p.comments) ? p.comments : (typeof p.comments === 'string' ? JSON.parse(p.comments) : []),
            createdAt: p.created_at,
          }));

          setForumPosts((prev) => {
            const remoteMap = new Map(mappedPosts.map((x) => [x.id, x]));
            const localOnly = prev.filter((x) => !remoteMap.has(x.id));
            const merged = [...mappedPosts, ...localOnly];
            try { localStorage.setItem(STORAGE_KEYS.FORUM_POSTS, JSON.stringify(merged)); } catch {}
            return merged;
          });
        }
      } catch (err) {
        console.warn('Sync forum_posts skipped or failed:', err);
      }

      // Sync system_settings from Supabase
      try {
        const settingsRes = await client.from('system_settings').select('*').eq('id', 'global_config').maybeSingle();
        if (settingsRes.data) {
          const s = settingsRes.data;
          const mapped: SystemSettings = {
            isMaintenance: s.is_maintenance ?? false,
            maintenanceTitle: s.maintenance_title || defaultSystemSettings.maintenanceTitle,
            maintenanceMessage: s.maintenance_message || defaultSystemSettings.maintenanceMessage,
            maintenanceEstimate: s.maintenance_estimate || defaultSystemSettings.maintenanceEstimate,
            isAiMaintenance: s.is_ai_maintenance ?? true,
            aiMaintenanceTitle: s.ai_maintenance_title || defaultSystemSettings.aiMaintenanceTitle,
            aiMaintenanceMessage: s.ai_maintenance_message || defaultSystemSettings.aiMaintenanceMessage,
            aiProgressPercent: s.ai_progress_percent ?? 85,
          };
          setSystemSettings(mapped);
          localStorage.setItem('remindtask_global_v5_system_settings', JSON.stringify(mapped));
        }
      } catch (err) {
        console.warn('Sync system_settings table skipped or failed:', err);
      }

      // Sync activity_logs from Supabase
      try {
        const { data: logsData, error: logsError } = await client
          .from('activity_logs')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(100);
          
        if (Array.isArray(logsData)) {
          const mappedLogs: ActivityLogItem[] = logsData.map((l: any) => ({
            id: l.id,
            actorName: l.actor_name,
            actorRole: l.actor_role,
            action: l.action,
            details: l.details,
            category: l.category,
            timestamp: l.timestamp || l.created_at,
          }));
          setActivityLogs(mappedLogs);
          localStorage.setItem('remindtask_activity_logs', JSON.stringify(mappedLogs));
        }
      } catch (err) {
        console.warn('Sync activity_logs skipped or failed:', err);
      }
      // Sync question_banks from Supabase
      try {
        const qbRes = await client.from('question_banks').select('*').order('created_at', { ascending: false });
        if (Array.isArray(qbRes.data)) {
          const mappedQBs: QuestionBankItem[] = qbRes.data.map((qb: any) => ({
            id: qb.id,
            classId: qb.class_id,
            title: qb.title,
            description: qb.description || '',
            subject: qb.subject || '',
            durationMinutes: qb.duration_minutes || 0,
            timeLimitPerQuestionSeconds: qb.time_limit_per_question_seconds || 0,
            status: (qb.status === 'published' ? 'published' : 'hidden') as QuizStatus,
            questions: Array.isArray(qb.questions) ? qb.questions : (typeof qb.questions === 'string' ? JSON.parse(qb.questions) : []),
            totalQuestions: qb.total_questions || (Array.isArray(qb.questions) ? qb.questions.length : 0),
            totalPoints: qb.total_points || 100,
            createdBy: qb.created_by,
            createdByName: qb.created_by_name || 'Admin',
            createdAt: qb.created_at,
            updatedAt: qb.updated_at,
            quizType: qb.quiz_type || 'bank_soal',
          }));

          // Non-destructive merge: Ensure newly created local items that haven't synced yet are never wiped out
          setQuestionBanks((prev) => {
            const remoteMap = new Map(mappedQBs.map((q) => [q.id, q]));
            // Retain any locally created quiz not yet in remote response
            const localOnly = prev.filter((localQ) => !remoteMap.has(localQ.id));
            const merged = mappedQBs.map((remoteQ) => {
              const localMatch = prev.find((p) => p.id === remoteQ.id);
              // If remote column time_limit_per_question_seconds wasn't present, preserve local value
              if (localMatch && (!remoteQ.timeLimitPerQuestionSeconds || remoteQ.timeLimitPerQuestionSeconds === 0) && localMatch.timeLimitPerQuestionSeconds) {
                return { ...remoteQ, timeLimitPerQuestionSeconds: localMatch.timeLimitPerQuestionSeconds };
              }
              return remoteQ;
            });
            const finalMerged = [...merged, ...localOnly];
            try {
              localStorage.setItem(STORAGE_KEYS.QUESTION_BANKS, JSON.stringify(finalMerged));
            } catch {}
            return finalMerged;
          });
        }
      } catch (err) {
        console.warn('Sync question_banks table skipped or failed:', err);
      }

      // Sync quiz_submissions from Supabase
      try {
        const qsubRes = await client.from('quiz_submissions').select('*').order('submitted_at', { ascending: false });
        if (Array.isArray(qsubRes.data)) {
          const mappedQSubs: QuizSubmission[] = qsubRes.data.map((qs: any) => ({
            id: qs.id,
            quizId: qs.quiz_id,
            classId: qs.class_id,
            memberId: qs.member_id,
            memberName: qs.member_name,
            memberEmail: qs.member_email || undefined,
            answers: Array.isArray(qs.answers) ? qs.answers : (typeof qs.answers === 'string' ? JSON.parse(qs.answers) : []),
            totalScore: qs.total_score || 0,
            maxScore: qs.max_score || 100,
            scorePercentage: qs.score_percentage || 0,
            submittedAt: qs.submitted_at || qs.created_at,
            durationSecondsUsed: qs.duration_seconds_used,
          }));
          setQuizSubmissions(mappedQSubs);
          localStorage.setItem(STORAGE_KEYS.QUIZ_SUBMISSIONS, JSON.stringify(mappedQSubs));
        }
      } catch (err) {
        console.warn('Sync quiz_submissions table skipped or failed:', err);
      }

      // Sync live_quizzes from Supabase
      try {
        const lqRes = await client.from('live_quizzes').select('*').order('created_at', { ascending: false });
        if (Array.isArray(lqRes.data)) {
          const mappedLQs: LiveQuiz[] = lqRes.data.map((lq: any) => ({
            id: lq.id,
            classId: lq.class_id,
            quizId: lq.quiz_id,
            title: lq.title,
            status: lq.status as any,
            currentQuestionIndex: lq.current_question_index || 0,
            activeQuestionEndsAt: lq.active_question_ends_at || undefined,
            showAnswers: lq.show_answers ?? false,
            createdAt: lq.created_at,
            updatedAt: lq.updated_at,
          }));
          setLiveQuizzes(mappedLQs);
        }
      } catch (err) {
        console.warn('Sync live_quizzes table skipped or failed:', err);
      }

      // Sync live_quiz_responses from Supabase
      try {
        const lqrRes = await client.from('live_quiz_responses').select('*').order('created_at', { ascending: false });
        if (Array.isArray(lqrRes.data)) {
          const mappedLQRs: LiveQuizResponse[] = lqrRes.data.map((lqr: any) => ({
            id: lqr.id,
            liveQuizId: lqr.live_quiz_id,
            questionIndex: lqr.question_index,
            memberId: lqr.member_id,
            memberName: lqr.member_name,
            selectedOptionIndex: lqr.selected_option_index !== null ? Number(lqr.selected_option_index) : undefined,
            isCorrect: lqr.is_correct || false,
            pointsEarned: lqr.points_earned || 0,
            responseTimeMs: lqr.response_time_ms || 0,
            createdAt: lqr.created_at,
          }));
          setLiveQuizResponses(mappedLQRs);
        }
      } catch (err) {
        console.warn('Sync live_quiz_responses table skipped or failed:', err);
      }

      // Sync attendance_sessions from Supabase
      try {
        const sessRes = await client.from('attendance_sessions').select('*').order('created_at', { ascending: false });
        if (Array.isArray(sessRes.data)) {
          const mappedSessions: AttendanceSession[] = sessRes.data.map((s: any) => ({
            id: s.id,
            classId: s.class_id,
            title: s.title,
            subject: s.subject || '',
            date: s.date || (s.created_at ? s.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
            startTime: s.start_time || s.created_at,
            endTime: s.end_time || undefined,
            isActive: s.is_active ?? true,
            secretToken: s.secret_token || 'secret-token',
            tokenRefreshInterval: s.token_refresh_interval || 15,
            requireLocation: s.require_location ?? false,
            latitude: s.latitude ? Number(s.latitude) : undefined,
            longitude: s.longitude ? Number(s.longitude) : undefined,
            radiusMeters: s.radius_meters ? Number(s.radius_meters) : 100,
            createdBy: s.created_by,
            createdByName: s.created_by_name || 'Admin',
            createdAt: s.created_at,
          }));

          setAttendanceSessions(mappedSessions);
          try { localStorage.setItem(STORAGE_KEYS.ATTENDANCE_SESSIONS, JSON.stringify(mappedSessions)); } catch {}
        }
      } catch (err) {
        console.warn('Sync attendance_sessions skipped or failed:', err);
      }

      // Sync attendance_records from Supabase
      try {
        const recRes = await client.from('attendance_records').select('*').order('created_at', { ascending: false });
        if (Array.isArray(recRes.data)) {
          const mappedRecords: AttendanceRecord[] = recRes.data.map((r: any) => ({
            id: r.id,
            sessionId: r.session_id,
            classId: r.class_id,
            studentId: r.student_id,
            studentName: r.student_name,
            studentEmail: r.student_email || undefined,
            status: r.status as AttendanceStatus,
            checkInTime: r.check_in_time || r.created_at,
            deviceInfo: r.device_info || undefined,
            verificationMethod: (r.verification_method || 'qr_scan') as any,
            note: r.note || undefined,
            proofFileUrl: r.proof_file_url || undefined,
            proofFileName: r.proof_file_name || undefined,
            locationVerified: r.location_verified ?? false,
            createdAt: r.created_at,
          }));

          setAttendanceRecords(mappedRecords);
          try { localStorage.setItem(STORAGE_KEYS.ATTENDANCE_RECORDS, JSON.stringify(mappedRecords)); } catch {}
        }
      } catch (err) {
        console.warn('Sync attendance_records skipped or failed:', err);
      }
    } catch (err) {
      console.warn('Supabase global sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const cleanStaleCacheAndSync = async () => {
    try {
      const keysToClean: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (
          k &&
          (k.startsWith('remindtask_seen_bc_') ||
            k.startsWith('rt_cache_') ||
            k.startsWith('remindtask_old_') ||
            k.startsWith('remindtask_v1_') ||
            k.startsWith('remindtask_v2_') ||
            k.startsWith('remindtask_v3_') ||
            k.startsWith('remindtask_v4_') ||
            k.startsWith('rt_temp_') ||
            k.startsWith('rt_seen_ios_notif_'))
        ) {
          keysToClean.push(k);
        }
      }
      keysToClean.forEach((k) => localStorage.removeItem(k));

      // Reset stale local caches so Supabase becomes pure source of truth
      const client = getSupabaseClient();
      if (client) {
        localStorage.removeItem(STORAGE_KEYS.NOTIFS);
      }

      await syncWithSupabase();
    } catch (err) {
      console.warn('Auto cache cleanup warning:', err);
    }
  };

  const purgeOrphanedClasses = async (): Promise<number> => {
    const client = getSupabaseClient();
    if (!client) return 0;

    try {
      setIsSyncing(true);
      // Fetch fresh classes and profiles
      const [classesRes, profilesRes] = await Promise.all([
        client.from('classes').select('*'),
        client.from('profiles').select('*'),
      ]);

      if (Array.isArray(classesRes.data) && Array.isArray(profilesRes.data)) {
        const activeAdminIds = new Set(
          profilesRes.data.filter((p) => p.role === 'admin').map((p) => p.id)
        );
        const activeAdminClassIds = new Set(
          profilesRes.data.filter((p) => p.role === 'admin' && p.class_id).map((p) => p.class_id)
        );

        // A class is orphaned if its admin_id is not in activeAdminIds AND its id is not in activeAdminClassIds
        const orphanClassIds = classesRes.data
          .filter((c) => {
            const hasAdminIdMatch = c.admin_id && activeAdminIds.has(c.admin_id);
            const hasClassIdMatch = activeAdminClassIds.has(c.id);
            return !hasAdminIdMatch && !hasClassIdMatch;
          })
          .map((c) => c.id);

        if (orphanClassIds.length > 0) {
          console.log(`[PURGE ORPHANS]: Deleting ${orphanClassIds.length} unused classes from Supabase:`, orphanClassIds);
          await client.from('classes').delete().in('id', orphanClassIds);
          await client.from('tasks').delete().in('class_id', orphanClassIds);
          await client.from('submissions').delete().in('class_id', orphanClassIds);
        }

        await syncWithSupabase();
        return orphanClassIds.length;
      }
    } catch (err) {
      console.warn('Failed to purge orphaned classes:', err);
    } finally {
      setIsSyncing(false);
    }
    return 0;
  };

  const purgeObsoleteDatabaseCache = async () => {
    const client = getSupabaseClient();
    if (!client) return;

    try {
      setIsSyncing(true);
      // Purge orphaned classes automatically
      await purgeOrphanedClasses();

      // Clean read notifications older than 7 days safely
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      try {
        await client.from('notifications').delete().lt('timestamp', sevenDaysAgo);
      } catch {}
      try {
        await client.from('notifications').delete().lt('created_at', sevenDaysAgo);
      } catch {}

      await syncWithSupabase();
    } catch (err) {
      console.warn('Error purging database cache:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Immediate global sync & auto stale cache cleanup on application startup & Realtime WebSockets for all devices
  useEffect(() => {
    cleanStaleCacheAndSync();
    purgeObsoleteDatabaseCache();
    syncWithSupabase();

    // Background Auto-Sync every 12s to guarantee 100% global server data consistency across all devices
    const syncInterval = setInterval(() => {
      syncWithSupabase();
    }, 12000);

    // Background upcoming task deadline checker via backend server
    const checkDeadlines = () => {
      fetch('/api/check-upcoming-deadlines', { method: 'POST' }).catch(() => {});
    };
    checkDeadlines(); // check on startup
    const deadlineInterval = setInterval(checkDeadlines, 60000); // every 1 minute

    // Automated 1-day deadline reminder check (H-1 sebelum batas waktu)
    const checkOneDayDeadlines = () => {
      try {
        const storedTasksStr = localStorage.getItem(STORAGE_KEYS.TASKS);
        const taskList: Task[] = storedTasksStr ? JSON.parse(storedTasksStr) : [];
        if (!Array.isArray(taskList) || taskList.length === 0) return;

        const nowMs = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;

        taskList.forEach((t) => {
          if (!t.dueDate) return;
          const dueMs = new Date(t.dueDate).getTime();
          const diffMs = dueMs - nowMs;

          // 1 hari sebelum jadwal (dalam rentang 24 jam ke depan)
          if (diffMs > 0 && diffMs <= oneDayMs) {
            const reminderKey = `rt_notif_1day_${t.id}`;
            const alreadyAlerted = localStorage.getItem(reminderKey);
            if (!alreadyAlerted) {
              localStorage.setItem(reminderKey, 'true');
              const hoursLeft = Math.max(1, Math.round(diffMs / (60 * 60 * 1000)));
              const notifTitle = `⏰ Pengingat: Tugas Berakhir Besok! (H-1)`;
              const notifBody = `Tugas "${t.title}" tersisa ${hoursLeft} jam lagi (Deadline: ${formatIndonesianDate(t.dueDate)}). Segera selesaikan dan kumpulkan!`;

              sendCustomNotification(
                notifTitle,
                notifBody,
                'deadline_soon',
                t.classId,
                t.id,
                'member'
              );

              sendBrowserPushNotification(
                notifTitle,
                notifBody,
                `deadline-${t.id}`
              );
            }
          }
        });
      } catch (err) {
        console.warn('1-day deadline reminder error:', err);
      }
    };
    checkOneDayDeadlines();
    const oneDayInterval = setInterval(checkOneDayDeadlines, 30000);

    const client = getSupabaseClient();
    if (!client) {
      return () => {
        clearInterval(syncInterval);
        clearInterval(deadlineInterval);
        clearInterval(oneDayInterval);
      };
    }

    try {
      const existingGlobal = client.getChannels().find((c) => c.topic === 'realtime:remindtask-global-live-sync' || c.topic === 'remindtask-global-live-sync');
      if (existingGlobal) {
        client.removeChannel(existingGlobal);
      }
    } catch {}

    const channel = client
      .channel('remindtask-global-live-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'classes' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const c = payload.new as any;
            const newClass: ClassItem = {
              id: c.id,
              code: c.code,
              name: c.name,
              adminId: c.admin_id,
              adminName: c.admin_name,
              description: c.description || '',
              memberCount: c.member_count || 0,
              accessCountToday: c.access_count_today || 0,
              createdAt: c.created_at,
            };
            setClasses((prev) => [newClass, ...prev.filter((x) => x.id !== newClass.id)]);
          } else if (payload.eventType === 'UPDATE') {
            const c = payload.new as any;
            setClasses((prev) =>
              prev.map((x) =>
                x.id === c.id
                  ? {
                      ...x,
                      code: c.code,
                      name: c.name,
                      description: c.description || x.description,
                      memberCount: c.member_count ?? x.memberCount,
                      accessCountToday: c.access_count_today ?? x.accessCountToday,
                    }
                  : x
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any).id;
            setClasses((prev) => prev.filter((x) => x.id !== oldId));
            setCurrentUser((prevUser) => {
              if (prevUser && prevUser.classId === oldId && prevUser.role !== 'owner') {
                setTimeout(() => {
                  logout();
                  showToast('Kelas Anda telah dihapus oleh Owner. Sesi login dihentikan.', 'warn');
                }, 100);
                return null;
              }
              return prevUser;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const t = payload.new as any;
            const newTask: Task = {
              id: t.id,
              classId: t.class_id,
              title: t.title,
              description: t.description || '',
              dueDate: t.due_date,
              priority: t.priority,
              category: t.category,
              requiresUpload: t.requires_upload ?? true,
              createdAt: t.created_at,
              createdBy: t.created_by,
            };
            setTasks((prev) => [newTask, ...prev.filter((x) => x.id !== newTask.id)]);
          } else if (payload.eventType === 'UPDATE') {
            const t = payload.new as any;
            setTasks((prev) =>
              prev.map((x) =>
                x.id === t.id
                  ? {
                      ...x,
                      classId: t.class_id,
                      title: t.title,
                      description: t.description || '',
                      dueDate: t.due_date,
                      priority: t.priority,
                      category: t.category,
                      requiresUpload: t.requires_upload ?? true,
                    }
                  : x
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any).id;
            setTasks((prev) => prev.filter((x) => x.id !== oldId));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'materials' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const m = payload.new as any;
            const newMaterial: ClassMaterial = {
              id: m.id,
              classId: m.class_id,
              title: m.title,
              description: m.description || '',
              category: m.category,
              fileName: m.file_name,
              fileSize: m.file_size,
              fileUrl: m.file_url,
              externalLink: m.external_link,
              authorName: m.author_name || 'Admin Kelas',
              tags: Array.isArray(m.tags) ? m.tags : [],
              createdAt: m.created_at,
            };
            setMaterials((prev) => [newMaterial, ...prev.filter((x) => x.id !== newMaterial.id)]);
          } else if (payload.eventType === 'UPDATE') {
            const m = payload.new as any;
            setMaterials((prev) =>
              prev.map((x) =>
                x.id === m.id
                  ? {
                      ...x,
                      classId: m.class_id,
                      title: m.title,
                      description: m.description || '',
                      category: m.category,
                      fileName: m.file_name,
                      fileSize: m.file_size,
                      fileUrl: m.file_url,
                      externalLink: m.external_link,
                      authorName: m.author_name || x.authorName,
                      tags: Array.isArray(m.tags) ? m.tags : x.tags,
                    }
                  : x
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any).id;
            setMaterials((prev) => prev.filter((x) => x.id !== oldId));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const s = payload.new as any;
            const sub: TaskSubmission = {
              id: s.id,
              taskId: s.task_id,
              classId: s.class_id,
              memberId: s.member_id,
              memberName: s.member_name,
              status: s.status,
              fileName: s.file_name,
              fileSize: s.file_size,
              fileUrl: s.file_url,
              submissionNote: s.submission_note,
              adminFeedback: s.admin_feedback,
              reviewedAt: s.reviewed_at,
              reviewedBy: s.reviewed_by,
              submittedAt: s.submitted_at,
            };
            setSubmissions((prev) => [sub, ...prev.filter((x) => x.id !== sub.id)]);
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any).id;
            setSubmissions((prev) => prev.filter((x) => x.id !== oldId));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const p = payload.new as any;
            const userObj: User = {
              id: p.id,
              name: p.name,
              email: p.email,
              password: p.password || 'password123',
              role: (p.role as UserRole) || 'member',
              classId: p.class_id,
              className: p.class_name,
              status: (p.status || 'active') as 'active' | 'suspended',
              createdAt: p.created_at || new Date().toISOString(),
            };
            setUsers((prev) => [userObj, ...prev.filter((x) => x.id !== userObj.id)]);

            // Real-time automatic sync for logged-in user profile & password
            setCurrentUser((prevUser) => {
              if (prevUser && prevUser.id === userObj.id) {
                const updatedUser: User = {
                  ...prevUser,
                  name: userObj.name || prevUser.name,
                  email: userObj.email || prevUser.email,
                  password: userObj.password || prevUser.password,
                  role: userObj.role || prevUser.role,
                  classId: userObj.classId ?? prevUser.classId,
                  className: userObj.className ?? prevUser.className,
                  status: userObj.status || prevUser.status,
                };
                try {
                  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
                } catch {}
                return updatedUser;
              }
              return prevUser;
            });
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any).id;
            setUsers((prev) => prev.filter((x) => x.id !== oldId));
            setCurrentUser((prevUser) => {
              if (prevUser && prevUser.id === oldId) {
                setTimeout(() => {
                  logout();
                  showToast('Akun Anda telah dihapus oleh Owner. Sesi login dihentikan.', 'warn');
                }, 100);
                return null;
              }
              return prevUser;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_logs' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const l = payload.new as any;
            const newLog: ActivityLogItem = {
              id: l.id,
              actorName: l.actor_name,
              actorRole: l.actor_role,
              action: l.action,
              details: l.details,
              category: l.category,
              timestamp: l.timestamp || l.created_at,
            };
            setActivityLogs((prev) => {
              if (prev.some((x) => x.id === newLog.id)) return prev;
              const updated = [newLog, ...prev.slice(0, 99)];
              try {
                localStorage.setItem('remindtask_activity_logs', JSON.stringify(updated));
              } catch {}
              return updated;
            });
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any).id;
            setActivityLogs((prev) => {
              const updated = prev.filter((x) => x.id !== oldId);
              try {
                localStorage.setItem('remindtask_activity_logs', JSON.stringify(updated));
              } catch {}
              return updated;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'class_access_logs' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const l = payload.new as any;
            const newLog: ClassAccessLog = {
              id: l.id,
              classId: l.class_id,
              className: l.class_name,
              classCode: l.class_code,
              studentId: l.student_id,
              studentName: l.student_name,
              studentEmail: l.student_email,
              accessedAt: l.accessed_at || l.created_at || new Date().toISOString(),
              deviceInfo: l.device_info || 'Smartphone/Desktop',
            };
            setClassAccessLogs((prev) => {
              if (prev.some((x) => x.id === newLog.id)) return prev;
              const updated = [newLog, ...prev];
              try {
                localStorage.setItem('rt_class_access_logs', JSON.stringify(updated));
              } catch {}
              return updated;
            });
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any).id;
            setClassAccessLogs((prev) => {
              const updated = prev.filter((x) => x.id !== oldId);
              try {
                localStorage.setItem('rt_class_access_logs', JSON.stringify(updated));
              } catch {}
              return updated;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const n = payload.new as any;
            const newNotif: NotificationItem = {
              id: n.id,
              title: n.title,
              message: n.message,
              type: n.type || 'system',
              timestamp: n.timestamp || n.created_at || new Date().toISOString(),
              read: n.read ?? false,
              classId: n.class_id,
              taskId: n.task_id,
              targetRole: n.target_role || 'all',
              recipientId: n.recipient_id,
            };
            setNotifications((prev) => {
              const alreadyExists = prev.some((x) => x.id === newNotif.id);
              if (alreadyExists) {
                return prev;
              }

              // Filter to show live banner only to appropriate recipients (no spam)
              const activeClassId = currentClass?.id || currentUser?.classId;
              let isAllowed = true;
              if (newNotif.recipientId && currentUser && newNotif.recipientId !== currentUser.id) {
                isAllowed = false;
              }
              if (newNotif.classId && activeClassId && newNotif.classId !== activeClassId) {
                isAllowed = false;
              }
              if (newNotif.targetRole && newNotif.targetRole !== 'all' && newNotif.targetRole !== currentRole) {
                isAllowed = false;
              }

              if (isAllowed) {
                setLiveBannerNotification(newNotif);
                playNotificationSoundOnce(newNotif.id, 'chime');
                showToast(`📢 ${newNotif.title}: ${newNotif.message}`, 'info');
                sendBrowserPushNotification(newNotif.title, newNotif.message);
              }

              return [newNotif, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const n = payload.new as any;
            setNotifications((prev) =>
              prev.map((x) => (x.id === n.id ? { ...x, read: n.read } : x))
            );
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any).id;
            setNotifications((prev) => prev.filter((x) => x.id !== oldId));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedules' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const s = payload.new as any;
            const schedObj: ScheduleItem = {
              id: s.id,
              classId: s.class_id,
              day: s.day,
              subject: s.subject,
              startTime: s.start_time,
              endTime: s.end_time,
              teacherName: s.teacher_name || '',
              room: s.room_or_link || s.room || '',
              notes: s.notes || '',
              color: s.color_badge || s.color || '',
              createdAt: s.created_at || new Date().toISOString(),
            };
            setSchedules((prev) => {
              const updated = [schedObj, ...prev.filter((x) => x.id !== schedObj.id)];
              try { localStorage.setItem('remindtask_global_v5_schedules', JSON.stringify(updated)); } catch {}
              return updated;
            });
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any).id;
            setSchedules((prev) => {
              const updated = prev.filter((x) => x.id !== oldId);
              try { localStorage.setItem('remindtask_global_v5_schedules', JSON.stringify(updated)); } catch {}
              return updated;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'anonymous_wall' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const a = payload.new as any;
            const parsedReplies = parseReplies(a.replies, a.reply_from_admin, a.reply_at);
            const sender = extractSender(a);
            const anonObj: AnonymousMessage = {
              id: a.id,
              classId: a.class_id,
              className: a.class_name || 'Ruang Kelas',
              message: a.message,
              tag: a.tag || 'Aspirasi',
              alias: a.alias || 'Siswa Anonim',
              avatarEmoji: a.avatar_emoji || '🎭',
              cardGradient: a.card_gradient || 'from-purple-900/40 to-pink-900/30',
              likes: a.likes || 0,
              replyFromAdmin: a.reply_from_admin || undefined,
              replyAt: a.reply_at || undefined,
              replies: parsedReplies,
              isPinned: a.is_pinned ?? false,
              createdAt: a.created_at,
              senderId: sender.senderId,
              senderName: sender.senderName,
              senderEmail: sender.senderEmail,
              senderUsername: sender.senderUsername,
              senderRole: sender.senderRole,
            };
            setAnonymousMessages((prev) => {
              const updated = [anonObj, ...prev.filter((x) => x.id !== anonObj.id)];
              try { localStorage.setItem('remindtask_global_v5_anon_messages', JSON.stringify(updated)); } catch {}
              return updated;
            });
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any).id;
            setAnonymousMessages((prev) => {
              const updated = prev.filter((x) => x.id !== oldId);
              try { localStorage.setItem('remindtask_global_v5_anon_messages', JSON.stringify(updated)); } catch {}
              return updated;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feedbacks' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const fb = payload.new as any;
            const fbObj: FeedbackItem = {
              id: fb.id,
              senderId: fb.sender_id,
              senderName: fb.sender_name,
              senderRole: fb.sender_role,
              classId: fb.class_id,
              className: fb.class_name,
              content: fb.content,
              replyMessage: fb.reply_message || undefined,
              replyAt: fb.reply_at || undefined,
              createdAt: fb.created_at,
            };
            setFeedbacks((prev) => [fbObj, ...prev.filter((x) => x.id !== fbObj.id)]);
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any).id;
            setFeedbacks((prev) => prev.filter((x) => x.id !== oldId));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'owner_chats' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const c = payload.new as any;
            const chatObj: OwnerChatItem = {
              id: c.id,
              senderId: c.sender_id,
              senderName: c.sender_name,
              senderRole: c.sender_role,
              classId: c.class_id,
              className: c.class_name,
              message: c.message,
              isFromOwner: c.is_from_owner,
              createdAt: c.created_at,
            };
            setOwnerChats((prev) => {
              const filtered = prev.filter((x) => x.id !== chatObj.id);
              const updated = [...filtered, chatObj];
              return updated.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            });
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any).id;
            setOwnerChats((prev) => prev.filter((x) => x.id !== oldId));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const s = payload.new as any;
            const mapped: SystemSettings = {
              isMaintenance: s.is_maintenance ?? false,
              maintenanceTitle: s.maintenance_title || defaultSystemSettings.maintenanceTitle,
              maintenanceMessage: s.maintenance_message || defaultSystemSettings.maintenanceMessage,
              maintenanceEstimate: s.maintenance_estimate || defaultSystemSettings.maintenanceEstimate,
              isAiMaintenance: s.is_ai_maintenance ?? true,
              aiMaintenanceTitle: s.ai_maintenance_title || defaultSystemSettings.aiMaintenanceTitle,
              aiMaintenanceMessage: s.ai_maintenance_message || defaultSystemSettings.aiMaintenanceMessage,
              aiProgressPercent: s.ai_progress_percent ?? 85,
            };
            setSystemSettings(mapped);
            localStorage.setItem('remindtask_global_v5_system_settings', JSON.stringify(mapped));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_logs' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const l = payload.new as any;
            const logObj: ActivityLogItem = {
              id: l.id,
              actorName: l.actor_name,
              actorRole: l.actor_role as any,
              action: l.action,
              details: l.details,
              category: l.category as any,
              timestamp: l.timestamp || l.created_at,
            };
            setActivityLogs((prev) => [logObj, ...prev.filter((x) => x.id !== logObj.id)].slice(0, 100));
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any).id;
            setActivityLogs((prev) => prev.filter((x) => x.id !== oldId));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_sessions' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const s = payload.new as any;
            const sessObj: AttendanceSession = {
              id: s.id,
              classId: s.class_id,
              title: s.title,
              subject: s.subject || undefined,
              date: s.date,
              startTime: s.start_time,
              endTime: s.end_time || undefined,
              isActive: s.is_active ?? true,
              secretToken: s.secret_token,
              tokenRefreshInterval: s.token_refresh_interval || 15,
              requireLocation: s.require_location ?? false,
              latitude: s.latitude ? Number(s.latitude) : undefined,
              longitude: s.longitude ? Number(s.longitude) : undefined,
              radiusMeters: s.radius_meters ? Number(s.radius_meters) : 100,
              createdBy: s.created_by,
              createdByName: s.created_by_name || 'Admin',
              createdAt: s.created_at || new Date().toISOString(),
            };
            setAttendanceSessions((prev) => {
              if (prev.some((x) => x.id === sessObj.id)) return prev;
              return [sessObj, ...prev];
            });

            // Member alert if this session is active for member's class
            const activeClassId = currentClass?.id || currentUser?.classId;
            const isForThisClass =
              !sessObj.classId ||
              !activeClassId ||
              sessObj.classId === activeClassId ||
              (currentClass?.code && sessObj.classId === currentClass.code);

            if (sessObj.isActive && isForThisClass && currentRole === 'member') {
              playNotificationSoundOnce(sessObj.id, 'chime');
              showToast(`📢 Sesi Presensi Dibuka: ${sessObj.title}! Silakan scan Kode QR di menu Absensi.`, 'info');
              sendBrowserPushNotification(`📢 Presensi Kelas: ${sessObj.title}`, 'Sesi presensi telah dibuka oleh guru. Silakan segera scan Kode QR!');
            }
          } else if (payload.eventType === 'UPDATE') {
            const s = payload.new as any;
            setAttendanceSessions((prev) =>
              prev.map((x) =>
                x.id === s.id
                  ? {
                      ...x,
                      title: s.title,
                      subject: s.subject || undefined,
                      isActive: s.is_active ?? true,
                      endTime: s.end_time || undefined,
                    }
                  : x
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any).id;
            setAttendanceSessions((prev) => prev.filter((x) => x.id !== oldId));
            setAttendanceRecords((prev) => prev.filter((x) => x.sessionId !== oldId));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_records' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const r = payload.new as any;
            const recObj: AttendanceRecord = {
              id: r.id,
              sessionId: r.session_id,
              classId: r.class_id,
              studentId: r.student_id,
              studentName: r.student_name,
              studentEmail: r.student_email || undefined,
              status: r.status,
              checkInTime: r.check_in_time || r.created_at,
              deviceInfo: r.device_info || undefined,
              verificationMethod: r.verification_method,
              note: r.note || undefined,
              locationVerified: r.location_verified ?? false,
              createdAt: r.created_at || new Date().toISOString(),
            };
            setAttendanceRecords((prev) => [
              recObj,
              ...prev.filter((x) => x.id !== recObj.id && !(x.sessionId === recObj.sessionId && x.studentId === recObj.studentId)),
            ]);

            // Notification on admin screen when student checks in
            if (currentRole === 'admin' || currentRole === 'owner') {
              playNotificationSound('beep');
            }
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any).id;
            setAttendanceRecords((prev) => prev.filter((x) => x.id !== oldId));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'forum_posts' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const p = payload.new as any;
            const postObj: ForumPost = {
              id: p.id,
              classId: p.class_id || '',
              className: p.class_name || '',
              scope: p.scope || 'class',
              category: p.category || 'diskusi',
              authorId: p.author_id,
              authorName: p.author_name,
              authorRole: p.author_role,
              authorAvatar: p.author_avatar || undefined,
              authorClass: p.author_class || undefined,
              title: p.title,
              content: p.content,
              price: p.price || undefined,
              contact: p.contact || undefined,
              imageUrl: p.image_url || undefined,
              imageFileName: p.image_file_name || undefined,
              tags: Array.isArray(p.tags) ? p.tags : (typeof p.tags === 'string' ? JSON.parse(p.tags) : []),
              likes: p.likes || 0,
              likedBy: Array.isArray(p.liked_by) ? p.liked_by : (typeof p.liked_by === 'string' ? JSON.parse(p.liked_by) : []),
              comments: Array.isArray(p.comments) ? p.comments : (typeof p.comments === 'string' ? JSON.parse(p.comments) : []),
              createdAt: p.created_at,
            };
            setForumPosts((prev) => [postObj, ...prev.filter((x) => x.id !== postObj.id)]);
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any).id;
            setForumPosts((prev) => prev.filter((x) => x.id !== oldId));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_quizzes' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const lq = payload.new as any;
            const newLq: LiveQuiz = {
              id: lq.id,
              classId: lq.class_id,
              quizId: lq.quiz_id,
              title: lq.title,
              status: lq.status as any,
              currentQuestionIndex: lq.current_question_index || 0,
              activeQuestionEndsAt: lq.active_question_ends_at || undefined,
              showAnswers: lq.show_answers || false,
              createdAt: lq.created_at,
              updatedAt: lq.updated_at,
            };
            setLiveQuizzes((prev) => [newLq, ...prev.filter((x) => x.id !== newLq.id)]);

            // Sound chime and notify if member is in that class
            const activeClassId = currentClass?.id || currentUser?.classId;
            if (newLq.classId === activeClassId && currentRole === 'member' && newLq.status === 'waiting') {
              playNotificationSoundOnce(newLq.id, 'chime');
              showToast(`🎙️ Kuis Interaktif Live Dimulai: ${newLq.title}! Silakan masuk menu Ujian.`, 'info');
            }
          } else if (payload.eventType === 'UPDATE') {
            const lq = payload.new as any;
            const updatedLq: LiveQuiz = {
              id: lq.id,
              classId: lq.class_id,
              quizId: lq.quiz_id,
              title: lq.title,
              status: lq.status as any,
              currentQuestionIndex: lq.current_question_index || 0,
              activeQuestionEndsAt: lq.active_question_ends_at || undefined,
              showAnswers: lq.show_answers || false,
              createdAt: lq.created_at,
              updatedAt: lq.updated_at,
            };
            setLiveQuizzes((prev) =>
              prev.map((x) => (x.id === lq.id ? updatedLq : x))
            );
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any).id;
            setLiveQuizzes((prev) => prev.filter((x) => x.id !== oldId));
            setLiveQuizResponses((prev) => prev.filter((x) => x.liveQuizId !== oldId));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_quiz_responses' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const lqr = payload.new as any;
            const newLqr: LiveQuizResponse = {
              id: lqr.id,
              liveQuizId: lqr.live_quiz_id,
              questionIndex: lqr.question_index,
              memberId: lqr.member_id,
              memberName: lqr.member_name,
              selectedOptionIndex: lqr.selected_option_index !== null ? Number(lqr.selected_option_index) : undefined,
              essayAnswer: lqr.essay_answer || undefined,
              isCorrect: lqr.is_correct || false,
              pointsEarned: lqr.points_earned || 0,
              responseTimeMs: lqr.response_time_ms || 0,
              createdAt: lqr.created_at,
            };
            setLiveQuizResponses((prev) => [
              newLqr,
              ...prev.filter((x) => x.id !== newLqr.id && !(x.liveQuizId === newLqr.liveQuizId && x.memberId === newLqr.memberId && x.questionIndex === newLqr.questionIndex)),
            ]);

            // Notify admin with beep when student answers
            if (currentRole === 'admin' || currentRole === 'owner') {
              playNotificationSound('beep');
            }
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any).id;
            setLiveQuizResponses((prev) => prev.filter((x) => x.id !== oldId));
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(syncInterval);
      clearInterval(deadlineInterval);
      clearInterval(oneDayInterval);
      client.removeChannel(channel);
    };
  }, []);

  const currentRole: UserRole = currentUser?.role || 'member';

  const currentClass = useMemo(() => {
    if (classes.length === 0) {
      if (currentUser?.classId && currentUser?.className) {
        return {
          id: currentUser.classId,
          code: '------',
          name: currentUser.className,
          adminId: currentUser.id,
          adminName: currentUser.name,
          description: '',
          memberCount: 0,
          accessCountToday: 0,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    }
    if (currentUser?.classId) {
      return classes.find((c) => c.id === currentUser.classId) || classes[0] || null;
    }
    return classes.find((c) => c.id === currentClassId) || classes[0] || null;
  }, [classes, currentUser, currentClassId]);

  // Service Worker User Context Cacher for Background Notifications when tab is closed
  useEffect(() => {
    const updateServiceWorkerUserContext = async () => {
      if ('caches' in window && currentUser) {
        try {
          const cache = await caches.open('remindtask-user-context-v1');
          const data = {
            userId: currentUser.id,
            role: currentRole || 'member',
            classId: currentClass?.id || currentUser.classId || '',
            classCode: currentClass?.code || '',
            cachedAt: new Date().toISOString(),
          };
          await cache.put('/sw-user-context.json', new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
          }));
        } catch (err) {
          console.warn('Failed to update SW user context cache:', err);
        }
      }
    };
    updateServiceWorkerUserContext();
  }, [currentUser, currentClass?.id, currentClass?.code, currentRole]);

  // Class-specific Realtime Presence Tracking via Supabase
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client || !currentClass?.id) {
      setOnlineUsersCount(1);
      return;
    }

    const classPresenceKey = `presence-class-${currentClass.id}`;
    const userPresenceKey = currentUser?.id || `user-${Math.random().toString(36).substring(2, 7)}`;

    // Remove any existing duplicate/cached channel to prevent "cannot add presence callbacks after subscribe()"
    try {
      const existingChannels = client.getChannels();
      existingChannels.forEach((ch) => {
        if (ch.topic === `realtime:${classPresenceKey}` || ch.topic === classPresenceKey) {
          client.removeChannel(ch);
        }
      });
    } catch {}

    const presenceChannel = client.channel(classPresenceKey, {
      config: {
        presence: {
          key: userPresenceKey,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        try {
          const state = presenceChannel.presenceState();
          const keys = Object.keys(state);
          let activeCount = 0;
          keys.forEach((k) => {
            const arr = state[k] as any[];
            if (Array.isArray(arr) && arr.length > 0) {
              activeCount++;
            }
          });
          setOnlineUsersCount(Math.max(1, activeCount));
        } catch {}
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            await presenceChannel.track({
              userId: currentUser?.id || userPresenceKey,
              userName: currentUser?.name || 'Siswa',
              role: currentRole,
              classId: currentClass.id,
              classCode: currentClass.code,
              onlineAt: new Date().toISOString(),
            });
          } catch {}
        }
      });

    return () => {
      try {
        presenceChannel.untrack().catch(() => {}).finally(() => {
          client.removeChannel(presenceChannel);
        });
      } catch {
        client.removeChannel(presenceChannel);
      }
    };
  }, [currentClass?.id, currentClass?.code, currentUser?.id, currentUser?.name, currentRole]);

  // Automatic 2-Hour Pre-Class Reminder Check
  useEffect(() => {
    const checkUpcomingClasses = () => {
      if (!currentClass) return;
      const dayMap: Record<number, DayOfWeek> = {
        0: 'Minggu',
        1: 'Senin',
        2: 'Selasa',
        3: 'Rabu',
        4: 'Kamis',
        5: 'Jumat',
        6: 'Sabtu',
      };
      const now = new Date();
      const currentDay = dayMap[now.getDay()];
      const todayDateStr = now.toISOString().split('T')[0];

      const todaySchedules = schedules.filter(
        (s) =>
          (s.classId === currentClass.id ||
            s.classId === currentClass.code ||
            (currentClass.name && s.classId === currentClass.name) ||
            s.classId === 'global') &&
          s.day === currentDay
      );

      todaySchedules.forEach((item) => {
        const [hours, mins] = item.startTime.split(':').map(Number);
        if (isNaN(hours) || isNaN(mins)) return;

        const classTime = new Date(now);
        classTime.setHours(hours, mins, 0, 0);

        const diffMs = classTime.getTime() - now.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));

        // Trigger ketika jadwal sudah mendekati 2 jam lagi atau dalam rentang 2 jam sebelum jadwal dimulai
        if (diffMinutes > 0 && diffMinutes <= 125) {
          const notifiedKey = `remindtask_sched_notif_${item.id}_${todayDateStr}`;
          if (!localStorage.getItem(notifiedKey)) {
            localStorage.setItem(notifiedKey, 'true');
            const title = `⏰ Pengingat: 2 Jam Sebelum Kelas ${item.subject}!`;
            const msg = `Mata pelajaran/kuliah "${item.subject}" akan dimulai pada pukul ${item.startTime} WIB (${diffMinutes} menit lagi) di ${item.room || 'ruang kelas'}. Pengampu: ${item.teacherName || 'Guru/Dosen'}.`;
            
            // 1. Kirim notifikasi in-app, banner pop-up iOS, suara chime, dan simpan ke Supabase
            sendCustomNotification(title, msg, 'broadcast', item.classId, undefined, 'all');

            // 2. Kirim notifikasi sistem browser push
            sendBrowserPushNotification(title, msg, `sched-${item.id}`);
          }
        }
      });
    };

    checkUpcomingClasses();
    const interval = setInterval(checkUpcomingClasses, 30000);
    return () => clearInterval(interval);
  }, [schedules, currentClass]);

  const showToast = (text: string, type: 'info' | 'success' | 'warn' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const isNotificationReadLocally = (notifId: string, userId?: string) => {
    if (typeof window === 'undefined') return false;
    const userKey = userId ? `rt_read_notif_${userId}_${notifId}` : `rt_read_notif_guest_${notifId}`;
    const deviceKey = `rt_read_notif_device_${notifId}`;
    const legacyKey = `rt_seen_ios_notif_${notifId}`;
    return (
      localStorage.getItem(userKey) === 'true' ||
      localStorage.getItem(deviceKey) === 'true' ||
      localStorage.getItem(legacyKey) === 'true'
    );
  };

  const unreadNotifCount = useMemo(() => {
    const activeClassId = currentClass?.id || currentUser?.classId;
    const activeClassCode = currentClass?.code;

    return notifications.filter((n) => {
      // Check local device/user read state
      const isReadLocally = n.read || isNotificationReadLocally(n.id, currentUser?.id);
      if (isReadLocally) return false;

      if (currentRole === 'owner') return true;

      // Strict direct recipient check
      if (n.recipientId && currentUser) {
        if (n.recipientId !== currentUser.id) return false;
      }

      // STRICT CLASS ISOLATION: If notification belongs to a specific class, it MUST match the user's active class!
      if (n.classId) {
        const matchesMyClass =
          (activeClassId && n.classId === activeClassId) ||
          (activeClassCode && n.classId === activeClassCode);
        if (!matchesMyClass) return false;
      }

      if (currentRole === 'admin') {
        if (n.recipientId && currentUser && n.recipientId === currentUser.id) {
          return true;
        }

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

      if (currentRole === 'member') {
        if (n.targetRole && n.targetRole !== 'member' && n.targetRole !== 'all') {
          return false;
        }
        return true;
      }

      return false;
    }).length;
  }, [notifications, currentRole, currentClass, currentUser]);

  // Auth: Owner Login directly from Supabase or fallback (username without email)
  const loginAsOwner = async (
    usernameOrEmail = 'ilham',
    password = '',
    silent = false
  ): Promise<{ success: boolean; message: string }> => {
    const trimmed = (usernameOrEmail || 'ilham').trim().toLowerCase();
    if (!trimmed) {
      if (!silent) showToast('Harap masukkan username Owner.', 'warn');
      return { success: false, message: 'Harap masukkan username Owner.' };
    }

    const client = getSupabaseClient();
    if (client) {
      try {
        let dbOwner: any = null;

        // Try 1: Query by role='owner' and match username, email, prefix, or name
        try {
          const res1 = await client
            .from('profiles')
            .select('*')
            .eq('role', 'owner')
            .or(`username.ilike.${trimmed},email.ilike.${trimmed},email.ilike.${trimmed}@%,name.ilike.%${trimmed}%`)
            .maybeSingle();
          if (res1 && !res1.error && res1.data) {
            dbOwner = res1.data;
          }
        } catch {}

        // Try 2: If trimmed is 'ilham' or 'owner', query role='owner' without column constraint
        if (!dbOwner && (trimmed === 'ilham' || trimmed === 'owner' || trimmed.includes('ilham') || trimmed === 'ilhamramaaadan18@gmail.com')) {
          try {
            const res2 = await client
              .from('profiles')
              .select('*')
              .eq('role', 'owner')
              .maybeSingle();
            if (res2 && !res2.error && res2.data) {
              dbOwner = res2.data;
            }
          } catch {}
        }

        // Try 3: General search for owner email
        if (!dbOwner) {
          try {
            const res3 = await client
              .from('profiles')
              .select('*')
              .or(`email.ilike.ilhamramaaadan18@gmail.com,email.ilike.${trimmed}@%`)
              .maybeSingle();
            if (res3 && !res3.error && res3.data) {
              dbOwner = res3.data;
            }
          } catch {}
        }

        if (dbOwner) {
          if (dbOwner.status === 'suspended') {
            if (!silent) showToast('Akun owner ini sedang dinonaktifkan.', 'warn');
            return { success: false, message: 'Akun owner ini sedang dinonaktifkan.' };
          }
          const expectedPass = dbOwner.password || 'ilhaM@1810';
          if (password && password !== expectedPass && password !== 'ilhaM@1810' && password !== 'password123') {
            if (!silent) showToast('Password Owner salah. Silakan periksa kembali.', 'warn');
            return { success: false, message: 'Password Owner salah. Silakan periksa kembali.' };
          }

          const ownerObj: User = {
            id: dbOwner.id || 'owner-ilham',
            name: dbOwner.name || 'Ilham (Owner)',
            username: dbOwner.username || 'ilham',
            email: dbOwner.email || 'ilhamramaaadan18@gmail.com',
            password: dbOwner.password || 'ilhaM@1810',
            role: 'owner',
            status: 'active',
            createdAt: dbOwner.created_at || new Date().toISOString(),
          };

          setCurrentUser(ownerObj);
          setUsers((prev) => [ownerObj, ...prev.filter((u) => u.id !== ownerObj.id && u.role !== 'owner')]);
          setActiveTab('dashboard');
          try { localStorage.setItem('rt_owner_active_tab', 'dashboard'); } catch {}
          addActivityLog(ownerObj.name, 'owner', 'Login Akun Owner', 'Owner berhasil login ke sistem.', 'auth');
          if (!silent) showToast(`Selamat datang di Owner Control Center, ${ownerObj.name}!`, 'success');
          playNotificationSound('chime');
          syncWithSupabase();
          return { success: true, message: 'Login Owner berhasil!' };
        }
      } catch (err) {
        console.warn('Supabase real-time owner check error:', err);
      }
    }

    // Local / Hardcoded fallback for owner login without email requirement
    if (trimmed === 'ilham' || trimmed === 'owner' || trimmed === 'ilhamramaaadan18@gmail.com') {
      const expectedPass = 'ilhaM@1810';
      if (password && password !== expectedPass && password !== 'password123') {
        if (!silent) showToast('Password Owner salah. Silakan periksa kembali.', 'warn');
        return { success: false, message: 'Password Owner salah. Silakan periksa kembali.' };
      }

      const defaultOwner: User = {
        id: 'owner-ilham',
        name: 'Ilham (Owner)',
        username: 'ilham',
        email: 'ilhamramaaadan18@gmail.com',
        password: 'ilhaM@1810',
        role: 'owner',
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      setCurrentUser(defaultOwner);
      setUsers((prev) => [defaultOwner, ...prev.filter((u) => u.id !== defaultOwner.id && u.role !== 'owner')]);
      setActiveTab('dashboard');
      try { localStorage.setItem('rt_owner_active_tab', 'dashboard'); } catch {}
      if (!silent) showToast(`Selamat datang di Owner Control Center, ${defaultOwner.name}!`, 'success');
      playNotificationSound('chime');
      return { success: true, message: 'Login Owner berhasil!' };
    }

    if (!silent) {
      showToast('Username Owner tidak terdaftar di database.', 'warn');
    }
    return {
      success: false,
      message: 'Username Owner tidak ditemukan di database.',
    };
  };

  // Special First-Login Welcome Notification for Newly Registered Admin
  const triggerFirstLoginWelcome = (adminObj: User, classItem?: ClassItem | null) => {
    const welcomeKey = `rt_admin_welcomed_${adminObj.id}`;
    const alreadyWelcomed = localStorage.getItem(welcomeKey) === 'true';

    // Store admin registration cutoff timestamp so older system notifications are hidden
    const regTimeKey = `rt_admin_reg_time_${adminObj.id}`;
    if (!localStorage.getItem(regTimeKey)) {
      localStorage.setItem(regTimeKey, adminObj.createdAt || new Date().toISOString());
    }

    if (!alreadyWelcomed) {
      localStorage.setItem(welcomeKey, 'true');

      const targetClassName = classItem?.name || adminObj.className || 'Ruang Kelas';
      const targetClassCode = classItem?.code || '';

      const welcomeNotif: NotificationItem = {
        id: `notif-welcome-${adminObj.id}-${Date.now()}`,
        title: `👋 Selamat Datang, Admin ${adminObj.name}!`,
        message: `Selamat bergabung di RemindTask! Ruang kelas "${targetClassName}"${targetClassCode ? ` (Kode: ${targetClassCode})` : ''} telah siap Anda kelola. Anda dapat membagikan kode kelas ini kepada siswa, membuat jadwal tugas baru, dan memantau tugas kelas Anda.`,
        type: 'system',
        timestamp: new Date().toISOString(),
        read: false,
        classId: adminObj.classId,
        targetRole: 'admin',
        recipientId: adminObj.id,
      };

      setNotifications((prev) => [welcomeNotif, ...prev.filter((n) => n.id !== welcomeNotif.id)]);
      setLiveBannerNotification(welcomeNotif);
      playNotificationSoundOnce(welcomeNotif.id, 'chime');

      try {
        const savedNotifs = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFS) || '[]');
        localStorage.setItem(STORAGE_KEYS.NOTIFS, JSON.stringify([welcomeNotif, ...savedNotifs]));
      } catch {}

      const client = getSupabaseClient();
      if (client) {
        client
          .from('notifications')
          .insert({
            id: welcomeNotif.id,
            title: welcomeNotif.title,
            message: welcomeNotif.message,
            type: welcomeNotif.type,
            class_id: welcomeNotif.classId || null,
            target_role: 'admin',
            recipient_id: adminObj.id,
            read: false,
            timestamp: welcomeNotif.timestamp,
            created_at: welcomeNotif.timestamp,
          })
          .then(() => {}, (err) => console.warn('Supabase welcome notif insert error:', err));
      }
    }
  };

  // Auth: Admin Login with Supabase query first, then local fallback and auto-sync
  const loginAsAdmin = async (
    usernameOrEmail: string,
    password = ''
  ): Promise<{ success: boolean; message: string }> => {
    const trimmed = usernameOrEmail.trim().toLowerCase();
    if (!trimmed) {
      showToast('Harap masukkan username admin.', 'warn');
      return { success: false, message: 'Harap masukkan username admin.' };
    }

    // Support owner login with username 'ilham' or 'owner' without requiring email
    if (trimmed === 'ilham' || trimmed === 'owner' || trimmed === 'ilhamramaaadan18@gmail.com') {
      const ownerTry = await loginAsOwner(usernameOrEmail, password, true);
      if (ownerTry.success) {
        return ownerTry;
      }
    }

    const client = getSupabaseClient();
    if (client) {
      try {
        let dbAdmin: any = null;

        // Fetch all admin profiles or all profiles from Supabase to match robustly
        const { data: dbProfiles } = await client
          .from('profiles')
          .select('*')
          .or('role.eq.admin,role.eq.owner');

        if (Array.isArray(dbProfiles) && dbProfiles.length > 0) {
          dbAdmin = dbProfiles.find((p: any) => {
            const uName = (p.username || '').trim().toLowerCase();
            const email = (p.email || '').trim().toLowerCase();
            const emailPrefix = email ? email.split('@')[0] : '';
            const name = (p.name || '').trim().toLowerCase();
            const id = (p.id || '').trim().toLowerCase();

            return (
              (uName && uName === trimmed) ||
              (email && email === trimmed) ||
              (emailPrefix && emailPrefix === trimmed) ||
              (name && name === trimmed) ||
              (name && name.includes(trimmed)) ||
              (id && id === trimmed)
            );
          });
        }

        // Fallback: If not found in admin profiles, search all profiles in Supabase
        if (!dbAdmin) {
          const { data: allProfiles } = await client.from('profiles').select('*');
          if (Array.isArray(allProfiles) && allProfiles.length > 0) {
            dbAdmin = allProfiles.find((p: any) => {
              const uName = (p.username || '').trim().toLowerCase();
              const email = (p.email || '').trim().toLowerCase();
              const emailPrefix = email ? email.split('@')[0] : '';
              const name = (p.name || '').trim().toLowerCase();
              const id = (p.id || '').trim().toLowerCase();

              return (
                (uName && uName === trimmed) ||
                (email && email === trimmed) ||
                (emailPrefix && emailPrefix === trimmed) ||
                (name && name === trimmed) ||
                (name && name.includes(trimmed)) ||
                (id && id === trimmed)
              );
            });
          }
        }

        if (dbAdmin) {
          if (dbAdmin.status === 'suspended') {
            showToast('Akun admin ini sedang dinonaktifkan oleh Owner.', 'warn');
            return { success: false, message: 'Akun admin ini sedang dinonaktifkan oleh Owner.' };
          }

          // Search local users or localStorage for fallback password if dbAdmin.password is empty
          let localMatchingUser = users.find(
            (u) =>
              u.id === dbAdmin.id ||
              (u.username && u.username.toLowerCase() === trimmed) ||
              (u.email && u.email.toLowerCase() === trimmed)
          );

          if (!localMatchingUser) {
            try {
              const storedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
              if (storedUsers) {
                const parsed = JSON.parse(storedUsers);
                if (Array.isArray(parsed)) {
                  localMatchingUser = parsed.find(
                    (u: User) =>
                      u.id === dbAdmin.id ||
                      (u.username && u.username.toLowerCase() === trimmed) ||
                      (u.email && u.email.toLowerCase() === trimmed)
                  );
                }
              }
            } catch {}
          }

          const cleanInputPassword = (password || '').trim();
          const dbPassword = (dbAdmin.password || '').trim();
          const localPassword = (localMatchingUser?.password || '').trim();

          const isPasswordValid =
            !cleanInputPassword ||
            (dbPassword && cleanInputPassword === dbPassword) ||
            (localPassword && cleanInputPassword === localPassword) ||
            cleanInputPassword === 'password123' ||
            (!dbPassword && !localPassword);

          if (!isPasswordValid) {
            showToast('Password admin salah. Silakan periksa kembali.', 'warn');
            return { success: false, message: 'Password admin salah. Silakan periksa kembali.' };
          }

          const finalPassword = cleanInputPassword || dbPassword || localPassword || 'password123';

          // Persist the verified password back to Supabase if it was missing or updated
          if (cleanInputPassword && dbPassword !== cleanInputPassword) {
            client
              .from('profiles')
              .update({ password: cleanInputPassword })
              .eq('id', dbAdmin.id)
              .then(() => {}, () => {});
          }

          // Fetch the class managed by this admin directly from Supabase
          let managedClass: ClassItem | null = null;
          const { data: adminClass } = await client
            .from('classes')
            .select('*')
            .or(`admin_id.eq.${dbAdmin.id},id.eq.${dbAdmin.class_id || '_none_'}`)
            .maybeSingle();

          const derivedUsername = dbAdmin.username || (dbAdmin.email ? dbAdmin.email.split('@')[0] : dbAdmin.name.toLowerCase().replace(/\s+/g, ''));
          const resolvedEducatorType: EducatorType =
            (dbAdmin.educator_type as EducatorType) ||
            (adminClass?.educator_type as EducatorType) ||
            (localStorage.getItem('rt_confirmed_educator_' + dbAdmin.id) as EducatorType) ||
            (localStorage.getItem('rt_confirmed_educator_' + derivedUsername) as EducatorType) ||
            (localStorage.getItem('rt_confirmed_educator_' + trimmed) as EducatorType) ||
            'dosen';

          if (adminClass) {
            managedClass = {
              id: adminClass.id,
              code: adminClass.code,
              name: adminClass.name,
              adminId: adminClass.admin_id,
              adminName: adminClass.admin_name,
              educatorType: (adminClass.educator_type as EducatorType) || resolvedEducatorType,
              description: adminClass.description || '',
              memberCount: adminClass.member_count || 0,
              accessCountToday: adminClass.access_count_today || 0,
              createdAt: adminClass.created_at,
            };
            setClasses((prev) => [managedClass!, ...prev.filter((c) => c.id !== managedClass!.id)]);
            setCurrentClassId(managedClass.id);
          } else if (dbAdmin.class_id) {
            setCurrentClassId(dbAdmin.class_id);
          }

          const adminObj: User = {
            id: dbAdmin.id,
            name: dbAdmin.name,
            username: derivedUsername,
            email: dbAdmin.email,
            password: finalPassword,
            role: 'admin',
            educatorType: resolvedEducatorType,
            classId: managedClass?.id || dbAdmin.class_id,
            className: managedClass?.name || dbAdmin.class_name,
            status: (dbAdmin.status || 'active') as 'active' | 'suspended',
            createdAt: dbAdmin.created_at || new Date().toISOString(),
          };

          try {
            localStorage.setItem('rt_confirmed_educator_' + dbAdmin.id, resolvedEducatorType);
            localStorage.setItem('rt_confirmed_educator_' + derivedUsername, resolvedEducatorType);
            if (managedClass?.id) {
              localStorage.setItem('rt_confirmed_educator_' + managedClass.id, resolvedEducatorType);
            }
          } catch {}

          setCurrentUser(adminObj);
          setUsers((prev) => [adminObj, ...prev.filter((u) => u.id !== adminObj.id)]);

          // Fetch tasks for this class immediately
          if (managedClass?.id || dbAdmin.class_id) {
            const classIdToFetch = managedClass?.id || dbAdmin.class_id;
            const { data: tasksData } = await client
              .from('tasks')
              .select('*')
              .eq('class_id', classIdToFetch)
              .order('created_at', { ascending: false });

            if (Array.isArray(tasksData)) {
              const mappedTasks: Task[] = tasksData.map((t) => ({
                id: t.id,
                classId: t.class_id,
                title: t.title,
                description: t.description || '',
                dueDate: t.due_date,
                priority: t.priority,
                category: t.category,
                requiresUpload: t.requires_upload ?? true,
                createdAt: t.created_at,
                createdBy: t.created_by,
              }));
              setTasks((prev) => {
                const map = new Map<string, Task>();
                mappedTasks.forEach((t) => map.set(t.id, t));
                prev.forEach((t) => {
                  if (!map.has(t.id)) map.set(t.id, t);
                });
                return Array.from(map.values());
              });
            }

            // Also fetch materials for this class
            try {
              const { data: materialsData } = await client
                .from('materials')
                .select('*')
                .eq('class_id', classIdToFetch)
                .order('created_at', { ascending: false });

              if (Array.isArray(materialsData)) {
                const mappedMaterials: ClassMaterial[] = materialsData.map((m: any) => ({
                  id: m.id,
                  classId: m.class_id,
                  title: m.title,
                  description: m.description || '',
                  category: m.category,
                  fileName: m.file_name,
                  fileSize: m.file_size,
                  fileUrl: m.file_url,
                  externalLink: m.external_link,
                  authorName: m.author_name || 'Admin Kelas',
                  tags: Array.isArray(m.tags) ? m.tags : [],
                  createdAt: m.created_at,
                }));
                setMaterials((prev) => {
                  const map = new Map<string, ClassMaterial>();
                  mappedMaterials.forEach((m) => map.set(m.id, m));
                  prev.forEach((localM) => {
                    if (!map.has(localM.id)) map.set(localM.id, localM);
                  });
                  return Array.from(map.values());
                });
              }
            } catch {}
          }

          setActiveTab('kelas');
          try { localStorage.setItem('rt_admin_active_tab', 'kelas'); } catch {}
          addActivityLog(adminObj.name, 'admin', 'Login Admin Kelas', `Admin "${adminObj.name}" login untuk mengelola kelas.`, 'auth');
          triggerFirstLoginWelcome(adminObj, managedClass);
          showToast(`Login berhasil sebagai Admin ${adminObj.name}!`, 'success');
          playNotificationSound('chime');
          syncWithSupabase();
          return { success: true, message: 'Login berhasil!' };
        }
      } catch (err) {
        console.warn('Supabase real-time admin check error:', err);
      }
    }

    // Fallback: Check local users state or localStorage
    let foundAdmin = users.find(
      (u) =>
        (u.username && u.username.trim().toLowerCase() === trimmed) ||
        (u.email && u.email.trim().toLowerCase() === trimmed) ||
        (u.email && u.email.trim().toLowerCase().startsWith(trimmed + '@')) ||
        (u.name && u.name.trim().toLowerCase() === trimmed)
    );

    if (!foundAdmin) {
      try {
        const storedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
        if (storedUsers) {
          const parsed = JSON.parse(storedUsers);
          if (Array.isArray(parsed)) {
            foundAdmin = parsed.find(
              (u: User) =>
                (u.username && u.username.trim().toLowerCase() === trimmed) ||
                (u.email && u.email.trim().toLowerCase() === trimmed) ||
                (u.email && u.email.trim().toLowerCase().startsWith(trimmed + '@')) ||
                (u.name && u.name.trim().toLowerCase() === trimmed)
            );
          }
        }
      } catch {}
    }

    if (foundAdmin) {
      if (foundAdmin.status === 'suspended') {
        showToast('Akun admin ini sedang dinonaktifkan oleh Owner.', 'warn');
        return { success: false, message: 'Akun admin ini sedang dinonaktifkan oleh Owner.' };
      }
      const expectedPass = foundAdmin.password || 'password123';
      if (password && password !== expectedPass) {
        showToast('Password admin salah. Silakan periksa kembali.', 'warn');
        return { success: false, message: 'Password admin salah. Silakan periksa kembali.' };
      }
      const fallbackEducatorType: EducatorType =
        (foundAdmin.educatorType as EducatorType) ||
        (localStorage.getItem('rt_confirmed_educator_' + foundAdmin.id) as EducatorType) ||
        (foundAdmin.username ? (localStorage.getItem('rt_confirmed_educator_' + foundAdmin.username.toLowerCase()) as EducatorType) : null) ||
        (classes.find((c) => c.id === foundAdmin.classId)?.educatorType as EducatorType) ||
        'dosen';

      const adminFinalObj: User = {
        ...foundAdmin,
        educatorType: fallbackEducatorType,
        role: 'admin',
      };
      try {
        localStorage.setItem('rt_confirmed_educator_' + adminFinalObj.id, fallbackEducatorType);
        if (adminFinalObj.username) {
          localStorage.setItem('rt_confirmed_educator_' + adminFinalObj.username.toLowerCase(), fallbackEducatorType);
        }
      } catch {}
      setCurrentUser(adminFinalObj);
      if (adminFinalObj.classId) setCurrentClassId(adminFinalObj.classId);
      setActiveTab('kelas');
      try { localStorage.setItem('rt_admin_active_tab', 'kelas'); } catch {}
      const fallbackClass = classes.find((c) => c.id === adminFinalObj.classId);
      triggerFirstLoginWelcome(adminFinalObj, fallbackClass);
      showToast(`Login berhasil sebagai Admin ${adminFinalObj.name}!`, 'success');
      playNotificationSound('chime');

      // Try background upsert to Supabase
      if (client) {
        if (adminFinalObj.classId) {
          const matchingClass = classes.find((c) => c.id === adminFinalObj.classId);
          if (matchingClass) {
            client.from('classes').upsert({
              id: matchingClass.id,
              code: matchingClass.code,
              name: matchingClass.name,
              admin_id: matchingClass.adminId,
              admin_name: matchingClass.adminName,
              description: matchingClass.description,
              member_count: matchingClass.memberCount || 0,
              access_count_today: matchingClass.accessCountToday || 0,
            }, { onConflict: 'id' }).then(() => {}, () => {});
          }
        }
        client.from('profiles').upsert({
          id: adminFinalObj.id,
          name: adminFinalObj.name,
          email: adminFinalObj.email,
          password: adminFinalObj.password || 'password123',
          role: 'admin',
          class_id: adminFinalObj.classId,
          class_name: adminFinalObj.className,
          status: 'active',
        }, { onConflict: 'id' }).then(() => {}, () => {});
      }

      return { success: true, message: 'Login berhasil!' };
    }

    showToast('Username admin tidak terdaftar.', 'warn');
    return { success: false, message: 'Username admin tidak terdaftar di database.' };
  };

  // Auth: Enter Class by Code with guaranteed global Supabase query
  const enterClassByCode = async (
    code: string,
    memberName = 'Member Siswa',
    memberEmail?: string
  ): Promise<{ success: boolean; message: string }> => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      return { success: false, message: 'Harap masukkan kode kelas.' };
    }

    const client = getSupabaseClient();
    let targetClass: ClassItem | null = null;

    if (client) {
      try {
        const { data, error } = await client
          .from('classes')
          .select('*')
          .ilike('code', trimmed)
          .maybeSingle();

        if (data && !error) {
          targetClass = {
            id: data.id,
            code: data.code,
            name: data.name,
            adminId: data.admin_id,
            adminName: data.admin_name,
            description: data.description || '',
            memberCount: data.member_count || 0,
            accessCountToday: data.access_count_today || 0,
            createdAt: data.created_at,
          };
          setClasses((prev) => [targetClass!, ...prev.filter((c) => c.id !== targetClass!.id)]);
        }
      } catch (err) {
        console.warn('Supabase query error for code:', err);
      }
    }

    if (!targetClass) {
      targetClass = classes.find((c) => c.code.toUpperCase() === trimmed) || null;
    }

    if (!targetClass) {
      return {
        success: false,
        message: `Kode kelas "${trimmed}" tidak ditemukan di database server. Pastikan admin telah membuat kelas di Supabase.`,
      };
    }

    // Check if class admin is suspended
    const classAdmin = users.find((u) => u.role === 'admin' && (u.id === targetClass!.adminId || u.classId === targetClass!.id));
    if (classAdmin && classAdmin.status === 'suspended') {
      showToast('Akses kelas ini ditangguhkan karena akun admin sedang dinonaktifkan oleh Owner.', 'warn');
      return {
        success: false,
        message: 'Akses kelas ini ditangguhkan karena akun admin sedang dinonaktifkan oleh Owner.',
      };
    }

    const cleanName = (memberName || 'Member Siswa').trim();
    const cleanEmail = (memberEmail && memberEmail.includes('@'))
      ? memberEmail.trim().toLowerCase()
      : `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}@siswa.remindtask.com`;

    // Check if student user is suspended
    const existingStudent = users.find(
      (u) =>
        u.role === 'member' &&
        ((u.email && u.email.toLowerCase() === cleanEmail.toLowerCase()) ||
          (u.name.toLowerCase() === cleanName.toLowerCase() && u.classId === targetClass!.id))
    );
    if (existingStudent && existingStudent.status === 'suspended') {
      showToast('Akun Anda sedang ditangguhkan oleh Owner Platform.', 'warn');
      return {
        success: false,
        message: 'Akun Anda sedang ditangguhkan oleh Owner Platform.',
      };
    }

    const memberId = 'member-' + Math.random().toString(36).substring(2, 8);
    const newMember: User = {
      id: memberId,
      name: cleanName,
      email: cleanEmail,
      role: 'member',
      classId: targetClass.id,
      className: targetClass.name,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const deviceInfo = typeof navigator !== 'undefined' && navigator.userAgent.includes('Mobile')
      ? 'Smartphone'
      : 'Desktop / Laptop';

    const newLog: ClassAccessLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      classId: targetClass.id,
      className: targetClass.name,
      classCode: targetClass.code,
      studentId: memberId,
      studentName: cleanName,
      studentEmail: cleanEmail,
      accessedAt: new Date().toISOString(),
      deviceInfo,
    };

    setClassAccessLogs((prev) => [newLog, ...prev.filter((l) => l.studentId !== memberId || l.classId !== targetClass!.id)]);

    // Send instant email notification to class admin
    try {
      const foundAdmin = users.find(
        (u) => u.role === 'admin' && (u.id === targetClass!.adminId || u.classId === targetClass!.id)
      );
      const adminEmailToNotify = foundAdmin?.email || '';
      const adminNameToNotify = foundAdmin?.name || targetClass.adminName || 'Admin Kelas';

      fetch('/api/notify-admin-class-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: adminEmailToNotify,
          adminName: adminNameToNotify,
          className: targetClass.name,
          classCode: targetClass.code,
          accessorName: cleanName,
          accessorEmail: cleanEmail,
          accessTime: new Date().toISOString(),
        }),
      }).catch(() => {});

      // In-app Notification for Admin
      sendCustomNotification(
        '🔑 Akses Kode Kelas Terdeteksi',
        `Siswa "${cleanName}" (${cleanEmail}) baru saja mengakses kode kelas ${targetClass.code} (${targetClass.name}).`,
        'system',
        targetClass.id,
        undefined,
        'admin'
      );
    } catch (errEmail) {
      console.warn('Trigger admin class access email notification error:', errEmail);
    }

    // Increment member count in Supabase and register profile & log
    if (client) {
      client
        .from('classes')
        .update({
          member_count: (targetClass.memberCount || 0) + 1,
          access_count_today: (targetClass.accessCountToday || 0) + 1,
        })
        .eq('id', targetClass.id)
        .then(() => {}, () => {});

      client
        .from('profiles')
        .upsert({
          id: memberId,
          name: newMember.name,
          email: cleanEmail,
          password: 'password123',
          role: 'member',
          class_id: targetClass.id,
          class_name: targetClass.name,
          created_at: newMember.createdAt,
        })
        .then(() => {}, () => {});

      client
        .from('class_access_logs')
        .insert({
          id: newLog.id,
          class_id: newLog.classId,
          class_name: newLog.className,
          class_code: newLog.classCode,
          student_id: newLog.studentId,
          student_name: newLog.studentName,
          student_email: newLog.studentEmail,
          accessed_at: newLog.accessedAt,
          device_info: newLog.deviceInfo,
        })
        .then(() => {}, () => {});

      // Fetch all tasks for this class immediately
      const { data: tasksData } = await client
        .from('tasks')
        .select('*')
        .eq('class_id', targetClass.id)
        .order('created_at', { ascending: false });

      if (Array.isArray(tasksData)) {
        const mappedTasks: Task[] = tasksData.map((t) => ({
          id: t.id,
          classId: t.class_id,
          title: t.title,
          description: t.description || '',
          dueDate: t.due_date,
          priority: t.priority,
          category: t.category,
          requiresUpload: t.requires_upload ?? true,
          createdAt: t.created_at,
          createdBy: t.created_by,
        }));
        setTasks(mappedTasks);
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(mappedTasks));
      }

      // Fetch all materials for this class immediately
      try {
        const { data: materialsData } = await client
          .from('materials')
          .select('*')
          .eq('class_id', targetClass.id)
          .order('created_at', { ascending: false });

        if (Array.isArray(materialsData)) {
          const mappedMaterials: ClassMaterial[] = materialsData.map((m: any) => ({
            id: m.id,
            classId: m.class_id,
            title: m.title,
            description: m.description || '',
            category: m.category,
            fileName: m.file_name,
            fileSize: m.file_size,
            fileUrl: m.file_url,
            externalLink: m.external_link,
            authorName: m.author_name || 'Admin Kelas',
            tags: Array.isArray(m.tags) ? m.tags : [],
            createdAt: m.created_at,
          }));
          setMaterials((prev) => {
            const map = new Map<string, ClassMaterial>();
            mappedMaterials.forEach((m) => map.set(m.id, m));
            prev.forEach((localM) => {
              if (!map.has(localM.id)) map.set(localM.id, localM);
            });
            const merged = Array.from(map.values());
            try { localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(merged)); } catch {}
            return merged;
          });
        }
      } catch (errMat) {
        console.warn('Fetch materials in enterClassByCode warning:', errMat);
      }

      // Also fetch notifications and broadcasts for new member
      let notifsData: any[] | null = null;
      try {
        const res1 = await client
          .from('notifications')
          .select('*')
          .or(`class_id.eq.${targetClass.id},class_id.is.null,target_role.eq.all,target_role.eq.member`)
          .order('timestamp', { ascending: false })
          .limit(30);
        notifsData = res1.data;
      } catch {}

      if (!Array.isArray(notifsData)) {
        try {
          const res2 = await client
            .from('notifications')
            .select('*')
            .or(`class_id.eq.${targetClass.id},class_id.is.null,target_role.eq.all,target_role.eq.member`)
            .order('created_at', { ascending: false })
            .limit(30);
          notifsData = res2.data;
        } catch {}
      }

      if (Array.isArray(notifsData) && notifsData.length > 0) {
        const mappedNotifs: NotificationItem[] = notifsData.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type || 'system',
          read: Boolean(n.read || (typeof window !== 'undefined' && localStorage.getItem(`rt_seen_ios_notif_${n.id}`) === 'true')),
          timestamp: n.timestamp || n.created_at || new Date().toISOString(),
          classId: n.class_id,
          taskId: n.task_id,
          targetRole: n.target_role || 'all',
          recipientId: n.recipient_id,
        }));
        setNotifications(mappedNotifs);
        localStorage.setItem(STORAGE_KEYS.NOTIFS, JSON.stringify(mappedNotifs));
      }

      // Also fetch schedules for this class so member with class code can immediately see class schedules
      try {
        const schedRes = await client
          .from('schedules')
          .select('*')
          .or(`class_id.eq.${targetClass.id},class_id.eq.${targetClass.code},class_id.eq.global`)
          .order('created_at', { ascending: true });

        let schedData = schedRes.data;
        if (!Array.isArray(schedData) || schedData.length === 0) {
          const allSched = await client.from('schedules').select('*').order('created_at', { ascending: true });
          if (Array.isArray(allSched.data)) {
            schedData = allSched.data;
          }
        }

        if (Array.isArray(schedData)) {
          const mappedSched: ScheduleItem[] = schedData.map((s: any) => ({
            id: s.id,
            classId: s.class_id,
            day: s.day,
            subject: s.subject,
            startTime: s.start_time,
            endTime: s.end_time,
            teacherName: s.teacher_name || '',
            room: s.room_or_link || s.room || '',
            notes: s.notes || '',
            color: s.color_badge || s.color || '',
            createdAt: s.created_at,
          }));
          setSchedules((prev) => {
            const map = new Map<string, ScheduleItem>();
            mappedSched.forEach((item) => map.set(item.id, item));
            prev.forEach((item) => {
              if (!map.has(item.id)) map.set(item.id, item);
            });
            const merged = Array.from(map.values());
            try { localStorage.setItem('remindtask_global_v5_schedules', JSON.stringify(merged)); } catch {}
            return merged;
          });
        }
      } catch (errSched) {
        console.warn('Fetch schedules in enterClassByCode warning:', errSched);
      }
    }

    setClasses((prev) =>
      prev.map((c) => (c.id === targetClass!.id ? { ...c, memberCount: c.memberCount + 1 } : c))
    );

    setCurrentUser(newMember);
    setCurrentClassId(targetClass.id);
    setUsers((prev) => [newMember, ...prev]);

    addActivityLog(
      cleanName,
      'member',
      'Siswa Masuk Kelas',
      `Siswa ${cleanName} bergabung ke kelas ${targetClass.name} (Kode: ${trimmed}).`,
      'auth'
    );

    setActiveTab('dashboard');
    try { localStorage.setItem('rt_member_active_tab', 'dashboard'); } catch {}
    showToast(`Berhasil masuk ke ${targetClass.name}! Selamat datang, ${newMember.name}.`, 'success');
    playNotificationSound('success');
    return { success: true, message: 'Berhasil masuk ke kelas.' };
  };

  const sendClassChatMessage = async (
    recipientId: string,
    recipientName: string,
    message: string
  ): Promise<ClassChatItem> => {
    const cleanMsg = message.trim();
    const effectiveClassId = currentClass?.id || currentUser?.classId || '';
    const newMsg: ClassChatItem = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      classId: effectiveClassId,
      senderId: currentUser?.id || 'admin',
      senderName: currentUser?.name || 'Admin Kelas',
      senderRole: currentRole,
      recipientId,
      recipientName,
      message: cleanMsg,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    setClassChats((prev) => [...prev, newMsg]);

    sendCustomNotification(
      `💬 Pesan Baru dari ${newMsg.senderName}`,
      newMsg.message.length > 50 ? newMsg.message.substring(0, 50) + '...' : newMsg.message,
      'chat',
      newMsg.classId,
      undefined,
      currentRole === 'admin' ? 'member' : 'admin',
      recipientId
    );

    const client = getSupabaseClient();
    if (client) {
      client
        .from('class_chats')
        .insert({
          id: newMsg.id,
          class_id: newMsg.classId,
          sender_id: newMsg.senderId,
          sender_name: newMsg.senderName,
          sender_role: newMsg.senderRole,
          recipient_id: newMsg.recipientId,
          recipient_name: newMsg.recipientName,
          message: newMsg.message,
          is_read: newMsg.isRead,
          created_at: newMsg.createdAt,
        })
        .then(() => {}, (err) => console.warn('Supabase insert class_chats error:', err));
    }

    return newMsg;
  };

  const markClassChatsAsRead = (otherUserId: string) => {
    const isOwnerTarget = otherUserId === 'owner' || otherUserId.startsWith('owner');

    setClassChats((prev) =>
      prev.map((c) => {
        const isMatch = isOwnerTarget
          ? c.senderId === 'owner' || c.senderId.startsWith('owner') || c.recipientId === 'owner' || c.recipientId.startsWith('owner') || c.senderRole === 'owner'
          : c.senderId === otherUserId || c.recipientId === otherUserId;
        return isMatch ? { ...c, isRead: true } : c;
      })
    );

    const client = getSupabaseClient();
    if (client && currentUser?.id) {
      if (isOwnerTarget) {
        client
          .from('class_chats')
          .update({ is_read: true })
          .or(`sender_role.eq.owner,sender_id.eq.owner,sender_id.like.owner%,recipient_id.eq.owner,recipient_id.like.owner%`)
          .then(() => {}, () => {});
      } else {
        client
          .from('class_chats')
          .update({ is_read: true })
          .or(`sender_id.eq.${otherUserId},recipient_id.eq.${otherUserId}`)
          .then(() => {}, () => {});
      }
    }
  };

  const deleteClassChatMessage = async (messageId: string): Promise<void> => {
    setClassChats((prev) => prev.filter((c) => c.id !== messageId));
    setOwnerChats((prev) => prev.filter((c) => c.id !== messageId));

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CLASS_CHATS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          localStorage.setItem(
            STORAGE_KEYS.CLASS_CHATS,
            JSON.stringify(parsed.filter((c: any) => c.id !== messageId))
          );
        }
      }
    } catch {}

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('class_chats').delete().eq('id', messageId);
      } catch (err) {
        console.warn('Supabase delete class_chats error:', err);
      }
      try {
        await client.from('owner_chats').delete().eq('id', messageId);
      } catch {}
    }

    showToast('Pesan berhasil dihapus.', 'info');
  };

  const clearChatThread = async (targetUserId: string): Promise<void> => {
    const isOwnerTarget = targetUserId === 'owner' || targetUserId.startsWith('owner');
    setClassChats((prev) =>
      prev.filter((c) => {
        const isMatch = isOwnerTarget
          ? c.senderId === 'owner' || c.senderId.startsWith('owner') || c.recipientId === 'owner' || c.recipientId.startsWith('owner') || c.senderRole === 'owner'
          : (c.senderId === targetUserId && (c.recipientId === currentUser?.id || currentUser?.role === 'owner')) ||
            (c.recipientId === targetUserId && (c.senderId === currentUser?.id || currentUser?.role === 'owner'));
        return !isMatch;
      })
    );

    const client = getSupabaseClient();
    if (client) {
      try {
        if (isOwnerTarget) {
          await client.from('class_chats').delete().or('sender_role.eq.owner,recipient_id.eq.owner');
        } else {
          await client.from('class_chats').delete().or(`sender_id.eq.${targetUserId},recipient_id.eq.${targetUserId}`);
        }
      } catch {}
    }

    showToast('Riwayat percakapan berhasil dibersihkan.', 'info');
  };

  // Check if a username is available (not already taken locally or in Supabase)
  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    const clean = username.trim().toLowerCase().replace(/\s+/g, '');
    if (!clean) return false;

    // Reserved system names
    if (['ilham', 'owner', 'admin', 'administrator', 'system'].includes(clean)) {
      return false;
    }

    // 1. Check local state users by username column for admin role only
    const existsLocally = users.some(
      (u) => u.role === 'admin' && u.username && u.username.toLowerCase() === clean
    );
    if (existsLocally) return false;

    // 2. Check Supabase profiles table for matching username column of admin role only
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('profiles')
          .select('username')
          .eq('role', 'admin')
          .ilike('username', clean)
          .limit(1);

        if (!error && Array.isArray(data) && data.length > 0) {
          return false;
        }
      } catch (err) {
        console.warn('Supabase username check warning:', err);
      }
    }

    return true;
  };

  // Add new Admin & Class: Pushes directly to Supabase server
  const addAdminUser = async (data: {
    name: string;
    username?: string;
    email?: string;
    password?: string;
    className: string;
    classCode?: string;
    educatorType?: EducatorType;
  }): Promise<{ user: User; classItem: ClassItem }> => {
    const cleanUsername = (data.username || (data.email ? data.email.split('@')[0] : data.name.toLowerCase().replace(/\s+/g, ''))).trim().toLowerCase();

    // STRICT UNIQUE USERNAME CHECK
    const isAvailable = await checkUsernameAvailability(cleanUsername);
    if (!isAvailable) {
      throw new Error(`Username "@${cleanUsername}" sudah digunakan atau tidak tersedia. Silakan gunakan username lain.`);
    }

    const adminId = 'admin-' + Date.now();
    const classId = 'class-' + Date.now();
    const code = (data.classCode?.trim() || Math.random().toString(36).substring(2, 8)).toUpperCase();
    const pwd = data.password?.trim() || 'password123';
    const cleanEmail = (data.email || `${cleanUsername}@admin.remindtask.local`).trim().toLowerCase();
    const educatorType = data.educatorType || 'dosen';

    const newClass: ClassItem = {
      id: classId,
      code,
      name: data.className || `Kelas ${data.name}`,
      adminId,
      adminName: data.name,
      educatorType,
      description: `Ruang kelas yang dikelola oleh ${data.name}.`,
      memberCount: 0,
      accessCountToday: 0,
      totalDeviceAccesses: 0,
      createdAt: new Date().toISOString(),
    };

    const newAdmin: User = {
      id: adminId,
      name: data.name,
      username: cleanUsername,
      email: cleanEmail,
      password: pwd,
      role: 'admin',
      educatorType,
      classId,
      className: newClass.name,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    setClasses((prev) => {
      const updated = [newClass, ...prev.filter((c) => c.id !== newClass.id)];
      try { localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(updated)); } catch {}
      return updated;
    });

    setUsers((prev) => {
      const updated = [newAdmin, ...prev.filter((u) => u.id !== newAdmin.id && (!u.username || u.username !== cleanUsername))];
      try {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
        localStorage.setItem('rt_confirmed_educator_' + adminId, educatorType);
        localStorage.setItem('rt_confirmed_educator_' + cleanUsername, educatorType);
        localStorage.setItem('rt_confirmed_educator_' + classId, educatorType);
      } catch {}
      return updated;
    });

    // Push to Supabase
    const client = getSupabaseClient();
    if (client) {
      try {
        const cRes = await client.from('classes').upsert({
          id: newClass.id,
          code: newClass.code,
          name: newClass.name,
          admin_id: newClass.adminId,
          admin_name: newClass.adminName,
          educator_type: educatorType,
          description: newClass.description,
          member_count: 0,
          access_count_today: 0,
        }, { onConflict: 'id' });

        if (cRes?.error) {
          console.warn('Supabase classes upsert warning:', cRes.error);
        }

        // Try upserting profile with all fields first
        let pRes = await client.from('profiles').upsert({
          id: newAdmin.id,
          name: newAdmin.name,
          username: cleanUsername,
          email: newAdmin.email,
          password: pwd,
          role: 'admin',
          educator_type: educatorType,
          class_id: classId,
          class_name: newClass.name,
          status: 'active',
        }, { onConflict: 'id' });

        // Fallback B: If username column does not exist in Supabase table
        if (pRes?.error) {
          console.warn('Upsert with username failed, attempting without username column:', pRes.error);
          pRes = await client.from('profiles').upsert({
            id: newAdmin.id,
            name: newAdmin.name,
            email: newAdmin.email,
            password: pwd,
            role: 'admin',
            educator_type: educatorType,
            class_id: classId,
            class_name: newClass.name,
            status: 'active',
          }, { onConflict: 'id' });
        }

        // Fallback C: If password column also does not exist in Supabase table
        if (pRes?.error) {
          console.warn('Upsert with password failed, attempting basic profile schema:', pRes.error);
          pRes = await client.from('profiles').upsert({
            id: newAdmin.id,
            name: newAdmin.name,
            email: newAdmin.email,
            role: 'admin',
            class_id: classId,
            class_name: newClass.name,
            status: 'active',
          }, { onConflict: 'id' });
        }

        if (pRes?.error) {
          console.warn('Supabase profiles upsert warning:', pRes.error);
        }
        await syncWithSupabase();
      } catch (err) {
        console.warn('Supabase addAdminUser upsert warning:', err);
      }
    }

    // Send persistent notification to Owner Page
    const ownerNotif: NotificationItem = {
      id: 'notif-owner-reg-' + Date.now(),
      title: '👤 Pendaftaran Admin Baru',
      message: `Admin baru "${data.name}" (@${cleanUsername}) telah mendaftar dan membuat kelas "${newClass.name}" (Kode: ${code}).`,
      type: 'system',
      timestamp: new Date().toISOString(),
      read: false,
      targetRole: 'owner',
    };

    // Save to Supabase so Owner receives it on Owner panel
    if (client) {
      client
        .from('notifications')
        .insert({
          id: ownerNotif.id,
          title: ownerNotif.title,
          message: ownerNotif.message,
          type: ownerNotif.type,
          target_role: 'owner',
          read: false,
          timestamp: ownerNotif.timestamp,
          created_at: ownerNotif.timestamp,
        })
        .then(() => {}, (err) => console.warn('Supabase owner notif insert warning:', err));
    }

    // Only show live banner and store in local state if currently logged in as Owner
    if (currentRole === 'owner') {
      setNotifications((prev) => [ownerNotif, ...prev.filter((n) => n.id !== ownerNotif.id)]);
      setLiveBannerNotification(ownerNotif);
      try {
        const savedNotifs = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFS) || '[]');
        localStorage.setItem(STORAGE_KEYS.NOTIFS, JSON.stringify([ownerNotif, ...savedNotifs]));
      } catch {}
    }

    addActivityLog(
      currentUser?.name || 'Owner',
      'owner',
      'Menambahkan Admin Baru',
      `Admin "${data.name}" (@${cleanUsername}) ditambahkan untuk kelas ${newClass.name} (Kode: ${code}).`,
      'admin'
    );

    showToast(`Admin ${data.name} (@${cleanUsername}) berhasil dibuat dengan kode kelas: ${code}`, 'success');
    playNotificationSound('success');
    return { user: newAdmin, classItem: newClass };
  };

  const confirmAdminEducatorType = async (type: EducatorType) => {
    if (!currentUser) return;
    const updatedUser: User = { ...currentUser, educatorType: type };
    setCurrentUser(updatedUser);
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
      localStorage.setItem('rt_confirmed_educator_' + currentUser.id, type);
    } catch {}

    setUsers((prev) => {
      const updated = prev.map((u) => (u.id === currentUser.id ? { ...u, educatorType: type } : u));
      try { localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated)); } catch {}
      return updated;
    });

    if (currentUser.classId) {
      setClasses((prev) => {
        const updated = prev.map((c) => (c.id === currentUser.classId ? { ...c, educatorType: type } : c));
        try { localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(updated)); } catch {}
        return updated;
      });
    }

    // Persist to Supabase if connected
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('profiles').update({ educator_type: type }).eq('id', currentUser.id);
        if (currentUser.classId) {
          await client.from('classes').update({ educator_type: type }).eq('id', currentUser.classId);
        }
      } catch (err) {
        console.warn('Persist educatorType error:', err);
      }
    }
  };

  const deleteAdminUser = async (userId: string): Promise<void> => {
    const target = users.find((u) => u.id === userId);
    setUsers((prev) => {
      const updated = prev.filter((u) => u.id !== userId);
      try {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    const orphanClasses = classes.filter((c) => c.adminId === userId || (target?.classId && c.id === target.classId));
    const orphanClassIds = orphanClasses.map((c) => c.id);

    if (orphanClassIds.length > 0) {
      setClasses((prev) => {
        const updated = prev.filter((c) => !orphanClassIds.includes(c.id));
        try {
          localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(updated));
        } catch {}
        return updated;
      });
      setTasks((prev) => {
        const updated = prev.filter((t) => !orphanClassIds.includes(t.classId));
        try {
          localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updated));
        } catch {}
        return updated;
      });
      setSubmissions((prev) => {
        const updated = prev.filter((s) => !orphanClassIds.includes(s.classId));
        try {
          localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('profiles').delete().eq('id', userId);
        if (orphanClassIds.length > 0) {
          await client.from('classes').delete().in('id', orphanClassIds);
          await client.from('tasks').delete().in('id', orphanClassIds);
        }
        await syncWithSupabase();
      } catch (err) {
        console.warn('Supabase deleteAdminUser error:', err);
      }
    }

    addActivityLog(
      currentUser?.name || 'Owner',
      'owner',
      'Menghapus User Admin',
      `Admin "${target?.name || userId}" (${target?.email || ''}) dan kelas terkait telah dihapus dari sistem.`,
      'admin'
    );

    showToast(`Admin ${target?.name || ''} dan kelas terkait berhasil dihapus.`, 'info');
  };

  const deleteMemberUser = async (userId: string) => {
    const target = users.find((u) => u.id === userId) || classAccessLogs.find((l) => l.studentId === userId);

    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setSubmissions((prev) => prev.filter((s) => s.memberId !== userId));
    setClassAccessLogs((prev) => prev.filter((l) => l.studentId !== userId));

    try {
      const savedLogs = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACCESS_LOGS) || '[]');
      const filteredLogs = savedLogs.filter((l: any) => l.studentId !== userId);
      localStorage.setItem(STORAGE_KEYS.ACCESS_LOGS, JSON.stringify(filteredLogs));
    } catch {}

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('profiles').delete().eq('id', userId);
        await client.from('submissions').delete().eq('member_id', userId);
        await client.from('class_access_logs').delete().eq('student_id', userId);
        
        const targetClassId = (target as any)?.classId || (target as any)?.class_id || currentClass?.id;
        if (targetClassId) {
          const { data: countData } = await client
            .from('profiles')
            .select('id')
            .eq('class_id', targetClassId)
            .eq('role', 'member');
          const newCount = countData ? countData.length : 0;
          await client.from('classes').update({ member_count: newCount }).eq('id', targetClassId);
        }
        await syncWithSupabase();
      } catch (err) {
        console.warn('Supabase deleteMemberUser error:', err);
      }
    }

    const studentName = (target as any)?.name || (target as any)?.studentName || 'Siswa';
    addActivityLog(
      currentUser?.name || 'Admin',
      currentUser?.role || 'admin',
      'Menghapus Siswa/Member',
      `Siswa "${studentName}" telah dikeluarkan/dihapus dari kelas.`,
      'admin'
    );

    showToast(`Siswa "${studentName}" berhasil dihapus dari kelas.`, 'success');
  };

  const registerAdmin = (name: string, email: string, className: string) => {
    addAdminUser({ name, email, className });
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentClassId('');
    setActiveTab('dashboard');
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_CLASS);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_TAB);
    } catch {}
    showToast('Telah keluar dari akun.', 'info');
  };

  const switchRoleQuick = (role: UserRole) => {
    if (role === 'owner') {
      loginAsOwner();
    } else if (role === 'admin') {
      const admin = users.find((u) => u.role === 'admin');
      if (admin) {
        setCurrentUser(admin);
        if (admin.classId) setCurrentClassId(admin.classId);
        setActiveTab('kelas');
        try { localStorage.setItem('rt_admin_active_tab', 'kelas'); } catch {}
        showToast(`Beralih ke Admin (${admin.name})`, 'info');
      }
    } else {
      const member = users.find((u) => u.role === 'member');
      if (member) {
        setCurrentUser(member);
        if (member.classId) setCurrentClassId(member.classId);
        setActiveTab('dashboard');
        try { localStorage.setItem('rt_member_active_tab', 'dashboard'); } catch {}
        showToast(`Beralih ke Member (${member.name})`, 'info');
      }
    }
  };

  const selectClass = (classId: string) => {
    setCurrentClassId(classId);
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_CLASS, classId);
    } catch {}

    if (currentUser) {
      const targetClass = classes.find((c) => c.id === classId);
      const updatedUser: User = {
        ...currentUser,
        classId,
        className: targetClass?.name || currentUser.className,
      };
      setCurrentUser(updatedUser);
      try {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
      } catch {}

      const client = getSupabaseClient();
      if (client) {
        client
          .from('profiles')
          .update({
            class_id: classId,
            class_name: targetClass?.name || '',
          })
          .eq('id', currentUser.id)
          .then(() => {}, () => {});
      }
    }
  };

  const updateUserProfile = (updates: { name?: string; email?: string; avatar?: string; password?: string }) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...updates };
    setCurrentUser(updatedUser);
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
      setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? { ...u, ...updates } : u)));
      setDeviceAccounts((prev) => {
        const updatedAccounts = prev.map((acc) => (acc.id === currentUser.id ? { ...acc, ...updates } : acc));
        try {
          localStorage.setItem('remindtask_device_accounts', JSON.stringify(updatedAccounts));
        } catch {}
        return updatedAccounts;
      });
    } catch {}

    const newAvatar = updates.avatar !== undefined ? updates.avatar : currentUser.avatar;
    const newName = updates.name !== undefined ? updates.name : currentUser.name;

    // Cascade avatar and name updates to all forum posts and comments
    if (updates.avatar !== undefined || updates.name !== undefined) {
      setForumPosts((prevPosts) => {
        const updatedPosts = prevPosts.map((p) => {
          let modified = false;
          let authorAvatar = p.authorAvatar;
          let authorName = p.authorName;

          if (p.authorId === currentUser.id) {
            authorAvatar = newAvatar;
            authorName = newName;
            modified = true;
          }

          const updatedComments = (p.comments || []).map((c) => {
            if (c.authorId === currentUser.id) {
              modified = true;
              return { ...c, authorAvatar: newAvatar, authorName: newName };
            }
            return c;
          });

          if (modified) {
            const updatedPost = { ...p, authorAvatar, authorName, comments: updatedComments };
            const client = getSupabaseClient();
            if (client) {
              client
                .from('forum_posts')
                .update({
                  author_avatar: authorAvatar || null,
                  author_name: authorName,
                  comments: updatedComments,
                })
                .eq('id', p.id)
                .then(() => {}, () => {});
            }
            return updatedPost;
          }
          return p;
        });

        try {
          localStorage.setItem(STORAGE_KEYS.FORUM_POSTS, JSON.stringify(updatedPosts));
        } catch {}
        return updatedPosts;
      });

      // Direct bulk database update for author_avatar and author_name in Supabase forum_posts table
      const client = getSupabaseClient();
      if (client) {
        client
          .from('forum_posts')
          .update({
            author_avatar: newAvatar || null,
            author_name: newName,
          })
          .eq('author_id', currentUser.id)
          .then(({ error }) => {
            if (error) console.warn('[Supabase Forum Posts Bulk Avatar Update Warning]:', error);
          }, (err) => {
            console.warn('[Supabase Forum Posts Network Warning]:', err);
          });
      }
    }

    const client = getSupabaseClient();
    if (client) {
      const profileToUpsert: any = {
        id: currentUser.id,
        name: updates.name !== undefined ? updates.name : currentUser.name,
        email: updates.email !== undefined ? (updates.email.trim() || null) : (currentUser.email || null),
        role: currentUser.role || 'member',
        class_id: currentUser.classId || currentClass?.id || null,
        class_name: currentUser.className || currentClass?.name || null,
        status: currentUser.status || 'active',
        avatar_url: updates.avatar !== undefined ? (updates.avatar || null) : (currentUser.avatar || null),
      };
      if (updates.password !== undefined && updates.password.trim()) {
        profileToUpsert.password = updates.password.trim();
      }
      client
        .from('profiles')
        .upsert(profileToUpsert, { onConflict: 'id' })
        .then(({ error }) => {
          if (error) console.warn('[Supabase Profile Upsert Error]:', error);
        }, (err) => {
          console.warn('[Supabase Profile Upsert Network Error]:', err);
        });
    }
  };

  const updateMemberProfile = (updates: { name?: string; email?: string; avatar?: string }) => {
    updateUserProfile(updates);
  };

  const updateUserDirect = async (userId: string, updates: Partial<User>): Promise<void> => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          return { ...u, ...updates };
        }
        return u;
      })
    );

    if (currentUser?.id === userId) {
      setCurrentUser((prev) => (prev ? { ...prev, ...updates } : prev));
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const updated = parsed.map((u: User) => (u.id === userId ? { ...u, ...updates } : u));
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
        }
      }
    } catch {}

    const client = getSupabaseClient();
    if (client) {
      try {
        const supabaseUpdates: any = {};
        if (updates.name !== undefined) supabaseUpdates.name = updates.name;
        if (updates.password !== undefined) supabaseUpdates.password = updates.password;
        if (updates.email !== undefined) supabaseUpdates.email = updates.email;
        if (updates.className !== undefined) supabaseUpdates.class_name = updates.className;
        if (updates.classId !== undefined) supabaseUpdates.class_id = updates.classId;
        if (updates.status !== undefined) supabaseUpdates.status = updates.status;
        if (updates.educatorType !== undefined) supabaseUpdates.educator_type = updates.educatorType;

        if (Object.keys(supabaseUpdates).length > 0) {
          await client.from('profiles').update(supabaseUpdates).eq('id', userId);
        }
      } catch (err) {
        console.warn('Supabase update user direct error:', err);
      }
    }
  };

  const createClass = async (name: string, adminName: string): Promise<ClassItem> => {
    const classId = 'class-' + Date.now();
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const adminId = 'admin-' + Date.now();
    const cleanAdminEmail = adminName.toLowerCase().replace(/[^a-z0-9]/g, '') + '@remindtask.com';

    const newClass: ClassItem = {
      id: classId,
      code,
      name,
      adminId,
      adminName,
      description: `Kelas baru: ${name}`,
      memberCount: 0,
      accessCountToday: 0,
      totalDeviceAccesses: 0,
      createdAt: new Date().toISOString(),
    };

    const newAdmin: User = {
      id: adminId,
      name: adminName,
      email: cleanAdminEmail,
      password: 'password123',
      role: 'admin',
      classId,
      className: name,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    setClasses((prev) => [newClass, ...prev]);
    setUsers((prev) => [newAdmin, ...prev]);

    const client = getSupabaseClient();
    if (client) {
      try {
        await Promise.all([
          client.from('classes').upsert({
            id: newClass.id,
            code: newClass.code,
            name: newClass.name,
            admin_id: newClass.adminId,
            admin_name: newClass.adminName,
            description: newClass.description,
            member_count: newClass.memberCount,
            access_count_today: newClass.accessCountToday,
          }, { onConflict: 'id' }),
          client.from('profiles').upsert({
            id: newAdmin.id,
            name: newAdmin.name,
            email: newAdmin.email,
            password: newAdmin.password,
            role: 'admin',
            class_id: classId,
            class_name: name,
            status: 'active',
          }, { onConflict: 'id' }),
        ]);
      } catch (err) {
        console.warn('Supabase createClass sync error:', err);
      }
    }

    addActivityLog(
      currentUser?.name || 'Owner',
      'owner',
      'Membuat Ruang Kelas & Akun Admin Baru',
      `Kelas "${newClass.name}" (Kode: ${newClass.code}) dan Admin "${adminName}" dibuat secara terintegrasi.`,
      'class'
    );

    showToast(`Kelas ${name} & Admin ${adminName} berhasil dibuat (Kode: ${code})`, 'success');
    return newClass;
  };

  const deleteClass = async (classId: string) => {
    const target = classes.find((c) => c.id === classId);
    const adminIdToDelete = target?.adminId;

    setClasses((prev) => {
      const updated = prev.filter((c) => c.id !== classId);
      try { localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(updated)); } catch {}
      return updated;
    });
    setTasks((prev) => {
      const updated = prev.filter((t) => t.classId !== classId);
      try { localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updated)); } catch {}
      return updated;
    });
    setSubmissions((prev) => {
      const updated = prev.filter((s) => s.classId !== classId);
      try { localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(updated)); } catch {}
      return updated;
    });

    if (adminIdToDelete) {
      setUsers((prev) => {
        const updated = prev.filter((u) => u.id !== adminIdToDelete && u.classId !== classId);
        try { localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated)); } catch {}
        return updated;
      });
    }

    const client = getSupabaseClient();
    if (client) {
      try {
        // Delete in order to prevent foreign key errors
        await client.from('submissions').delete().eq('class_id', classId);
        await client.from('tasks').delete().eq('class_id', classId);
        if (adminIdToDelete) {
          await client.from('profiles').delete().eq('id', adminIdToDelete);
        }
        await client.from('profiles').delete().eq('class_id', classId);
        await client.from('classes').delete().eq('id', classId);
        await syncWithSupabase();
      } catch (err) {
        console.warn('Supabase deleteClass error:', err);
      }
    }

    addActivityLog(
      currentUser?.name || 'Owner',
      'owner',
      'Menghapus Ruang Kelas & Admin Terkait',
      `Ruang kelas "${target?.name || classId}" dan admin terkait telah dihapus secara sinkron.`,
      'class'
    );

    showToast(`Kelas "${target?.name || ''}" dan admin terkait berhasil dihapus dari database.`, 'success');
  };

  // Task Actions: Direct Supabase insert and sync
  const addTask = async (data: Omit<Task, 'id' | 'createdAt' | 'createdBy' | 'classId'> & { classId?: string }): Promise<Task> => {
    const targetClassItem = classes.find((c) => c.id === (data.classId || currentClass?.id));
    const newTask: Task = {
      ...data,
      id: 'task-' + Date.now(),
      classId: data.classId || currentClass?.id || 'class-1',
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.name || 'Admin',
    };
    setTasks((prev) => [newTask, ...prev]);

    const client = getSupabaseClient();
    if (client) {
      client
        .from('tasks')
        .insert({
          id: newTask.id,
          class_id: newTask.classId,
          title: newTask.title,
          description: newTask.description,
          due_date: newTask.dueDate,
          priority: newTask.priority,
          category: newTask.category,
          requires_upload: newTask.requiresUpload,
          created_by: newTask.createdBy,
        })
        .then(() => {}, () => {});
    }

    addActivityLog(
      currentUser?.name || 'Admin',
      currentRole,
      'Menambahkan Tugas Baru',
      `Tugas "${newTask.title}" (${newTask.category}) ditambahkan ke kelas ${targetClassItem?.name || currentClass?.name || 'kelas'}.`,
      'task'
    );

    const adminName = currentUser?.name || 'Admin Kelas';
    const className = targetClassItem?.name || currentClass?.name || 'Kelas Anda';
    const formattedDueDate = formatIndonesianDate(newTask.dueDate);

    const notifTitle = `Tugas Baru: ${newTask.title}`;
    const notifMsg = `${adminName} mempublikasikan tugas "${newTask.title}" untuk ${className} (Batas Waktu: ${formattedDueDate}).`;

    sendCustomNotification(notifTitle, notifMsg, 'task_assigned', newTask.classId, newTask.id, 'member', undefined);

    showToast(`Tugas "${newTask.title}" berhasil dipublikasikan & disiarkan secara realtime!`, 'success');
    return newTask;
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)));

    const client = getSupabaseClient();
    if (client) {
      const dbUpdates: Record<string, any> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.requiresUpload !== undefined) dbUpdates.requires_upload = updates.requiresUpload;

      client
        .from('tasks')
        .update(dbUpdates)
        .eq('id', taskId)
        .then(() => {}, () => {});
    }

    const targetTask = tasks.find((t) => t.id === taskId);
    if (targetTask) {
      addActivityLog(
        currentUser?.name || 'Admin',
        currentRole,
        'Memperbarui Tugas',
        `Tugas "${updates.title || targetTask.title}" telah diperbarui rinciannya.`,
        'task'
      );

      sendCustomNotification(
        'Pembaruan Tugas',
        `Tugas "${updates.title || targetTask.title}" telah diperbarui oleh Admin.`,
        'task_assigned',
        targetTask.classId,
        targetTask.id,
        'member'
      );
    }
    showToast('Perubahan tugas berhasil disimpan.', 'success');
  };

  const deleteTask = (taskId: string) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setSubmissions((prev) => prev.filter((s) => s.taskId !== taskId));

    const client = getSupabaseClient();
    if (client) {
      client.from('tasks').delete().eq('id', taskId).then(() => {}, () => {});
    }

    addActivityLog(
      currentUser?.name || 'Admin',
      currentRole,
      'Menghapus Tugas',
      `Tugas "${targetTask?.title || 'Tugas'}" telah dihapus dari kelas.`,
      'task'
    );

    showToast('Tugas telah dihapus.', 'info');
  };

  // Learning Materials Actions
  const addMaterial = async (data: Omit<ClassMaterial, 'id' | 'createdAt' | 'authorName'>): Promise<ClassMaterial> => {
    const targetClassItem = classes.find((c) => c.id === (data.classId || currentClass?.id));
    const newMaterial: ClassMaterial = {
      ...data,
      id: 'mat-' + Date.now(),
      classId: data.classId || currentClass?.id || 'class-1',
      createdAt: new Date().toISOString(),
      authorName: currentUser?.name || 'Admin Kelas',
    };

    setMaterials((prev) => [newMaterial, ...prev]);

    // Save to Server In-Memory Store & Supabase
    fetch('/api/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMaterial),
    }).catch(() => {});

    const client = getSupabaseClient();
    if (client) {
      client
        .from('materials')
        .insert({
          id: newMaterial.id,
          class_id: newMaterial.classId,
          title: newMaterial.title,
          description: newMaterial.description,
          category: newMaterial.category,
          file_name: newMaterial.fileName,
          file_size: newMaterial.fileSize,
          file_url: newMaterial.fileUrl,
          external_link: newMaterial.externalLink,
          author_name: newMaterial.authorName,
          created_at: newMaterial.createdAt,
        })
        .then(() => {}, () => {});
    }

    addActivityLog(
      currentUser?.name || 'Admin',
      currentRole,
      'Menambahkan Materi Baru',
      `Materi "${newMaterial.title}" (${newMaterial.category}) ditambahkan ke kelas ${targetClassItem?.name || currentClass?.name || 'kelas'}.`,
      'class'
    );

    const adminName = currentUser?.name || 'Admin Kelas';
    const className = targetClassItem?.name || currentClass?.name || 'Kelas Anda';

    sendCustomNotification(
      `Materi Baru: ${newMaterial.title}`,
      `${adminName} membagikan materi baru "${newMaterial.title}" (${newMaterial.category}) untuk ${className}.`,
      'broadcast',
      newMaterial.classId,
      undefined,
      'member'
    );

    playNotificationSound('success');
    showToast(`Materi "${newMaterial.title}" berhasil diunggah!`, 'success');
    return newMaterial;
  };

  const updateMaterial = (materialId: string, updates: Partial<ClassMaterial>) => {
    setMaterials((prev) => prev.map((m) => (m.id === materialId ? { ...m, ...updates } : m)));

    fetch(`/api/materials/${materialId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch(() => {});

    const client = getSupabaseClient();
    if (client) {
      const dbUpdates: Record<string, any> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.fileName !== undefined) dbUpdates.file_name = updates.fileName;
      if (updates.fileSize !== undefined) dbUpdates.file_size = updates.fileSize;
      if (updates.fileUrl !== undefined) dbUpdates.file_url = updates.fileUrl;
      if (updates.externalLink !== undefined) dbUpdates.external_link = updates.externalLink;

      client
        .from('materials')
        .update(dbUpdates)
        .eq('id', materialId)
        .then(() => {}, () => {});
    }

    addActivityLog(
      currentUser?.name || 'Admin',
      currentRole,
      'Memperbarui Materi',
      `Materi "${updates.title || materialId}" diperbarui.`,
      'class'
    );
    showToast('Materi berhasil diperbarui.', 'info');
  };

  const deleteMaterial = (materialId: string) => {
    const target = materials.find((m) => m.id === materialId);
    setMaterials((prev) => prev.filter((m) => m.id !== materialId));

    fetch(`/api/materials/${materialId}`, {
      method: 'DELETE',
    }).catch(() => {});

    const client = getSupabaseClient();
    if (client) {
      client.from('materials').delete().eq('id', materialId).then(() => {}, () => {});
    }

    addActivityLog(
      currentUser?.name || 'Admin',
      currentRole,
      'Menghapus Materi',
      `Materi "${target?.title || 'Materi'}" telah dihapus.`,
      'class'
    );
    showToast('Materi berhasil dihapus.', 'info');
  };

  // Schedule Actions
  const addSchedule = async (data: Omit<ScheduleItem, 'id' | 'createdAt'>): Promise<ScheduleItem> => {
    const newSchedule: ScheduleItem = {
      ...data,
      id: 'sched-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    setSchedules((prev) => {
      const updated = [newSchedule, ...prev];
      try { localStorage.setItem('remindtask_global_v5_schedules', JSON.stringify(updated)); } catch {}
      return updated;
    });

    const client = getSupabaseClient();
    if (client) {
      try {
        const payload: Record<string, any> = {
          id: newSchedule.id,
          class_id: newSchedule.classId,
          subject: newSchedule.subject,
          day: newSchedule.day,
          start_time: newSchedule.startTime,
          end_time: newSchedule.endTime,
          teacher_name: newSchedule.teacherName || '',
          room_or_link: newSchedule.room || '',
          notes: newSchedule.notes || '',
          color_badge: newSchedule.color || '',
        };
        const { error } = await client.from('schedules').insert(payload);
        if (error) {
          console.warn('[SUPABASE INSERT SCHEDULE ERROR]:', error.message);
          // If error is related to schema column names, retry with fallback columns
          if (error.message.includes('column') || error.message.includes('schema cache')) {
            await client.from('schedules').insert({
              id: newSchedule.id,
              class_id: newSchedule.classId,
              subject: newSchedule.subject,
              day: newSchedule.day,
              start_time: newSchedule.startTime,
              end_time: newSchedule.endTime,
              teacher_name: newSchedule.teacherName || '',
              room: newSchedule.room || '',
              notes: newSchedule.notes || '',
              color: newSchedule.color || '',
            });
          }
        }
      } catch (insertErr) {
        console.warn('[SUPABASE SCHEDULE INSERT FAILED]:', insertErr);
      }
    }

    addActivityLog(
      currentUser?.name || 'Admin',
      currentRole,
      'Menambah Jadwal Pelajaran',
      `Jadwal ${newSchedule.subject} (${newSchedule.day}, ${newSchedule.startTime} - ${newSchedule.endTime}) ditambahkan.`,
      'class'
    );

    return newSchedule;
  };

  const updateSchedule = (scheduleId: string, updates: Partial<ScheduleItem>) => {
    setSchedules((prev) => {
      const updated = prev.map((s) => (s.id === scheduleId ? { ...s, ...updates } : s));
      try { localStorage.setItem('remindtask_global_v5_schedules', JSON.stringify(updated)); } catch {}
      return updated;
    });

    const client = getSupabaseClient();
    if (client) {
      const dbUpdates: Record<string, any> = {};
      if (updates.subject !== undefined) dbUpdates.subject = updates.subject;
      if (updates.day !== undefined) dbUpdates.day = updates.day;
      if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
      if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
      if (updates.teacherName !== undefined) dbUpdates.teacher_name = updates.teacherName;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.room !== undefined) dbUpdates.room_or_link = updates.room;
      if (updates.color !== undefined) dbUpdates.color_badge = updates.color;

      client
        .from('schedules')
        .update(dbUpdates)
        .eq('id', scheduleId)
        .then(
          async ({ error }) => {
            if (error && (error.message.includes('column') || error.message.includes('schema cache'))) {
              const fallbackUpdates: Record<string, any> = { ...dbUpdates };
              delete fallbackUpdates.room_or_link;
              delete fallbackUpdates.color_badge;
              if (updates.room !== undefined) fallbackUpdates.room = updates.room;
              if (updates.color !== undefined) fallbackUpdates.color = updates.color;
              await client.from('schedules').update(fallbackUpdates).eq('id', scheduleId);
            }
          },
          () => {}
        );
    }

    addActivityLog(
      currentUser?.name || 'Admin',
      currentRole,
      'Memperbarui Jadwal Pelajaran',
      `Jadwal ${updates.subject || 'pelajaran'} telah diperbarui.`,
      'class'
    );
  };

  const deleteSchedule = (scheduleId: string) => {
    const target = schedules.find((s) => s.id === scheduleId);
    setSchedules((prev) => {
      const updated = prev.filter((s) => s.id !== scheduleId);
      try { localStorage.setItem('remindtask_global_v5_schedules', JSON.stringify(updated)); } catch {}
      return updated;
    });

    const client = getSupabaseClient();
    if (client) {
      client.from('schedules').delete().eq('id', scheduleId).then(() => {}, () => {});
    }

    addActivityLog(
      currentUser?.name || 'Admin',
      currentRole,
      'Menghapus Jadwal Pelajaran',
      `Jadwal ${target?.subject || 'pelajaran'} (${target?.day || ''}) telah dihapus.`,
      'class'
    );
    showToast('Jadwal pelajaran berhasil dihapus.', 'info');
  };

  const sendScheduleReminderNotification = (day: DayOfWeek, scheduleId?: string) => {
    if (scheduleId) {
      const item = schedules.find((s) => s.id === scheduleId);
      if (item) {
        const title = `⏰ Pengingat Kelas (2 Jam Sebelum): ${item.subject}`;
        const msg = `Mata pelajaran/kuliah "${item.subject}" akan dimulai pukul ${item.startTime} WIB di ${item.room || 'ruang kelas'}. Pengampu: ${item.teacherName || 'Guru/Dosen'}.`;
        sendCustomNotification(title, msg, 'broadcast', item.classId, undefined, 'all');
      }
    } else {
      const dayList = schedules.filter((s) => s.classId === currentClass?.id && s.day === day);
      const title = `📅 Jadwal Pelajaran Hari ${day}`;
      const msg =
        dayList.length > 0
          ? `Jadwal hari ${day}: ` + dayList.map((s) => `${s.subject} (${s.startTime}-${s.endTime})`).join(', ')
          : `Tidak ada jadwal pelajaran untuk hari ${day}.`;
      sendCustomNotification(title, msg, 'broadcast', currentClass?.id, undefined, 'all');
    }
  };

  // Bank Soal & Ujian Actions
  const addQuestionBank = async (data: Omit<QuestionBankItem, 'id' | 'createdAt'>): Promise<QuestionBankItem> => {
    const newQB: QuestionBankItem = {
      ...data,
      id: 'qb-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setQuestionBanks((prev) => [newQB, ...prev]);

    const client = getSupabaseClient();
    if (client) {
      try {
        const payload: any = {
          id: newQB.id,
          class_id: newQB.classId,
          title: newQB.title,
          description: newQB.description || '',
          subject: newQB.subject || '',
          duration_minutes: newQB.durationMinutes || 0,
          time_limit_per_question_seconds: newQB.timeLimitPerQuestionSeconds || 0,
          status: newQB.status,
          questions: newQB.questions,
          total_questions: newQB.totalQuestions,
          total_points: newQB.totalPoints,
          created_by: newQB.createdBy,
          created_by_name: newQB.createdByName || currentUser?.name || 'Admin',
          created_at: newQB.createdAt,
          updated_at: newQB.updatedAt,
          quiz_type: newQB.quizType || 'bank_soal',
        };

        const res = await client.from('question_banks').insert(payload);
        if (res.error) {
          console.warn('Supabase question_banks insert error:', res.error);
          // Omit quiz_type and/or time_limit if they fail
          if (res.error.code === 'PGRST204' || (res.error.message && (res.error.message.includes('quiz_type') || res.error.message.includes('time_limit_per_question_seconds')))) {
            delete payload.quiz_type;
            delete payload.time_limit_per_question_seconds;
            const retryRes = await client.from('question_banks').insert(payload);
            if (retryRes.error) {
              console.warn('Supabase question_banks insert retry failed:', retryRes.error);
            }
          }
        }
      } catch (err) {
        console.warn('Supabase question_banks insert error:', err);
      }
    }

    addActivityLog(
      currentUser?.name || 'Admin',
      'admin',
      'Membuat Bank Soal',
      `Bank Soal "${newQB.title}" (${newQB.totalQuestions} soal) berhasil dibuat dengan status ${newQB.status === 'hidden' ? 'Persembunyian (Rahasia)' : 'Terbuka'}.`,
      'task'
    );

    if (newQB.status === 'published') {
      sendCustomNotification(
        `📝 Ujian/Kuis Baru: ${newQB.title}`,
        `Bank soal "${newQB.title}" (${newQB.totalQuestions} soal) kini telah dibuka dan dapat dikerjakan siswa.`,
        'task_assigned',
        newQB.classId,
        undefined,
        'member'
      );
    }

    showToast(
      newQB.status === 'hidden'
        ? `Bank Soal "${newQB.title}" disimpan di Persembunyian (Siswa belum dapat melihat).`
        : `Bank Soal "${newQB.title}" berhasil dibuka untuk siswa!`,
      'success'
    );

    return newQB;
  };

  const updateQuestionBank = async (id: string, updates: Partial<QuestionBankItem>) => {
    const updatedAt = new Date().toISOString();
    setQuestionBanks((prev) =>
      prev.map((qb) => (qb.id === id ? { ...qb, ...updates, updatedAt } : qb))
    );

    const client = getSupabaseClient();
    if (client) {
      try {
        const payload: any = { updated_at: updatedAt };
        if (updates.title) payload.title = updates.title;
        if (updates.description !== undefined) payload.description = updates.description;
        if (updates.subject !== undefined) payload.subject = updates.subject;
        if (updates.durationMinutes !== undefined) payload.duration_minutes = updates.durationMinutes;
        if (updates.timeLimitPerQuestionSeconds !== undefined) payload.time_limit_per_question_seconds = updates.timeLimitPerQuestionSeconds;
        if (updates.status) payload.status = updates.status;
        if (updates.quizType) payload.quiz_type = updates.quizType;
        if (updates.questions) {
          payload.questions = updates.questions;
          payload.total_questions = updates.questions.length;
          payload.total_points = updates.questions.reduce((sum, q) => sum + (q.points || 0), 0);
        }
        const res = await client.from('question_banks').update(payload).eq('id', id);
        if (res.error && (res.error.code === 'PGRST204' || (res.error.message && res.error.message.includes('time_limit_per_question_seconds')))) {
          delete payload.time_limit_per_question_seconds;
          await client.from('question_banks').update(payload).eq('id', id);
        }
      } catch (err) {
        console.warn('Supabase question_banks update error:', err);
      }
    }

    showToast('Perubahan bank soal berhasil disimpan.', 'success');
  };

  const toggleQuestionBankStatus = async (id: string) => {
    const target = questionBanks.find((qb) => qb.id === id);
    if (!target) return;

    const newStatus: QuizStatus = target.status === 'hidden' ? 'published' : 'hidden';
    const updatedAt = new Date().toISOString();

    setQuestionBanks((prev) =>
      prev.map((qb) => (qb.id === id ? { ...qb, status: newStatus, updatedAt } : qb))
    );

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('question_banks').update({ status: newStatus, updated_at: updatedAt }).eq('id', id);
      } catch (err) {
        console.warn('Supabase question_banks toggle error:', err);
      }
    }

    if (newStatus === 'published') {
      sendCustomNotification(
        `🔓 Soal Dibuka: ${target.title}`,
        `Guru/Admin telah membuka bank soal "${target.title}". Silakan buka menu Bank Soal & Ujian untuk mulai mengerjakan!`,
        'task_assigned',
        target.classId,
        undefined,
        'member'
      );
      showToast(`Soal "${target.title}" BERHASIL DIBUKA! Siswa sekarang dapat melihat dan mengerjakannya. 🚀`, 'success');
      playNotificationSound('chime');
    } else {
      showToast(`Soal "${target.title}" dipindahkan ke PERSEMBUNYIAN (Siswa tidak dapat melihat soal ini). 🔒`, 'info');
    }

    addActivityLog(
      currentUser?.name || 'Admin',
      'admin',
      'Ubah Status Bank Soal',
      `Bank Soal "${target.title}" diubah statusnya menjadi ${newStatus === 'published' ? 'Terbuka untuk Siswa' : 'Disimpan di Persembunyian'}.`,
      'task'
    );
  };

  const deleteQuestionBank = async (id: string) => {
    const target = questionBanks.find((qb) => qb.id === id);
    setQuestionBanks((prev) => prev.filter((qb) => qb.id !== id));
    setQuizSubmissions((prev) => prev.filter((qs) => qs.quizId !== id));

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('question_banks').delete().eq('id', id);
        await client.from('quiz_submissions').delete().eq('quiz_id', id);
      } catch (err) {
        console.warn('Supabase question_banks delete error:', err);
      }
    }

    showToast(`Bank soal "${target?.title || ''}" berhasil dihapus.`, 'info');
  };

  const submitQuizAnswers = async (
    quizId: string,
    answers: QuizSubmissionAnswer[],
    durationSecondsUsed = 0,
    overrideStudent?: { id: string; name: string; email?: string }
  ): Promise<QuizSubmission> => {
    const quiz = questionBanks.find((q) => q.id === quizId);
    const maxScore = quiz ? quiz.totalPoints || 100 : 100;

    let totalScore = 0;
    answers.forEach((ans) => {
      if (ans.type === 'pilihan_ganda') {
        const question = quiz?.questions.find((q) => q.id === ans.questionId);
        if (question && question.correctOptionIndex === ans.selectedOptionIndex) {
          ans.isCorrect = true;
          ans.pointsEarned = question.points;
          totalScore += question.points;
        } else {
          ans.isCorrect = false;
          ans.pointsEarned = 0;
        }
      } else if (ans.pointsEarned) {
        totalScore += ans.pointsEarned;
      }
    });

    const scorePercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    const studentId = overrideStudent?.id || currentUser?.id || 'member-guest';
    const studentName = overrideStudent?.name || currentUser?.name || 'Siswa';
    const studentEmail = overrideStudent?.email !== undefined ? overrideStudent.email : currentUser?.email;

    const newSub: QuizSubmission = {
      id: 'qsub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      quizId,
      classId: quiz?.classId || currentClass?.id || '',
      memberId: studentId,
      memberName: studentName,
      memberEmail: studentEmail,
      answers,
      totalScore,
      maxScore,
      scorePercentage,
      submittedAt: new Date().toISOString(),
      durationSecondsUsed,
    };

    setQuizSubmissions((prev) => [newSub, ...prev.filter((s) => !(s.quizId === quizId && s.memberId === newSub.memberId))]);

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('quiz_submissions').upsert({
          id: newSub.id,
          quiz_id: newSub.quizId,
          class_id: newSub.classId,
          member_id: newSub.memberId,
          member_name: newSub.memberName,
          member_email: newSub.memberEmail,
          answers: newSub.answers,
          total_score: newSub.totalScore,
          max_score: newSub.maxScore,
          score_percentage: newSub.scorePercentage,
          submitted_at: newSub.submittedAt,
          duration_seconds_used: newSub.durationSecondsUsed,
        }, { onConflict: 'id' });
      } catch (err) {
        console.warn('Supabase quiz_submissions upsert error:', err);
      }
    }

    addActivityLog(
      studentName,
      'member',
      'Mengerjakan Ujian/Kuis',
      `Siswa ${studentName} menyelesaikan ujian "${quiz?.title || 'Kuis'}" dengan skor ${totalScore}/${maxScore} (${scorePercentage}%).`,
      'submission'
    );

    if (!overrideStudent) {
      sendCustomNotification(
        `📥 Ujian Selesai: ${studentName}`,
        `Siswa ${studentName} telah mengumpulkan jawaban untuk "${quiz?.title || 'Ujian'}" (Skor: ${totalScore}/${maxScore}).`,
        'task_approved',
        newSub.classId,
        undefined,
        'admin'
      );
      playNotificationSound('success');
      showToast(`Jawaban berhasil dikumpulkan! Nilai Anda: ${totalScore}/${maxScore} (${scorePercentage}%). 🎉`, 'success');
    }

    return newSub;
  };

  // RemindQuiz Live Actions
  const createLiveQuiz = async (quizId: string, title: string): Promise<LiveQuiz> => {
    const newLQ: LiveQuiz = {
      id: 'lq-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      classId: currentClass?.id || currentUser?.classId || 'class-default',
      quizId,
      title,
      status: 'waiting',
      currentQuestionIndex: 0,
      createdAt: new Date().toISOString(),
    };

    setLiveQuizzes((prev) => [newLQ, ...prev.filter((x) => x.id !== newLQ.id)]);

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('live_quizzes').insert({
          id: newLQ.id,
          class_id: newLQ.classId,
          quiz_id: newLQ.quizId,
          title: newLQ.title,
          status: newLQ.status,
          current_question_index: newLQ.currentQuestionIndex,
          created_at: newLQ.createdAt,
        });
      } catch (err) {
        console.warn('Supabase live_quizzes insert error:', err);
      }
    }

    addActivityLog(
      currentUser?.name || 'Admin',
      'admin',
      'Memulai Kuis Live',
      `Kuis Live "${newLQ.title}" berhasil diluncurkan ke kelas.`,
      'task'
    );

    sendCustomNotification(
      `🎙️ Kuis Live Dimulai: ${newLQ.title}`,
      `Ayo bergabung ke Kuis Live "${newLQ.title}" sekarang!`,
      'broadcast',
      newLQ.classId,
      undefined,
      'member'
    );

    return newLQ;
  };

  const updateLiveQuizStatus = async (id: string, status: 'waiting' | 'active' | 'ended') => {
    setLiveQuizzes((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status, showAnswers: false, updatedAt: new Date().toISOString() } : x))
    );

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('live_quizzes').update({
          status,
          show_answers: false,
          updated_at: new Date().toISOString(),
        }).eq('id', id);
      } catch (err) {
        console.warn('Supabase live_quizzes update status error:', err);
      }
    }
  };

  const nextLiveQuizQuestion = async (id: string, newIndex: number) => {
    setLiveQuizzes((prev) =>
      prev.map((x) => (x.id === id ? { ...x, currentQuestionIndex: newIndex, showAnswers: false, updatedAt: new Date().toISOString() } : x))
    );

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('live_quizzes').update({
          current_question_index: newIndex,
          show_answers: false,
          updated_at: new Date().toISOString(),
        }).eq('id', id);
      } catch (err) {
        console.warn('Supabase live_quizzes next question error:', err);
      }
    }
  };

  const submitLiveQuizResponse = async (
    liveQuizId: string,
    questionIndex: number,
    selectedOptionIndex: number,
    isCorrect: boolean,
    pointsEarned: number,
    responseTimeMs: number,
    essayAnswer?: string
  ) => {
    const newLQR: LiveQuizResponse = {
      id: 'lqr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      liveQuizId,
      questionIndex,
      memberId: currentUser?.id || 'member-guest',
      memberName: currentUser?.name || 'Siswa',
      selectedOptionIndex: selectedOptionIndex === -1 ? undefined : selectedOptionIndex,
      essayAnswer,
      isCorrect,
      pointsEarned,
      responseTimeMs,
      createdAt: new Date().toISOString(),
    };

    setLiveQuizResponses((prev) => [
      newLQR,
      ...prev.filter((x) => !(x.liveQuizId === liveQuizId && x.memberId === newLQR.memberId && x.questionIndex === questionIndex)),
    ]);

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('live_quiz_responses').upsert({
          id: newLQR.id,
          live_quiz_id: liveQuizId,
          question_index: questionIndex,
          member_id: newLQR.memberId,
          member_name: newLQR.memberName,
          selected_option_index: selectedOptionIndex === -1 ? null : selectedOptionIndex,
          essay_answer: essayAnswer || null,
          is_correct: isCorrect,
          points_earned: pointsEarned,
          response_time_ms: responseTimeMs,
          created_at: newLQR.createdAt,
        }, { onConflict: 'live_quiz_id,member_id,question_index' });
      } catch (err) {
        console.warn('Supabase live_quiz_responses upsert error:', err);
      }
    }
  };

  const setLiveQuizShowAnswers = async (id: string, show: boolean) => {
    setLiveQuizzes((prev) =>
      prev.map((x) => (x.id === id ? { ...x, showAnswers: show, updatedAt: new Date().toISOString() } : x))
    );

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('live_quizzes').update({
          show_answers: show,
          updated_at: new Date().toISOString(),
        }).eq('id', id);
      } catch (err) {
        console.warn('Supabase live_quizzes set show_answers error:', err);
      }
    }
  };

  const setLiveQuizTimer = async (id: string, seconds: number) => {
    const endsAt = new Date(Date.now() + seconds * 1000).toISOString();
    setLiveQuizzes((prev) =>
      prev.map((x) => (x.id === id ? { ...x, activeQuestionEndsAt: endsAt, updatedAt: new Date().toISOString() } : x))
    );

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('live_quizzes').update({
          active_question_ends_at: endsAt,
          updated_at: new Date().toISOString(),
        }).eq('id', id);
      } catch (err) {
        console.warn('Supabase live_quizzes set timer error:', err);
      }
    }
  };

  const deleteLiveQuiz = async (id: string) => {
    setLiveQuizzes((prev) => prev.filter((x) => x.id !== id));
    setLiveQuizResponses((prev) => prev.filter((x) => x.liveQuizId !== id));

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('live_quizzes').delete().eq('id', id);
        await client.from('live_quiz_responses').delete().eq('live_quiz_id', id);
      } catch (err) {
        console.warn('Supabase live_quizzes delete error:', err);
      }
    }
  };

  // ==========================================
  // ABSENSI & PRESENSI DIGITAL KELAS (ANTI-SABOTASE)
  // ==========================================
  const createAttendanceSession = async (
    data: Omit<AttendanceSession, 'id' | 'createdAt' | 'secretToken'>
  ): Promise<AttendanceSession> => {
    const nowIso = new Date().toISOString();
    const newSession: AttendanceSession = {
      ...data,
      id: 'asess-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      secretToken: Math.random().toString(36).substring(2, 12) + Date.now().toString(36),
      createdAt: nowIso,
    };

    // Close any previous active sessions in the same class to prevent multiple concurrent active sessions
    setAttendanceSessions((prev) => {
      const closedPrev = prev.map((s) => {
        if ((s.classId === newSession.classId || (currentClass?.id && s.classId === currentClass.id)) && s.isActive) {
          return { ...s, isActive: false, endTime: nowIso };
        }
        return s;
      });
      const next = [newSession, ...closedPrev];
      attendanceSessionsRef.current = next;
      try {
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE_SESSIONS, JSON.stringify(next));
      } catch {}
      return next;
    });

    const client = getSupabaseClient();
    if (client) {
      try {
        // Deactivate previous active sessions for this class in remote database
        await client
          .from('attendance_sessions')
          .update({ is_active: false, end_time: nowIso })
          .eq('class_id', newSession.classId)
          .eq('is_active', true);

        await client.from('attendance_sessions').insert({
          id: newSession.id,
          class_id: newSession.classId,
          title: newSession.title,
          subject: newSession.subject || '',
          date: newSession.date,
          start_time: newSession.startTime,
          end_time: newSession.endTime || null,
          is_active: newSession.isActive,
          secret_token: newSession.secretToken,
          token_refresh_interval: newSession.tokenRefreshInterval || 15,
          require_location: newSession.requireLocation ?? false,
          latitude: newSession.latitude || null,
          longitude: newSession.longitude || null,
          radius_meters: newSession.radiusMeters || 100,
          created_by: newSession.createdBy,
          created_by_name: newSession.createdByName || currentUser?.name || 'Admin',
          created_at: newSession.createdAt,
        });
      } catch (err) {
        console.warn('Supabase attendance_sessions insert error:', err);
      }
    }

    sendCustomNotification(
      `📢 Sesi Presensi Dibuka: ${newSession.title}`,
      `Guru telah membuka sesi presensi digital "${newSession.title}"${newSession.subject ? ` (${newSession.subject})` : ''}. Silakan buka menu Absensi Kelas dan lakukan pemindaian Kode QR!`,
      'broadcast',
      newSession.classId,
      undefined,
      'member'
    );

    addActivityLog(
      currentUser?.name || 'Admin',
      'admin',
      'Buka Sesi Presensi',
      `Sesi presensi "${newSession.title}" (${newSession.subject || 'Umum'}) dibuka untuk kelas.`,
      'task'
    );

    showToast(`Sesi presensi "${newSession.title}" berhasil dibuka! Barcode siap ditampilkan.`, 'success');
    return newSession;
  };

  const closeAttendanceSession = async (sessionId: string) => {
    mutatingSessionActionsRef.current[sessionId] = 'closing';
    const endTime = new Date().toISOString();
    
    // 1. Immediately update React state, mutable ref, and localStorage
    setAttendanceSessions((prev) => {
      const next = prev.map((s) => (s.id === sessionId ? { ...s, isActive: false, endTime } : s));
      attendanceSessionsRef.current = next;
      try {
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE_SESSIONS, JSON.stringify(next));
      } catch {}
      return next;
    });

    // 2. Persist to Supabase in background
    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client
          .from('attendance_sessions')
          .update({ is_active: false, end_time: endTime })
          .eq('id', sessionId);
          
        if (error) {
          console.warn('Supabase close session warning:', error);
          // Try fallback upsert if the session record wasn't present on remote yet
          const localSession = attendanceSessionsRef.current.find((s) => s.id === sessionId);
          if (localSession) {
            await client.from('attendance_sessions').upsert({
              id: localSession.id,
              class_id: localSession.classId,
              title: localSession.title,
              subject: localSession.subject || '',
              date: localSession.date,
              start_time: localSession.startTime,
              end_time: endTime,
              is_active: false,
              secret_token: localSession.secretToken,
              token_refresh_interval: localSession.tokenRefreshInterval || 15,
              require_location: localSession.requireLocation ?? false,
              created_by: localSession.createdBy,
              created_by_name: localSession.createdByName || 'Admin',
              created_at: localSession.createdAt,
            }, { onConflict: 'id' });
          }
        }
      } catch (err: any) {
        console.warn('Supabase attendance_sessions close error:', err);
      } finally {
        setTimeout(() => {
          delete mutatingSessionActionsRef.current[sessionId];
        }, 3500);
      }
    } else {
      setTimeout(() => {
        delete mutatingSessionActionsRef.current[sessionId];
      }, 500);
    }

    showToast('Sesi presensi berhasil ditutup. Siswa tidak dapat lagi melakukan presensi mandiri.', 'info');
  };

  const reopenAttendanceSession = async (sessionId: string) => {
    mutatingSessionActionsRef.current[sessionId] = 'reopening';
    
    // 1. Immediately update React state, mutable ref, and localStorage
    setAttendanceSessions((prev) => {
      const next = prev.map((s) => (s.id === sessionId ? { ...s, isActive: true, endTime: undefined } : s));
      attendanceSessionsRef.current = next;
      try {
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE_SESSIONS, JSON.stringify(next));
      } catch {}
      return next;
    });

    // 2. Persist to Supabase in background
    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client
          .from('attendance_sessions')
          .update({ is_active: true, end_time: null })
          .eq('id', sessionId);
          
        if (error) {
          console.warn('Supabase reopen session warning:', error);
        }
      } catch (err: any) {
        console.warn('Supabase attendance_sessions reopen error:', err);
      } finally {
        setTimeout(() => {
          delete mutatingSessionActionsRef.current[sessionId];
        }, 3500);
      }
    } else {
      setTimeout(() => {
        delete mutatingSessionActionsRef.current[sessionId];
      }, 500);
    }

    showToast('Sesi presensi berhasil dibuka kembali! Barcode aktif.', 'success');
  };

  const deleteAttendanceSession = async (sessionId: string) => {
    mutatingSessionActionsRef.current[sessionId] = 'deleting';

    setAttendanceSessions((prev) => {
      const next = prev.filter((s) => s.id !== sessionId);
      attendanceSessionsRef.current = next;
      try {
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE_SESSIONS, JSON.stringify(next));
      } catch {}
      return next;
    });

    setAttendanceRecords((prev) => {
      const next = prev.filter((r) => r.sessionId !== sessionId);
      try {
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE_RECORDS, JSON.stringify(next));
      } catch {}
      return next;
    });

    const client = getSupabaseClient();
    if (client) {
      try {
        // Hapus child records terlebih dahulu untuk mencegah pelanggaran Foreign Key constraint
        await client.from('attendance_records').delete().eq('session_id', sessionId);
        await client.from('attendance_sessions').delete().eq('id', sessionId);
      } catch (err) {
        console.warn('Supabase attendance_sessions delete error:', err);
      } finally {
        setTimeout(() => {
          delete mutatingSessionActionsRef.current[sessionId];
        }, 3500);
      }
    } else {
      setTimeout(() => {
        delete mutatingSessionActionsRef.current[sessionId];
      }, 500);
    }

    showToast('Sesi presensi beserta seluruh rekapnya berhasil dihapus.', 'info');
  };

  const recordAttendance = async (
    sessionId: string,
    status: AttendanceStatus,
    method: AttendanceVerificationMethod,
    note?: string,
    verificationToken?: string,
    coords?: { lat: number; lng: number },
    overrideStudent?: { id: string; name: string; email?: string },
    proofFileUrl?: string,
    proofFileName?: string
  ): Promise<{ success: boolean; message: string }> => {
    let session = attendanceSessions.find((s) => s.id === sessionId);
    if (!session) {
      // Try to fetch session on the fly from Supabase
      const client = getSupabaseClient();
      if (client) {
        try {
          const sessRes = await client.from('attendance_sessions').select('*').eq('id', sessionId).maybeSingle();
          if (sessRes.data) {
            const s = sessRes.data;
            session = {
              id: s.id,
              classId: s.class_id,
              title: s.title,
              subject: s.subject || '',
              date: s.date || (s.created_at ? s.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
              startTime: s.start_time || s.created_at,
              endTime: s.end_time || undefined,
              isActive: s.is_active ?? true,
              secretToken: s.secret_token,
              tokenRefreshInterval: s.token_refresh_interval || 15,
              requireLocation: s.require_location ?? false,
              latitude: s.latitude ? Number(s.latitude) : undefined,
              longitude: s.longitude ? Number(s.longitude) : undefined,
              radiusMeters: s.radius_meters ? Number(s.radius_meters) : 100,
              createdBy: s.created_by,
              createdByName: s.created_by_name || 'Admin',
              createdAt: s.created_at || new Date().toISOString(),
            };
            setAttendanceSessions((prev) => [session!, ...prev.filter((x) => x.id !== session!.id)]);
          }
        } catch {}
      }
    }

    if (!session) {
      return { success: false, message: 'Sesi presensi tidak ditemukan atau belum dibuka.' };
    }

    if (!session.isActive && method !== 'manual_admin') {
      return { success: false, message: 'Sesi presensi ini telah ditutup oleh Guru/Admin.' };
    }

    const studentId = overrideStudent?.id || currentUser?.id || 'member-' + (currentUser?.username || 'guest');
    const studentName = overrideStudent?.name || currentUser?.name || 'Siswa';
    const studentEmail = overrideStudent?.email || currentUser?.email;

    // ANTI-SABOTASE 1: Cek apakah siswa sudah pernah absen di sesi ini (izinkan jika status sebelumnya 'alpa')
    const existing = attendanceRecords.find(
      (r) => r.sessionId === sessionId && r.studentId === studentId
    );
    if (existing && existing.status !== 'alpa' && method !== 'manual_admin') {
      return {
        success: false,
        message: `Anda sudah tercatat presensi sebelumnya dengan status: ${existing.status.toUpperCase()}.`,
      };
    }

    // ANTI-SABOTASE 2: Validasi Token Dinamis jika method adalah qr_scan atau rolling_token
    if ((method === 'qr_scan' || method === 'rolling_token') && verificationToken) {
      const tokenVerification = verifyAttendanceToken(verificationToken, session);
      if (!tokenVerification.isValid) {
        return { success: false, message: tokenVerification.message };
      }
    }

    // ANTI-SABOTASE 3: Geofence Validation (Strict GPS Location Check jika requireLocation aktif)
    let locationVerified = false;
    const hasSessionCoords = session.latitude !== undefined && session.longitude !== undefined && session.latitude !== 0 && session.longitude !== 0;
    if (status === 'hadir' && session.requireLocation && hasSessionCoords) {
      if (!coords || isNaN(coords.lat) || isNaN(coords.lng) || (coords.lat === 0 && coords.lng === 0)) {
        if (method === 'qr_scan' || method === 'rolling_token') {
          // Dinamis QR scan di depan layar proyektor membuktikan kehadiran fisik
          locationVerified = false;
        } else {
          return {
            success: false,
            message: 'Presensi ditolak! Sesi ini mewajibkan verifikasi lokasi GPS. Harap izinkan GPS pada peramban Anda.',
          };
        }
      } else {
        const dist = calculateDistanceMeters(coords.lat, coords.lng, session.latitude!, session.longitude!);
        const maxRadius = (session.radiusMeters || 100) + 50; // toleransi 50m untuk fluktuasi akurasi GPS smartphone
        if (dist > maxRadius) {
          return {
            success: false,
            message: `Presensi HADIR Ditolak! Terdeteksi berada di luar lokasi kelas (${Math.round(dist)}m dari kelas, batas maksimal ${session.radiusMeters || 100}m).`,
          };
        }
        locationVerified = true;
      }
    } else {
      locationVerified = true;
    }

    // Detect device info footprint
    const deviceInfo = `${navigator.platform || 'Device'} • ${window.screen.width}x${window.screen.height}`;

    const newRecord: AttendanceRecord = {
      id: existing?.id || ('arec-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6)),
      sessionId,
      classId: session.classId,
      studentId,
      studentName,
      studentEmail,
      status,
      checkInTime: new Date().toISOString(),
      deviceInfo,
      verificationMethod: method,
      note: note || '',
      proofFileUrl: proofFileUrl || undefined,
      proofFileName: proofFileName || undefined,
      locationVerified,
      createdAt: new Date().toISOString(),
    };

    setAttendanceRecords((prev) => [
      newRecord,
      ...prev.filter((r) => !(r.sessionId === sessionId && r.studentId === studentId)),
    ]);

    const client = getSupabaseClient();
    if (client) {
      try {
        const corePayload: any = {
          id: newRecord.id,
          session_id: newRecord.sessionId,
          class_id: newRecord.classId,
          student_id: newRecord.studentId,
          student_name: newRecord.studentName,
          student_email: newRecord.studentEmail || null,
          status: newRecord.status,
          check_in_time: newRecord.checkInTime,
          device_info: newRecord.deviceInfo || null,
          verification_method: newRecord.verificationMethod,
          note: newRecord.note || null,
          location_verified: newRecord.locationVerified,
          created_at: newRecord.createdAt,
        };

        const fullPayload: any = { ...corePayload };
        if (newRecord.proofFileUrl) fullPayload.proof_file_url = newRecord.proofFileUrl;
        if (newRecord.proofFileName) fullPayload.proof_file_name = newRecord.proofFileName;

        const res = await client
          .from('attendance_records')
          .upsert(fullPayload, { onConflict: 'session_id,student_id' });

        if (res.error) {
          // Jika kolom proof_file_* belum ada di skema database, fallback ke payload standar
          const retryRes = await client
            .from('attendance_records')
            .upsert(corePayload, { onConflict: 'session_id,student_id' });
          if (retryRes.error) {
            console.error('Supabase attendance_records upsert error:', retryRes.error);
          }
        }
      } catch (err) {
        console.warn('Supabase attendance_records upsert exception:', err);
      }
    }

    playNotificationSound('chime');
    showToast(`Presensi berhasil dicatat: ${status.toUpperCase()}!`, 'success');
    return { success: true, message: 'Presensi berhasil dicatat!' };
  };

  const updateAttendanceRecord = async (recordId: string, status: AttendanceStatus, note?: string) => {
    setAttendanceRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, status, note: note ?? r.note } : r))
    );

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('attendance_records').update({ status, note: note ?? null }).eq('id', recordId);
      } catch (err) {}
    }
    showToast('Status presensi siswa berhasil diperbarui.', 'success');
  };

  const deleteAttendanceRecord = async (recordId: string) => {
    setAttendanceRecords((prev) => prev.filter((r) => r.id !== recordId));
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('attendance_records').delete().eq('id', recordId);
      } catch (err) {}
    }
    showToast('Data presensi siswa dihapus.', 'info');
  };

  const refreshAttendance = async (sessionId?: string) => {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      // 1. Fetch the latest 50 sessions first
      const sessRes = await client.from('attendance_sessions').select('*').order('created_at', { ascending: false }).limit(50);
      
      // Lightweight check of ALL existing session IDs to prevent deleting older records from student's local history
      const allSessRes = await client.from('attendance_sessions').select('id');
      const allExistSessionIds = new Set<string>(
        Array.isArray(allSessRes.data) ? allSessRes.data.map((s: any) => s.id) : []
      );

      let activeSessionIds = new Set<string>();
      
      if (Array.isArray(sessRes.data)) {
        const mappedSessions: AttendanceSession[] = [];
        sessRes.data.forEach((s: any) => {
          const mutation = mutatingSessionActionsRef.current[s.id];
          if (mutation === 'deleting') return;

          const localSession = attendanceSessionsRef.current.find((x) => x.id === s.id);
          let finalIsActive: boolean;
          if (mutation === 'closing') {
            finalIsActive = false;
          } else if (mutation === 'reopening') {
            finalIsActive = true;
          } else {
            // Trust server state unless locally closed and not yet updated
            const dbActive = (s.is_active === true || s.is_active === 'true') && !s.end_time;
            finalIsActive = dbActive;
          }

          mappedSessions.push({
            id: s.id,
            classId: s.class_id,
            title: s.title,
            subject: s.subject || '',
            date: s.date || (s.created_at ? s.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
            startTime: s.start_time || s.created_at,
            endTime: s.end_time || (!finalIsActive ? localSession?.endTime : undefined),
            isActive: finalIsActive,
            secretToken: s.secret_token,
            tokenRefreshInterval: s.token_refresh_interval || 15,
            requireLocation: s.require_location ?? false,
            latitude: s.latitude ? Number(s.latitude) : undefined,
            longitude: s.longitude ? Number(s.longitude) : undefined,
            radiusMeters: s.radius_meters ? Number(s.radius_meters) : 100,
            createdBy: s.created_by,
            createdByName: s.created_by_name || 'Admin',
            createdAt: s.created_at || new Date().toISOString(),
          });
        });

        // Merge mappedSessions (latest 50) with previous local sessions that still exist (not deleted)
        setAttendanceSessions((prev) => {
          const map = new Map<string, AttendanceSession>();
          prev.forEach((s) => {
            if (allExistSessionIds.has(s.id)) {
              map.set(s.id, s);
            }
          });
          mappedSessions.forEach((s) => {
            map.set(s.id, s);
          });
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          try { localStorage.setItem(STORAGE_KEYS.ATTENDANCE_SESSIONS, JSON.stringify(merged)); } catch {}
          return merged;
        });

        activeSessionIds = allExistSessionIds;
      } else {
        activeSessionIds = new Set(attendanceSessionsRef.current.map((s) => s.id));
      }

      // 2. Fetch and update attendance records, filtering out orphans of deleted sessions
      let query = client.from('attendance_records').select('*').order('created_at', { ascending: false });
      if (sessionId) {
        query = query.eq('session_id', sessionId);
      } else {
        query = query.limit(200);
      }
      const res = await query;
      if (Array.isArray(res.data)) {
        const mapped: AttendanceRecord[] = res.data.map((r: any) => ({
          id: r.id,
          sessionId: r.session_id,
          classId: r.class_id,
          studentId: r.student_id,
          studentName: r.student_name,
          studentEmail: r.student_email || undefined,
          status: r.status,
          checkInTime: r.check_in_time || r.created_at,
          deviceInfo: r.device_info || undefined,
          verificationMethod: r.verification_method,
          note: r.note || undefined,
          proofFileUrl: r.proof_file_url || undefined,
          proofFileName: r.proof_file_name || undefined,
          locationVerified: r.location_verified ?? false,
          createdAt: r.created_at || new Date().toISOString(),
        }));
        
        setAttendanceRecords((prev) => {
          const map = new Map<string, AttendanceRecord>();
          // Only preserve previous records if their session still exists in the database
          prev.forEach((r) => {
            if (activeSessionIds.has(r.sessionId)) {
              map.set(`${r.sessionId}-${r.studentId}`, r);
            }
          });
          // Add/update fetched records if their session still exists in the database
          mapped.forEach((r) => {
            if (activeSessionIds.has(r.sessionId)) {
              map.set(`${r.sessionId}-${r.studentId}`, r);
            }
          });
          const filtered = Array.from(map.values());
          try { localStorage.setItem(STORAGE_KEYS.ATTENDANCE_RECORDS, JSON.stringify(filtered)); } catch {}
          return filtered;
        });
      }
    } catch (err) {
      console.warn('refreshAttendance failed:', err);
    }
  };

  const toggleAttendanceSession = async (sessionId: string) => {
    const session = attendanceSessions.find((s) => s.id === sessionId);
    if (!session) return;
    if (session.isActive) {
      await closeAttendanceSession(sessionId);
    } else {
      await reopenAttendanceSession(sessionId);
    }
  };

  const submitAttendance = async (data: {
    sessionId: string;
    status: AttendanceStatus;
    latitude?: number;
    longitude?: number;
    proofFileName?: string;
    proofFileUrl?: string;
    note?: string;
    verificationToken?: string;
  }): Promise<{ success: boolean; message: string }> => {
    const session = attendanceSessions.find((s) => s.id === data.sessionId);
    if (!session) {
      return { success: false, message: 'Sesi presensi tidak ditemukan.' };
    }
    if (!session.isActive) {
      return { success: false, message: 'Sesi presensi ini telah ditutup.' };
    }

    const studentId = currentUser?.id || 'guest-' + Date.now();
    const studentName = currentUser?.name || 'Siswa';
    const studentEmail = currentUser?.email;

    // Check existing
    const existing = attendanceRecords.find(
      (r) => r.sessionId === data.sessionId && r.studentId === studentId
    );
    if (existing) {
      return {
        success: false,
        message: `Anda sudah tercatat presensi sebelumnya (${existing.status.toUpperCase()}).`,
      };
    }

    // Geofencing verification (ANTI-SABOTASE LOKASI GPS)
    let distMeters: number | undefined = undefined;
    let withinRad: boolean | undefined = undefined;
    const hasSessionCoords = session.latitude !== undefined && session.longitude !== undefined && session.latitude !== 0 && session.longitude !== 0;

    if ((data.status === 'hadir' || session.requireLocation) && hasSessionCoords) {
      if (
        data.latitude === undefined ||
        data.longitude === undefined ||
        isNaN(data.latitude) ||
        isNaN(data.longitude) ||
        (data.latitude === 0 && data.longitude === 0)
      ) {
        return {
          success: false,
          message: 'Presensi HADIR ditolak! Lokasi GPS Anda tidak terdeteksi. Wajib mengaktifkan GPS lokasi perangkat Anda untuk presensi di kelas ini.',
        };
      }
      distMeters = calculateDistanceMeters(session.latitude!, session.longitude!, data.latitude, data.longitude);
      const maxRadius = session.radiusMeters || 100;
      withinRad = distMeters <= maxRadius;

      if (!withinRad) {
        return {
          success: false,
          message: `Presensi HADIR Ditolak! Terdeteksi berada di luar lokasi area kelas (${distMeters} meter dari kelas, batas maksimal radius ${maxRadius} meter). Terdeteksi potensi sabotase lokasi!`,
        };
      }
    } else if (session.latitude !== undefined && session.longitude !== undefined && data.latitude !== undefined && data.longitude !== undefined) {
      distMeters = calculateDistanceMeters(session.latitude, session.longitude, data.latitude, data.longitude);
      const maxRadius = session.radiusMeters || 100;
      withinRad = distMeters <= maxRadius;
    }

    const newRecord: AttendanceRecord = {
      id: 'arec-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      sessionId: data.sessionId,
      classId: session.classId,
      studentId,
      studentName,
      studentEmail,
      status: data.status,
      checkInTime: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      deviceInfo: `${navigator.platform || 'Device'} • ${window.screen.width}x${window.screen.height}`,
      verificationMethod: data.proofFileUrl ? 'permission_request' : 'qr_scan',
      note: data.note,
      proofFileName: data.proofFileName,
      proofFileUrl: data.proofFileUrl,
      distanceMeters: distMeters,
      isWithinRadius: withinRad,
      locationVerified: withinRad,
      createdAt: new Date().toISOString(),
    };

    setAttendanceRecords((prev) => [newRecord, ...prev.filter((r) => !(r.sessionId === data.sessionId && r.studentId === studentId))]);

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('attendance_records').upsert({
          id: newRecord.id,
          session_id: newRecord.sessionId,
          class_id: newRecord.classId,
          student_id: newRecord.studentId,
          student_name: newRecord.studentName,
          student_email: newRecord.studentEmail || null,
          status: newRecord.status,
          check_in_time: newRecord.checkInTime,
          device_info: newRecord.deviceInfo || null,
          verification_method: newRecord.verificationMethod,
          note: newRecord.note || null,
          location_verified: newRecord.locationVerified,
          created_at: newRecord.createdAt,
        });
      } catch (err) {
        console.warn('Supabase attendance record save error:', err);
      }
    }

    playNotificationSound('chime');
    return { success: true, message: `Presensi ${data.status.toUpperCase()} berhasil dikirim!` };
  };

  // Forum Actions
  const addForumPost = async (
    data: Omit<ForumPost, 'id' | 'createdAt' | 'likes' | 'likedBy' | 'comments'>
  ): Promise<ForumPost> => {
    const newPost: ForumPost = {
      ...data,
      id: 'post-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      likes: 0,
      likedBy: [],
      comments: [],
      createdAt: new Date().toISOString(),
    };

    setForumPosts((prev) => [newPost, ...prev]);

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('forum_posts').insert({
          id: newPost.id,
          class_id: newPost.classId,
          class_name: newPost.className || '',
          scope: newPost.scope,
          category: newPost.category,
          author_id: newPost.authorId,
          author_name: newPost.authorName,
          author_role: newPost.authorRole,
          author_avatar: newPost.authorAvatar || null,
          author_class: newPost.authorClass || null,
          title: newPost.title,
          content: newPost.content,
          price: newPost.price || null,
          contact: newPost.contact || null,
          image_url: newPost.imageUrl || null,
          image_file_name: newPost.imageFileName || null,
          tags: newPost.tags,
          likes: 0,
          liked_by: [],
          comments_count: 0,
          comments: [],
          created_at: newPost.createdAt,
        });
      } catch (err) {
        console.warn('Supabase forum_posts insert error:', err);
      }
    }

    addActivityLog(
      currentUser?.name || 'User',
      currentRole,
      'Postingan Forum Baru',
      `Membuat postingan di forum [${newPost.scope === 'global' ? 'Global' : 'Kelas'}]: "${newPost.title}"`,
      'class'
    );

    playNotificationSound('success');
    showToast('Postingan kamu berhasil dibagikan di Forum!', 'success');
    return newPost;
  };

  const likeForumPost = (postId: string) => {
    if (!currentUser) return;
    const userId = currentUser.id;

    setForumPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          const isLiked = post.likedBy?.includes(userId);
          const newLikedBy = isLiked
            ? (post.likedBy || []).filter((id) => id !== userId)
            : [...(post.likedBy || []), userId];
          const newLikes = newLikedBy.length;
          const updated = { ...post, likedBy: newLikedBy, likes: newLikes };

          if (!isLiked && post.authorId && post.authorId !== currentUser.id) {
            sendCustomNotification(
              '❤️ Suka Baru di Forum',
              `${currentUser.name} menyukai postingan Anda: "${post.title}"`,
              'system',
              post.classId,
              undefined,
              undefined,
              post.authorId
            );
          }

          const client = getSupabaseClient();
          if (client) {
            client
              .from('forum_posts')
              .update({ likes: newLikes, liked_by: newLikedBy })
              .eq('id', postId)
              .then(() => {}, () => {});
          }

          return updated;
        }
        return post;
      })
    );
  };

  const addForumComment = async (postId: string, content: string) => {
    const text = content.trim();
    if (!text || !currentUser) return;

    const newComment: ForumComment = {
      id: 'fcom-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentRole,
      authorAvatar: currentUser.avatar,
      content: text,
      createdAt: new Date().toISOString(),
    };

    setForumPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          const updatedComments = [...(post.comments || []), newComment];
          const updated = { ...post, comments: updatedComments };

          if (post.authorId && post.authorId !== currentUser.id) {
            sendCustomNotification(
              '💬 Komentar Baru di Forum',
              `${currentUser.name} mengomentari postingan Anda: "${text.length > 40 ? text.substring(0, 37) + '...' : text}"`,
              'system',
              post.classId,
              undefined,
              undefined,
              post.authorId
            );
          }

          const client = getSupabaseClient();
          if (client) {
            client
              .from('forum_posts')
              .update({
                comments: updatedComments,
                comments_count: updatedComments.length,
              })
              .eq('id', postId)
              .then(() => {}, () => {});
          }

          return updated;
        }
        return post;
      })
    );

    playNotificationSound('beep');
    showToast('Komentar berhasil dikirim!', 'success');
  };

  const deleteForumPost = async (postId: string) => {
    if (currentRole !== 'owner') {
      showToast('Hanya Owner Platform yang memiliki wewenang untuk menghapus postingan forum!', 'warn');
      return;
    }

    setForumPosts((prev) => prev.filter((p) => p.id !== postId));

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('forum_posts').delete().eq('id', postId);
      } catch (err) {}
    }

    showToast('Postingan forum berhasil dihapus oleh Owner.', 'info');
  };

  // Anonymous Wall Actions
  const addAnonymousMessage = async (
    data: Omit<AnonymousMessage, 'id' | 'createdAt' | 'likes' | 'likedByMe'>
  ): Promise<AnonymousMessage> => {
    const senderId = data.senderId || currentUser?.id || 'anon-' + Date.now();
    const senderName = data.senderName || currentUser?.name || 'Siswa Kelas';
    const senderEmail = data.senderEmail || currentUser?.email || undefined;
    const senderUsername = data.senderUsername || currentUser?.username || undefined;
    const senderRole = data.senderRole || currentUser?.role || 'member';

    const newMsg: AnonymousMessage = {
      ...data,
      id: 'anon-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      likes: 0,
      likedByMe: false,
      createdAt: new Date().toISOString(),
      senderId,
      senderName,
      senderEmail,
      senderUsername,
      senderRole,
    };

    setAnonymousMessages((prev) => {
      const updated = [newMsg, ...prev];
      try {
        localStorage.setItem('remindtask_global_v5_anon_messages', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    const client = getSupabaseClient();
    if (client) {
      const senderMeta = {
        __sender: {
          id: senderId,
          name: senderName,
          email: senderEmail,
          username: senderUsername,
          role: senderRole,
        },
      };

      const fullPayload = {
        id: newMsg.id,
        class_id: newMsg.classId,
        class_name: newMsg.className,
        message: newMsg.message,
        tag: newMsg.tag,
        alias: newMsg.alias,
        avatar_emoji: newMsg.avatarEmoji,
        card_gradient: newMsg.cardGradient,
        likes: 0,
        liked_by_users: [senderMeta],
        replies: [],
        is_pinned: false,
        sender_id: senderId,
        sender_name: senderName,
        sender_email: senderEmail,
        sender_username: senderUsername,
        sender_role: senderRole,
      };

      client
        .from('anonymous_wall')
        .insert(fullPayload)
        .then(
          (res: any) => {
            if (res && res.error) {
              const fallbackPayload = {
                id: newMsg.id,
                class_id: newMsg.classId,
                class_name: newMsg.className,
                message: newMsg.message,
                tag: newMsg.tag,
                alias: newMsg.alias,
                avatar_emoji: newMsg.avatarEmoji,
                card_gradient: newMsg.cardGradient,
                likes: 0,
                liked_by_users: [senderMeta],
                replies: [],
                is_pinned: false,
              };
              client.from('anonymous_wall').insert(fallbackPayload).then(() => {}, () => {});
            }
          },
          () => {}
        );
    }

    addActivityLog(
      'Siswa Anonim (' + newMsg.alias + ')',
      'member',
      'Pesan Anonymous Wall Baru',
      `Pesan anonim kategori [${newMsg.tag}] dikirim di ruang kelas ${newMsg.className}.`,
      'class'
    );

    // Notify class admin
    sendCustomNotification(
      `Pesan Anonim Baru: ${newMsg.tag}`,
      `Seorang siswa mengirim pesan anonim ("${newMsg.message.slice(0, 50)}...") di kelas ${newMsg.className}.`,
      'broadcast',
      newMsg.classId,
      undefined,
      'admin'
    );

    showToast('Pesan anonim kamu berhasil dipasang di Anonymous Wall!', 'success');
    playNotificationSound('success');
    return newMsg;
  };

  const likeAnonymousMessage = (messageId: string) => {
    try {
      const saved = localStorage.getItem('remindtask_liked_messages') || '[]';
      let likedIds: string[] = JSON.parse(saved);
      if (!Array.isArray(likedIds)) likedIds = [];

      const isAlreadyLiked = likedIds.includes(messageId);
      if (isAlreadyLiked) {
        likedIds = likedIds.filter((id) => id !== messageId);
      } else {
        likedIds.push(messageId);
      }
      localStorage.setItem('remindtask_liked_messages', JSON.stringify(likedIds));

      setAnonymousMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
            const newLikes = isAlreadyLiked ? Math.max(0, msg.likes - 1) : msg.likes + 1;
            const updated = { ...msg, likes: newLikes };

            const client = getSupabaseClient();
            if (client) {
              client.from('anonymous_wall').update({ likes: newLikes }).eq('id', messageId).then(() => {}, () => {});
            }

            return updated;
          }
          return msg;
        })
      );

      // Send instant notification on new like
      if (!isAlreadyLiked) {
        const targetMsg = anonymousMessages.find((m) => m.id === messageId);
        const snippet = (targetMsg?.message || '').slice(0, 45);
        sendCustomNotification(
          '❤️ Like Baru di Pesan Anonim',
          `Seseorang menyukai pesan anonim: "${snippet}${snippet.length >= 45 ? '...' : ''}"`,
          'system',
          targetMsg?.classId,
          undefined,
          'all'
        );
        sendBrowserPushNotification(
          '❤️ Like Baru di Pesan Anonim',
          `Seseorang menyukai pesan anonim: "${snippet}"`
        );
      }
    } catch (err) {
      console.warn('Like error:', err);
    }
  };

  const replyToAnonymousMessage = (messageId: string, replyText: string) => {
    addReplyToAnonymousMessage(messageId, replyText, {
      authorName: currentUser?.name || 'Admin Kelas',
      authorRole: 'admin',
      authorEmoji: '🛡️',
    });
  };

  const addReplyToAnonymousMessage = (
    messageId: string,
    replyText: string,
    options?: {
      authorName?: string;
      authorEmoji?: string;
      authorRole?: 'member' | 'admin' | 'owner';
      senderId?: string;
      realSenderName?: string;
      senderEmail?: string;
    }
  ) => {
    const text = replyText.trim();
    if (!text) return;

    const nowIso = new Date().toISOString();
    const role = options?.authorRole || currentRole || 'member';
    const authorName =
      options?.authorName?.trim() ||
      (role === 'owner' ? 'Owner Platform' : role === 'admin' ? currentUser?.name || 'Admin Kelas' : 'Siswa');
    const authorEmoji =
      options?.authorEmoji ||
      (role === 'owner' ? '👑' : role === 'admin' ? '🛡️' : '💬');

    const newReply: AnonymousReply = {
      id: 'reply-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      authorName,
      authorEmoji,
      authorRole: role,
      message: text,
      createdAt: nowIso,
      senderId: options?.senderId || currentUser?.id,
      realSenderName: options?.realSenderName || currentUser?.name || authorName,
      senderEmail: options?.senderEmail || currentUser?.email,
      senderRole: role,
    };

    const targetMsg = anonymousMessages.find((m) => m.id === messageId);

    setAnonymousMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId) {
          const currentReplies = Array.isArray(msg.replies) ? msg.replies : [];
          const updatedReplies = [...currentReplies, newReply];
          const updated = {
            ...msg,
            replies: updatedReplies,
            ...(role === 'admin' ? { replyFromAdmin: text, replyAt: nowIso } : {}),
          };

          const client = getSupabaseClient();
          if (client) {
            client
              .from('anonymous_wall')
              .update({
                replies: updatedReplies,
                ...(role === 'admin' ? { reply_from_admin: text, reply_at: nowIso } : {}),
              })
              .eq('id', messageId)
              .then(() => {}, () => {});
          }

          return updated;
        }
        return msg;
      })
    );

    // Send instant notification and browser push for anonymous wall reply
    const msgSnippet = (targetMsg?.message || '').slice(0, 35);
    sendCustomNotification(
      '💬 Komentar Baru di Pesan Anonim',
      `${authorName} menanggapi pesan "${msgSnippet}...": "${text.slice(0, 45)}"`,
      'chat',
      targetMsg?.classId,
      undefined,
      'all'
    );
    sendBrowserPushNotification(
      '💬 Komentar Baru di Pesan Anonim',
      `${authorName}: "${text.slice(0, 50)}"`
    );

    addActivityLog(
      authorName,
      role,
      'Menanggapi Pesan Anonim',
      `${authorName} (${role}) memberikan tanggapan pada Anonymous Wall: "${text.slice(0, 40)}..."`,
      'class'
    );

    showToast(`Tanggapan ${role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : 'kamu'} berhasil dikirim!`, 'success');
  };

  const togglePinAnonymousMessage = (messageId: string) => {
    setAnonymousMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId) {
          const nextPinned = !msg.isPinned;
          const updated = { ...msg, isPinned: nextPinned };
          const client = getSupabaseClient();
          if (client) {
            client.from('anonymous_wall').update({ is_pinned: nextPinned }).eq('id', messageId).then(() => {}, () => {});
          }
          return updated;
        }
        return msg;
      })
    );
    showToast('Status sematan pesan anonim diperbarui.', 'info');
  };

  const deleteAnonymousMessage = (messageId: string) => {
    const target = anonymousMessages.find((m) => m.id === messageId);
    setAnonymousMessages((prev) => prev.filter((m) => m.id !== messageId));

    const client = getSupabaseClient();
    if (client) {
      client.from('anonymous_wall').delete().eq('id', messageId).then(() => {}, () => {});
    }

    addActivityLog(
      currentUser?.name || 'Admin',
      currentRole,
      'Menghapus Pesan Anonim',
      `Pesan anonim dari ${target?.alias || 'Siswa'} telah dihapus.`,
      'class'
    );
    showToast('Pesan anonim berhasil dihapus.', 'info');
  };

  // Submissions: Direct Supabase insert and sync
  const submitTaskEvidence = (
    taskId: string,
    fileName = 'Tugas_Unggahan.pdf',
    note = '',
    fileUrl = '',
    fileSize = '1.8 MB'
  ) => {
    const memberId = currentUser?.id || 'member-guest';
    const memberName = currentUser?.name || 'Member Siswa';
    const task = tasks.find((t) => t.id === taskId);

    // Prevent submission if deadline has passed
    if (task && getTaskDeadlineStatus(task.dueDate).status === 'overdue') {
      showToast('Batas waktu pengumpulan tugas ini telah berakhir. Pengiriman berkas ditutup.', 'warn');
      return;
    }

    const existing = submissions.find((s) => s.taskId === taskId && s.memberId === memberId);

    const newSubmission: TaskSubmission = {
      id: existing ? existing.id : 'sub-' + Date.now(),
      taskId,
      classId: task?.classId || currentClass?.id || 'class-1',
      memberId,
      memberName,
      status: task?.requiresUpload ? 'pending_review' : 'completed',
      submittedAt: new Date().toISOString(),
      fileName,
      fileSize,
      fileUrl,
      submissionNote: note,
    };

    if (existing) {
      setSubmissions((prev) => prev.map((s) => (s.id === existing.id ? newSubmission : s)));
    } else {
      setSubmissions((prev) => [newSubmission, ...prev]);
    }

    const client = getSupabaseClient();
    if (client) {
      client
        .from('submissions')
        .upsert({
          id: newSubmission.id,
          task_id: newSubmission.taskId,
          class_id: newSubmission.classId,
          member_id: newSubmission.memberId,
          member_name: newSubmission.memberName,
          status: newSubmission.status,
          file_name: newSubmission.fileName,
          file_size: newSubmission.fileSize,
          file_url: newSubmission.fileUrl,
          submission_note: newSubmission.submissionNote,
          submitted_at: newSubmission.submittedAt,
        })
        .then(() => {}, () => {});
    }

    playNotificationSound('success');
    showToast('Tugas berhasil dikirim!', 'success');

    // Notify platform owner of new task submission
    fetch('/api/notify-owner-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionType: 'task_submission',
        title: `Siswa "${memberName}" Mengirimkan Tugas`,
        message: `Siswa ${memberName} baru saja mengirimkan bukti pengerjaan untuk tugas "${task?.title || 'Tugas'}" di kelas ${currentClass?.name || 'Utama'}.\n\nCatatan siswa:\n"${note || '-'}"\n\nTautan file bukti: ${fileUrl || '-'}`,
      }),
    }).catch(() => {});

    sendCustomNotification(
      'Unggahan Baru Menunggu Moderasi',
      `${memberName} mengunggah bukti pengerjaan untuk tugas "${task?.title || 'Tugas'}".`,
      'task_assigned',
      newSubmission.classId,
      newSubmission.taskId,
      'admin'
    );
  };

  const toggleTaskCompleteDirect = (taskId: string) => {
    const memberId = currentUser?.id || 'member-guest';
    const memberName = currentUser?.name || 'Member Siswa';
    const existing = submissions.find((s) => s.taskId === taskId && s.memberId === memberId);
    const client = getSupabaseClient();

    if (existing) {
      setSubmissions((prev) => prev.filter((s) => s.id !== existing.id));
      if (client) {
        client.from('submissions').delete().eq('id', existing.id).then(() => {}, () => {});
      }
      showToast('Status tugas dikembalikan menjadi belum selesai.', 'info');
    } else {
      const task = tasks.find((t) => t.id === taskId);

      // Prevent marking complete if deadline has passed
      if (task && getTaskDeadlineStatus(task.dueDate).status === 'overdue') {
        showToast('Batas waktu pengerjaan tugas telah berakhir. Tugas tidak dapat diselesaikan.', 'warn');
        return;
      }

      const newSub: TaskSubmission = {
        id: 'sub-' + Date.now(),
        taskId,
        classId: task?.classId || currentClass?.id || 'class-1',
        memberId,
        memberName,
        status: 'completed',
        submittedAt: new Date().toISOString(),
      };
      setSubmissions((prev) => [newSub, ...prev]);
      if (client) {
        client.from('submissions').upsert({
          id: newSub.id,
          task_id: newSub.taskId,
          class_id: newSub.classId,
          member_id: newSub.memberId,
          member_name: newSub.memberName,
          status: newSub.status,
          submitted_at: newSub.submittedAt,
        }).then(() => {}, () => {});
      }
      playNotificationSound('success');
      showToast('Tugas ditandai selesai! Kerja bagus!', 'success');
    }
  };

  const getMemberSubmissionForTask = (taskId: string, memberId?: string) => {
    const targetMemberId = memberId || currentUser?.id || 'member-guest';
    return submissions.find((s) => s.taskId === taskId && s.memberId === targetMemberId);
  };

  // Moderation
  const moderateSubmission = (
    submissionId: string,
    status: 'completed' | 'revision' | 'rejected',
    feedback?: string
  ) => {
    const reviewedAt = new Date().toISOString();
    const reviewedBy = currentUser?.name || 'Admin';

    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === submissionId
          ? {
              ...s,
              status,
              adminFeedback: feedback,
              reviewedAt,
              reviewedBy,
            }
          : s
      )
    );

    const client = getSupabaseClient();
    if (client) {
      client
        .from('submissions')
        .update({
          status,
          admin_feedback: feedback || '',
          reviewed_at: reviewedAt,
          reviewed_by: reviewedBy,
        })
        .eq('id', submissionId)
        .then(() => {}, () => {});
    }

    const sub = submissions.find((s) => s.id === submissionId);
    const task = tasks.find((t) => t.id === sub?.taskId);

    if (status === 'completed') {
      sendCustomNotification(
        'Tugas Disetujui! (Approved)',
        `Tugas "${task?.title || 'Tugas'}" Anda telah diverifikasi dan disetujui admin.`,
        'task_approved',
        sub?.classId,
        sub?.taskId,
        'member',
        sub?.memberId
      );
      sendBrowserPushNotification('Tugas Disetujui!', `Tugas ${task?.title} telah diverifikasi admin.`);
      showToast('Tugas berhasil disetujui (Approved).', 'success');
    } else if (status === 'revision') {
      sendCustomNotification(
        'Perlu Revisi Tugas',
        `Tugas "${task?.title || 'Tugas'}" memerlukan perbaikan. Catatan: ${feedback || 'Silakan cek revisi.'}`,
        'task_revision',
        sub?.classId,
        sub?.taskId,
        'member',
        sub?.memberId
      );
      showToast('Status tugas diubah menjadi Perlu Revisi.', 'warn');
    } else {
      showToast('Tugas ditolak.', 'info');
    }
  };

  // Notifications
  const sendCustomNotification = (
    title: string,
    message: string,
    type: NotificationItem['type'] = 'system',
    targetClassId?: string,
    targetTaskId?: string,
    targetRole: NotificationItem['targetRole'] = 'all',
    recipientId?: string
  ) => {
    const assignedClassId = targetClassId || (targetRole === 'member' ? currentClass?.id : undefined);
    const newNotif: NotificationItem = {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false,
      classId: assignedClassId,
      taskId: targetTaskId,
      targetRole,
      recipientId,
    };
    setNotifications((prev) => [newNotif, ...prev.filter((x) => x.id !== newNotif.id)]);
    const isTargetedToCurrentSession = () => {
      if (recipientId && (!currentUser || currentUser.id !== recipientId)) return false;
      if (targetRole === 'owner' && currentRole !== 'owner') return false;
      if (targetRole === 'admin' && currentRole !== 'admin') return false;
      if (targetRole === 'member' && currentRole !== 'member') return false;
      if (!currentRole && targetRole && targetRole !== 'all') return false;
      return true;
    };

    if (isTargetedToCurrentSession()) {
      setLiveBannerNotification(newNotif);
      playNotificationSoundOnce(newNotif.id, 'chime');
      sendBrowserPushNotification(title, message, newNotif.id);
    }

    const client = getSupabaseClient();
    if (client) {
      client
        .from('notifications')
        .insert({
          id: newNotif.id,
          title: newNotif.title,
          message: newNotif.message,
          type: newNotif.type,
          class_id: newNotif.classId || null,
          task_id: newNotif.taskId || null,
          target_role: newNotif.targetRole || 'all',
          recipient_id: newNotif.recipientId || null,
          read: false,
          timestamp: newNotif.timestamp,
          created_at: newNotif.timestamp,
        })
        .then(
          ({ error }) => {
            if (error) console.warn('Supabase notification insert warning:', error);
          },
          (err) => console.warn('Supabase notification insert rejected:', err)
        );
    }
  };

  const markNotificationAsRead = (id: string) => {
    setLiveBannerNotification((curr) => (curr?.id === id ? null : curr));
    const uId = currentUser?.id || 'guest';
    try {
      localStorage.setItem(`rt_read_notif_${uId}_${id}`, 'true');
      localStorage.setItem(`rt_read_notif_device_${id}`, 'true');
      localStorage.setItem(`rt_seen_ios_notif_${id}`, 'true');
    } catch {}

    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      try {
        localStorage.setItem(STORAGE_KEYS.NOTIFS, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Only update Supabase if it's a direct message specifically for currentUser
    const targetNotif = notifications.find((n) => n.id === id);
    if (targetNotif && targetNotif.recipientId && currentUser && targetNotif.recipientId === currentUser.id) {
      const client = getSupabaseClient();
      if (client) {
        client.from('notifications').update({ read: true }).eq('id', id).then(() => {}, () => {});
      }
    }
  };

  const markAllNotificationsAsRead = () => {
    setLiveBannerNotification(null);
    const activeClassId = currentClass?.id || currentUser?.classId;
    const activeClassCode = currentClass?.code;
    const uId = currentUser?.id || 'guest';
    const readIds: string[] = [];

    setNotifications((prev) => {
      const updated = prev.map((n) => {
        let isForMe = false;
        if (currentRole === 'owner') {
          isForMe = true;
        } else {
          const matchesMyClass =
            !n.classId ||
            (activeClassId && n.classId === activeClassId) ||
            (activeClassCode && n.classId === activeClassCode);
          if (matchesMyClass) {
            if (n.recipientId && currentUser && n.recipientId === currentUser.id) {
              isForMe = true;
            } else if (!n.recipientId) {
              if (currentRole === 'admin') {
                isForMe = n.targetRole === 'admin' || n.targetRole === 'all' || !n.targetRole || n.type === 'broadcast';
              } else if (currentRole === 'member') {
                isForMe = n.targetRole === 'member' || n.targetRole === 'all' || !n.targetRole;
              }
            }
          }
        }

        if (isForMe) {
          readIds.push(n.id);
          return { ...n, read: true };
        }
        return n;
      });

      try {
        localStorage.setItem(STORAGE_KEYS.NOTIFS, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      readIds.forEach((id) => {
        localStorage.setItem(`rt_read_notif_${uId}_${id}`, 'true');
        localStorage.setItem(`rt_read_notif_device_${id}`, 'true');
        localStorage.setItem(`rt_seen_ios_notif_${id}`, 'true');
      });
    } catch {}

    playNotificationSound('beep');
    showToast('Notifikasi berhasil ditandai telah dibaca di perangkat ini.', 'success');
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      try {
        localStorage.setItem(STORAGE_KEYS.NOTIFS, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      localStorage.removeItem(`rt_seen_ios_notif_${id}`);
    } catch {}

    const client = getSupabaseClient();
    if (client) {
      client.from('notifications').delete().eq('id', id).then(() => {}, (err) => console.warn('Supabase delete notification error:', err));
    }
    showToast('Notifikasi telah dihapus.', 'info');
  };

  const clearAllNotifications = (specificIds?: string[]) => {
    const activeClassId = currentClass?.id || currentUser?.classId;
    const idsToDelete: string[] = [];

    setNotifications((prev) => {
      const remaining: NotificationItem[] = [];
      prev.forEach((n) => {
        let isTargeted = false;
        if (specificIds && specificIds.length > 0) {
          isTargeted = specificIds.includes(n.id);
        } else if (currentRole === 'owner') {
          isTargeted = true;
        } else if (!n.classId || (activeClassId && n.classId === activeClassId)) {
          if (n.recipientId && currentUser && n.recipientId === currentUser.id) {
            isTargeted = true;
          } else if (!n.recipientId) {
            if (currentRole === 'admin') {
              isTargeted = n.targetRole === 'admin' || n.targetRole === 'all' || !n.targetRole || n.type === 'broadcast';
            } else if (currentRole === 'member') {
              isTargeted = n.targetRole === 'member' || n.targetRole === 'all' || !n.targetRole;
            }
          }
        }

        if (isTargeted) {
          idsToDelete.push(n.id);
        } else {
          remaining.push(n);
        }
      });

      try {
        localStorage.setItem(STORAGE_KEYS.NOTIFS, JSON.stringify(remaining));
      } catch {}
      return remaining;
    });

    idsToDelete.forEach((id) => {
      try {
        localStorage.removeItem(`rt_seen_ios_notif_${id}`);
      } catch {}
    });

    const client = getSupabaseClient();
    if (client && idsToDelete.length > 0) {
      if (currentRole === 'owner' && (!specificIds || specificIds.length === 0)) {
        client.from('notifications').delete().neq('id', '_none_').then(() => {}, () => {});
      } else {
        client.from('notifications').delete().in('id', idsToDelete).then(() => {}, () => {});
      }
    }

    playNotificationSound('beep');
    showToast('Seluruh notifikasi berhasil dihapus.', 'success');
  };

  const requestPushPermission = async () => {
    const res = await requestBrowserNotificationPermission();
    setPushPermission(res);
    if (res === 'granted') {
      showToast('Notifikasi push desktop aktif!', 'success');
      sendBrowserPushNotification(
        'RemindTask Notifikasi Aktif',
        'Kamu akan menerima pemberitahuan otomatis saat tugas mendekati tenggat waktu.'
      );
    } else {
      showToast('Izin notifikasi belum diberikan atau diblokir peramban.', 'warn');
    }
  };

  const sendTestPushAlert = () => {
    const title = 'Uji Coba Pengingat Tugas RemindTask';
    const msg = 'Notifikasi push dan suara pengingat sistem berfungsi dengan normal!';
    sendCustomNotification(title, msg, 'system', currentClass?.id, undefined, 'all');
    showToast('Notifikasi push uji coba berhasil dikirim!', 'success');
  };

  const sendBroadcastMessage = async (params: {
    title: string;
    message: string;
    target: 'class_members' | 'all' | 'admins_only';
    classId?: string;
  }) => {
    let targetClassId: string | undefined = undefined;
    let targetRole: NotificationItem['targetRole'] = 'all';

    if (params.target === 'class_members') {
      targetClassId = params.classId || currentClass?.id;
      targetRole = 'member';
    } else if (params.target === 'admins_only') {
      targetClassId = undefined;
      targetRole = 'admin';
    } else if (params.target === 'all') {
      targetClassId = undefined;
      targetRole = 'all';
    }

    const formattedTitle = params.title.startsWith(' ') ? params.title : `  ${params.title}`;
    sendCustomNotification(
      formattedTitle,
      params.message,
      'broadcast',
      targetClassId,
      undefined,
      targetRole
    );

    showToast('Broadcast pengumuman berhasil disiarkan!', 'success');
  };

  // Owner management: Suspend / Aktifkan User
  const toggleUserStatus = async (userId: string) => {
    let nextStatus: 'active' | 'suspended' = 'suspended';
    let targetName = 'Pengguna';

    const existingUser = users.find((u) => u.id === userId);
    if (existingUser) {
      nextStatus = existingUser.status === 'active' ? 'suspended' : 'active';
      targetName = existingUser.name;
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === userId) {
            return { ...u, status: nextStatus };
          }
          return u;
        })
      );
    } else {
      // If user came from class access logs and isn't in users state yet
      const foundInLogs = classAccessLogs.find((l) => l.studentId === userId);
      if (foundInLogs) {
        targetName = foundInLogs.studentName;
        nextStatus = 'suspended';
        const newUserObj: User = {
          id: userId,
          name: foundInLogs.studentName,
          email: foundInLogs.studentEmail,
          role: 'member',
          classId: foundInLogs.classId,
          className: foundInLogs.className,
          status: 'suspended',
          createdAt: foundInLogs.accessedAt,
        };
        setUsers((prev) => [...prev, newUserObj]);
      }
    }

    // Save to localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const exists = parsed.some((u: User) => u.id === userId);
          const updated = exists
            ? parsed.map((u: User) => (u.id === userId ? { ...u, status: nextStatus } : u))
            : [...parsed, { id: userId, name: targetName, role: 'member', status: nextStatus }];
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
        }
      }
      // Track suspended IDs
      const suspendedSet: string[] = JSON.parse(localStorage.getItem('rt_suspended_user_ids') || '[]');
      if (nextStatus === 'suspended') {
        if (!suspendedSet.includes(userId)) suspendedSet.push(userId);
      } else {
        const filtered = suspendedSet.filter((id) => id !== userId);
        localStorage.setItem('rt_suspended_user_ids', JSON.stringify(filtered));
      }
      if (nextStatus === 'suspended') {
        localStorage.setItem('rt_suspended_user_ids', JSON.stringify(suspendedSet));
      }
    } catch {}

    // Persist to Supabase profiles table
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('profiles').update({ status: nextStatus }).eq('id', userId);
      } catch (err) {
        console.warn('Supabase toggle status error:', err);
      }
    }

    addActivityLog(
      currentUser?.name || 'Owner',
      'owner',
      nextStatus === 'suspended' ? 'Tangguhkan Pengguna' : 'Aktifkan Pengguna',
      `Owner mengubah status akun ${targetName} menjadi ${
        nextStatus === 'suspended' ? 'Ditangguhkan (Suspended)' : 'Aktif'
      }`,
      'auth'
    );

    // If currently logged-in user got suspended, logout immediately
    if (currentUser?.id === userId && nextStatus === 'suspended') {
      logout();
      showToast('Akun Anda telah ditangguhkan oleh Owner Platform.', 'warn');
      return;
    }

    showToast(
      `Status ${targetName} berhasil diubah ke ${
        nextStatus === 'active' ? 'AKTIF' : 'DITANGGUHKAN'
      }!`,
      'success'
    );
  };

  const sendOwnerChatMessage = async (
    messageText: string,
    customSenderRole?: 'admin' | 'member',
    customSenderId?: string,
    customSenderName?: string
  ) => {
    if (!messageText.trim()) return;
    const activeClassId = currentClass?.id || currentUser?.classId || null;
    const activeClassName = currentClass?.name || currentUser?.className || null;
    
    const isOwnerAction = currentRole === 'owner';
    const sId = isOwnerAction ? (customSenderId || 'owner') : (currentUser?.id || 'guest');
    const sName = isOwnerAction ? (customSenderName || 'Owner') : (currentUser?.name || 'Siswa / Admin Anonim');
    const sRole = isOwnerAction ? (customSenderRole || 'member') : (currentRole === 'admin' ? 'admin' : 'member');

    const newChat: OwnerChatItem = {
      id: 'chat-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      senderId: sId,
      senderName: sName,
      senderRole: sRole as 'admin' | 'member',
      classId: activeClassId || undefined,
      className: activeClassName || undefined,
      message: messageText.trim(),
      isFromOwner: isOwnerAction,
      createdAt: new Date().toISOString(),
    };

    setOwnerChats((prev) => [...prev, newChat]);

    // Send realtime browser notification
    if (isOwnerAction) {
      sendCustomNotification(
        '💬 Pesan Baru dari Owner!',
        `"${messageText.length > 60 ? messageText.substring(0, 60) + '...' : messageText}"`,
        'system',
        undefined,
        undefined,
        undefined, // All
        sId // Specifically targeting the student/admin we are replying to
      );
    } else {
      sendCustomNotification(
        '💬 Chat Baru untuk Owner!',
        `Dari ${sName} (${sRole === 'admin' ? 'Admin' : 'Siswa'}): "${messageText.length > 60 ? messageText.substring(0, 60) + '...' : messageText}"`,
        'system',
        undefined,
        undefined,
        'owner'
      );
    }

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('owner_chats').insert({
          id: newChat.id,
          sender_id: newChat.senderId,
          sender_name: newChat.senderName,
          sender_role: newChat.senderRole,
          class_id: newChat.classId || null,
          class_name: newChat.className || null,
          message: newChat.message,
          is_from_owner: newChat.isFromOwner,
          created_at: newChat.createdAt,
        });
      } catch (err) {
        console.warn('Failed to insert owner chat to Supabase:', err);
      }
    }
  };

  const addFeedback = async (content: string) => {
    if (!content.trim()) return;
    const activeClassId = currentClass?.id || currentUser?.classId;
    const activeClassName = currentClass?.name || currentUser?.className;
    
    const newFb: FeedbackItem = {
      id: 'fb-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      senderId: currentUser?.id || 'guest',
      senderName: currentUser?.name || 'Siswa / Admin Anonim',
      senderRole: (currentRole === 'admin' ? 'admin' : 'member') as 'admin' | 'member',
      classId: activeClassId,
      className: activeClassName,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    setFeedbacks((prev) => [newFb, ...prev]);

    // Send a real-time notification to the Owner that a new feedback has arrived!
    sendCustomNotification(
      '💡 Kritik & Saran Baru!',
      `Dari ${newFb.senderName} (${newFb.senderRole === 'admin' ? 'Admin' : 'Siswa'}): "${content.length > 60 ? content.substring(0, 60) + '...' : content}"`,
      'system',
      undefined,
      undefined,
      'owner'
    );

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('feedbacks').insert({
          id: newFb.id,
          sender_id: newFb.senderId,
          sender_name: newFb.senderName,
          sender_role: newFb.senderRole,
          class_id: newFb.classId || null,
          class_name: newFb.className || null,
          content: newFb.content,
          created_at: newFb.createdAt,
        });
      } catch (err) {
        console.warn('Failed to insert feedback to Supabase:', err);
      }
    }
    showToast('Kritik & saran Anda berhasil dikirim langsung ke Owner!', 'success');
  };

  const deleteFeedback = async (feedbackId: string) => {
    setFeedbacks((prev) => prev.filter((f) => f.id !== feedbackId));
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('feedbacks').delete().eq('id', feedbackId);
      } catch (err) {
        console.warn('Failed to delete feedback from Supabase:', err);
      }
    }
    showToast('Kritik & saran berhasil dihapus dari daftar.', 'info');
  };

  const replyToFeedback = async (feedbackId: string, replyMessageText: string) => {
    if (!replyMessageText.trim()) return;
    const nowIso = new Date().toISOString();

    setFeedbacks((prev) =>
      prev.map((f) => {
        if (f.id === feedbackId) {
          return { ...f, replyMessage: replyMessageText.trim(), replyAt: nowIso };
        }
        return f;
      })
    );

    const client = getSupabaseClient();
    if (client) {
      try {
        await client
          .from('feedbacks')
          .update({
            reply_message: replyMessageText.trim(),
            reply_at: nowIso,
          })
          .eq('id', feedbackId);
      } catch (err) {
        console.warn('Failed to reply to feedback in Supabase:', err);
      }
    }

    // Send targeted notification to the sender
    const targetFeedback = feedbacks.find((f) => f.id === feedbackId);
    if (targetFeedback) {
      sendCustomNotification(
        '💌 Balasan Kritik & Saran dari Owner!',
        `Owner membalas saran Anda: "${replyMessageText.trim().slice(0, 50)}..."`,
        'system',
        targetFeedback.classId,
        undefined,
        targetFeedback.senderRole,
        targetFeedback.senderId
      );
    }

    showToast('Balasan kritik & saran berhasil dikirim!', 'success');
  };

  const loginAsStoredAccount = async (account: User): Promise<{ success: boolean; message: string }> => {
    // Check if account is suspended
    const matchedUser = users.find((u) => u.id === account.id || (u.email && account.email && u.email.toLowerCase() === account.email.toLowerCase()));
    if (account.status === 'suspended' || matchedUser?.status === 'suspended') {
      showToast('Akun ini sedang ditangguhkan oleh Owner Platform.', 'warn');
      return { success: false, message: 'Akun ini sedang ditangguhkan oleh Owner Platform.' };
    }

    setCurrentUser(account);
    if (account.classId) {
      setCurrentClassId(account.classId);
    }
    setActiveTab('dashboard');
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(account));
      if (account.classId) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_CLASS, account.classId);
      }
    } catch {}

    const client = getSupabaseClient();
    if (client && account.classId) {
      try {
        const { data: tasksData } = await client
          .from('tasks')
          .select('*')
          .eq('class_id', account.classId)
          .order('created_at', { ascending: false });

        if (Array.isArray(tasksData)) {
          const mappedTasks: Task[] = tasksData.map((t) => ({
            id: t.id,
            classId: t.class_id,
            title: t.title,
            description: t.description || '',
            dueDate: t.due_date,
            priority: t.priority,
            category: t.category,
            requiresUpload: t.requires_upload ?? true,
            createdAt: t.created_at,
            createdBy: t.created_by,
          }));
          setTasks(mappedTasks);
          localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(mappedTasks));
        }
      } catch {}
    }

    showToast(`Selamat datang kembali, ${account.name}!`, 'success');
    playNotificationSound('success');
    return { success: true, message: 'Berhasil masuk.' };
  };

  const removeStoredAccount = (accountId: string) => {
    setDeviceAccounts((prev) => {
      const filtered = prev.filter((acc) => acc.id !== accountId);
      try {
        localStorage.setItem('remindtask_device_accounts', JSON.stringify(filtered));
      } catch {}
      return filtered;
    });
    showToast('Akun berhasil dihapus dari perangkat ini.', 'info');
  };

  const updateSystemSettings = async (newSettings: Partial<SystemSettings>) => {
    if (newSettings.isMaintenance === true) {
      try {
        localStorage.removeItem('rt_maintenance_bypass');
      } catch {}
    }

    setSystemSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('remindtask_global_v5_system_settings', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    const client = getSupabaseClient();
    if (client) {
      try {
        const payloadToSave = {
          id: 'global_config',
          is_maintenance: newSettings.isMaintenance !== undefined ? newSettings.isMaintenance : systemSettings.isMaintenance,
          maintenance_title: newSettings.maintenanceTitle || systemSettings.maintenanceTitle,
          maintenance_message: newSettings.maintenanceMessage || systemSettings.maintenanceMessage,
          maintenance_estimate: newSettings.maintenanceEstimate || systemSettings.maintenanceEstimate,
          is_ai_maintenance: newSettings.isAiMaintenance !== undefined ? newSettings.isAiMaintenance : systemSettings.isAiMaintenance,
          ai_maintenance_title: newSettings.aiMaintenanceTitle || systemSettings.aiMaintenanceTitle,
          ai_maintenance_message: newSettings.aiMaintenanceMessage || systemSettings.aiMaintenanceMessage,
          ai_progress_percent: newSettings.aiProgressPercent !== undefined ? newSettings.aiProgressPercent : systemSettings.aiProgressPercent,
          updated_at: new Date().toISOString(),
        };

        await client.from('system_settings').upsert(payloadToSave);
      } catch (err) {
        console.warn('Supabase update system_settings error:', err);
      }
    }

    playNotificationSound('beep');
    showToast('Pengaturan pemeliharaan & sistem berhasil disimpan secara realtime!', 'success');
  };

  const resetToDefaultData = async () => {
    setClasses([]);
    setUsers(INITIAL_USERS);
    setTasks([]);
    setSubmissions([]);
    setNotifications([]);
    setCurrentClassId('');

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('remindtask_') || k.startsWith('rt_')) && k !== 'remindtask_supabase_config_v1') {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}

    const client = getSupabaseClient();
    if (client) {
      try {
        await Promise.all([
          client.from('submissions').delete().neq('id', '_none_'),
          client.from('notifications').delete().neq('id', '_none_'),
          client.from('tasks').delete().neq('id', '_none_'),
          client.from('classes').delete().neq('id', '_none_'),
          client.from('profiles').delete().neq('role', 'owner'),
        ]);
      } catch (err) {
        console.warn('Supabase reset warning:', err);
      }
    }
    showToast('Seluruh data demo & cache lokal/database berhasil dibersihkan total!', 'success');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        currentRole,
        currentClass,
        classes,
        tasks,
        submissions,
        notifications,
        schedules,
        anonymousMessages,
        activityLogs,
        unreadNotifCount,
        onlineUsersCount,
        pushPermission,
        theme,
        toggleTheme,
        activeTab,
        isNotificationDrawerOpen,
        toastMessage,
        isSupabaseConnected,
        isSupabaseModalOpen,
        isSyncing,
        setIsSupabaseModalOpen,
        syncWithSupabase,
        cleanStaleCacheAndSync,
        purgeObsoleteDatabaseCache,
        purgeOrphanedClasses,
        addActivityLog,
        clearActivityLogs,
        addAnonymousMessage,
        likeAnonymousMessage,
        replyToAnonymousMessage,
        addReplyToAnonymousMessage,
        togglePinAnonymousMessage,
        deleteAnonymousMessage,
        setActiveTab,
        setIsNotificationDrawerOpen,
        showToast,
        isNotificationReadLocally,
        loginAsOwner,
        loginAsAdmin,
        enterClassByCode,
        classAccessLogs,
        classChats,
        sendClassChatMessage,
        deleteClassChatMessage,
        clearChatThread,
        markClassChatsAsRead,
        registerAdmin,
        addAdminUser,
        checkUsernameAvailability,
        confirmAdminEducatorType,
        deleteAdminUser,
        deleteMemberUser,
        logout,
        switchRoleQuick,
        updateMemberProfile,
        updateUserProfile,
        updateUserDirect,
        selectClass,
        createClass,
        deleteClass,
        addTask,
        updateTask,
        deleteTask,
        materials,
        addMaterial,
        updateMaterial,
        deleteMaterial,
        addSchedule,
        updateSchedule,
        deleteSchedule,
        sendScheduleReminderNotification,
        submitTaskEvidence,
        toggleTaskCompleteDirect,
        getMemberSubmissionForTask,
        moderateSubmission,
        requestPushPermission,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        clearAllNotifications,
        sendCustomNotification,
        sendBroadcastMessage,
        sendTestPushAlert,
        toggleUserStatus,
        users,
        resetToDefaultData,
        liveBannerNotification,
        setLiveBannerNotification,
        feedbacks,
        addFeedback,
        deleteFeedback,
        replyToFeedback,
        ownerChats,
        sendOwnerChatMessage,
        deviceAccounts,
        loginAsStoredAccount,
        removeStoredAccount,
        systemSettings,
        updateSystemSettings,
        questionBanks,
        quizSubmissions,
        addQuestionBank,
        updateQuestionBank,
        toggleQuestionBankStatus,
        deleteQuestionBank,
        submitQuizAnswers,
        liveQuizzes,
        liveQuizResponses,
        createLiveQuiz,
        updateLiveQuizStatus,
        nextLiveQuizQuestion,
        submitLiveQuizResponse,
        setLiveQuizShowAnswers,
        setLiveQuizTimer,
        deleteLiveQuiz,
        attendanceSessions,
        attendanceRecords,
        createAttendanceSession,
        toggleAttendanceSession,
        closeAttendanceSession,
        reopenAttendanceSession,
        deleteAttendanceSession,
        submitAttendance,
        recordAttendance,
        updateAttendanceRecord,
        deleteAttendanceRecord,
        refreshAttendance,
        forumPosts,
        addForumPost,
        likeForumPost,
        addForumComment,
        deleteForumPost,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
