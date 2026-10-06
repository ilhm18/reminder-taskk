import React, { useState } from 'react';
import { MessageSquarePlus, Send, History, Sparkles, User, HelpCircle, AlertCircle, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const FeedbackView: React.FC = () => {
  const { feedbacks, addFeedback, currentUser, currentRole, currentClass } = useApp();
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Filter feedbacks sent by this specific user
  const myFeedbacks = feedbacks.filter((f) => f.senderId === (currentUser?.id || 'guest'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSending(true);
    try {
      await addFeedback(content);
      setContent('');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e153b] via-[#15112e] to-[#0c0a15] border border-purple-500/20 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl -translate-y-12 translate-x-12" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl translate-y-12 -translate-x-12" />

        <div className="relative flex flex-col md:flex-row md:items-center gap-6 justify-between">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Suara Pengguna RemindTask</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Kritik & Saran <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">untuk Owner</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              Bantu kami menyempurnakan aplikasi RemindTask. Sampaikan aspirasi, kendala teknis, masukan fitur, atau keluhan Anda secara langsung kepada Owner.
            </p>
          </div>
          <div className="shrink-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-pink-500/20">
              <MessageSquarePlus className="w-8 h-8 stroke-[1.8]" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Form and Guidelines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#141126]/90 border border-[#2c2250] rounded-3xl p-6 shadow-xl relative">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-pink-400" />
              <span>Kirim Kritik & Saran</span>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Pesan Anda
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Tulis kritik, keluhan, masukan fitur, atau saran pengembangan di sini secara detail..."
                  rows={6}
                  maxLength={1000}
                  required
                  className="w-full bg-[#0a0814] border border-[#2b2154] focus:border-pink-500 rounded-2xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20 transition-all resize-none leading-relaxed"
                />
                <div className="flex items-center justify-between mt-1.5 text-xs">
                  <span className="text-slate-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Batas 1000 karakter
                  </span>
                  <span className={`font-mono font-medium ${content.length > 900 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {content.length}/1000
                  </span>
                </div>
              </div>

              {/* Sender Identity Preview Banner */}
              <div className="p-3.5 rounded-2xl bg-[#1b143a]/50 border border-[#30255c] flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-300">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Dikirim Sebagai:
                  </span>
                  <span className="text-xs font-semibold text-white">
                    {currentUser?.name || 'Siswa'} ({currentRole === 'admin' ? '🔑 Admin Kelas' : '🎓 Anggota Kelas'})
                    {currentClass && ` • ${currentClass.name}`}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSending || !content.trim()}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-sm shadow-lg shadow-pink-500/15 transition-all active:scale-[0.99] disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Mengirimkan ke Owner...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4.5 h-4.5" />
                    <span>Kirim Saran Sekarang</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Guidelines Column */}
        <div className="space-y-6">
          <div className="bg-[#141126]/90 border border-[#2c2250] rounded-3xl p-6 shadow-xl">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
              <HelpCircle className="w-4.5 h-4.5 text-purple-400" />
              <span>Panduan Kritik & Saran</span>
            </h2>

            <ul className="space-y-3.5 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0 mt-1.5" />
                <p className="leading-relaxed">
                  <strong className="text-white">Etika Penyampaian:</strong> Sampaikan kritik secara sopan, konstruktif, dan objektif.
                </p>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0 mt-1.5" />
                <p className="leading-relaxed">
                  <strong className="text-white">Kendala Teknis:</strong> Jika melaporkan bug/error, sebutkan fitur mana yang bermasalah dan jelaskan secara detail.
                </p>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0 mt-1.5" />
                <p className="leading-relaxed">
                  <strong className="text-white">Transparansi:</strong> Kritik & saran Anda dikirimkan dengan menyertakan nama dan kelas Anda agar Owner dapat menindaklanjutinya secara personal jika dibutuhkan.
                </p>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0 mt-1.5" />
                <p className="leading-relaxed">
                  <strong className="text-white">Respons Real-time:</strong> Setiap kritik baru akan langsung mengirimkan notifikasi instan langsung ke HP/Perangkat Owner.
                </p>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="bg-[#141126]/90 border border-[#2c2250] rounded-3xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
          <History className="w-5 h-5 text-purple-400" />
          <span>Riwayat Saran Saya ({myFeedbacks.length})</span>
        </h2>

        {myFeedbacks.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Anda belum pernah mengirimkan kritik & saran.</p>
            <p className="text-xs text-slate-600 mt-1">Aspirasi Anda sangat berharga bagi masa depan RemindTask.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {myFeedbacks.map((fb) => (
              <div
                key={fb.id}
                className="p-4 rounded-2xl bg-[#0a0814]/80 border border-[#221a44] relative overflow-hidden"
              >
                <div className="flex items-center justify-between gap-4 mb-2.5">
                  <span className="text-[10px] font-bold text-purple-300">
                    Pengirim: {fb.senderName} ({fb.className ? `Kelas ${fb.className}` : 'Kelas Umum'})
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(fb.createdAt).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line bg-[#130f2c]/40 p-3 rounded-xl border border-[#2a2254]/30">
                  {fb.content}
                </p>

                {fb.replyMessage && (
                  <div className="mt-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-slate-300 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded text-[8px] bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black uppercase">Owner 👑</span>
                        <span>Balasan Resmi Owner:</span>
                      </span>
                      {fb.replyAt && (
                        <span className="text-[9px] font-mono text-slate-500">
                          {new Date(fb.replyAt).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                    <p className="leading-relaxed font-semibold text-slate-200">{fb.replyMessage}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
