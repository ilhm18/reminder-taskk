import React, { useState } from 'react';
import { Database, ExternalLink, Key, RefreshCw, Sparkles, Terminal, X, Zap, Copy, CheckCircle2 } from 'lucide-react';
import {
  clearSupabaseConfig,
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  SUPABASE_SQL_SCHEMA,
  testSupabaseConnection,
} from '../../services/supabase';
import { playNotificationSound } from '../../utils/notification';

interface SupabaseTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectedChange?: () => void;
}

export const SupabaseTutorialModal: React.FC<SupabaseTutorialModalProps> = ({
  isOpen,
  onClose,
  onConnectedChange,
}) => {
  const currentConfig = getStoredSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url || '');
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedOwnerSql, setCopiedOwnerSql] = useState(false);
  const [activeStepTab, setActiveStepTab] = useState<'tutorial' | 'koneksi' | 'sql' | 'owner_tutor'>('owner_tutor');

  // Custom Owner SQL Generator fields
  const [customOwnerName, setCustomOwnerName] = useState('Owner RemindTask');
  const [customOwnerEmail, setCustomOwnerEmail] = useState('');
  const [customOwnerPass, setCustomOwnerPass] = useState('');

  if (!isOpen) return null;

  const generatedOwnerSql = `-- Jalankan query ini di Supabase SQL Editor:
-- 1. Tambahkan kolom password dan kolom penting jika tabel profiles lama belum memilikinya:
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'password123';
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS class_id TEXT;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS class_name TEXT;

-- 2. Pastikan kolom email unik agar dapat di-update (ON CONFLICT):
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_key'
  ) THEN
    BEGIN
      ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
    EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 3. Masukkan / Perbarui Akun Owner:
INSERT INTO public.profiles (id, name, email, password, role, status)
VALUES (
  'owner-' || substr(md5(random()::text), 1, 8),
  '${customOwnerName.replace(/'/g, "''") || 'Owner RemindTask'}',
  '${customOwnerEmail.trim().toLowerCase().replace(/'/g, "''") || 'owner@domain.com'}',
  '${customOwnerPass.replace(/'/g, "''") || 'password123'}',
  'owner',
  'active'
)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  role = 'owner',
  status = 'active';`;

  const handleCopyOwnerSql = () => {
    navigator.clipboard.writeText(generatedOwnerSql);
    setCopiedOwnerSql(true);
    playNotificationSound('beep');
    setTimeout(() => setCopiedOwnerSql(false), 3000);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    playNotificationSound('beep');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);
    const result = await testSupabaseConnection(url.trim(), anonKey.trim());
    setIsTesting(false);
    setTestResult(result);
    if (result.success) {
      saveSupabaseConfig(url.trim(), anonKey.trim());
      playNotificationSound('success');
      if (onConnectedChange) onConnectedChange();
    }
  };

  const handleDisconnect = () => {
    clearSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setTestResult({ success: true, message: 'Koneksi Supabase dicabut. Aplikasi kembali ke mode penyimpanan lokal.' });
    if (onConnectedChange) onConnectedChange();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[#141126] border border-[#2e2652] rounded-3xl p-6 shadow-2xl overflow-hidden relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#261f42]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-white text-lg">Panduan & Integrasi Supabase</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  PostgreSQL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Setup database online gratis dan hubungkan ke RemindTask secara langsung
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#25203f] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selector */}
        <div className="flex items-center gap-2 mt-4 pb-2 border-b border-[#231d3d] overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveStepTab('owner_tutor')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeStepTab === 'owner_tutor'
                ? 'bg-gradient-to-r from-amber-500 to-pink-600 text-white shadow-lg shadow-amber-500/20'
                : 'text-amber-300 hover:text-white hover:bg-[#1e173a]'
            }`}
          >
            <span>  Tutorial Akun Owner</span>
          </button>
          <button
            onClick={() => setActiveStepTab('tutorial')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeStepTab === 'tutorial'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-[#1e173a]'
            }`}
          >
            1. Tutorial Database Supabase
          </button>
          <button
            onClick={() => setActiveStepTab('koneksi')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeStepTab === 'koneksi'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-[#1e173a]'
            }`}
          >
            2. Hubungkan URL & Key API
          </button>
          <button
            onClick={() => setActiveStepTab('sql')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeStepTab === 'sql'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-[#1e173a]'
            }`}
          >
            3. Skrip SQL Tabel Lengkap
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-xs">
          {/* TAB 0: TUTORIAL BUAT AKUN OWNER */}
          {activeStepTab === 'owner_tutor' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 space-y-1">
                <span className="font-bold text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Anda Memiliki Kendali Penuh Atas Akun Owner
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Semua cache akun demo lama telah dibersihkan. Sekarang Anda bisa mendaftarkan email & password akun Owner sesuka Anda langsung dari database Supabase Anda sendiri!
                </p>
              </div>

              {/* METODE 1: SQL GENERATOR OTOMATIS */}
              <div className="p-4 rounded-2xl bg-[#1b1535] border border-[#2f2455] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-black flex items-center justify-center text-xs font-bold">1</span>
                    Metode Cepat: Generator Query SQL Owner
                  </span>
                  <span className="text-[10px] text-amber-400 font-semibold">Tinggal Salin & Run</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  Ketik nama, email, dan password yang Anda inginkan di bawah ini. Skrip SQL akan otomatis terbuat:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Nama Owner
                    </label>
                    <input
                      type="text"
                      value={customOwnerName}
                      onChange={(e) => setCustomOwnerName(e.target.value)}
                      placeholder="Nama Anda"
                      className="w-full bg-[#100d20] border border-[#3b2e63] focus:border-amber-400 rounded-xl px-3 py-2 text-white text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Email Login Owner
                    </label>
                    <input
                      type="email"
                      value={customOwnerEmail}
                      onChange={(e) => setCustomOwnerEmail(e.target.value)}
                      placeholder="emailanda@gmail.com"
                      className="w-full bg-[#100d20] border border-[#3b2e63] focus:border-amber-400 rounded-xl px-3 py-2 text-white text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Password Login Owner
                    </label>
                    <input
                      type="text"
                      value={customOwnerPass}
                      onChange={(e) => setCustomOwnerPass(e.target.value)}
                      placeholder="password123"
                      className="w-full bg-[#100d20] border border-[#3b2e63] focus:border-amber-400 rounded-xl px-3 py-2 text-white text-xs outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Preview Box */}
                <div className="relative mt-2">
                  <div className="p-3.5 rounded-xl bg-[#0e0b1c] border border-[#2a204d] font-mono text-[11px] text-amber-200/90 overflow-x-auto">
                    <pre>{generatedOwnerSql}</pre>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyOwnerSql}
                    className="mt-2.5 w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-600 hover:to-pink-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                    <span>{copiedOwnerSql ? '  Query SQL Owner Berhasil Disalin!' : 'Salin Query SQL Owner'}</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 leading-relaxed bg-[#120d26] p-3 rounded-xl border border-[#231b40]">
                  <strong>Cara Eksekusi di Supabase:</strong>
                  <ol className="list-decimal list-inside space-y-1 mt-1 pl-1">
                    <li>Buka dashboard Supabase Anda di <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-pink-400 underline">supabase.com</a></li>
                    <li>Buka menu <strong>SQL Editor</strong> (ikon terminal di sidebar kiri)   klik <strong>New Query</strong>.</li>
                    <li>Tempelkan (*paste*) query yang baru Anda salin, lalu klik tombol hijau <strong>RUN</strong>.</li>
                    <li>Akun Owner Anda langsung aktif! Sekarang buka portal login RemindTask dan login menggunakan email & password tersebut.</li>
                  </ol>
                </div>
              </div>

              {/* METODE 2: LEWAT TABLE EDITOR UI */}
              <div className="p-4 rounded-2xl bg-[#1b1535] border border-[#2f2455] space-y-2">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold">2</span>
                  Metode Alternatif: Menggunakan Table Editor Supabase (Tanpa Koding)
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Jika Anda lebih suka mengisi data lewat tampilan tabel Supabase:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] pl-1">
                  <li>Buka <strong>Table Editor</strong> (ikon tabel di sidebar kiri Supabase).</li>
                  <li>Pilih tabel <strong><code>profiles</code></strong>.</li>
                  <li>Klik tombol hijau <strong>"Insert row"</strong>.</li>
                  <li>Isi kolom tabel sebagai berikut:
                    <ul className="list-disc list-inside pl-4 mt-1 space-y-0.5 text-slate-400">
                      <li><code>id</code>: Isi <code>owner-1</code> (atau klik Generate UUID)</li>
                      <li><code>name</code>: Nama Anda (contoh: <code>Ahmad (Owner)</code>)</li>
                      <li><code>email</code>: Email Anda (contoh: <code>ahmad@gmail.com</code>)</li>
                      <li><code>password</code>: Password Anda (contoh: <code>rahasia123</code>)</li>
                      <li><code>role</code>: Wajib ketik huruf kecil: <strong className="text-amber-300"><code>owner</code></strong></li>
                      <li><code>status</code>: <code>active</code></li>
                    </ul>
                  </li>
                  <li>Klik <strong>Save</strong>. Selesai! Akun Owner langsung siap digunakan.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 1: TUTORIAL DATABASE SUPABASE */}
          {activeStepTab === 'tutorial' && (
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="p-4 rounded-2xl bg-[#1a1433] border border-[#2d2350] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs font-mono">1</span>
                    Buat Project Gratis di Supabase
                  </span>
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="text-pink-400 hover:text-pink-300 font-bold flex items-center gap-1 text-[11px]"
                  >
                    <span>Buka Supabase</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Buka <strong>supabase.com</strong>, daftar atau login dengan akun GitHub/Email. Klik <strong>"New Project"</strong>, isi nama project (misal: <code className="bg-[#100c24] px-1.5 py-0.5 rounded text-pink-300">remindtask-db</code>), masukkan Database Password, dan pilih region terdekat (misal: <em>Singapore</em>).
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-2xl bg-[#1a1433] border border-[#2d2350] space-y-2">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs font-mono">2</span>
                  Jalankan Skrip SQL Tabel & Relasi
                </span>
                <p className="text-slate-300 leading-relaxed">
                  Di dashboard Supabase, buka menu <strong>SQL Editor</strong> (ikon terminal di sidebar kiri)   klik <strong>"New Query"</strong>. Salin seluruh skrip dari tab <strong>"3. Skrip SQL Lengkap"</strong> dan klik tombol hijau <strong>"RUN"</strong>. Skrip ini akan membuat tabel <code className="text-purple-300">classes</code>, <code className="text-purple-300">tasks</code>, <code className="text-purple-300">submissions</code>, <code className="text-purple-300">profiles</code>, dan <code className="text-purple-300">notifications</code>.
                </p>
                <button
                  onClick={handleCopySql}
                  className="mt-2 px-3 py-1.5 rounded-xl bg-[#281f49] hover:bg-[#352960] text-pink-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedSql ? '  Skrip SQL Tersalin!' : 'Salin Skrip SQL Sekarang'}</span>
                </button>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-2xl bg-[#1a1433] border border-[#2d2350] space-y-2">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs font-mono">3</span>
                  Salin Project URL & Anon Key ke RemindTask
                </span>
                <p className="text-slate-300 leading-relaxed">
                  Buka menu <strong>Project Settings</strong> (ikon gerigi)   <strong>API</strong>. Salin:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
                  <li><strong>Project URL</strong>: Contoh <code className="text-purple-300">https://abcdefghijkl.supabase.co</code></li>
                  <li><strong>Project API Keys</strong> (anon / public): String panjang yang aman digunakan di browser.</li>
                </ul>
                <p className="text-slate-300 pt-1">
                  Buka tab <strong>"2. Hubungkan URL & Key API"</strong> di atas, tempelkan, dan klik <strong>"Uji & Simpan Koneksi"</strong>.
                </p>
              </div>

              {/* Step 4: Penjelasan 3 Jalur Login */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#241744] to-[#181230] border border-[#3b2a64] space-y-3">
                <span className="font-bold text-pink-300 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  Arsitektur 3 Jalur Login Terpisah:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-[#140e29] border border-[#2e2150]">
                    <strong className="text-white block mb-1">  Jalur Member</strong>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Siswa hanya butuh memasukkan <strong>Kode Kelas</strong> dan nama mereka. Tanpa registrasi yang rumit!
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#140e29] border border-[#2e2150]">
                    <strong className="text-white block mb-1">  Jalur Admin</strong>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Login khusus pengelola kelas untuk mempublikasikan tugas, mengatur deadline, dan memeriksa berkas tugas siswa.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#140e29] border border-[#2e2150]">
                    <strong className="text-white block mb-1">  Jalur Owner</strong>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Portal tingkat tertinggi untuk memantau semua kelas, menangguhkan admin nakal, dan melihat analitik platform.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: KONEKSI */}
          {activeStepTab === 'koneksi' && (
            <div className="space-y-4">
              <form onSubmit={handleTestAndSave} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    required
                    className="w-full bg-[#1b1633] border border-[#342a5a] focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white text-xs outline-none transition-colors font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Ditemukan di: Supabase Dashboard   Settings   API   Project URL
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    Supabase Anon Public API Key
                  </label>
                  <input
                    type="text"
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    required
                    className="w-full bg-[#1b1633] border border-[#342a5a] focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white text-xs outline-none transition-colors font-mono text-ellipsis"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Ditemukan di: Supabase Dashboard   Settings   API   Project API Keys (anon public)
                  </span>
                </div>

                {/* Status response */}
                {testResult && (
                  <div
                    className={`p-3.5 rounded-2xl border text-xs ${
                      testResult.success
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-500/15 border-red-500/30 text-red-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold mb-0.5">
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <X className="w-4 h-4 text-red-400" />
                      )}
                      <span>{testResult.success ? 'Berhasil Terhubung' : 'Koneksi Gagal'}</span>
                    </div>
                    <p className="text-[11px] opacity-90">{testResult.message}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-[#231d3d]">
                  {currentConfig.isConnected && (
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="px-3.5 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-xl border border-red-500/20 transition-colors cursor-pointer"
                    >
                      Putuskan Koneksi Supabase
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isTesting}
                    className="ml-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isTesting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Menguji Koneksi...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        <span>Uji & Simpan Koneksi</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 3: SKRIP SQL */}
          {activeStepTab === 'sql' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-semibold text-xs flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-pink-400" />
                  SQL Migration Script (Auto Table + RLS + Seed Data)
                </span>
                <button
                  onClick={handleCopySql}
                  className="px-3 py-1.5 rounded-xl bg-[#221a42] hover:bg-[#2e2358] text-pink-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedSql ? '  Tersalin!' : 'Salin Seluruh SQL'}</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-[#0e0b1c] border border-[#271e44] font-mono text-[11px] text-slate-300 overflow-x-auto max-h-[380px] leading-relaxed select-all">
                <pre>{SUPABASE_SQL_SCHEMA}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#231d3d] flex items-center justify-between text-[11px] text-slate-400">
          <span>RemindTask mendukung mode offline & sinkronisasi Supabase realtime.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#20183b] hover:bg-[#2b2150] text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
