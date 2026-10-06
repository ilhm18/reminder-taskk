import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  User,
  Mail,
  CheckCheck,
  Check,
  Sparkles,
  RefreshCw,
  Copy,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatIndonesianDate } from '../../utils/notification';

export const AdminMemberChatView: React.FC = () => {
  const {
    currentClass,
    users,
    classAccessLogs,
    classChats,
    sendClassChatMessage,
    markClassChatsAsRead,
    currentUser,
    showToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // List of all students in current class
  const classStudents = useMemo(() => {
    if (!currentClass) return [];

    const map = new Map<string, { id: string; name: string; email: string; createdAt: string }>();

    // 1. Add members from users state
    users
      .filter((u) => u.role === 'member' && u.classId === currentClass.id)
      .forEach((m) => {
        map.set(m.id, {
          id: m.id,
          name: m.name,
          email: m.email || `${m.name.toLowerCase().replace(/\s+/g, '')}@siswa.remindtask.com`,
          createdAt: m.createdAt,
        });
      });

    // 2. Add members from classAccessLogs
    classAccessLogs
      .filter((l) => l.classId === currentClass.id || l.classCode === currentClass.code)
      .forEach((l) => {
        if (!map.has(l.studentId)) {
          map.set(l.studentId, {
            id: l.studentId,
            name: l.studentName,
            email: l.studentEmail,
            createdAt: l.accessedAt,
          });
        }
      });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [currentClass, users, classAccessLogs]);

  // Set default selected student if none selected
  useEffect(() => {
    if (!selectedStudentId && classStudents.length > 0) {
      setSelectedStudentId(classStudents[0].id);
    }
  }, [classStudents, selectedStudentId]);

  const activeStudent = useMemo(() => {
    return classStudents.find((s) => s.id === selectedStudentId) || null;
  }, [classStudents, selectedStudentId]);

  // Filter students by search query
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return classStudents;
    return classStudents.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }, [classStudents, searchQuery]);

  // Chat thread for active student
  const activeThread = useMemo(() => {
    if (!selectedStudentId || !currentClass) return [];
    return classChats.filter(
      (c) =>
        (c.classId === currentClass.id || c.classId === currentClass.code) &&
        (c.senderId === selectedStudentId ||
          c.recipientId === selectedStudentId ||
          (c.senderRole === 'member' && c.senderName === activeStudent?.name) ||
          (c.recipientName === activeStudent?.name))
    );
  }, [classChats, selectedStudentId, currentClass, activeStudent]);

  // Mark as read when student selected
  useEffect(() => {
    if (selectedStudentId) {
      markClassChatsAsRead(selectedStudentId);
    }
  }, [selectedStudentId, activeThread.length]);

  // Auto scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [activeThread.length]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeStudent) return;

    const text = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      await sendClassChatMessage(activeStudent.id, activeStudent.name, text);
    } catch (err) {
      console.warn('Send message error:', err);
      showToast('Gagal mengirim pesan.', 'warn');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141126] border border-[#272144] p-5 rounded-3xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-5 h-5 text-pink-400" />
            <h3 className="text-lg font-extrabold text-white">Layanan Chat & Konsultasi Siswa</h3>
          </div>
          <p className="text-xs text-slate-400">
            Kirim dan terima pesan langsung secara realtime kepada anggota di ruang kelas <span className="font-mono text-pink-300 font-bold">({currentClass?.name})</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1.5 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-300 font-mono text-xs font-bold">
            {classStudents.length} Siswa Terdaftar
          </span>
        </div>
      </div>

      {/* Main Chat Container Grid */}
      <div className="bg-[#141126] border border-[#272144] rounded-3xl shadow-2xl grid grid-cols-1 md:grid-cols-12 overflow-hidden min-h-[580px]">
        {/* LEFT SIDEBAR: STUDENT LIST */}
        <div className="md:col-span-5 lg:col-span-4 border-r border-[#241c42] flex flex-col bg-[#110e22]">
          {/* Search Box */}
          <div className="p-3.5 border-b border-[#221b3d]">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari siswa..."
                className="w-full bg-[#181330] border border-[#2d2250] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-pink-500 transition-colors font-medium"
              />
            </div>
          </div>

          {/* Student List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#1e1738] max-h-[500px]">
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Tidak ada siswa ditemukan.
              </div>
            ) : (
              filteredStudents.map((student) => {
                const isSelected = student.id === selectedStudentId;

                // Find unread count for this student
                const unreadCount = classChats.filter(
                  (c) =>
                    c.senderId === student.id &&
                    !c.isRead &&
                    (c.classId === currentClass?.id || c.classId === currentClass?.code)
                ).length;

                // Find last message
                const studentMessages = classChats.filter(
                  (c) => c.senderId === student.id || c.recipientId === student.id
                );
                const lastMsg = studentMessages[studentMessages.length - 1];

                return (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudentId(student.id)}
                    className={`w-full p-3.5 flex items-center justify-between gap-3 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-pink-500/10 border-l-4 border-l-pink-500 text-white'
                        : 'hover:bg-[#181233] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{student.name}</h4>
                        <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5 font-mono">
                          <Mail className="w-3 h-3 text-pink-400 shrink-0" />
                          <span className="truncate">{student.email}</span>
                        </p>
                        {lastMsg && (
                          <p className="text-[10px] text-slate-400 truncate mt-1 italic">
                            {lastMsg.senderRole === 'admin' ? 'Anda: ' : ''}{lastMsg.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {unreadCount > 0 ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold text-[9px] border border-pink-500/30 animate-pulse">
                          Pesan Baru
                        </span>
                        <span className="w-5 h-5 rounded-full bg-pink-500 text-white font-mono text-[10px] font-bold flex items-center justify-center shadow-lg">
                          {unreadCount}
                        </span>
                      </div>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL: CHAT THREAD */}
        <div className="md:col-span-7 lg:col-span-8 flex flex-col bg-[#141126]">
          {activeStudent ? (
            <>
              {/* Active Student Header */}
              <div className="p-4 bg-[#181330] border-b border-[#271d47] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
                    {activeStudent.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-sm truncate flex items-center gap-2">
                      <span>{activeStudent.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[9px] font-mono font-bold border border-emerald-500/30">
                        Siswa / Member
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400 font-mono truncate flex items-center gap-1 mt-0.5">
                      <Mail className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                      <span>{activeStudent.email}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(activeStudent.email);
                    showToast(`Email ${activeStudent.email} disalin!`, 'success');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#231a44] hover:bg-[#32245f] text-pink-300 text-xs font-bold border border-[#3b2868] flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Email</span>
                </button>
              </div>

              {/* Chat Thread Messages Area */}
              <div
                ref={chatContainerRef}
                className="flex-1 p-4 overflow-y-auto space-y-3.5 max-h-[420px] bg-[#100d20]"
              >
                {activeThread.length === 0 ? (
                  <div className="py-16 text-center text-slate-500 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-[#1b1536] text-pink-400 flex items-center justify-center mx-auto border border-[#2f2252]">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-300">Belum Ada Riwayat Percakapan</p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Ketik pesan di bawah untuk memulai percakapan atau memberi bimbingan langsung kepada {activeStudent.name}.
                    </p>
                  </div>
                ) : (
                  activeThread.map((msg) => {
                    const isAdminMsg = msg.senderRole === 'admin' || msg.senderRole === 'owner';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isAdminMsg ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-md p-3.5 rounded-2xl text-xs shadow-md leading-relaxed ${
                            isAdminMsg
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

              {/* Chat Input Box */}
              <form onSubmit={handleSendMessage} className="p-3 bg-[#181330] border-t border-[#271d47] flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Tulis pesan untuk ${activeStudent.name}...`}
                  className="flex-1 bg-[#100d20] border border-[#2d2250] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-pink-500 font-medium transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-pink-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSending ? '...' : 'Kirim'}</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-2">
              <MessageSquare className="w-10 h-10 text-slate-600" />
              <p className="text-xs font-bold text-slate-300">Pilih Siswa untuk Memulai Chat</p>
              <p className="text-[11px] text-slate-500">
                Pilih salah satu siswa dari daftar di sebelah kiri untuk melihat pesan atau mengirim percakapan baru.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
