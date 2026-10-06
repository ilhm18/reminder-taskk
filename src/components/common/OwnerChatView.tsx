import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Send, MessageSquare, User, Shield, Sparkles, AlertCircle, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const OwnerChatView: React.FC = () => {
  const { currentUser, currentRole, ownerChats, sendOwnerChatMessage, users, classes } = useApp();
  const [inputText, setInputText] = useState('');
  const [selectedThreadUserId, setSelectedThreadUserId] = useState<string | null>(null);
  
  const isOwner = currentRole === 'owner';
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [ownerChats, selectedThreadUserId]);

  // Group chats by user for the Owner's inbox view
  const chatThreads = useMemo(() => {
    if (!isOwner) return [];
    
    // Group messages by their non-owner senderId
    const threadsMap: Record<string, {
      userId: string;
      userName: string;
      userRole: 'admin' | 'member';
      lastMessage: string;
      lastTimestamp: string;
      className?: string;
      unread?: boolean;
    }> = {};

    ownerChats.forEach((c) => {
      // If from owner, we find who we sent it to based on recipient context or we assign to the non-owner participant
      const participantId = c.isFromOwner ? c.senderId : c.senderId; 
      // Actually, when owner sends, c.senderId holds the user we are replying to (set as customSenderId)
      const isOwnerSent = c.isFromOwner;
      const targetUserId = participantId;

      if (!targetUserId || targetUserId === 'owner') return;

      const userObj = users.find((u) => u.id === targetUserId);
      const userClassName = userObj?.className || 'Kelas Umum';

      const existing = threadsMap[targetUserId];
      if (!existing || new Date(c.createdAt).getTime() > new Date(existing.lastTimestamp).getTime()) {
        threadsMap[targetUserId] = {
          userId: targetUserId,
          userName: c.senderName,
          userRole: c.senderRole,
          lastMessage: c.message,
          lastTimestamp: c.createdAt,
          className: userClassName,
        };
      }
    });

    return Object.values(threadsMap).sort(
      (a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime()
    );
  }, [ownerChats, isOwner]);

  // If Owner is viewing, do NOT set any default active thread on load (WhatsApp-like behavior)
  // Thread must be explicitly clicked to load messages.
  useEffect(() => {
    // Left empty intentionally to prevent auto-loading the first thread
  }, [isOwner, chatThreads, selectedThreadUserId]);

  // Filter messages for current thread
  const activeMessages = useMemo(() => {
    if (isOwner) {
      if (!selectedThreadUserId) return [];
      return ownerChats.filter((c) => c.senderId === selectedThreadUserId);
    } else {
      // Standard member/admin sees only chats associated with their own id
      return ownerChats.filter((c) => c.senderId === currentUser?.id);
    }
  }, [ownerChats, isOwner, selectedThreadUserId, currentUser]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (isOwner) {
      if (!selectedThreadUserId) return;
      const activeThread = chatThreads.find((t) => t.userId === selectedThreadUserId);
      const recipientName = activeThread?.userName || 'User';
      const recipientRole = activeThread?.userRole || 'member';
      
      // For Owner sending, pass target details so we associate with their thread
      await sendOwnerChatMessage(inputText, recipientRole, selectedThreadUserId, recipientName);
    } else {
      await sendOwnerChatMessage(inputText);
    }

    setInputText('');
  };

  const getActiveThreadUser = () => {
    if (!selectedThreadUserId) return null;
    return chatThreads.find((t) => t.userId === selectedThreadUserId) || null;
  };

  const activeUser = getActiveThreadUser();

  return (
    <div className="bg-[#141126]/90 border border-[#2c2250] rounded-3xl overflow-hidden shadow-2xl animate-in fade-in duration-300 flex flex-col md:flex-row h-[600px]">
      
      {/* LEFT COLUMN: Threads List (Owner Only) */}
      {isOwner && (
        <div className="w-full md:w-80 border-r border-[#2c2250] flex flex-col bg-[#0d091d]/60 shrink-0">
          <div className="p-4.5 border-b border-[#2c2250] bg-[#110c25]">
            <h3 className="text-sm font-extrabold text-pink-400 flex items-center gap-2">
              <MessageSquare className="w-4.5 h-4.5 text-pink-500" />
              <span>Kotak Masuk Chat ({chatThreads.length})</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-medium leading-normal">
              Konsultasi langsung dari Siswa &amp; Admin Kelas
            </p>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#20183e]/40 p-2 space-y-1">
            {chatThreads.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <span>Belum ada chat masuk</span>
              </div>
            ) : (
              chatThreads.map((thread) => {
                const isActive = thread.userId === selectedThreadUserId;
                const isAdmin = thread.userRole === 'admin';

                return (
                  <button
                    key={thread.userId}
                    onClick={() => setSelectedThreadUserId(thread.userId)}
                    className={`w-full text-left p-3.5 rounded-2xl transition-all flex items-start gap-3 cursor-pointer border ${
                      isActive 
                        ? 'bg-gradient-to-r from-pink-500/15 to-purple-600/15 border-pink-500/40 text-white shadow-lg shadow-pink-500/5' 
                        : 'hover:bg-[#1a1436]/40 border-transparent text-slate-300'
                    }`}
                  >
                    <div className={`w-9.5 h-9.5 rounded-xl flex items-center justify-center shrink-0 ${
                      isAdmin ? 'bg-purple-600/20 text-purple-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {isAdmin ? <Shield className="w-4.5 h-4.5" /> : <User className="w-4.5 h-4.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <span className="font-bold text-xs text-white truncate block">{thread.userName}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border shrink-0 uppercase tracking-wider ${
                          isAdmin ? 'bg-purple-500/15 border-purple-500/30 text-purple-300' : 'bg-pink-500/15 border-pink-500/30 text-pink-300'
                        }`}>
                          {isAdmin ? `Admin • ${thread.className || 'Kelas'}` : `Member • ${thread.className || 'Kelas'}`}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-400 truncate leading-relaxed">{thread.lastMessage}</p>
                      <span className="text-[9px] text-slate-500 block mt-1 font-mono">
                        {new Date(thread.lastTimestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* RIGHT COLUMN: Active Chat Messages Box */}
      <div className="flex-1 flex flex-col bg-[#0a0717]/40">
        
        {!selectedThreadUserId && isOwner ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 p-8">
            <div className="w-16 h-16 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-4 animate-pulse">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h5 className="text-base font-extrabold text-white">RemindTask Chat Hub</h5>
            <p className="text-xs text-slate-400 max-w-xs mt-2 leading-relaxed">
              Pilih salah satu percakapan di sebelah kiri untuk membaca dan membalas pesan secara realtime.
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-[#2c2250] bg-[#110c25] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className={`w-9.5 h-9.5 rounded-2xl flex items-center justify-center ${
                  isOwner 
                    ? (activeUser?.userRole === 'admin' ? 'bg-purple-600/20 text-purple-300' : 'bg-emerald-500/20 text-emerald-300')
                    : 'bg-gradient-to-tr from-pink-500/20 to-purple-500/20 text-pink-300'
                }`}>
                  {isOwner ? (
                    activeUser?.userRole === 'admin' ? <Shield className="w-4.5 h-4.5" /> : <User className="w-4.5 h-4.5" />
                  ) : (
                    <Sparkles className="w-4.5 h-4.5 animate-pulse" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    {isOwner ? (activeUser?.userName || 'Pilih Chat') : 'Chat Langsung dengan Owner'}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {isOwner 
                      ? (activeUser ? `Role: ${activeUser.userRole === 'admin' ? 'Admin Kelas' : 'Siswa'}` : 'Pilih percakapan aktif dari bilah samping') 
                      : 'Konsultasi, kritik, atau saran langsung yang direspon langsung oleh Owner platform!'
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping" />
                  <span>Realtime</span>
                </span>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scroll-smooth scrollbar-thin">
              {activeMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-6">
                  <MessageSquare className="w-12 h-12 text-slate-600 mb-3 animate-bounce" />
                  <h5 className="text-sm font-bold text-white">Mulai Percakapan</h5>
                  <p className="text-xs text-slate-400 max-w-xs mt-1.5">
                    {isOwner 
                      ? 'Kirimkan pesan sapaan atau tanggapan pertama untuk memulai obrolan.' 
                      : 'Kirimkan masukan, curhat, bantuan sistem, atau ucapan pertamamu langsung kepada Owner!'
                    }
                  </p>
                </div>
              ) : (
                activeMessages.map((msg) => {
                  // Message is outgoing if:
                  // - current user is owner AND msg isFromOwner
                  // - current user is NOT owner AND msg isNOT from owner
                  const isOutgoing = (isOwner && msg.isFromOwner) || (!isOwner && !msg.isFromOwner);

                  return (
                    <div 
                      key={msg.id} 
                      className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} animate-in fade-in duration-150`}
                    >
                      <div className={`max-w-[80%] rounded-2xl p-3.5 ${
                        isOutgoing 
                          ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-br-none shadow-md shadow-pink-500/5' 
                          : 'bg-[#18132e] border border-[#2f2452] text-slate-100 rounded-bl-none'
                      }`}>
                        {/* Sender Label for Incoming Chats (Owner Only) */}
                        {!isOutgoing && (
                          <div className="flex items-center gap-1.5 mb-1.5 text-[9px] font-black uppercase text-pink-300">
                            {msg.isFromOwner ? (
                              <span className="bg-pink-500/20 px-1 py-0.5 rounded text-pink-300">Owner 👑</span>
                            ) : (
                              <span>{msg.senderName} ({msg.senderRole})</span>
                            )}
                          </div>
                        )}
                        <p className="text-xs leading-relaxed font-normal whitespace-pre-wrap break-words">{msg.message}</p>
                        <div className="flex items-center justify-end mt-1 text-[8px] opacity-60 font-mono">
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Message Input Box */}
            <form onSubmit={handleSend} className="p-3.5 border-t border-[#2c2250] bg-[#110c25] shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isOwner && !selectedThreadUserId}
                  placeholder={
                    isOwner 
                      ? (selectedThreadUserId ? 'Ketik balasan resmi owner...' : 'Pilih percakapan terlebih dahulu') 
                      : 'Tulis pesan langsung untuk Owner disini...'
                  }
                  className="flex-1 bg-[#0a0814] border border-[#2b2154] focus:border-pink-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || (isOwner && !selectedThreadUserId)}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold transition-all shadow shadow-pink-500/20 active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  <Send className="w-4.5 h-4.5" />
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
