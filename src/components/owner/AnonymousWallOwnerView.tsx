import React, { useState } from 'react';
import {
  MessageSquareDashed,
  Trash2,
  Shield,
  Search,
  Heart,
  Sparkles,
  Lightbulb,
  MessageCircle,
  Flame,
  HelpCircle,
  Layers,
  Pin,
  TrendingUp,
  BarChart2,
  Crown,
  Reply,
  Send,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AnonymousMessage, AnonymousTag } from '../../types';
import { formatIndonesianDate } from '../../utils/notification';

const TAG_CONFIG: Record<
  AnonymousTag,
  { label: string; icon: React.FC<{ className?: string }>; color: string; bg: string; border: string }
> = {
  Aspirasi: {
    label: 'Aspirasi',
    icon: Lightbulb,
    color: 'text-amber-300',
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/40',
  },
  Curhat: {
    label: 'Curhat',
    icon: MessageCircle,
    color: 'text-purple-300',
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/40',
  },
  Masukan: {
    label: 'Masukan Kelas',
    icon: MessageSquareDashed,
    color: 'text-blue-300',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/40',
  },
  Semangat: {
    label: 'Ucapan Semangat',
    icon: Flame,
    color: 'text-rose-300',
    bg: 'bg-rose-500/20',
    border: 'border-rose-500/40',
  },
  Tanya: {
    label: 'Tanya Anonim',
    icon: HelpCircle,
    color: 'text-cyan-300',
    bg: 'bg-cyan-500/20',
    border: 'border-cyan-500/40',
  },
  Ide: {
    label: 'Ide Kreatif',
    icon: Sparkles,
    color: 'text-emerald-300',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/40',
  },
};

export const AnonymousWallOwnerView: React.FC = () => {
  const { classes, currentUser, anonymousMessages, deleteAnonymousMessage, togglePinAnonymousMessage, addReplyToAnonymousMessage, likeAnonymousMessage, showToast } = useApp();

  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<'all' | AnonymousTag>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyingMessageId, setReplyingMessageId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const filtered = anonymousMessages
    .filter((m) => {
      if (selectedClassId !== 'all' && m.classId !== selectedClassId) return false;
      if (selectedTag !== 'all' && m.tag !== selectedTag) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.message.toLowerCase().includes(q) ||
          m.alias.toLowerCase().includes(q) ||
          m.className.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalAspirasi = anonymousMessages.filter((m) => m.tag === 'Aspirasi').length;
  const totalCurhat = anonymousMessages.filter((m) => m.tag === 'Curhat').length;
  const totalMasukan = anonymousMessages.filter((m) => m.tag === 'Masukan').length;
  const totalSemangat = anonymousMessages.filter((m) => m.tag === 'Semangat').length;

  const handleSendOwnerReply = (msgId: string) => {
    if (!replyText.trim()) {
      showToast('Tuliskan tanggapan owner terlebih dahulu.', 'warn');
      return;
    }

    addReplyToAnonymousMessage(msgId, replyText.trim(), {
      authorName: currentUser?.name || 'Owner Platform',
      authorEmoji: '👑',
      authorRole: 'owner',
    });

    setReplyingMessageId(null);
    setReplyText('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-gradient-to-r dark:from-[#2a133b] dark:via-[#1d0f2b] dark:to-[#120a1c] border border-slate-200 dark:border-[#4a2468] p-6 sm:p-7 shadow-sm">
        <div className="absolute right-0 top-0 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-pink-500 to-amber-500 p-0.5 shadow-lg shadow-pink-500/25 flex items-center justify-center text-white text-2xl shrink-0">
              🎭
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-pink-50 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 font-bold text-[10px] uppercase tracking-wider border border-pink-200 dark:border-pink-500/30">
                  Global Owner Moderation
                </span>
                <span className="text-xs font-mono text-amber-700 dark:text-amber-300 font-bold">
                  {anonymousMessages.length} Total Pesan di Seluruh Kelas
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                Pusat Pesan Anonim Seluruh Platform
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                Pantau seluruh lalu lintas pesan anonim, aspirasi, dan curhatan siswa dari seluruh ruang kelas di RemindTask.
              </p>
            </div>
          </div>
        </div>
      </div>



      {/* Filters and Class Selector */}
      <div className="p-5 rounded-3xl bg-[#141126] border border-[#272144] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kata kunci, nama, atau kelas..."
              className="w-full bg-[#1c1638] border border-[#332658] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-pink-500"
            />
          </div>

          {/* Class Filter */}
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="bg-[#1c1638] border border-[#332658] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-pink-500 cursor-pointer"
          >
            <option value="all">Semua Ruang Kelas ({classes.length})</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} ({cls.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-3xl bg-[#141126] border border-[#272144] p-8">
          <MessageSquareDashed className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-white">Tidak Ada Pesan Anonim</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Belum ada pesan yang cocok dengan filter atau pencarian saat ini.
          </p>
        </div>
      ) : (
        <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((msg) => {
              const conf = TAG_CONFIG[msg.tag] || TAG_CONFIG.Aspirasi;
              const Icon = conf.icon;
              const isReplying = replyingMessageId === msg.id;
              const repliesList = Array.isArray(msg.replies) ? msg.replies : [];

              return (
                <div
                  key={msg.id}
                  className="p-5 rounded-3xl bg-[#17112e] border border-[#2d224d] hover:border-pink-500/50 transition-all flex flex-col justify-between"
                >
                <div>
                  {/* Top: Alias + Class + Tag */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{msg.avatarEmoji || '🎭'}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">{msg.alias}</span>
                          <span className="px-2 py-0.2 rounded bg-white/10 text-pink-300 text-[9px] font-mono">
                            {msg.className}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatIndonesianDate(msg.createdAt)}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${conf.bg} ${conf.color} ${conf.border} border`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{conf.label}</span>
                    </span>
                  </div>

                  {/* Message content */}
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal whitespace-pre-wrap">
                    {msg.message}
                  </p>

                  {/* Thread Replies */}
                  {(repliesList.length > 0 || msg.replyFromAdmin) && (
                    <div className="mt-3.5 space-y-2">
                      {msg.replyFromAdmin && repliesList.length === 0 && (
                        <div className="p-3 rounded-2xl bg-pink-950/40 border border-pink-500/30 text-xs">
                          <span className="text-pink-300 font-bold text-[11px] block mb-1">
                            Tanggapan Resmi Admin:
                          </span>
                          <p className="text-slate-300 leading-relaxed">{msg.replyFromAdmin}</p>
                        </div>
                      )}

                      {repliesList.map((reply) => {
                        const isOwner = reply.authorRole === 'owner';
                        const isAdmin = reply.authorRole === 'admin';

                        return (
                          <div
                            key={reply.id}
                            className={`p-3 rounded-2xl text-xs ${
                              isOwner
                                ? 'bg-amber-950/40 border border-amber-500/40'
                                : isAdmin
                                ? 'bg-pink-950/40 border border-pink-500/30'
                                : 'bg-[#120d26] border border-[#271d47]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <div className="flex items-center gap-1.5">
                                {isOwner ? (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-[10px] flex items-center gap-1">
                                    <Crown className="w-3 h-3 text-amber-400" />
                                    <span>Owner</span>
                                  </span>
                                ) : isAdmin ? (
                                  <span className="px-2 py-0.5 rounded-md bg-pink-500/20 text-pink-300 border border-pink-500/30 font-bold text-[10px] flex items-center gap-1">
                                    <Shield className="w-3 h-3 text-pink-400" />
                                    <span>Admin Kelas</span>
                                  </span>
                                ) : (
                                  <span className="text-sm">{reply.authorEmoji || '💬'}</span>
                                )}
                                <span className="font-bold text-white text-[11px]">{reply.authorName}</span>
                              </div>
                              <span className="text-[9px] text-slate-400 font-mono">
                                {formatIndonesianDate(reply.createdAt)}
                              </span>
                            </div>
                            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{reply.message}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Inline Owner Reply Form */}
                  {isReplying && (
                    <div className="mt-3 p-3 rounded-2xl bg-[#17112e] border border-amber-500/40 space-y-2 animate-in fade-in duration-150">
                      <label className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                        <span>Tuliskan Tanggapan Resmi Owner:</span>
                      </label>
                      <textarea
                        rows={2}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Tuliskan respon atau arahan resmi dari platform owner..."
                        className="w-full bg-[#120d26] border border-[#3b2d61] rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-400 resize-none"
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setReplyingMessageId(null)}
                          className="px-3 py-1.5 rounded-lg bg-transparent text-slate-400 hover:text-white text-xs"
                        >
                          Batal
                        </button>
                        <button
                          onClick={() => handleSendOwnerReply(msg.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-600 text-white text-xs font-bold shadow cursor-pointer"
                        >
                          Kirim Tanggapan Owner
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Actions Bar */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs mt-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => likeAnonymousMessage(msg.id)}
                      className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-bold transition-all cursor-pointer ${
                        msg.likedByMe
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-transparent'
                      }`}
                      title={msg.likedByMe ? 'Batal Suka' : 'Suka'}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${msg.likedByMe ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`}
                      />
                      <span>{msg.likes || 0}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setReplyingMessageId(isReplying ? null : msg.id)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Reply className="w-3.5 h-3.5" />
                      <span>{isReplying ? 'Tutup' : 'Tanggapi'}</span>
                    </button>

                    <button
                      onClick={() => deleteAnonymousMessage(msg.id)}
                      className="p-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                      title="Hapus Pesan dari Server"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
};
