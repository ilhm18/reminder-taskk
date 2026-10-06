import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  Key,
  Lock,
  LogIn,
  Mail,
  Shield,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ClassItem } from '../../types';
import { ThemeToggle } from '../common/ThemeToggle';

export const AuthScreens: React.FC = () => {
  const {
    classes,
    enterClassByCode,
    loginAsAdmin,
    loginAsOwner,
    addAdminUser,
    showToast,
    theme,
    deviceAccounts,
    loginAsStoredAccount,
    removeStoredAccount,
  } = useApp();
  const isLight = false;

  // Active Role Portal: 'member' | 'admin'
  const [rolePortal, setRolePortal] = useState<'member' | 'admin'>('member');

  // Member 2-step form: 'code' -> 'name'
  const [memberStep, setMemberStep] = useState<'code' | 'name'>('code');
  const [validatedClass, setValidatedClass] = useState<ClassItem | null>(null);
  const [classCodeInput, setClassCodeInput] = useState('');
  const [memberNameInput, setMemberNameInput] = useState('');

  // Admin form
  const [adminMode, setAdminMode] = useState<'login' | 'register'>('login');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Admin Registration form
  const [adminRegName, setAdminRegName] = useState('');
  const [adminRegUsername, setAdminRegUsername] = useState('');
  const [adminRegPassword, setAdminRegPassword] = useState('');
  const [adminRegClassName, setAdminRegClassName] = useState('');
  const [showAdminRegPassword, setShowAdminRegPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');
    const code = classCodeInput.trim().toUpperCase();
    if (!code) {
      setErrorMessage('Harap masukkan kode kelas.');
      return;
    }

    setIsSubmitting(true);
    let foundClass = classes.find((c) => c.code.toUpperCase() === code);

    // If not found in memory, query Supabase directly
    if (!foundClass) {
      const { getSupabaseClient } = await import('../../services/supabase');
      const client = getSupabaseClient();
      if (client) {
        try {
          const { data, error } = await client
            .from('classes')
            .select('*')
            .ilike('code', code)
            .maybeSingle();

          if (data && !error) {
            foundClass = {
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
          }
        } catch (err) {
          console.warn('Query class code error:', err);
        }
      }
    }

    setIsSubmitting(false);

    if (!foundClass) {
      setErrorMessage('Kode kelas tidak ditemukan. Pastikan kode kelas sudah dibuat oleh admin.');
      return;
    }

    setValidatedClass(foundClass);
    setMemberStep('name');
    setErrorMessage('');
    setSuccessMessage(`Kode kelas valid! Ruang kelas: ${foundClass.name}`);
  };

  const handleCompleteMemberEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    if (!memberNameInput.trim()) {
      setErrorMessage('Nama lengkap wajib diisi untuk masuk ke kelas.');
      return;
    }
    if (!validatedClass) {
      setMemberStep('code');
      setErrorMessage('Silakan verifikasi kode kelas terlebih dahulu.');
      return;
    }
    setIsSubmitting(true);
    const result = await enterClassByCode(validatedClass.code, memberNameInput.trim(), '');
    setIsSubmitting(false);
    if (!result.success) {
      setErrorMessage(result.message);
    } else {
      setErrorMessage('');
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    if (!adminUsername.trim()) {
      setErrorMessage('Harap masukkan username admin.');
      return;
    }
    if (!adminPassword) {
      setErrorMessage('Harap masukkan password admin.');
      return;
    }
    setIsSubmitting(true);
    const result = await loginAsAdmin(adminUsername.trim(), adminPassword);
    setIsSubmitting(false);
    if (!result.success) {
      setErrorMessage(result.message);
    } else {
      setErrorMessage('');
    }
  };

  const handleAdminRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    if (!adminRegName.trim()) {
      setErrorMessage('Harap masukkan nama lengkap admin.');
      return;
    }
    if (!adminRegUsername.trim()) {
      setErrorMessage('Harap masukkan username admin.');
      return;
    }
    if (!adminRegPassword) {
      setErrorMessage('Harap tentukan password admin.');
      return;
    }
    if (!adminRegClassName.trim()) {
      setErrorMessage('Harap tentukan nama kelas yang dikelola.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const cleanUsername = adminRegUsername.trim().toLowerCase().replace(/\s+/g, '');
      const pwd = adminRegPassword;
      await addAdminUser({
        name: adminRegName.trim(),
        username: cleanUsername,
        password: pwd,
        className: adminRegClassName.trim(),
      });

      // Do not auto login - switch to login form with pre-filled username
      setAdminMode('login');
      setAdminUsername(cleanUsername);
      setAdminPassword('');
      setSuccessMessage('Pendaftaran admin berhasil! Akun Anda telah siap. Silakan masukkan password untuk login.');
      showToast('Pendaftaran admin berhasil! Silakan login.', 'success');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal mendaftarkan akun admin.');
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className={`min-h-screen ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0c0a15] text-white'} flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-200`}>
      {/* Floating Theme Toggle (Sun/Moon) */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Background ambient lighting */}
      <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] ${isLight ? 'bg-gradient-to-tr from-pink-400/10 via-purple-400/10 to-indigo-400/10' : 'bg-gradient-to-tr from-pink-600/10 via-purple-600/15 to-indigo-600/10'} rounded-full blur-3xl pointer-events-none`} />

      {/* Main Login Card */}
      <div className={`w-full max-w-[460px] ${isLight ? 'bg-white border-slate-200 shadow-xl' : 'bg-[#141126]/90 border-[#272144] shadow-2xl'} border rounded-3xl p-6 sm:p-8 backdrop-blur-xl relative z-10 transition-all`}>
        {/* Top Glowing Bell Brand Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500 via-fuchsia-500 to-indigo-500 p-0.5 shadow-xl shadow-pink-500/25 flex items-center justify-center transform transition-transform hover:scale-105">
            <div className="w-full h-full rounded-[14px] bg-gradient-to-tr from-pink-500 via-fuchsia-500 to-indigo-500 flex items-center justify-center">
              <Bell className="w-8 h-8 text-white fill-white" />
            </div>
          </div>
        </div>

        {/* Role Portal Tabs (Only shown on Admin portal, not on Member login) */}
        {rolePortal !== 'member' && (
          <div className="space-y-3 mb-6">
            <div className={`flex items-center justify-between pb-2 border-b ${isLight ? 'border-slate-200' : 'border-[#251d45]'}`}>
              <button
                type="button"
                onClick={() => {
                  setRolePortal('member');
                  setMemberStep('code');
                  setErrorMessage('');
                }}
                className={`text-xs font-semibold ${isLight ? 'text-slate-600 hover:text-pink-600' : 'text-slate-400 hover:text-pink-300'} flex items-center gap-1.5 transition-colors cursor-pointer`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Masuk Siswa</span>
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Titles */}
        <div className="text-center mb-6">
          <h1 className={`text-2xl sm:text-3xl font-extrabold ${isLight ? 'text-slate-900' : 'text-white'} tracking-tight`}>
            {rolePortal === 'member' && 'Masuk Ruang Kelas'}
            {rolePortal === 'admin' && (adminMode === 'register' ? 'Daftar Akun Admin' : 'Login Admin')}
          </h1>
          <p className={`${isLight ? 'text-slate-600' : 'text-slate-400'} text-xs mt-1.5`}>
            {rolePortal === 'member' && 'Masukkan kode kelas untuk melihat tugas dan jadwal'}
            {rolePortal === 'admin' &&
              (adminMode === 'register'
                ? 'Buat akun pengelola dan dapatkan kode kelas otomatis'
                : 'Akses dashboard pengelola kelas dan pemeriksaan tugas')}
          </p>
        </div>

        {/* Success message alert */}
        {successMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs text-center font-medium animate-in fade-in duration-150 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error message alert */}
        {errorMessage && (
          <div className="mb-5 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-300 text-xs text-center font-medium animate-in fade-in duration-150">
            {errorMessage}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: MEMBER (MASUK KELAS) */}
        {/* ========================================================================= */}
        {rolePortal === 'member' && (
          <div>
            {/* QUICK ACCOUNT SWITCHER / DEVICE SESSIONS LIST */}
            {deviceAccounts.length > 0 && (
              <div className="mb-5 p-5 rounded-2xl bg-[#191530]/80 border border-[#2c2250] shadow-xl relative overflow-hidden animate-in fade-in duration-200">
                <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-full blur-2xl pointer-events-none" />
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                  <span>Sesi Login Sebelumnya di Perangkat Ini</span>
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {deviceAccounts.map((acc) => {
                    const isOwner = acc.role === 'owner';
                    const isAdmin = acc.role === 'admin';
                    return (
                      <div
                        key={acc.id}
                        className="p-3 rounded-xl bg-[#0f0c1f] hover:bg-[#141029]/80 border border-[#2b2154] hover:border-pink-500/40 flex items-center justify-between gap-3 transition-all group"
                      >
                        <button
                          type="button"
                          onClick={() => loginAsStoredAccount(acc)}
                          className="flex-1 flex items-center gap-3 text-left cursor-pointer focus:outline-none"
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-sm shrink-0 ${
                            isOwner
                              ? 'bg-gradient-to-tr from-amber-500 to-yellow-600'
                              : isAdmin
                              ? 'bg-gradient-to-tr from-purple-600 to-indigo-600'
                              : 'bg-gradient-to-tr from-pink-500 to-purple-600'
                          }`}>
                            {acc.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-white truncate max-w-[120px]">{acc.name}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                isOwner
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : isAdmin
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                              }`}>
                                {acc.role === 'owner' ? 'Owner' : acc.role === 'admin' ? 'Admin' : 'Siswa'}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {acc.className || 'RemindTask Portal'}
                            </span>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeStoredAccount(acc.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                          title="Hapus sesi dari perangkat ini"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className={`${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#191530] border-[#2c264d]'} border rounded-2xl p-5 mb-4 transition-all shadow-xs`}>
              {/* STEP 1: INPUT KODE KELAS */}
              {memberStep === 'code' && (
                <div>
                  <div className={`flex items-center gap-2 font-bold text-sm mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    <Key className="w-4 h-4 text-pink-500" />
                    <span>masukkan kode kelas</span>
                  </div>
                  <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'} mb-4`}>
                    Masukkan kode yang diberikan oleh admin kelas Anda.
                  </p>

                  <form onSubmit={handleVerifyCode} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={classCodeInput}
                        onChange={(e) => {
                          setClassCodeInput(e.target.value.toUpperCase());
                          setErrorMessage('');
                        }}
                        placeholder="MASUKKAN KODE KELAS"
                        className={`flex-1 ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-pink-500'
                            : 'bg-[#100d20] border-[#342e5a] text-white placeholder:text-slate-500 focus:border-pink-500'
                        } border rounded-xl px-4 py-3 font-mono uppercase tracking-wider text-sm outline-none transition-colors shadow-xs`}
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-13 h-12 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white flex items-center justify-center transition-all shadow-md shadow-pink-500/20 cursor-pointer active:scale-95 disabled:opacity-50"
                        title="Verifikasi Kode Kelas"
                      >
                        <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* STEP 2: KODE VALID -> INPUT NAMA SISWA */}
              {memberStep === 'name' && validatedClass && (
                <div className="animate-in fade-in duration-200">
                  {/* Verified Class Card */}
                  <div className={`p-3.5 rounded-xl ${isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/30'} border mb-4 flex items-start gap-2.5`}>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          KODE KELAS VALID
                        </span>
                        <span className={`text-xs font-mono font-bold text-pink-500 ${isLight ? 'bg-white border-slate-200' : 'bg-[#141029] border-[#2d2250]'} px-2 py-0.5 rounded-lg border`}>
                          {validatedClass.code}
                        </span>
                      </div>
                      <h4 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'} mt-0.5`}>{validatedClass.name}</h4>
                      <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Admin: {validatedClass.adminName}</p>
                    </div>
                  </div>

                  <form onSubmit={handleCompleteMemberEntry} className="space-y-3.5">
                    <div>
                      <label className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'} mb-1.5 flex items-center justify-between`}>
                        <span>Nama Lengkap Anda <span className="text-pink-500">*</span></span>
                        <span className="text-[10px] text-pink-500 font-semibold uppercase">Wajib Diisi</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={memberNameInput}
                          onChange={(e) => {
                            setMemberNameInput(e.target.value);
                            setErrorMessage('');
                          }}
                          placeholder="Masukkan nama lengkap Anda (cth: Budi Santoso)"
                          required
                          autoFocus
                          className={`w-full ${
                            isLight
                              ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-pink-500'
                              : 'bg-[#100d20] border-[#342e5a] text-white placeholder:text-slate-500 focus:border-pink-500'
                          } border rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-colors font-medium shadow-xs`}
                        />
                      </div>
                      <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'} mt-1 block`}>
                        Nama Anda akan tercatat resmi di daftar statistik & produktivitas kelas admin.
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setMemberStep('code');
                          setErrorMessage('');
                        }}
                        className={`py-2.5 px-3.5 rounded-xl ${
                          isLight
                            ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                            : 'bg-[#141029] hover:bg-[#1d173b] border-[#2c224e] text-slate-300'
                        } border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer`}
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Ganti Kode</span>
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-pink-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        <span>{isSubmitting ? 'Memproses...' : 'Masuk ke Kelas'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className={`mt-4 pt-3.5 border-t ${isLight ? 'border-slate-200 text-slate-600' : 'border-[#292348] text-slate-400'} flex items-center justify-between text-[11px]`}>
                <span>Pengelola kelas?</span>
                <button
                  type="button"
                  onClick={() => {
                    setRolePortal('admin');
                    setAdminMode('login');
                    setErrorMessage('');
                  }}
                  className="text-pink-600 dark:text-pink-400 hover:underline font-bold cursor-pointer"
                >
                  Login Admin
                </button>
              </div>
            </div>

            <div className="text-center">
              <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                Hubungi admin kelas Anda untuk mendapatkan kode akses kelas.
              </span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ADMIN KELAS (LOGIN & DAFTAR BARU) */}
        {/* ========================================================================= */}
        {rolePortal === 'admin' && adminMode === 'login' && (
          <div>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'} mb-1.5`}>
                  Username Admin
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => {
                      setAdminUsername(e.target.value);
                      setErrorMessage('');
                    }}
                    placeholder="Username admin"
                    required
                    className={`w-full ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-pink-500'
                        : 'bg-[#100d20] border-[#342e5a] text-white placeholder:text-slate-500 focus:border-pink-500'
                    } border rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none transition-colors shadow-xs`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'} mb-1.5`}>
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      setErrorMessage('');
                    }}
                    placeholder="Password admin"
                    required
                    className={`w-full ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-pink-500'
                        : 'bg-[#100d20] border-[#342e5a] text-white placeholder:text-slate-500 focus:border-pink-500'
                    } border rounded-xl pl-10 pr-10 py-2.5 text-xs outline-none transition-colors font-mono shadow-xs`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
              >
                <LogIn className="w-4 h-4 stroke-[2.5]" />
                <span>{isSubmitting ? 'Memeriksa...' : 'Masuk sebagai Admin'}</span>
              </button>

              <div className={`pt-3.5 border-t ${isLight ? 'border-slate-200 text-slate-600' : 'border-[#292348] text-slate-400'} text-center flex flex-col items-center gap-1.5`}>
                <span className="text-[11px]">
                  Ingin menjadi admin?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAdminMode('register');
                    setErrorMessage('');
                  }}
                  className="text-pink-600 dark:text-pink-400 hover:underline font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Daftar / Buat Akun Admin</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2B: REGISTER ADMIN BARU */}
        {rolePortal === 'admin' && adminMode === 'register' && (
          <div>
            <form onSubmit={handleAdminRegister} className="space-y-3.5">
              <div>
                <label className={`block text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'} mb-1.5`}>
                  Nama Lengkap Admin
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={adminRegName}
                    onChange={(e) => {
                      setAdminRegName(e.target.value);
                      setErrorMessage('');
                    }}
                    placeholder="Nama lengkap admin"
                    required
                    className={`w-full ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-pink-500'
                        : 'bg-[#100d20] border-[#342e5a] text-white placeholder:text-slate-500 focus:border-pink-500'
                    } border rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none transition-colors shadow-xs`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'} mb-1.5`}>
                  Username Admin
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={adminRegUsername}
                    onChange={(e) => {
                      setAdminRegUsername(e.target.value.toLowerCase().replace(/\s+/g, ''));
                      setErrorMessage('');
                    }}
                    placeholder="Username admin"
                    required
                    className={`w-full ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-pink-500'
                        : 'bg-[#100d20] border-[#342e5a] text-white placeholder:text-slate-500 focus:border-pink-500'
                    } border rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none transition-colors shadow-xs`}
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Digunakan untuk login. Gunakan huruf kecil, angka, atau garis bawah (_).
                </span>
              </div>

              <div>
                <label className={`block text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'} mb-1.5`}>
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showAdminRegPassword ? 'text' : 'password'}
                    value={adminRegPassword}
                    onChange={(e) => {
                      setAdminRegPassword(e.target.value);
                      setErrorMessage('');
                    }}
                    placeholder="Buat password admin"
                    required
                    className={`w-full ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-pink-500'
                        : 'bg-[#100d20] border-[#342e5a] text-white placeholder:text-slate-500 focus:border-pink-500'
                    } border rounded-xl pl-10 pr-10 py-2.5 text-xs outline-none transition-colors font-mono shadow-xs`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminRegPassword(!showAdminRegPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showAdminRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'} mb-1.5`}>
                  Nama Ruang Kelas yang Dikelola
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={adminRegClassName}
                    onChange={(e) => {
                      setAdminRegClassName(e.target.value);
                      setErrorMessage('');
                    }}
                    placeholder="Contoh: Kelas XII RPL 1 / Fisika"
                    required
                    className={`w-full ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-pink-500'
                        : 'bg-[#100d20] border-[#342e5a] text-white placeholder:text-slate-500 focus:border-pink-500'
                    } border rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none transition-colors shadow-xs`}
                  />
                </div>
                <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'} mt-1 block`}>
                  Kode kelas 6-karakter unik akan otomatis dibuat untuk siswa Anda.
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4 stroke-[2.5]" />
                <span>{isSubmitting ? 'Mendaftarkan...' : 'Daftar & Buat Kelas Sekarang'}</span>
              </button>

              <div className={`pt-3.5 border-t ${isLight ? 'border-slate-200 text-slate-600' : 'border-[#292348] text-slate-400'} text-center flex flex-col items-center gap-1.5`}>
                <span className="text-[11px]">
                  Sudah memiliki akun admin?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAdminMode('login');
                    setErrorMessage('');
                  }}
                  className="text-pink-600 dark:text-pink-400 hover:underline font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Masuk dengan Akun Admin</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
