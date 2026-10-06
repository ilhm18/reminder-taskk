import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MessageSquare, Send, Sparkles, User, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const MemberAdminChatView: React.FC = () => {
  const {
    currentClass,
    currentUser,
    classChats,
    sendClassChatMessage,
    markClassChatsAsRead,
    showToast,
  } = useApp();

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const adminName = currentClass?.adminName || 'Admin Kelas';
  const adminId = currentClass?.adminId || 'admin';

  // Filter messages for current member with Admin
  const myChatThread = useMemo(() => {
    if (!currentUser || !currentClass) return [];
    return classChats.filter(
      (c) =>
        (c.classId === currentClass.id || c.classId === currentClass.code) &&
        (c.senderId === currentUser.id ||
          c.recipientId === currentUser.id ||
          (c.senderRole === 'member' && c.senderName === currentUser.name) ||
          c.recipientName === currentUser.name)
    );
  }, [classChats, currentUser, currentClass]);

  // Mark as read when opened
  useEffect(() => {
    if (adminId) {
      markClassChatsAsRead(adminId);
    }
  }, [myChatThread.length]);

  // Auto scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [myChatThread.length]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      await sendClassChatMessage(adminId, adminName, text);
    } catch (err) {
      console.warn('Send member chat error:', err);
      showToast('Gagal mengirim pesan ke admin.', 'warn');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#141126] border border-[#272144] p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-5 h-5 text-pink-400" />
            <h3 className="text-lg font-extrabold text-white">Chat Dengan Admin Kelas</h3>
          </div>
          <p className="text-xs text-slate-400">
            Kirim pertanyaan, konsultasi tugas, atau diskusi langsung ke admin kelas <span className="font-bold text-pink-300">({currentClass?.name})</span>
          </p>
        </div>
      </div>

      <div className="bg-[#141126] border border-[#272144] rounded-3xl shadow-2xl flex flex-col overflow-hidden min-h-[500px]">
        {/* Admin Header Bar */}
        <div className="p-4 bg-[#181330] border-b border-[#271d47] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
              <ShieldCheck className="w-5 h-5 text-pink-300" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <span>{adminName}</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[9px] font-mono font-bold border border-purple-500/30">
                  Pengelola Kelas
                </span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Ruang Kelas: {currentClass?.name || 'Utama'} (Kode: {currentClass?.code})
              </p>
            </div>
          </div>
        </div>

        {/* Chat Thread Messages */}
        <div
          ref={chatContainerRef}
          className="flex-1 p-4 overflow-y-auto space-y-3.5 max-h-[380px] bg-[#100d20]"
        >
          {myChatThread.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#1b1536] text-pink-400 flex items-center justify-center mx-auto border border-[#2f2252]">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-300">Belum Ada Pesan Dengan Admin</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Tulis pesan Anda di bawah untuk bertanya mengenai materi, kuis, atau pengumpulan tugas kepada admin kelas.
              </p>
            </div>
          ) : (
            myChatThread.map((msg) => {
              const isMyMsg = msg.senderId === currentUser?.id || msg.senderRole === 'member';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMyMsg ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-md p-3.5 rounded-2xl text-xs shadow-md leading-relaxed ${
                      isMyMsg
                        ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-br-xs'
                        : 'bg-[#1e173b] border border-[#31255e] text-slate-100 rounded-bl-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1 text-[10px] opacity-80 border-b border-white/10 pb-1">
                      <span className="font-bold">{msg.senderName}</span>
                      <span className="font-mono text-[9px]">
                        {new Date(msg.createdAt).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap font-medium">{msg.message}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="p-3 bg-[#181330] border-t border-[#271d47] flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Tulis pesan untuk ${adminName}...`}
            className="flex-1 bg-[#100d20] border border-[#2d2250] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-pink-500 font-medium transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-pink-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSending ? '...' : 'Kirim'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
