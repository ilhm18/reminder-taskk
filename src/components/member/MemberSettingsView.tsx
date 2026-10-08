import React, { useState, useEffect } from 'react';
import {
  User,
  Settings,
  Key,
  Check,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ProfileAvatarUploader } from '../common/ProfileAvatarUploader';
import { getTerminology, resolveEducatorType } from '../../utils/terminology';

export const MemberSettingsView: React.FC = () => {
  const { currentUser, currentClass, showToast, updateMemberProfile } = useApp();

  const educatorType = resolveEducatorType(currentUser, currentClass);
  const terms = getTerminology(educatorType);

  const [nameInput, setNameInput] = useState(currentUser?.name || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentUser && currentUser.name) {
      setNameInput(currentUser.name);
    }
  }, [currentUser]);

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      showToast('Nama profil tidak boleh kosong!', 'warn');
      return;
    }

    setIsSaving(true);
    try {
      if (updateMemberProfile) {
        updateMemberProfile({
          name: nameInput.trim(),
        });
      }
      showToast('Pengaturan profil berhasil disimpan!', 'success');
    } catch {
      showToast('Gagal menyimpan profil', 'warn');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200 pb-12">
      {/* Header */}
      <div className="bg-[#141126] border border-[#272144] p-6 rounded-3xl flex items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-pink-400 uppercase tracking-wider block">
              PENGATURAN AKUN SISWA
            </span>
            <h2 className="text-xl font-bold text-white">Profil &amp; Preferensi Akun</h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Quick Profile Card */}
        <div className="bg-[#141126] border border-[#272144] rounded-3xl p-6 text-center space-y-4 h-fit">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white font-black text-2xl flex items-center justify-center mx-auto shadow-lg shadow-pink-500/30 overflow-hidden relative">
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              (currentUser?.name || 'S').charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h3 className="font-bold text-white text-base">{currentUser?.name || 'Siswa Kelas'}</h3>
            <span className="text-xs text-pink-400 font-mono inline-block mt-0.5">
              Role: Member Siswa
            </span>
          </div>

          <div className="pt-3 border-t border-[#231b3d] text-left space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>Kelas Aktif:</span>
              <span className="text-white font-bold">{currentClass?.name || 'Belum Bergabung'}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Kode Kelas:</span>
              <span className="text-pink-300 font-mono font-bold">{currentClass?.code || '-'}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Notifikasi:</span>
              <span className="text-emerald-400 font-bold">
                🟢 Push Pop-up Aktif
              </span>
            </div>
          </div>
        </div>

        {/* Right: Edit Forms & Avatar Uploader */}
        <div className="md:col-span-2 space-y-6">
          <ProfileAvatarUploader
            title={`Foto Profil ${terms.memberTitle}`}
            subtitle={`Unggah foto Anda agar dapat dilihat oleh ${terms.educatorTitle.toLowerCase()}, admin, dan teman sekelas`}
          />

          <div className="bg-[#141126] border border-[#272144] rounded-3xl p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#231b3d] pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <User className="w-4 h-4 text-pink-400" />
                <span>Ubah Informasi Akun</span>
              </h3>
            </div>

            <form onSubmit={handleSaveAll} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nama Lengkap / Panggilan Siswa
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Ketik nama Anda..."
                    maxLength={40}
                    className="w-full bg-[#1b1636] border border-[#34275a] rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white outline-none focus:border-pink-500"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Nama ini akan tampil pada papan tugas, peringkat, dan catatan pengumpulan tugas kelas.
                </p>
              </div>

              <div className="pt-4 border-t border-[#231b3d] flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-400">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Notifikasi Pop-up Aktif
                  </span>
                </span>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-pink-500/20 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan Profil'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
