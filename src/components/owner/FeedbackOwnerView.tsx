import React, { useState, useMemo } from 'react';
import { MessageSquare, Trash2, Search, Filter, Shield, User, AlertCircle, Calendar, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const FeedbackOwnerView: React.FC = () => {
  const { feedbacks, deleteFeedback, replyToFeedback } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'member'>('all');
  const [replyingFbId, setReplyingFbId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const handleSendReply = async (fbId: string) => {
    if (!replyText.trim()) return;
    await replyToFeedback(fbId, replyText.trim());
    setReplyingFbId(null);
    setReplyText('');
  };

  // Compute some quick statistics
  const totalCount = feedbacks.length;
  const adminCount = feedbacks.filter((f) => f.senderRole === 'admin').length;
  const memberCount = feedbacks.filter((f) => f.senderRole === 'member').length;

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((fb) => {
      const matchesSearch =
        fb.senderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fb.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (fb.className && fb.className.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesRole = roleFilter === 'all' || fb.senderRole === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [feedbacks, searchTerm, roleFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#141126]/90 border border-purple-500/10 shadow flex items-center justify-between">
          <div>
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Kritik & Saran
            </span>
            <span className="text-2xl font-extrabold text-white mt-1 block">
              {totalCount}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#141126]/90 border border-purple-500/10 shadow flex items-center justify-between">
          <div>
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Masukan dari Admin
            </span>
            <span className="text-2xl font-extrabold text-purple-400 mt-1 block">
              {adminCount}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
            <Shield className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#141126]/90 border border-purple-500/10 shadow flex items-center justify-between">
          <div>
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Masukan dari Siswa/Member
            </span>
            <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">
              {memberCount}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Bar: Search and Filters */}
      <div className="bg-[#141126]/90 border border-[#2c2250] rounded-3xl p-4 flex flex-col md:flex-row md:items-center gap-4 justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari pengirim, isi kritik/saran, atau nama kelas..."
            className="w-full bg-[#0a0814] border border-[#2b2154] focus:border-pink-500 rounded-xl py-2 px-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-pink-500/20"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex bg-[#0a0814] border border-[#2b2154] p-1 rounded-xl">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                roleFilter === 'all'
                  ? 'bg-pink-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                roleFilter === 'admin'
                  ? 'bg-[#1b143a]/90 border border-[#3c2a6e] text-purple-300 shadow'
                  : 'text-slate-400 hover:text-purple-300'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
            <button
              onClick={() => setRoleFilter('member')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                roleFilter === 'member'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Siswa</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        {filteredFeedbacks.length === 0 ? (
          <div className="bg-[#141126]/90 border border-[#2c2250] rounded-3xl p-12 text-center text-slate-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-semibold">Tidak ada kritik & saran ditemukan</p>
            <p className="text-xs text-slate-600 mt-1">
              {feedbacks.length === 0
                ? 'Belum ada anggota kelas yang mengirimkan kritik atau saran.'
                : 'Coba ubah kata kunci pencarian atau filter Anda.'}
            </p>
          </div>
        ) : (
          <div className="max-h-[350px] overflow-y-auto pr-1.5 space-y-4 scroll-smooth scrollbar-thin scrollbar-thumb-purple-500/20">
            {filteredFeedbacks.map((fb) => {
            const isEncouragement = fb.content.startsWith('[Semangat Dev]');
            const displayContent = isEncouragement 
              ? fb.content.replace(/^\[Semangat Dev\]\s*(💖\s*)?/, '') 
              : fb.content;

            return (
              <div
                key={fb.id}
                className={`border rounded-3xl p-5 shadow-lg transition-all relative group overflow-hidden ${
                  isEncouragement 
                    ? 'bg-gradient-to-br from-[#23153c]/90 via-[#170e28]/95 to-[#0b0515]/98 border-pink-500/30 hover:border-pink-500/50 shadow-pink-500/5'
                    : 'bg-[#141126]/90 border border-[#2c2250] hover:border-purple-500/20'
                }`}
              >
                {isEncouragement && (
                  <div className="absolute right-0 top-0 w-24 h-24 bg-pink-500/5 rounded-full blur-2xl pointer-events-none" />
                )}
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#211a3d] mb-4">
                  {/* Sender Identity */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow ${
                        isEncouragement
                          ? 'bg-gradient-to-tr from-pink-500 to-rose-600 shadow-pink-500/20 animate-pulse'
                          : fb.senderRole === 'admin'
                          ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-purple-600/10'
                          : 'bg-gradient-to-tr from-emerald-500 to-teal-600 shadow-emerald-500/10'
                      }`}
                    >
                      {isEncouragement ? (
                        <Sparkles className="w-5 h-5 text-pink-200 fill-pink-200" />
                      ) : fb.senderRole === 'admin' ? (
                        <Shield className="w-5 h-5" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-sm">
                          {fb.senderName}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                            isEncouragement
                              ? 'bg-pink-500/20 border-pink-500/40 text-pink-300 animate-pulse'
                              : fb.senderRole === 'admin'
                              ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          }`}
                        >
                          {isEncouragement ? '💖 Dukungan Semangat' : fb.senderRole === 'admin' ? 'Admin Kelas' : 'Siswa'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 block mt-0.5">
                        {fb.className ? `Kelas: ${fb.className}` : 'Luar Kelas / Akun Baru'}
                      </span>
                    </div>
                  </div>

                  {/* Date & Actions */}
                  <div className="flex items-center gap-3 sm:self-center self-end">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 bg-[#0b0816] px-2.5 py-1 rounded-lg border border-[#241a45]">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        {new Date(fb.createdAt).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </span>

                    <button
                      onClick={() => deleteFeedback(fb.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer border border-transparent hover:border-red-500/20"
                      title="Hapus saran ini"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>

                {/* Message Content */}
                <div className="relative">
                  <span className={`absolute -top-1.5 -left-1 text-3xl font-serif select-none ${isEncouragement ? 'text-pink-500/20' : 'text-purple-500/15'}`}>
                    “
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line pl-4 font-semibold mb-3">
                    {displayContent}
                  </p>
                </div>

              {/* Official Owner Response / Reply Display */}
              {fb.replyMessage && (
                <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-slate-300">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-amber-400 font-bold flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 border border-amber-500/40 text-amber-300 uppercase font-black">Owner 👑</span>
                      <span>Jawaban Resmi Owner:</span>
                    </span>
                    {fb.replyAt && (
                      <span className="text-[10px] font-mono text-slate-500">
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

              {/* Toggle Reply Button & Reply Form */}
              <div className="mt-4 pt-3 border-t border-[#211a3d] flex flex-col gap-3">
                {replyingFbId !== fb.id ? (
                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => {
                        setReplyingFbId(fb.id);
                        setReplyText(fb.replyMessage || '');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                      <span>{fb.replyMessage ? 'Ubah Balasan' : 'Balas Masukan'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-150">
                    <label className="text-[10px] font-bold text-slate-400 block uppercase">
                      Tulis Balasan Resmi Owner:
                    </label>
                    <textarea
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Masukkan tanggapan atau solusi resmi Anda selaku owner platform..."
                      className="w-full bg-[#0a0814] border border-[#2b2154] rounded-xl p-2.5 text-xs text-white outline-none focus:border-pink-500 resize-none font-medium placeholder:text-slate-600"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-2 text-xs">
                      <button
                        onClick={() => {
                          setReplyingFbId(null);
                          setReplyText('');
                        }}
                        className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => handleSendReply(fb.id)}
                        className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold shadow-md cursor-pointer"
                      >
                        Kirim Balasan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
          </div>
        )}
      </div>
    </div>
  );
};
