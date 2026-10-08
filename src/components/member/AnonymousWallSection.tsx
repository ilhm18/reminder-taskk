import React, { useState } from 'react';
import {
  MessageSquareDashed,
  Send,
  Heart,
  Sparkles,
  Shuffle,
  Pin,
  MessageCircle,
  Shield,
  Filter,
  Check,
  Copy,
  AlertCircle,
  Eye,
  Flame,
  HelpCircle,
  Lightbulb,
  Crown,
  Reply,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AnonymousMessage, AnonymousTag } from '../../types';
import { formatIndonesianDate, playNotificationSound } from '../../utils/notification';

const RANDOM_ALIASES = [
  'Siswa Misterius',
  'Kucing Senja',
  'Pengagum Rahasia',
  'Bintang Malam',
  'Pejuang Nilai A',
  'Pemuja Kopi Susu',
  'Anak Ambis Santai',
  'Penikmat Hujan',
  'Pikachu Cerdas',
  'Rubah Bijak',
  'Panda Mengantuk',
  'Dragon Legend',
  'Sobat Belajar',
  'Anonim Kelas',
];

const AVATAR_EMOJIS = ['✨', '🎭', '🐱', '🦊', '🐼', '🐰', '🐉', '⭐', '☕', '🚀', '🎨', '🔥', '🦉', '🌙'];

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

const CARD_GRADIENTS = [
  'from-[#2a1b4e] via-[#1f153d] to-[#140e28]',
  'from-[#3b173c] via-[#28122c] to-[#160a1a]',
  'from-[#132647] via-[#0f1d38] to-[#0a1224]',
  'from-[#16382e] via-[#102922] to-[#0a1b16]',
  'from-[#382613] via-[#291b0d] to-[#170e06]',
];

export const AnonymousWallSection: React.FC = () => {
  const { currentUser, currentClass, anonymousMessages, addAnonymousMessage, likeAnonymousMessage, addReplyToAnonymousMessage, showToast } = useApp();

  const [messageInput, setMessageInput] = useState('');
  const [alias, setAlias] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('✨');
  const [selectedGradient, setSelectedGradient] = useState(CARD_GRADIENTS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Device-level liked tracking to prevent multi-like abuse
  const [deviceLikedIds, setDeviceLikedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('remindtask_liked_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const handleLikeToggle = (msgId: string) => {
    likeAnonymousMessage(msgId);
    try {
      const saved = localStorage.getItem('remindtask_liked_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setDeviceLikedIds(parsed);
        }
      }
    } catch {}
  };

  // Reply state
  const [replyingMessageId, setReplyingMessageId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyAlias, setReplyAlias] = useState('');

  // Filter messages for current class (no categories needed)
  const classMessages = anonymousMessages
    .filter((m) => m.classId === currentClass?.id)
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const filteredMessages = classMessages;

  const handleRandomizeIdentity = () => {
    const randomAlias = RANDOM_ALIASES[Math.floor(Math.random() * RANDOM_ALIASES.length)] + ' #' + Math.floor(10 + Math.random() * 90);
    const randomEmoji = AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];
    const randomGrad = CARD_GRADIENTS[Math.floor(Math.random() * CARD_GRADIENTS.length)];
    setAlias(randomAlias);
    setAvatarEmoji(randomEmoji);
    setSelectedGradient(randomGrad);
    playNotificationSound('chime');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) {
      showToast('Tulis pesan anonim kamu terlebih dahulu.', 'warn');
      return;
    }
    if (messageInput.trim().length < 3) {
      showToast('Pesan terlalu singkat (minimal 3 karakter).', 'warn');
      return;
    }

    setIsSubmitting(true);
    try {
      await addAnonymousMessage({
        classId: currentClass?.id || 'class-1',
        className: currentClass?.name || 'Ruang Kelas',
        message: messageInput.trim(),
        tag: 'Aspirasi',
        alias: alias.trim() || 'Siswa Anonim',
        avatarEmoji: avatarEmoji || '🎭',
        cardGradient: selectedGradient,
        senderId: currentUser?.id,
        senderName: currentUser?.name || 'Siswa Kelas',
        senderEmail: currentUser?.email,
        senderUsername: currentUser?.username,
        senderRole: currentUser?.role || 'member',
      });

      setMessageInput('');
      setAlias('');
      setAvatarEmoji('✨');
    } catch {
      showToast('Gagal mengirim pesan, coba lagi.', 'warn');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartReply = (msg: AnonymousMessage) => {
    if (replyingMessageId === msg.id) {
      setReplyingMessageId(null);
      setReplyText('');
    } else {
      setReplyingMessageId(msg.id);
      setReplyText('');
      setReplyAlias(alias.trim() || '');
    }
  };

  const handleSendReply = (msgId: string) => {
    if (!replyText.trim()) {
      showToast('Tulis tanggapan terlebih dahulu.', 'warn');
      return;
    }

    addReplyToAnonymousMessage(msgId, replyText.trim(), {
      authorName: replyAlias.trim() || alias.trim() || 'Siswa Anonim',
      authorEmoji: avatarEmoji || '💬',
      authorRole: 'member',
      senderId: currentUser?.id,
      realSenderName: currentUser?.name || 'Siswa Kelas',
      senderEmail: currentUser?.email,
    });

    setReplyingMessageId(null);
    setReplyText('');
  };

  return (
    <section className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#21143c] via-[#1a1130] to-[#120d24] border border-[#3b2866] p-6 sm:p-7 shadow-xl">
        <div className="absolute right-0 top-0 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5 shadow-lg shadow-pink-500/25 flex items-center justify-center text-white text-2xl shrink-0">
              🎭
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold text-[10px] uppercase tracking-wider border border-pink-500/30">
                  Anonymous Wall • {currentClass?.name || 'Ruang Kelas'}
                </span>
                <span className="text-[11px] font-mono text-slate-400">100% Rahasia &amp; Aman</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Suara &amp; Aspirasi Anonim Kelas
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Tuliskan curhat, aspirasi, masukan pelajaran, atau ucapan semangat tanpa takut identitas aslimu diketahui!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Input Box: Write Anonymous Message */}
      <div className="p-6 rounded-3xl bg-[#141126] border border-[#272144] shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#231c3d]">
            {/* Identity badge & Manual Input */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-[#1b1536] border border-[#34275a] focus-within:border-pink-500 rounded-2xl px-3 py-1.5 transition-all shadow-inner">
                <button
                  type="button"
                  onClick={() => {
                    const nextIdx = (AVATAR_EMOJIS.indexOf(avatarEmoji) + 1) % AVATAR_EMOJIS.length;
                    setAvatarEmoji(AVATAR_EMOJIS[nextIdx]);
                  }}
                  className="text-2xl hover:scale-110 active:scale-95 transition-transform cursor-pointer select-none"
                  title="Klik untuk ganti emoji avatar"
                >
                  {avatarEmoji}
                </button>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
                    Identitas Samaran Kamu:
                  </span>
                  <input
                    type="text"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    placeholder="Ketik nama samaran..."
                    maxLength={32}
                    className="bg-transparent text-xs sm:text-sm font-black text-pink-300 font-mono outline-none w-36 sm:w-48 placeholder:text-slate-500 placeholder:font-normal"
                    title="Ketik nama samaranmu secara manual di sini"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleRandomizeIdentity}
                className="px-3 py-2 rounded-xl bg-[#20183b] hover:bg-[#2d2252] text-slate-300 hover:text-pink-300 text-xs font-semibold flex items-center gap-1.5 border border-[#312558] transition-colors cursor-pointer shrink-0"
                title="Acak nama samaran & avatar otomatis"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">Acak Identitas</span>
              </button>
            </div>
          </div>

          {/* Textarea */}
          <div className="relative">
            <textarea
              rows={3}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Tuliskan pesanmu di sini secara santai... (Contoh: Semoga kuis besok nilainya bagus semua! / Tolong admin tambahkan waktu pengumpulan praktikum ya...)"
              maxLength={400}
              className="w-full bg-[#1b1636] border border-[#34275a] rounded-2xl p-4 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-pink-500 transition-colors resize-none leading-relaxed"
            />
            <span className="absolute right-3 bottom-3 text-[10px] font-mono text-slate-500">
              {messageInput.length}/400
            </span>
          </div>

          {/* Footer Submit Bar */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Identitas akun aslimu tidak disimpan di pesan ini</span>
            </span>

            <button
              type="submit"
              disabled={isSubmitting || !messageInput.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-pink-500/25 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Mengirim...' : 'Kirim ke Wall'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Wall Filters & Stats */}
      <div className="flex items-center justify-between gap-3 border-b border-[#231c3d]/60 pb-3">
        <h3 className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-pink-500" />
          <span>Papan Pesan Anonim ({classMessages.length})</span>
        </h3>
        <span className="text-xs text-slate-400 font-mono">
          Total {classMessages.length} pesan di wall
        </span>
      </div>

      {/* Messages Grid */}
      {filteredMessages.length === 0 ? (
        <div className="text-center py-14 bg-[#141126] border border-[#272144] rounded-3xl p-6">
          <MessageSquareDashed className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-white">Belum Ada Pesan Anonim</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Jadilah yang pertama menuliskan pesan, curhat, atau aspirasi di Anonymous Wall kelas ini!
          </p>
        </div>
      ) : (
        <div className="max-h-[1050px] md:max-h-[620px] overflow-y-auto pr-1 scroll-smooth scrollbar-thin scrollbar-thumb-pink-500/15">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
            {filteredMessages.map((msg) => {
              const repliesList = Array.isArray(msg.replies) ? msg.replies : [];
              const isReplying = replyingMessageId === msg.id;
              const deviceLiked = deviceLikedIds.includes(msg.id);

              return (
                <div
                  key={msg.id}
                  className={`p-5 rounded-3xl bg-gradient-to-br ${
                    msg.cardGradient || 'from-[#22153d] via-[#1a1130] to-[#120c22]'
                  } border ${
                    msg.isPinned ? 'border-amber-400/60 shadow-lg shadow-amber-500/10' : 'border-[#2e2350]'
                  } hover:border-pink-500/50 transition-all flex flex-col justify-between group`}
                >
                  <div>
                    {/* Top row: Avatar + Pinned */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{msg.avatarEmoji || '🎭'}</span>
                        <div>
                          <span className="text-xs font-bold text-white block leading-tight">{msg.alias}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatIndonesianDate(msg.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {msg.isPinned && (
                          <span
                            className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1"
                            title="Disematkan oleh Admin"
                          >
                            <Pin className="w-3 h-3 fill-amber-300 text-amber-300" />
                            <span>Pinned</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Message body */}
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal whitespace-pre-wrap">
                      {msg.message}
                    </p>

                    {/* Tanggapan & Thread Replies - Max 2 rows with auto-scroll container */}
                    {(repliesList.length > 0 || msg.replyFromAdmin) && (
                      <div className="mt-3.5 space-y-2 max-h-[170px] overflow-y-auto pr-1.5 scroll-smooth scrollbar-thin scrollbar-thumb-pink-500/10">
                        {/* Legacy admin reply if not yet in repliesList */}
                        {msg.replyFromAdmin && repliesList.length === 0 && (
                          <div className="p-3 rounded-2xl bg-pink-950/40 border border-pink-500/30 text-xs">
                            <div className="flex items-center gap-1.5 text-pink-300 font-bold text-[11px] mb-1">
                              <Shield className="w-3.5 h-3.5 text-pink-400" />
                              <span>Tanggapan Resmi Admin:</span>
                            </div>
                            <p className="text-slate-300 leading-relaxed">{msg.replyFromAdmin}</p>
                          </div>
                        )}

                        {/* Multi-role replies list */}
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
                                  : 'bg-[#18132e] border border-[#2f2452]'
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

                    {/* Inline Reply Input Box for Member */}
                    {isReplying && (
                      <div className="mt-3.5 p-3 rounded-2xl bg-[#141029] border border-pink-500/40 space-y-2 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-pink-300 font-bold flex items-center gap-1">
                            <Reply className="w-3.5 h-3.5 text-pink-400" />
                            <span>Tanggapi Pesan Ini:</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setReplyingMessageId(null)}
                            className="text-slate-400 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <input
                          type="text"
                          value={replyAlias}
                          onChange={(e) => setReplyAlias(e.target.value)}
                          placeholder="Nama samaranmu (opsional)..."
                          maxLength={25}
                          className="w-full bg-[#1b1536] border border-[#34275a] focus:border-pink-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
                        />

                        <textarea
                          rows={2}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Tuliskan tanggapan atau saranmu..."
                          maxLength={300}
                          className="w-full bg-[#1b1536] border border-[#34275a] focus:border-pink-500 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 outline-none resize-none leading-relaxed"
                          autoFocus
                        />

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setReplyingMessageId(null)}
                            className="px-3 py-1.5 rounded-lg bg-[#21183d] text-slate-400 text-xs font-semibold hover:text-white cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendReply(msg.id)}
                            disabled={!replyText.trim()}
                            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xs flex items-center gap-1 shadow-sm disabled:opacity-50 cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>Kirim Tanggapan</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Reactions & Actions */}
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLikeToggle(msg.id)}
                        className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-bold transition-all cursor-pointer ${
                          deviceLiked
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                            : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
                        }`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${deviceLiked ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`}
                        />
                        <span>{msg.likes || 0}</span>
                      </button>

                      <button
                        onClick={() => handleStartReply(msg)}
                        className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-bold transition-all cursor-pointer ${
                          isReplying
                            ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                            : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
                        }`}
                        title="Beri Tanggapan"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{repliesList.length > 0 ? `${repliesList.length} Tanggapan` : 'Tanggapi'}</span>
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`[Pesan Anonim - ${msg.alias}]\n"${msg.message}"`);
                        showToast('Pesan berhasil disalin!', 'success');
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Salin isi pesan"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
