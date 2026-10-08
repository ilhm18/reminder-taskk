import React, { useState } from 'react';
import { GraduationCap, School, Users, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { EducatorType } from '../../types';
import { useApp } from '../../context/AppContext';

interface AdminEducatorTypeModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const AdminEducatorTypeModal: React.FC<AdminEducatorTypeModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, confirmAdminEducatorType, showToast } = useApp();

  const [selectedMain, setSelectedMain] = useState<'dosen' | 'guru' | 'pengurus'>('dosen');
  const [pengurusSub, setPengurusSub] = useState<'mahasiswa' | 'sekolah'>('mahasiswa');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalType: EducatorType = 'dosen';
    if (selectedMain === 'dosen') {
      finalType = 'dosen';
    } else if (selectedMain === 'guru') {
      finalType = 'guru';
    } else {
      finalType = pengurusSub === 'mahasiswa' ? 'pengurus_mahasiswa' : 'pengurus_sekolah';
    }

    setIsSubmitting(true);
    try {
      if (currentUser?.id) {
        localStorage.setItem('rt_confirmed_educator_' + currentUser.id, finalType);
      }
      if (currentUser?.username) {
        localStorage.setItem('rt_confirmed_educator_' + currentUser.username.toLowerCase(), finalType);
      }
      if (currentUser?.classId) {
        localStorage.setItem('rt_confirmed_educator_' + currentUser.classId, finalType);
      }
      await confirmAdminEducatorType(finalType);
      showToast('Identitas & jenis kelas berhasil dikonfirmasi!', 'success');
      if (onClose) onClose();
    } catch (err) {
      console.error('Error confirming educator type:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#141126] border border-[#2e2654] rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5 flex items-center justify-center shrink-0 shadow-lg shadow-pink-500/20">
            <div className="w-full h-full rounded-[14px] bg-[#141126] flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-pink-400" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-white tracking-tight">
              Konfirmasi Identitas &amp; Jenis Kelas
            </h2>
            <p className="text-xs text-slate-400">
              Halo <span className="text-pink-300 font-bold">{currentUser?.name || 'Admin'}</span>! Tentukan peran Anda di kelas ini.
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-300 bg-[#1b1735] p-3.5 rounded-2xl border border-[#2c2452] mb-5 leading-relaxed">
          Pilihan ini akan menyesuaikan sebutan (<strong>Dosen / Guru / Pengurus Kelas</strong>) serta anggota kelas (<strong>Mahasiswa / Siswa</strong>) secara konsisten di seluruh dashboard Anda dan halaman anggota.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Main Choices */}
          <div className="space-y-2.5">
            {/* 1. DOSEN */}
            <label
              onClick={() => setSelectedMain('dosen')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                selectedMain === 'dosen'
                  ? 'bg-gradient-to-r from-pink-500/15 to-purple-500/15 border-pink-500 text-white shadow-md shadow-pink-500/10'
                  : 'bg-[#181433] border-[#29224d] text-slate-300 hover:border-slate-600'
              }`}
            >
              <input
                type="radio"
                name="mainRole"
                value="dosen"
                checked={selectedMain === 'dosen'}
                onChange={() => setSelectedMain('dosen')}
                className="mt-1 accent-pink-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-bold text-sm text-white">
                  <GraduationCap className="w-4 h-4 text-pink-400" />
                  <span>Dosen</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Mengampu perkuliahan di perguruan tinggi. Anggota kelas disebut <strong className="text-pink-300">Mahasiswa</strong>.
                </p>
              </div>
            </label>

            {/* 2. GURU */}
            <label
              onClick={() => setSelectedMain('guru')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                selectedMain === 'guru'
                  ? 'bg-gradient-to-r from-pink-500/15 to-purple-500/15 border-pink-500 text-white shadow-md shadow-pink-500/10'
                  : 'bg-[#181433] border-[#29224d] text-slate-300 hover:border-slate-600'
              }`}
            >
              <input
                type="radio"
                name="mainRole"
                value="guru"
                checked={selectedMain === 'guru'}
                onChange={() => setSelectedMain('guru')}
                className="mt-1 accent-pink-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-bold text-sm text-white">
                  <School className="w-4 h-4 text-purple-400" />
                  <span>Guru</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Mengajar di jenjang sekolah (SD/SMP/SMA/SMK). Anggota kelas disebut <strong className="text-pink-300">Siswa</strong>.
                </p>
              </div>
            </label>

            {/* 3. PENGURUS KELAS */}
            <label
              onClick={() => setSelectedMain('pengurus')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                selectedMain === 'pengurus'
                  ? 'bg-gradient-to-r from-pink-500/15 to-purple-500/15 border-pink-500 text-white shadow-md shadow-pink-500/10'
                  : 'bg-[#181433] border-[#29224d] text-slate-300 hover:border-slate-600'
              }`}
            >
              <input
                type="radio"
                name="mainRole"
                value="pengurus"
                checked={selectedMain === 'pengurus'}
                onChange={() => setSelectedMain('pengurus')}
                className="mt-1 accent-pink-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-bold text-sm text-white">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>Pengurus Kelas</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pengurus / Ketua / Sekretaris Kelas yang mengelola grup kelas.
                </p>

                {/* Sub Options for Pengurus Kelas */}
                {selectedMain === 'pengurus' && (
                  <div className="mt-3 pt-3 border-t border-[#312759] space-y-2 animate-in fade-in duration-150">
                    <span className="text-[10px] font-bold text-pink-300 uppercase tracking-wider block">
                      Pilih Sub-Jenis Kelas:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPengurusSub('mahasiswa');
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          pengurusSub === 'mahasiswa'
                            ? 'bg-pink-500/20 border-pink-500 text-pink-300'
                            : 'bg-[#120e29] border-[#2c2250] text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>Kelas Mahasiswa</span>
                        </span>
                        <span className="text-[9px] font-normal text-slate-400">Anggota: Mahasiswa</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPengurusSub('sekolah');
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          pengurusSub === 'sekolah'
                            ? 'bg-pink-500/20 border-pink-500 text-pink-300'
                            : 'bg-[#120e29] border-[#2c2250] text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          <School className="w-3.5 h-3.5" />
                          <span>Kelas Sekolah</span>
                        </span>
                        <span className="text-[9px] font-normal text-slate-400">Anggota: Siswa</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xl shadow-pink-500/25 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan & Konfirmasi Identitas'}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
};
