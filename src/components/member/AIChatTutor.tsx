import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Trash2,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Zap,
  Layers,
  Plus,
  MessageSquare,
  ChevronLeft,
  Edit2,
  Clock,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateSmartTutorResponse } from '../../services/smartTutorSolver';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export const AIChatTutor: React.FC = () => {
  const { currentUser, currentClass, tasks, systemSettings, showToast } = useApp();

  // Storage key is strictly isolated per-user so history is NEVER visible to others
  const getStorageKey = () => {
    if (currentUser?.id) {
      return `remindtask_aichat_sessions_u_${currentUser.id}`;
    }
    if (currentClass?.id) {
      return `remindtask_aichat_sessions_c_${currentClass.id}`;
    }
    return 'remindtask_aichat_sessions_guest';
  };

  const createInitialSession = (): ChatSession => {
    const welcomeMsg: ChatMessage = {
      id: 'welcome-' + Date.now(),
      role: 'model',
      text: `Halo ${currentUser?.name || 'kamu'}! 👋 Aku AI Assistant & teman ngobrol santai kamu di **${currentClass?.name || 'RemindTask'}**.\n\nLagi pusing sama tugas kelas, pengen bedah rumus/kodingan, curhat santai, atau sekadar ngobrol nemenin begadang? Bebas banget, tulis aja di bawah ya! Siap nemenin kamu kapan aja! 😄☕`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    return {
      id: 'session-' + Date.now(),
      title: 'Sesi Percakapan',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [welcomeMsg],
    };
  };

  // Load sessions isolated to this current user
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const key = getStorageKey();
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed: ChatSession[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return [createInitialSession()];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return sessions[0]?.id || 'session-default';
  });

  // Re-sync sessions when currentUser or class changes (e.g. login/switch account)
  useEffect(() => {
    try {
      const key = getStorageKey();
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed: ChatSession[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          setActiveSessionId(parsed[0].id);
          return;
        }
      }
    } catch {}
    const newInitial = [createInitialSession()];
    setSessions(newInitial);
    setActiveSessionId(newInitial[0].id);
  }, [currentUser?.id, currentClass?.id]);

  // Persist sessions for this specific user
  useEffect(() => {
    try {
      const key = getStorageKey();
      localStorage.setItem(key, JSON.stringify(sessions));
    } catch {}
  }, [sessions, currentUser?.id, currentClass?.id]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0] || createInitialSession();
  const messages = activeSession.messages || [];

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [includeClassContext, setIncludeClassContext] = useState(true);
  const [selectedModel, setSelectedModel] = useState<'gemini-3.8-flash' | 'gemini-3.1-flash-lite' | 'gemini-3.1-pro-preview'>('gemini-3.8-flash');

  useEffect(() => {
    localStorage.setItem('rt_selected_ai_model', 'gemini-3.8-flash');
  }, []);
  const selectedPersona = 'kating';
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Build context about current class tasks
  const getContextString = () => {
    if (!includeClassContext || !currentClass) return '';
    const classTasks = tasks.filter((t) => t.classId === currentClass.id);
    const taskDetails = classTasks
      .map((t) => `- Judul: ${t.title} (Kategori: ${t.category}, Deadline: ${t.dueDate}, Prioritas: ${t.priority})`)
      .join('\n');
    return `Kelas Siswa: ${currentClass.name} (Kode: ${currentClass.code})\nSiswa: ${currentUser?.name || 'Member'}\nDaftar Tugas Aktif Kelas Ini:\n${taskDetails || 'Belum ada tugas terdaftar'}`;
  };

  const handleCreateNewSession = () => {
    const newSession = createInitialSession();
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setShowSidebar(false);
    showToast('Sesi percakapan baru dimulai!', 'success');
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      // Reset single session
      const resetSession = createInitialSession();
      setSessions([resetSession]);
      setActiveSessionId(resetSession.id);
      showToast('Riwayat sesi chat telah direset.', 'info');
      return;
    }
    const updated = sessions.filter((s) => s.id !== sessionId);
    setSessions(updated);
    if (activeSessionId === sessionId) {
      setActiveSessionId(updated[0]?.id || '');
    }
    showToast('Sesi chat berhasil dihapus.', 'info');
  };

  const handleStartRename = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitleInput(session.title);
  };

  const handleSaveRename = (sessionId: string) => {
    if (!editTitleInput.trim()) {
      setEditingSessionId(null);
      return;
    }
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title: editTitleInput.trim(), updatedAt: new Date().toISOString() } : s))
    );
    setEditingSessionId(null);
    showToast('Judul sesi diperbarui!', 'success');
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputMessage.trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Auto-update session title if it's currently 'Obrolan Baru'
    const isFirstUserMessage = messages.filter((m) => m.role === 'user').length === 0;
    const generatedTitle = isFirstUserMessage
      ? textToSend.slice(0, 30) + (textToSend.length > 30 ? '...' : '')
      : activeSession.title;

    // Append user message immediately
    const updatedMessages = [...messages, userMsg];
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id
          ? {
              ...s,
              title: generatedTitle,
              updatedAt: new Date().toISOString(),
              messages: updatedMessages,
            }
          : s
      )
    );
    setInputMessage('');
    setIsLoading(true);

    // Prepare history for multi-turn conversational context (prior messages only)
    const validHistory = messages
      .filter((m) => m.text && m.text.trim())
      .slice(-10)
      .map((m) => ({
        role: m.role,
        text: m.text,
      }));

    try {

      let replyText = '';

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 35000);

        const res = await fetch('/api/gemini/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: textToSend,
            history: validHistory,
            classContext: getContextString(),
            aiModel: selectedModel,
            aiPersona: selectedPersona,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json().catch(() => ({}));
            if (data && data.reply && typeof data.reply === 'string') {
              replyText = data.reply.trim();
            }
          }
        }
      } catch (networkErr) {
        console.warn('Backend API request skipped or unreachable, switching to seamless client solver:', networkErr);
      }

      // If backend was unreachable or returned empty (e.g. static domain, no proxy, offline), use smart solver
      if (!replyText) {
        replyText = generateSmartTutorResponse(textToSend, [], getContextString(), validHistory);
      }

      const botMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        role: 'model',
        text: replyText || 'Ada yang mau ditanyain lagi seputar materi atau tugas kelas? Tulis aja ya, santai!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? {
                ...s,
                updatedAt: new Date().toISOString(),
                messages: [...s.messages, botMsg],
              }
            : s
        )
      );
    } catch (err: any) {
      console.error('Chat error:', err);
      // Even in the worst case unexpected exception, provide a friendly answer instead of blocking error
      const safeReply = generateSmartTutorResponse(textToSend, [], getContextString(), validHistory);
      const fallbackMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        role: 'model',
        text: safeReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? {
                ...s,
                messages: [...s.messages, fallbackMsg],
              }
            : s
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Teks berhasil disalin!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Web Speech Synthesis TTS
  const handleToggleSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) {
      showToast('Browser Anda belum mendukung suara otomatis.', 'warn');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[*#`_~[\]]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'id-ID';
      utterance.rate = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const quickPrompts = [
    {
      title: '⏰ Besok Jam 8: Pengingat Tugas',
      prompt: 'Besok jam 8 ingatkan saya mengerjakan tugas.',
    },
    {
      title: '☕ Ngobrol Santai / Curhat',
      prompt: 'Hai! Lagi pengen ngobrol santai nih, kamu lagi sibuk apa sekarang?',
    },
    {
      title: '🍕 Rekomendasi Jajan & Makanan',
      prompt: 'Laper banget nih pas lagi nugas, enaknya jajan atau makan apa ya?',
    },
    {
      title: '🎮 Rekomendasi Game & Hiburan',
      prompt: 'Lagi bosen dan butuh refreshing, ada rekomendasi game atau film seru gak?',
    },
    {
      title: '💡 Bedah Soal & Kodingan',
      prompt: 'Bisa tolong bantu jelasin materi/soal ini dengan bahasa santai dan gampang dipahami?',
    },
    {
      title: '⏰ Strategi Beresin Tugas',
      prompt: 'Lihat daftar tugas kelasku dong. Kasih saran urutan mana yang sebaiknya aku kerjain duluan biar gak keteteran.',
    },
  ];

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[550px] bg-[#110e22] border border-[#231b40] rounded-3xl overflow-hidden shadow-2xl relative">
      {/* Mobile Drawer Backdrop */}
      {showSidebar && (
        <div
          onClick={() => setShowSidebar(false)}
          className="md:hidden absolute inset-0 z-20 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
        />
      )}

      {/* SESSIONS SIDEBAR (Desktop & Mobile Drawer) */}
      <div
        className={`${
          showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } absolute md:relative z-30 inset-y-0 left-0 w-72 max-w-[85%] md:w-64 bg-[#141029] border-r border-[#231b40] flex flex-col justify-between transition-transform duration-200 ease-in-out shrink-0 h-full shadow-2xl md:shadow-none`}
      >
        <div className="p-4 flex flex-col h-full">
          {/* Sidebar Top: New Chat Button */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <MessageSquare className="w-4 h-4 text-pink-400" />
              <span>Sesi Chat Pribadi</span>
            </div>
            <button
              onClick={() => setShowSidebar(false)}
              className="md:hidden p-1.5 rounded-lg bg-[#20193e] text-slate-400 hover:text-white cursor-pointer"
              title="Tutup menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleCreateNewSession}
            className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-pink-500/20 to-purple-600/20 hover:from-pink-500/30 hover:to-purple-600/30 border border-pink-500/30 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 mb-3"
          >
            <Plus className="w-4 h-4 text-pink-400" />
            <span>Sesi Percakapan Baru</span>
          </button>

          {/* Privacy badge */}
          <div className="px-2.5 py-1.5 rounded-xl bg-[#1b1533] border border-[#2c224e] mb-3 flex items-center gap-1.5 text-[10px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Riwayat percakapan tersimpan secara privat</span>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
            {sessions.map((sess) => {
              const isActive = sess.id === activeSessionId;
              const isEditing = editingSessionId === sess.id;
              return (
                <div
                  key={sess.id}
                  onClick={() => {
                    if (!isEditing) {
                      setActiveSessionId(sess.id);
                      setShowSidebar(false);
                    }
                  }}
                  className={`group relative p-2.5 rounded-2xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600/30 to-pink-600/20 border-pink-500/40 text-white font-semibold'
                      : 'bg-[#181333]/70 hover:bg-[#1f183e] border-[#292049] text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editTitleInput}
                        onChange={(e) => setEditTitleInput(e.target.value)}
                        onBlur={() => handleSaveRename(sess.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(sess.id);
                          if (e.key === 'Escape') setEditingSessionId(null);
                        }}
                        autoFocus
                        className="w-full bg-[#100c22] border border-pink-500 rounded-lg px-2 py-0.5 text-xs text-white outline-none"
                      />
                    ) : (
                      <>
                        <div className="truncate font-medium">{sess.title}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{sess.messages.length} pesan</span>
                        </div>
                      </>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleStartRename(sess, e)}
                        className="p-1 text-slate-400 hover:text-pink-300 rounded"
                        title="Ubah nama sesi"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteSession(sess.id, e)}
                        className="p-1 text-slate-400 hover:text-red-400 rounded"
                        title="Hapus sesi ini"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CHAT MAIN AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0c0a18] relative">
        {/* HEADER */}
        <div className="px-4 sm:px-5 py-3.5 bg-[#141029] border-b border-[#231b40] flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Toggle session list on mobile */}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="md:hidden p-2 rounded-xl bg-[#1b1533] border border-[#2c224e] text-slate-300 hover:text-white cursor-pointer"
              title="Lihat daftar sesi chat"
            >
              <MessageSquare className="w-4 h-4 text-pink-400" />
            </button>
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/25 shrink-0">
              <Sparkles className="w-4.5 h-4.5 text-amber-300 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-xs sm:text-sm text-white tracking-tight truncate">
                  {activeSession.title}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-bold text-emerald-400 shrink-0 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Sesi Aktif
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                Asisten Cerdas RemindTask   Diskusi & Pembelajaran
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Assistant Kelas Component */}
            <div
              title={systemSettings?.isAiMaintenance ? "AI Assistant Sedang Maintenance" : "Assistant Kelas Aktif & Siap Membantu"}
              className={`hidden lg:flex px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold items-center gap-1.5 shadow-sm select-none ${
                systemSettings?.isAiMaintenance
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-gradient-to-r from-pink-500/20 via-purple-600/20 to-indigo-600/20 border-pink-500/30 text-pink-300'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 shrink-0 ${systemSettings?.isAiMaintenance ? 'text-amber-400 animate-pulse' : 'text-amber-300'}`} />
              <span>{systemSettings?.isAiMaintenance ? 'Maintenance' : 'Assistant Kelas'}</span>
            </div>

            {/* All-in-One Model Badge */}
            <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500/15 to-purple-600/15 border border-[#2c224e] text-pink-300 text-xs font-bold flex items-center gap-1.5 select-none shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse shrink-0" />
              <span>AI Assistant</span>
            </div>

            {/* Clear Current Session */}
            <button
              onClick={(e) => handleDeleteSession(activeSession.id, e)}
              className="p-1.5 sm:p-2 rounded-xl bg-[#1b1533] hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-[#2c224e] transition-colors cursor-pointer"
              title="Hapus sesi ini"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* MESSAGES SCROLL AREA */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 bg-[#0e0b1d]/70">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold ${
                    isUser
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-gradient-to-tr from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/20'
                  }`}
                >
                  {isUser ? (currentUser?.name?.charAt(0) || 'U') : <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-200" />}
                </div>

                {/* Message Content */}
                <div className="flex flex-col space-y-1.5 max-w-[85%] sm:max-w-[78%]">
                  {/* Bubble */}
                  <div
                    className={`p-3.5 sm:p-4 rounded-3xl text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-xs shadow-md'
                        : 'bg-[#181333] border border-[#2b214f] text-slate-100 rounded-tl-xs shadow-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-sans">
                      {msg.text}
                    </div>
                  </div>

                  {/* Actions / Timestamp */}
                  <div
                    className={`flex items-center gap-2 px-1 text-[10px] text-slate-500 ${
                      isUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {!isUser && (
                      <>
                        <span> </span>
                        <button
                          onClick={() => handleCopyText(msg.id, msg.text)}
                          className="hover:text-pink-400 flex items-center gap-0.5 transition-colors cursor-pointer"
                          title="Salin jawaban"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                        <span> </span>
                        <button
                          onClick={() => handleToggleSpeak(msg.text)}
                          className="hover:text-purple-400 flex items-center gap-0.5 transition-colors cursor-pointer"
                          title="Dengarkan suara penjelasan"
                        >
                          {isSpeaking ? <VolumeX className="w-3 h-3 text-pink-400" /> : <Volume2 className="w-3 h-3" />}
                          <span>{isSpeaking ? 'Hentikan' : 'Dengar'}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-3 max-w-xl mr-auto animate-in fade-in duration-200">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-md">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-200 animate-spin" />
              </div>
              <div className="p-3.5 sm:p-4 rounded-3xl bg-[#181333] border border-[#2b214f] text-slate-300 rounded-tl-xs flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
                </div>
                <span className="text-xs font-semibold text-slate-300">
                  RemindAI lagi mikir....
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* QUICK PROMPT SUGGESTIONS */}
        <div className="px-4 py-2 bg-[#120e24] border-t border-[#20183b] flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400 shrink-0 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" /> Cepat:
          </span>
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(qp.prompt)}
              disabled={isLoading}
              className="px-3 py-1 rounded-xl bg-[#1b1533] hover:bg-[#251e47] border border-[#2c224e] hover:border-pink-500/40 text-left text-slate-300 hover:text-white text-xs whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>{qp.title}</span>
            </button>
          ))}
        </div>

        {/* INPUT BAR */}
        <div className="p-3 sm:p-4 bg-[#141029] border-t border-[#231b40] shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            {/* Text Input */}
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Tanya materi, rumus, koding, atau lanjutin topik obrolan tadi..."
              disabled={isLoading}
              className="flex-1 bg-[#1b1533] border border-[#2c224e] focus:border-pink-500 rounded-2xl px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-white placeholder-slate-400 outline-none transition-colors"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white shadow-lg shadow-pink-500/25 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shrink-0"
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </form>
          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 px-1">
            <span>  Tips: Tanyakan materi pelajaran, pembedahan rumus, atau solusi pemrograman.</span>
            <span className="hidden sm:inline">Sesi #{activeSession.id.slice(-4)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
