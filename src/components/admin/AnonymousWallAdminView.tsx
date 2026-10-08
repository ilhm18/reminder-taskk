import React, { useState } from 'react';
import {
  MessageSquareDashed,
  Pin,
  Trash2,
  Reply,
  Shield,
  Search,
  Heart,
  Sparkles,
  Lightbulb,
  MessageCircle,
  Flame,
  HelpCircle,
  Crown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AnonymousMessage, AnonymousTag } from '../../types';
import { formatIndonesianDate } from '../../utils/notification';
import { getTerminology, resolveEducatorType } from '../../utils/terminology';

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

export const AnonymousWallAdminView: React.FC = () => {
  const {
    currentClass,
    currentUser,
    anonymousMessages,
    addReplyToAnonymousMessage,
    togglePinAnonymousMessage,
    deleteAnonymousMessage,
    likeAnonymousMessage,
    showToast,
  } = useApp();

  const educatorType = resolveEducatorType(currentUser, currentClass);
  const terms = getTerminology(educatorType);

  const [selectedTag, setSelectedTag] = useState<'all' | AnonymousTag>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyingMessageId, setReplyingMessageId] = useState<string | null>(null);
  const [replyTextInput, setReplyTextInput] = useState('');

  // Filter messages for current class
  const classMessages = anonymousMessages.filter((m) => m.classId === currentClass?.id);

  const filtered = classMessages
    .filter((m) => {
      if (selectedTag !== 'all' && m.tag !== selectedTag) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.message.toLowerCase().includes(q) ||
          m.alias.toLowerCase().includes(q) ||
          (m.replyFromAdmin && m.replyFromAdmin.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleStartReply = (msg: AnonymousMessage) => {
    setReplyingMessageId(msg.id);
    setReplyTextInput(msg.replyFromAdmin || '');
  };

  const handleSaveReply = (msgId: string) => {
    if (!replyTextInput.trim()) {
      showToast('Tuliskan tanggapan terlebih dahulu.', 'warn');
      return;
    }
    addReplyToAnonymousMessage(msgId, replyTextInput.trim(), {
      authorName: currentUser?.name || 'Admin Kelas',
      authorRole: 'admin',
      authorEmoji: '🛡️',
    });
    setReplyingMessageId(null);
    setReplyTextInput('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#21143c] via-[#1a1130] to-[#120d24] border border-[#3b2866] p-6 sm:p-7 shadow-xl">
        <div className="absolute right-0 top-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5 shadow-lg shadow-pink-500/25 flex items-center justify-center text-white text-2xl shrink-0">
              🎭
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold text-[10px] uppercase tracking-wider border border-pink-500/30">
                  Kelola Anonymous Wall • {currentClass?.name || 'Ruang Kelas'}
                </span>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  {classMessages.length} Total Pesan Masuk
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Pesan &amp; Aspirasi Anonim {terms.memberTitle}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Pantau aspirasi dan curhatan anonim dari {terms.memberTitle.toLowerCase()} di kelas Anda, sematkan pesan penting, dan berikan tanggapan resmi.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-5 rounded-3xl bg-[#141126] border border-[#272144] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kata kunci pesan atau nama samaran..."
            className="w-full bg-[#1c1638] border border-[#332658] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-pink-500"
          />
        </div>

        {/* Tag Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedTag('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              selectedTag === 'all'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm'
                : 'bg-[#1c1638] text-slate-400 hover:text-white'
            }`}
          >
            Semua ({classMessages.length})
          </button>
          {(Object.keys(TAG_CONFIG) as AnonymousTag[]).map((tagKey) => {
            const count = classMessages.filter((m) => m.tag === tagKey).length;
            const isSelected = selectedTag === tagKey;
            return (
              <button
                key={tagKey}
                onClick={() => setSelectedTag(tagKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'bg-[#1c1638] text-slate-400 hover:text-white'
                }`}
              >
                <span>{tagKey}</span>
                <span className="text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Message List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-3xl bg-[#141126] border border-[#272144] p-8">
          <MessageSquareDashed className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-white">Tidak Ada Pesan Anonim</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Belum ada pesan yang cocok dengan filter pencarian ini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((msg) => {
            const conf = TAG_CONFIG[msg.tag] || TAG_CONFIG.Aspirasi;
            const Icon = conf.icon;
            const isReplying = replyingMessageId === msg.id;
            const repliesList = Array.isArray(msg.replies) ? msg.replies : [];

            return (
              <div
                key={msg.id}
                className={`p-5 rounded-3xl bg-[#17122e] border ${
                  msg.isPinned ? 'border-amber-400/60 shadow-lg shadow-amber-500/10' : 'border-[#2d224d]'
                } hover:border-pink-500/50 transition-all flex flex-col justify-between`}
              >
                <div>
                  {/* Top Bar: Alias + Pinned */}
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
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1">
                          <Pin className="w-3 h-3 fill-amber-300 text-amber-300" />
                          <span>Pinned</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Message content */}
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal whitespace-pre-wrap">
                    {msg.message}
                  </p>

                  {/* Thread Replies & Official Responses */}
                  {(repliesList.length > 0 || msg.replyFromAdmin) && (
                    <div className="mt-3.5 space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar scroll-smooth">
                      {msg.replyFromAdmin && repliesList.length === 0 && (
                        <div className="p-3 rounded-2xl bg-pink-950/40 border border-pink-500/30 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-pink-300 font-bold text-[11px] flex items-center gap-1">
                              <Shield className="w-3.5 h-3.5 text-pink-400" />
                              <span>Tanggapan Resmi Admin:</span>
                            </span>
                            {msg.replyAt && (
                              <span className="text-[10px] font-mono text-slate-400">
                                {formatIndonesianDate(msg.replyAt)}
                              </span>
                            )}
                          </div>
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

                  {/* Inline Reply Form */}
                  {isReplying && (
                    <div className="mt-3 p-3 rounded-2xl bg-[#17112e] border border-pink-500/40 space-y-2 animate-in fade-in duration-150">
                      <label className="text-[11px] font-bold text-pink-300 block">
                        Tuliskan Tanggapan Resmi Admin:
                      </label>
                      <textarea
                        rows={2}
                        value={replyTextInput}
                        onChange={(e) => setReplyTextInput(e.target.value)}
                        placeholder="Tuliskan tanggapan resmi dari pihak admin kelas..."
                        className="w-full bg-[#120d26] border border-[#2e2352] rounded-xl p-2.5 text-xs text-white outline-none focus:border-pink-500 resize-none"
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
                          onClick={() => handleSaveReply(msg.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold shadow cursor-pointer"
                        >
                          Publikasikan Tanggapan
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
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
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
                      onClick={() => togglePinAnonymousMessage(msg.id)}
                      className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                        msg.isPinned
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : 'bg-white/5 border-transparent text-slate-300 hover:text-white hover:bg-white/10'
                      }`}
                      title={msg.isPinned ? 'Lepas Sematan' : 'Sematkan ke Atas'}
                    >
                      <Pin className={`w-3.5 h-3.5 ${msg.isPinned ? 'fill-amber-300' : ''}`} />
                    </button>

                    <button
                      onClick={() => handleStartReply(msg)}
                      className="px-3 py-1.5 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 text-pink-300 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Reply className="w-3.5 h-3.5" />
                      <span>{isReplying ? 'Tutup Form' : 'Tanggapi'}</span>
                    </button>

                    <button
                      onClick={() => deleteAnonymousMessage(msg.id)}
                      className="p-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                      title="Hapus Pesan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
