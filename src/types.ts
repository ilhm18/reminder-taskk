export type UserRole = 'owner' | 'admin' | 'member';
export type EducatorType = 'dosen' | 'guru' | 'pengurus_mahasiswa' | 'pengurus_sekolah';

export interface User {
  id: string;
  name: string;
  username?: string;
  email?: string;
  password?: string;
  role: UserRole;
  educatorType?: EducatorType;
  classId?: string;
  className?: string;
  status: 'active' | 'suspended';
  avatar?: string;
  createdAt: string;
}

export interface ClassItem {
  id: string;
  code: string;
  name: string;
  adminId: string;
  adminName: string;
  educatorType?: EducatorType;
  description?: string;
  memberCount: number;
  accessCountToday: number;
  totalDeviceAccesses?: number;
  createdAt: string;
}

export type TaskPriority = 'tinggi' | 'sedang' | 'rendah';
export type TaskCategory = 'Tugas Mandiri' | 'Tugas Kelompok' | 'Kuis' | 'Proyek' | 'Praktikum';

export type MaterialCategory =
  | 'Modul / PDF'
  | 'Slide Presentasi'
  | 'Video Pembelajaran'
  | 'Catatan / Ringkasan'
  | 'Tautan / Referensi'
  | 'Latihan Soal';

export interface ClassMaterial {
  id: string;
  classId: string;
  title: string;
  description: string;
  category: MaterialCategory;
  fileName?: string;
  fileSize?: string;
  fileUrl?: string;
  externalLink?: string;
  createdAt: string;
  authorName: string;
  tags?: string[];
}

export interface Task {
  id: string;
  classId: string;
  title: string;
  description: string;
  dueDate: string; // ISO string e.g. "2026-10-02T17:00:00"
  priority: TaskPriority;
  category: TaskCategory;
  requiresUpload: boolean;
  createdAt: string;
  createdBy: string;
}

export type SubmissionStatus = 'completed' | 'pending_review' | 'revision' | 'rejected';

export interface TaskSubmission {
  id: string;
  taskId: string;
  classId: string;
  memberId: string;
  memberName: string;
  status: SubmissionStatus;
  submittedAt: string;
  fileName?: string;
  fileSize?: string;
  fileUrl?: string;
  submissionNote?: string;
  adminFeedback?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'task_assigned' | 'deadline_soon' | 'task_overdue' | 'task_approved' | 'task_revision' | 'system' | 'broadcast' | 'chat';
  timestamp: string;
  read: boolean;
  classId?: string;
  taskId?: string;
  targetRole?: 'member' | 'admin' | 'owner' | 'all';
  recipientId?: string;
}

export interface DailyReportData {
  date: string;
  formattedDate: string;
  className: string;
  classCode: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completionRate: number;
  activeMembersCount: number;
  topPerformers: { name: string; completedCount: number; onTimeRate: number }[];
  urgentTasks: { title: string; dueDate: string; priority: TaskPriority }[];
}

export interface ActivityLogItem {
  id: string;
  actorName: string;
  actorRole: UserRole | 'system';
  action: string;
  details: string;
  category: 'admin' | 'class' | 'task' | 'auth' | 'submission' | 'system';
  timestamp: string;
}

// Jadwal Pelajaran / Mata Kuliah
export type DayOfWeek = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu';

export interface ScheduleItem {
  id: string;
  classId: string;
  subject: string; // Nama Pelajaran / Mata Kuliah
  day: DayOfWeek;
  startTime: string; // e.g. "08:00"
  endTime: string; // e.g. "09:40"
  room?: string; // e.g. "Lab 2" / "R. 301"
  teacherName?: string; // e.g. "Dra. Siti Rahmawati"
  color?: string;
  notes?: string;
  createdAt: string;
}

// Virtual Pet Companion
export type PetType = 'cat' | 'fox' | 'panda' | 'bunny' | 'dragon';

export interface VirtualPetData {
  id: string;
  petType: PetType;
  name: string;
  level: number;
  xp: number;
  maxXp: number;
  hunger: number; // 0-100
  happiness: number; // 0-100
  cleanliness: number; // 0-100
  energy: number; // 0-100
  coins: number;
  equippedAccessory?: string;
  unlockedAccessories: string[];
  stage: 'baby' | 'teen' | 'master';
  lastInteraction: string;
}

// Anonymous Wall
export type AnonymousTag = 'Aspirasi' | 'Curhat' | 'Masukan' | 'Semangat' | 'Tanya' | 'Ide';

export interface AnonymousReply {
  id: string;
  authorName: string;
  authorEmoji?: string;
  authorRole: 'member' | 'admin' | 'owner';
  message: string;
  createdAt: string;
  senderId?: string;
  realSenderName?: string;
  senderEmail?: string;
  senderRole?: 'member' | 'admin' | 'owner';
}

export interface AnonymousMessage {
  id: string;
  classId: string;
  className: string;
  message: string;
  tag: AnonymousTag;
  alias: string;
  avatarEmoji: string;
  cardGradient: string;
  likes: number;
  likedByMe?: boolean;
  replyFromAdmin?: string;
  replyAt?: string;
  replies?: AnonymousReply[];
  isPinned?: boolean;
  createdAt: string;
  senderId?: string;
  senderName?: string;
  senderEmail?: string;
  senderUsername?: string;
  senderRole?: string;
}

export interface FeedbackItem {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'admin' | 'member';
  classId?: string;
  className?: string;
  content: string;
  replyMessage?: string;
  replyAt?: string;
  createdAt: string;
}

export interface OwnerChatItem {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'admin' | 'member';
  classId?: string;
  className?: string;
  message: string;
  isFromOwner: boolean;
  createdAt: string;
}

export interface SystemSettings {
  isMaintenance: boolean;
  maintenanceTitle: string;
  maintenanceMessage: string;
  maintenanceEstimate: string;
  isAiMaintenance: boolean;
  aiMaintenanceTitle: string;
  aiMaintenanceMessage: string;
  aiProgressPercent: number;
}

export interface ClassAccessLog {
  id: string;
  classId: string;
  className: string;
  classCode: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  accessedAt: string;
  deviceInfo?: string;
}

export interface ClassChatItem {
  id: string;
  classId: string;
  senderId: string;
  senderName: string;
  senderRole: 'admin' | 'member' | 'owner';
  recipientId: string;
  recipientName: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export type QuestionType = 'pilihan_ganda' | 'essay';
export type QuizStatus = 'hidden' | 'published';

export interface QuestionItem {
  id: string;
  type: QuestionType;
  questionText: string;
  options?: string[];
  correctOptionIndex?: number;
  essayAnswerKey?: string;
  points: number;
}

export interface QuestionBankItem {
  id: string;
  classId: string;
  title: string;
  description?: string;
  subject?: string;
  durationMinutes: number;
  timeLimitPerQuestionSeconds?: number; // 0 or undefined = tanpa batas waktu per soal
  status: QuizStatus;
  questions: QuestionItem[];
  totalQuestions: number;
  totalPoints: number;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface QuizSubmissionAnswer {
  questionId: string;
  type: QuestionType;
  selectedOptionIndex?: number;
  essayAnswerText?: string;
  isCorrect?: boolean;
  pointsEarned?: number;
}

export interface QuizSubmission {
  id: string;
  quizId: string;
  classId: string;
  memberId: string;
  memberName: string;
  memberEmail?: string;
  answers: QuizSubmissionAnswer[];
  totalScore: number;
  maxScore: number;
  scorePercentage: number;
  submittedAt: string;
  durationSecondsUsed?: number;
}

export type AttendanceStatus = 'hadir' | 'izin' | 'sakit' | 'alpa';
export type AttendanceVerificationMethod = 'qr_scan' | 'rolling_token' | 'manual_admin' | 'permission_request' | 'photo_proof';

export interface AttendanceSession {
  id: string;
  classId: string;
  className?: string;
  code?: string;
  title: string;
  subject?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO
  endTime?: string; // ISO
  isActive: boolean;
  secretToken: string; // Seed for dynamic rolling token
  tokenRefreshInterval: number; // In seconds (default: 15)
  requireLocation?: boolean;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number; // e.g. 100 meters
  createdBy: string;
  createdByName?: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  classId: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  status: AttendanceStatus;
  checkInTime: string;
  timestamp?: string;
  deviceInfo?: string;
  verificationMethod: AttendanceVerificationMethod;
  note?: string;
  proofFileUrl?: string;
  proofFileName?: string;
  distanceMeters?: number;
  isWithinRadius?: boolean;
  locationVerified?: boolean;
  createdAt: string;
}

// Forum Types
export type ForumCategory = 'semua' | 'umum' | 'diskusi' | 'tanya_jawab' | 'materi' | 'informasi' | 'jasa' | 'karya';

export interface ForumComment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: 'admin' | 'member' | 'owner';
  authorAvatar?: string;
  content: string;
  createdAt: string;
}

export interface ForumPost {
  id: string;
  classId: string;
  className?: string;
  scope: 'class' | 'global';
  category: ForumCategory;
  authorId: string;
  authorName: string;
  authorRole: 'admin' | 'member' | 'owner';
  authorAvatar?: string;
  authorClass?: string;
  title: string;
  content: string;
  price?: string;
  contact?: string;
  imageUrl?: string;
  imageFileName?: string;
  tags: string[];
  likes: number;
  likedBy: string[];
  comments: ForumComment[];
  createdAt: string;
}

// RemindQuiz Live
export interface LiveQuiz {
  id: string;
  classId: string;
  quizId: string;
  title: string;
  status: 'waiting' | 'active' | 'ended';
  currentQuestionIndex: number;
  activeQuestionEndsAt?: string;
  showAnswers?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface LiveQuizResponse {
  id: string;
  liveQuizId: string;
  questionIndex: number;
  memberId: string;
  memberName: string;
  selectedOptionIndex?: number;
  essayAnswer?: string;
  isCorrect?: boolean;
  pointsEarned?: number;
  responseTimeMs?: number;
  createdAt: string;
}


