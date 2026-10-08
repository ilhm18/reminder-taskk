import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'remindtask_supabase_config_v1';

// Default Supabase Credentials so ALL devices automatically connect to the same server!
export const DEFAULT_SUPABASE_URL = 'https://wlxfjilmfjpgmeshznab.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndseGZqaWxtZmpwZ21lc2h6bmFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NTIwOTksImV4cCI6MjEwNjQyODA5OX0.9_hdZ3qS08s2vR2JToOu2Te0bjkWzXUoLoYcZrRRb2U';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
}

export function getStoredSupabaseConfig(): SupabaseConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey) {
        return {
          url: parsed.url,
          anonKey: parsed.anonKey,
          isConnected: true,
        };
      }
    }
  } catch {
    // fallback
  }

  // Check Vite environment variables if defined, otherwise use user's project credentials as default
  const envUrl =
    (import.meta as unknown as { env?: { VITE_SUPABASE_URL?: string } }).env?.VITE_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;
  const envKey =
    (import.meta as unknown as { env?: { VITE_SUPABASE_ANON_KEY?: string } }).env?.VITE_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY;

  // Persist default configuration to localStorage so it stays permanent on this device
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        url: envUrl,
        anonKey: envKey,
        isConnected: true,
      })
    );
  } catch {}

  return {
    url: envUrl,
    anonKey: envKey,
    isConnected: true,
  };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  const config: SupabaseConfig = {
    url: url.trim(),
    anonKey: anonKey.trim(),
    isConnected: true,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  if (cachedClient && lastUrl === config.url && lastKey === config.anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
      },
    });
    lastUrl = config.url;
    lastKey = config.anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Gagal menginisialisasi Supabase client:', err);
    return null;
  }
}

export async function testSupabaseConnection(
  url: string,
  anonKey: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
      return { success: false, message: 'URL Supabase harus berformat: https://[project-id].supabase.co' };
    }
    if (!anonKey || anonKey.length < 20) {
      return { success: false, message: 'Anon Key Supabase tidak valid.' };
    }

    const testClient = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
    // Ping by checking table or auth health
    const { error } = await testClient.from('classes').select('id').limit(1);

    if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
      return { success: false, message: `Koneksi gagal: ${error.message}` };
    }

    return {
      success: true,
      message:
        error?.code === '42P01'
          ? 'Terhubung ke Supabase! (Catatan: Tabel belum dibuat, silakan jalankan SQL Script di tab 3).'
          : 'Koneksi ke Supabase berhasil dan database aktif global!',
    };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, message: error.message || 'Gagal menghubungi server Supabase.' };
  }
}

/**
 * Complete & Robust SQL Schema script to run in Supabase SQL Editor
 * Enables global sync across all devices, real-time channels, and full RLS policies.
 */
export const SUPABASE_SQL_SCHEMA = `-- ====================================================
-- SKEMA BASIS DATA GLOBAL REMINDTASK (SUPABASE POSTGRESQL)
-- Salin dan jalankan seluruh query ini di:
-- Dashboard Supabase -> SQL Editor -> New Query -> Run
-- ====================================================

-- 1. Buat Tabel Profil Pengguna (Owner, Admin, Member)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  password TEXT DEFAULT 'password123',
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  educator_type TEXT DEFAULT 'guru',
  class_id TEXT,
  class_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrasi Keamanan & Skema: Hapus constraint dan tambahkan kolom educator_type
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_key;
DROP INDEX IF EXISTS public.profiles_email_unique_idx;
DROP INDEX IF EXISTS profiles_email_idx;
DROP INDEX IF EXISTS public.profiles_email_idx;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS educator_type TEXT DEFAULT 'guru';

-- Seed Akun Owner Utama (Terhubung langsung dengan database SQL)
INSERT INTO public.profiles (id, name, email, password, role, status)
VALUES ('owner-ilham', 'Ilham (Owner)', 'ilhamramaaadan18@gmail.com', 'ilhaM@1810', 'owner', 'active')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, role = EXCLUDED.role, status = EXCLUDED.status;

-- 2. Buat Tabel Kelas (Diakses Global oleh Seluruh Perangkat)
CREATE TABLE IF NOT EXISTS public.classes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  admin_id TEXT NOT NULL,
  admin_name TEXT NOT NULL,
  educator_type TEXT DEFAULT 'guru',
  description TEXT,
  member_count INT DEFAULT 0,
  access_count_today INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.classes ADD COLUMN IF NOT EXISTS educator_type TEXT DEFAULT 'guru';

-- 3. Buat Tabel Tugas
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('tinggi', 'sedang', 'rendah')),
  category TEXT NOT NULL CHECK (category IN ('Tugas Mandiri', 'Tugas Kelompok', 'Kuis', 'Proyek', 'Praktikum')),
  requires_upload BOOLEAN DEFAULT TRUE,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Buat Tabel Bukti Pengerjaan (Submissions)
CREATE TABLE IF NOT EXISTS public.submissions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('completed', 'pending_review', 'revision', 'rejected')),
  file_name TEXT,
  file_size TEXT,
  file_url TEXT,
  submission_note TEXT,
  admin_feedback TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4B. Buat Tabel Materi & Modul Pembelajaran (Class Materials)
CREATE TABLE IF NOT EXISTS public.materials (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  file_name TEXT,
  file_size TEXT,
  file_url TEXT,
  external_link TEXT,
  author_name TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Buat Tabel Notifikasi & Broadcast Realtime
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  class_id TEXT,
  task_id TEXT,
  target_role TEXT DEFAULT 'all',
  recipient_id TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrasi Keamanan untuk kolom notifikasi jika tabel sudah ada sebelumnya
ALTER TABLE IF EXISTS public.notifications ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE IF EXISTS public.notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE IF EXISTS public.notifications ADD COLUMN IF NOT EXISTS target_role TEXT DEFAULT 'all';
ALTER TABLE IF EXISTS public.notifications ADD COLUMN IF NOT EXISTS recipient_id TEXT;
ALTER TABLE IF EXISTS public.notifications ADD COLUMN IF NOT EXISTS class_id TEXT;
ALTER TABLE IF EXISTS public.notifications ADD COLUMN IF NOT EXISTS task_id TEXT;

-- 6. Buat Tabel Jadwal Pelajaran / Mata Kuliah
CREATE TABLE IF NOT EXISTS public.schedules (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  day TEXT NOT NULL CHECK (day IN ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu')),
  subject TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  teacher_name TEXT,
  room_or_link TEXT,
  notes TEXT,
  color_badge TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kompatibilitas Kolom Jadwal
ALTER TABLE IF EXISTS public.schedules ADD COLUMN IF NOT EXISTS room_or_link TEXT;
ALTER TABLE IF EXISTS public.schedules ADD COLUMN IF NOT EXISTS color_badge TEXT;
ALTER TABLE IF EXISTS public.schedules ADD COLUMN IF NOT EXISTS room TEXT;
ALTER TABLE IF EXISTS public.schedules ADD COLUMN IF NOT EXISTS color TEXT;

-- 7. Buat Tabel Anonymous Wall (Pesan Anonim Kelas)
CREATE TABLE IF NOT EXISTS public.anonymous_wall (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  class_name TEXT DEFAULT 'Ruang Kelas',
  message TEXT NOT NULL,
  tag TEXT DEFAULT 'Aspirasi',
  alias TEXT DEFAULT 'Siswa Anonim',
  avatar_emoji TEXT DEFAULT '🎭',
  card_gradient TEXT DEFAULT 'from-purple-900/40 to-pink-900/30',
  likes INT DEFAULT 0,
  liked_by_users JSONB DEFAULT '[]'::jsonb,
  replies JSONB DEFAULT '[]'::jsonb,
  is_pinned BOOLEAN DEFAULT FALSE,
  reply_from_admin TEXT,
  reply_at TIMESTAMPTZ,
  sender_id TEXT,
  sender_name TEXT,
  sender_email TEXT,
  sender_username TEXT,
  sender_role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alias untuk kompatibilitas
CREATE TABLE IF NOT EXISTS public.anonymous_messages (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  class_name TEXT DEFAULT 'Ruang Kelas',
  message TEXT NOT NULL,
  tag TEXT DEFAULT 'Aspirasi',
  alias TEXT DEFAULT 'Siswa Anonim',
  avatar_emoji TEXT DEFAULT '🎭',
  card_gradient TEXT,
  likes INT DEFAULT 0,
  liked_by_users JSONB DEFAULT '[]'::jsonb,
  replies JSONB DEFAULT '[]'::jsonb,
  is_pinned BOOLEAN DEFAULT FALSE,
  reply_from_admin TEXT,
  reply_at TIMESTAMPTZ,
  sender_id TEXT,
  sender_name TEXT,
  sender_email TEXT,
  sender_username TEXT,
  sender_role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.anonymous_wall ADD COLUMN IF NOT EXISTS replies JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.anonymous_messages ADD COLUMN IF NOT EXISTS replies JSONB DEFAULT '[]'::jsonb;

-- Kolom Identitas Pengirim Asli untuk Moderasi Owner
ALTER TABLE IF EXISTS public.anonymous_wall ADD COLUMN IF NOT EXISTS sender_id TEXT;
ALTER TABLE IF EXISTS public.anonymous_wall ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE IF EXISTS public.anonymous_wall ADD COLUMN IF NOT EXISTS sender_email TEXT;
ALTER TABLE IF EXISTS public.anonymous_wall ADD COLUMN IF NOT EXISTS sender_username TEXT;
ALTER TABLE IF EXISTS public.anonymous_wall ADD COLUMN IF NOT EXISTS sender_role TEXT DEFAULT 'member';

ALTER TABLE IF EXISTS public.anonymous_messages ADD COLUMN IF NOT EXISTS sender_id TEXT;
ALTER TABLE IF EXISTS public.anonymous_messages ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE IF EXISTS public.anonymous_messages ADD COLUMN IF NOT EXISTS sender_email TEXT;
ALTER TABLE IF EXISTS public.anonymous_messages ADD COLUMN IF NOT EXISTS sender_username TEXT;
ALTER TABLE IF EXISTS public.anonymous_messages ADD COLUMN IF NOT EXISTS sender_role TEXT DEFAULT 'member';

-- 8. Buat Tabel Kritik & Saran (Feedback)
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'member')),
  class_id TEXT,
  class_name TEXT,
  content TEXT NOT NULL,
  reply_message TEXT,
  reply_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tambahkan kolom jika tabel sudah ada sebelumnya
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS reply_message TEXT;
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS reply_at TIMESTAMPTZ;

-- 9. Buat Tabel Chat Dengan Owner Platform
CREATE TABLE IF NOT EXISTS public.owner_chats (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'member')),
  class_id TEXT,
  class_name TEXT,
  message TEXT NOT NULL,
  is_from_owner BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Buat Tabel Pengaturan & Maintenance Sistem (Global System Settings)
CREATE TABLE IF NOT EXISTS public.system_settings (
  id TEXT PRIMARY KEY DEFAULT 'global_config',
  is_maintenance BOOLEAN DEFAULT FALSE,
  maintenance_title TEXT DEFAULT 'Pemeliharaan Server & Pembaruan Sistem',
  maintenance_message TEXT DEFAULT 'Kami sedang melakukan peningkatan infrastruktur dan optimalisasi database Supabase untuk menghadirkan performa terbaik. Mohon bersabar, kami akan segera kembali.',
  maintenance_estimate TEXT DEFAULT 'Segera selesai dalam beberapa saat',
  is_ai_maintenance BOOLEAN DEFAULT TRUE,
  ai_maintenance_title TEXT DEFAULT 'AI Assistant Sedang Bersiap!',
  ai_maintenance_message TEXT DEFAULT 'Fitur AI Assistant sedang dalam tahap pengembangan developer, mohon ditunggu ya! Kami sedang mematangkan asisten bimbingan belajar cerdas terbaik untuk Anda.',
  ai_progress_percent INT DEFAULT 85,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Buat Tabel Chat Langsung Admin & Siswa Kelas (Class Member Chats)
CREATE TABLE IF NOT EXISTS public.class_chats (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'member', 'owner')),
  recipient_id TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_class_chats_class_id ON public.class_chats(class_id);
CREATE INDEX IF NOT EXISTS idx_class_chats_recipient_id ON public.class_chats(recipient_id);
CREATE INDEX IF NOT EXISTS idx_class_chats_sender_id ON public.class_chats(sender_id);

-- 12. Buat Tabel Riwayat Akses Kode Kelas (Class Access Logs)
CREATE TABLE IF NOT EXISTS public.class_access_logs (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  class_name TEXT,
  class_code TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_email TEXT NOT NULL,
  device_info TEXT DEFAULT 'Desktop/Laptop',
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Buat Tabel Audit Log Aktivitas Sistem (Activity Logs)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id TEXT PRIMARY KEY,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  category TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(timestamp DESC);

-- 14. Buat Tabel Bank Soal & Ujian (Question Banks)
CREATE TABLE IF NOT EXISTS public.question_banks (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  duration_minutes INTEGER DEFAULT 30,
  time_limit_per_question_seconds INTEGER DEFAULT 0, -- Batas waktu per butir soal (0 = bebas tanpa batas waktu)
  status TEXT DEFAULT 'hidden', -- 'hidden' = di persembunyian, 'published' = dibuka untuk siswa
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_questions INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 100,
  created_by TEXT NOT NULL,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrasi Keamanan: Tambah kolom time_limit_per_question_seconds jika tabel sudah dibuat sebelumnya
ALTER TABLE IF EXISTS public.question_banks ADD COLUMN IF NOT EXISTS time_limit_per_question_seconds INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_question_banks_class ON public.question_banks(class_id);
CREATE INDEX IF NOT EXISTS idx_question_banks_status ON public.question_banks(status);

-- 15. Buat Tabel Hasil Pengerjaan Siswa (Quiz Submissions)
CREATE TABLE IF NOT EXISTS public.quiz_submissions (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES public.question_banks(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  member_email TEXT,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_score NUMERIC(5,2) DEFAULT 0,
  max_score NUMERIC(5,2) DEFAULT 100,
  score_percentage NUMERIC(5,2) DEFAULT 0,
  duration_seconds_used INTEGER DEFAULT 0,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_submissions_quiz_member ON public.quiz_submissions(quiz_id, member_id);

-- 16. Buat Tabel Sesi Absensi Kelas (Attendance Sessions)
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT,
  date TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  secret_token TEXT NOT NULL,
  token_refresh_interval INTEGER DEFAULT 15,
  require_location BOOLEAN DEFAULT false,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  radius_meters INTEGER DEFAULT 100,
  created_by TEXT NOT NULL,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class ON public.attendance_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_active ON public.attendance_sessions(is_active);

-- 17. Buat Tabel Rekap Kehadiran Siswa (Attendance Records)
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_email TEXT,
  status TEXT NOT NULL DEFAULT 'hadir',
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  device_info TEXT,
  verification_method TEXT NOT NULL DEFAULT 'qr_scan',
  note TEXT,
  location_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_session_student UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_class ON public.attendance_records(class_id);

ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 18. Buat Tabel Postingan Forum (Class & Global)
CREATE TABLE IF NOT EXISTS public.forum_posts (
  id TEXT PRIMARY KEY,
  class_id TEXT,
  class_name TEXT,
  scope TEXT NOT NULL DEFAULT 'class',
  category TEXT NOT NULL DEFAULT 'diskusi',
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  author_avatar TEXT,
  author_class TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  price TEXT,
  contact TEXT,
  image_url TEXT,
  image_file_name TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  likes INT DEFAULT 0,
  liked_by JSONB DEFAULT '[]'::jsonb,
  comments_count INT DEFAULT 0,
  comments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrasi Keamanan untuk kolom forum_posts jika tabel sudah dibuat sebelumnya
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS liked_by JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS likes INT DEFAULT 0;
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS comments_count INT DEFAULT 0;

-- ====================================================
-- AKTIFKAN ROW LEVEL SECURITY (RLS) PENUH DENGAN AKSES PUBLIK
-- ====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_wall ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses publik profil" ON public.profiles;
DROP POLICY IF EXISTS "Akses publik kelas" ON public.classes;
DROP POLICY IF EXISTS "Akses publik tugas" ON public.tasks;
DROP POLICY IF EXISTS "Akses publik materi" ON public.materials;
DROP POLICY IF EXISTS "Akses publik pengumpulan" ON public.submissions;
DROP POLICY IF EXISTS "Akses publik notifikasi" ON public.notifications;
DROP POLICY IF EXISTS "Akses publik jadwal" ON public.schedules;
DROP POLICY IF EXISTS "Akses publik wall" ON public.anonymous_wall;
DROP POLICY IF EXISTS "Akses publik pesan anonim" ON public.anonymous_messages;
DROP POLICY IF EXISTS "Akses publik feedback" ON public.feedbacks;
DROP POLICY IF EXISTS "Akses publik chat owner" ON public.owner_chats;
DROP POLICY IF EXISTS "Akses publik system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Akses publik class chats" ON public.class_chats;
DROP POLICY IF EXISTS "Akses publik class access logs" ON public.class_access_logs;
DROP POLICY IF EXISTS "Akses publik activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Akses publik question banks" ON public.question_banks;
DROP POLICY IF EXISTS "Akses publik quiz submissions" ON public.quiz_submissions;
DROP POLICY IF EXISTS "Akses publik attendance sessions" ON public.attendance_sessions;
DROP POLICY IF EXISTS "Akses publik attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Akses publik forum posts" ON public.forum_posts;

CREATE POLICY "Akses publik profil" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik kelas" ON public.classes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik tugas" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik materi" ON public.materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik pengumpulan" ON public.submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik notifikasi" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik jadwal" ON public.schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik wall" ON public.anonymous_wall FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik pesan anonim" ON public.anonymous_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik feedback" ON public.feedbacks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik chat owner" ON public.owner_chats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik system settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik class chats" ON public.class_chats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik class access logs" ON public.class_access_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik activity logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik question banks" ON public.question_banks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik quiz submissions" ON public.quiz_submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik attendance sessions" ON public.attendance_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik attendance records" ON public.attendance_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik forum posts" ON public.forum_posts FOR ALL USING (true) WITH CHECK (true);

-- ====================================================
-- AKTIFKAN REALTIME REPLICATION & REPLICA IDENTITY FULL
-- (SANGAT PENTING: Mendorong Notifikasi & Tugas Seketika ke Seluruh HP / Perangkat Global)
-- ====================================================
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.classes REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.materials REPLICA IDENTITY FULL;
ALTER TABLE public.submissions REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.schedules REPLICA IDENTITY FULL;
ALTER TABLE public.anonymous_wall REPLICA IDENTITY FULL;
ALTER TABLE public.anonymous_messages REPLICA IDENTITY FULL;
ALTER TABLE public.feedbacks REPLICA IDENTITY FULL;
ALTER TABLE public.owner_chats REPLICA IDENTITY FULL;
ALTER TABLE public.system_settings REPLICA IDENTITY FULL;
ALTER TABLE public.class_chats REPLICA IDENTITY FULL;
ALTER TABLE public.class_access_logs REPLICA IDENTITY FULL;
ALTER TABLE public.activity_logs REPLICA IDENTITY FULL;
ALTER TABLE public.question_banks REPLICA IDENTITY FULL;
ALTER TABLE public.quiz_submissions REPLICA IDENTITY FULL;
ALTER TABLE public.attendance_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.attendance_records REPLICA IDENTITY FULL;
ALTER TABLE public.forum_posts REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.classes; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.materials; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.anonymous_wall; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.anonymous_messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.feedbacks; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.owner_chats; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.class_chats; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.class_access_logs; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_posts; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.question_banks; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_submissions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_sessions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
`;
