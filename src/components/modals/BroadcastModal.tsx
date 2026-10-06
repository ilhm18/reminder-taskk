import React, { useState } from 'react';
import { Megaphone, Send, Shield, Users, Building2, X, Sparkles, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BROADCAST_TEMPLATES = [
  {
    label: '🛠️ Pemeliharaan (Maintenance)',
    title: 'Pemberitahuan Pemeliharaan Sistem & Server',
    message: 'Halo seluruh warga kelas! Platform RemindTask akan menjalani pemeliharaan sistem (maintenance) server untuk peningkatan performa. Mohon bersabar, layanan akan kembali normal setelah proses selesai.',
  },
  {
    label: '⏰ Deadline Tugas',
    title: 'Pengingat Deadline Tugas Penting',
    message: 'Halo teman-teman! Diingatkan kembali agar segera menyelesaikan dan mengumpulkan tugas sebelum batas waktu yang ditentukan. Jangan sampai terlambat ya! Semangat!',
  },
  {
    label: '📝 Kuis / Evaluasi',
    title: 'Pemberitahuan Kuis & Evaluasi Kelas',
    message: 'Perhatian seluruh siswa/anggota kelas, akan diadakan kuis/evaluasi pemahaman pada pertemuan berikutnya. Harap persiapkan catatan dan pelajari materi sebelumnya.',
  },
  {
    label: '🏫 Jadwal Kelas',
    title: 'Informasi Penyesuaian Jadwal Kelas',
    message: 'Diberitahukan kepada seluruh anggota kelas bahwa terdapat perubahan atau penyesuaian jam belajar/ruangan. Silakan cek menu Jadwal untuk rincian lengkapnya.',
  },
  {
    label: '👥 Tugas Kelompok',
    title: 'Pembagian Kelompok & Instruksi Baru',
    message: 'Tugas kelompok telah dirilis beserta pembagian anggotanya. Mohon segera berkoordinasi dengan rekan sekelompok masing-masing untuk mulai berdiskusi.',
  },
  {
    label: '⚠️ Pengumuman Darurat',
    title: 'Pengumuman Penting & Mendesak',
    message: 'Mohon perhatian seluruh anggota kelas untuk segera membaca pengumuman ini. Harap segera konfirmasi respon atau kehadiran sesuai arahan admin.',
  },
];

export const BroadcastModal: React.FC<BroadcastModalProps> = ({ isOpen, onClose }) => {
  const {
    currentRole,
    currentClass,
    classes,
    sendBroadcastMessage,
    addActivityLog,
    currentUser,
    showToast,
  } = useApp();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'admins_only' | 'class_members'>(
    currentRole === 'owner' ? 'all' : 'class_members'
  );
  const [selectedClassId, setSelectedClassId] = useState<string>(
    currentClass?.id || classes[0]?.id || ''
  );
  const [isSending, setIsSending] = useState(false);

  const handleWhatsAppBroadcast = () => {
    if (!title.trim() || !message.trim()) {
      showToast('Harap isi judul dan pesan terlebih dahulu untuk dikirim ke WhatsApp.', 'warn');
      return;
    }
    const waText = `*📢 PENGUMUMAN REMINDTASK*\n*${title.trim()}*\n\n${message.trim()}\n\n_Kelas: ${currentClass?.name || 'Semua Kelas'}_\n_Waktu: ${new Date().toLocaleString('id-ID')}_`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;
    window.open(waUrl, '_blank');
    showToast('Membuka WhatsApp untuk mengirim broadcast!', 'success');
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast('Harap isi judul dan pesan broadcast.', 'warn');
      return;
    }

    setIsSending(true);

    try {
      if (currentRole === 'owner') {
        sendBroadcastMessage({
          title: title.trim(),
          message: message.trim(),
          target: targetType,
          classId: targetType === 'class_members' ? selectedClassId : undefined,
        });

        addActivityLog(
          currentUser?.name || 'Owner',
          'owner',
          'Pengiriman Broadcast Owner',
          `Owner menyiarkan broadcast "${title.trim()}" ke target: ${
            targetType === 'all'
              ? 'Seluruh User'
              : targetType === 'admins_only'
              ? 'Seluruh Admin'
              : `Kelas ID ${selectedClassId}`
          }.`,
          'system'
        );
      } else {
        // Admin role: restricted exclusively to their class
        const targetClassId = currentClass?.id || selectedClassId;
        const targetClassName = currentClass?.name || 'Kelas Admin';

        sendBroadcastMessage({
          title: title.trim(),
          message: message.trim(),
          target: 'class_members',
          classId: targetClassId,
        });

        addActivityLog(
          currentUser?.name || 'Admin',
          'admin',
          'Pengiriman Broadcast Admin Kelas',
          `Admin ${currentUser?.name || ''} menyiarkan broadcast "${title.trim()}" ke anggota kelas ${targetClassName}.`,
          'class'
        );
      }

      setTitle('');
      setMessage('');
      onClose();
    } catch {
      showToast('Gagal mengirim broadcast siaran.', 'warn');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#141126] border border-[#2e2652] rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#261f42] relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-pink-500/20">
              <Megaphone className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-lg tracking-tight">
                Siarkan Pesan Broadcast
              </h2>
              <p className="text-xs text-slate-400">
                {currentRole === 'owner'
                  ? 'Kirim notifikasi pengumuman ke Admin atau seluruh user'
                  : `Kirim pengumuman khusus anggota kelas ${currentClass?.name || 'Anda'}`}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 relative z-10">
          {/* Target Audience Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-pink-400" />
              Target Penerima Broadcast
            </label>

            {currentRole === 'owner' ? (
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType('all')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    targetType === 'all'
                      ? 'bg-pink-500/15 border-pink-500/50 text-white shadow-md shadow-pink-500/10'
                      : 'bg-[#1b1633] border-[#2e2552] text-slate-300 hover:bg-[#231c42]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-pink-500/20 flex items-center justify-center text-pink-300">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Seluruh User Sistem</div>
                      <div className="text-[10px] text-slate-400">Siswa, Admin & Owner (Global Broadcast)</div>
                    </div>
                  </div>
                  {targetType === 'all' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shadow-sm shadow-pink-500/50" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setTargetType('admins_only')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    targetType === 'admins_only'
                      ? 'bg-purple-500/15 border-purple-500/50 text-white shadow-md shadow-purple-500/10'
                      : 'bg-[#1b1633] border-[#2e2552] text-slate-300 hover:bg-[#231c42]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Khusus Seluruh Admin</div>
                      <div className="text-[10px] text-slate-400">Hanya terkirim ke akun beranperan Admin</div>
                    </div>
                  </div>
                  {targetType === 'admins_only' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setTargetType('class_members')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    targetType === 'class_members'
                      ? 'bg-indigo-500/15 border-indigo-500/50 text-white shadow-md shadow-indigo-500/10'
                      : 'bg-[#1b1633] border-[#2e2552] text-slate-300 hover:bg-[#231c42]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-300">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Siswa Kelas Spesifik</div>
                      <div className="text-[10px] text-slate-400">Targetkan anggota kelas tertentu</div>
                    </div>
                  </div>
                  {targetType === 'class_members' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50" />
                  )}
                </button>

                {targetType === 'class_members' && (
                  <div className="mt-1 pl-1">
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full bg-[#1b1633] border border-[#382b63] rounded-xl px-3.5 py-2 text-white text-xs outline-none focus:border-pink-500"
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id} className="bg-[#1b1633]">
                          {c.name} ({c.code}) - Admin: {c.adminName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-pink-500/10 border border-pink-500/30 text-slate-200 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-pink-500/20 flex items-center justify-center text-pink-400 shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    Anggota Kelas: {currentClass?.name || 'Kelas Saya'}
                  </div>
                  <div className="text-[10px] text-pink-300">
                    Broadcast disiarkan secara realtime ke seluruh siswa di kelas ini (Kode: {currentClass?.code || '------'})
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Preset Template Cepat */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              <span>Gunakan Template Cepat:</span>
            </label>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar">
              {BROADCAST_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setTitle(tmpl.title);
                    setMessage(tmpl.message);
                    showToast(`Template "${tmpl.label}" diterapkan!`, 'info');
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-[#1f173b] hover:bg-[#2e2254] border border-[#3b2b62] hover:border-pink-500/50 text-purple-200 hover:text-white text-xs whitespace-nowrap shrink-0 transition-all cursor-pointer font-medium"
                >
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              Judul Pengumuman
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Pengumuman Penting Ujian Akhir Semester"
              required
              className="w-full bg-[#1b1633] border border-[#342a5a] focus:border-pink-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors placeholder:text-slate-500"
            />
          </div>

          {/* Message input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Isi Pesan Siaran Broadcast
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tuliskan pesan lengkap pengumuman di sini..."
              rows={4}
              required
              className="w-full bg-[#1b1633] border border-[#342a5a] focus:border-pink-500 rounded-xl p-3.5 text-white text-xs outline-none transition-colors placeholder:text-slate-500 resize-none leading-relaxed"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-3 flex items-center justify-between gap-3 border-t border-[#261f42]">
            <button
              type="button"
              onClick={handleWhatsAppBroadcast}
              className="px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <span>💬 Kirim ke WhatsApp</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-[#1d1738] hover:bg-[#2a2150] text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSending}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white text-xs font-bold shadow-lg shadow-pink-500/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSending ? 'Menyiarkan...' : 'Kirim Broadcast'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
