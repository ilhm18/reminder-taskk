import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  Plus,
  Crown,
  Shield,
  User as UserIcon,
  Sparkles,
  Check,
  CheckCheck,
  X,
  Users,
  MessageCircle,
  Building2,
  Clock,
  ChevronRight,
  ArrowLeft,
  Filter,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ClassChatItem, User } from '../../types';
import { formatIndonesianDate, playNotificationSound } from '../../utils/notification';
import { getTerminology, resolveEducatorType } from '../../utils/terminology';

interface UnifiedChatViewProps {
  /** Optional initial recipient ID to open directly (e.g. 'admin' or 'owner') */
  initialTargetUserId?: string;
  /** Title shown at the top banner */
  title?: string;
  /** Subtitle shown at the top banner */
  subtitle?: string;
}

export const UnifiedChatView: React.FC<UnifiedChatViewProps> = ({
  initialTargetUserId,
  title = 'Pusat Pesan & Chat Langsung',
  subtitle,
}) => {
  const {
    currentUser,
    currentRole,
    currentClass,
    users,
    classes,
    classChats,
    ownerChats,
    sendClassChatMessage,
    deleteClassChatMessage,
    clearChatThread,
    sendOwnerChatMessage,
    markClassChatsAsRead,
    showToast,
  } = useApp();

  const educatorType = resolveEducatorType(currentUser, currentClass);
  const terms = getTerminology(educatorType);
  const effectiveSubtitle = subtitle || `Riwayat percakapan interaktif dengan ${terms.memberTitlePlural.toLowerCase()}, admin, dan owner`;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialTargetUserId || null);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [contactFilterRole, setContactFilterRole] = useState<'all' | 'owner' | 'admin' | 'member'>('all');
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [msgToDelete, setMsgToDelete] = useState<ClassChatItem | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync initialTargetUserId when provided or changed
  useEffect(() => {
    if (initialTargetUserId) {
      setSelectedUserId(initialTargetUserId);
      setMobileShowThread(true);
    }
  }, [initialTargetUserId]);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Synchronize all available contacts across the system
  const allContacts = useMemo(() => {
    const map = new Map<string, {
      id: string;
      name: string;
      role: 'owner' | 'admin' | 'member';
      className?: string;
      classCode?: string;
      avatarColor?: string;
      avatar?: string;
    }>();

    const ownerUser = users.find((u) => u.role === 'owner');

    // 1. Always ensure Platform Owner is available as a contact
    if (currentUser?.role !== 'owner') {
      map.set('owner', {
        id: 'owner',
        name: ownerUser?.name ? (ownerUser.name.includes('Owner') ? ownerUser.name : `Owner Platform (${ownerUser.name})`) : 'Owner Platform (Ilham Ramadan)',
        role: 'owner',
        className: 'Pengelola Pusat RemindTask',
        avatarColor: 'from-amber-500 to-orange-600',
        avatar: ownerUser?.avatar,
      });
    }

    // 2. Add class admin from currentClass if member
    if (currentClass?.adminName && currentUser?.role === 'member') {
      const adminId = currentClass.adminId || 'admin-' + currentClass.id;
      const adminUser = users.find((u) => u.id === adminId || (u.role === 'admin' && u.name === currentClass.adminName));
      map.set(adminId, {
        id: adminId,
        name: currentClass.adminName,
        role: 'admin',
        className: currentClass.name,
        classCode: currentClass.code,
        avatarColor: 'from-purple-600 to-indigo-600',
        avatar: adminUser?.avatar,
      });
    }

    const activeClassId = currentClass?.id || currentUser?.classId;
    const activeClassCode = currentClass?.code;

    // 3. Add users from registered `users` state (strictly isolated to same class if member/admin)
    users.forEach((u) => {
      if (u.id === currentUser?.id) return; // Don't add self

      // UNIFY OWNER CONTACT: Skip creating duplicate contact cards for Owner
      if (u.role === 'owner') {
        if (currentUser?.role !== 'owner') {
          map.set('owner', {
            id: 'owner',
            name: u.name.includes('Owner') ? u.name : `Owner Platform (${u.name})`,
            role: 'owner',
            className: 'Pengelola Pusat RemindTask',
            avatarColor: 'from-amber-500 to-orange-600',
            avatar: u.avatar,
          });
        }
        return; // Do NOT add u.id separately!
      }

      if (currentUser?.role !== 'owner') {
        const matchesClass =
          (activeClassId && ((u as any).classId === activeClassId || u.classId === activeClassId)) ||
          (activeClassCode && ((u as any).classCode === activeClassCode || (u as any).classCode === activeClassCode)) ||
          (currentClass?.name && u.className === currentClass.name);

        if (!matchesClass) return; // Strict class isolation!
      }

      const isAdmin = u.role === 'admin';
      const roleColor = isAdmin
        ? 'from-purple-600 to-indigo-600'
        : 'from-pink-500 to-purple-600';

      map.set(u.id, {
        id: u.id,
        name: u.name,
        role: u.role as 'admin' | 'member',
        className: u.className || 'Ruang Kelas',
        classCode: (u as any).classCode,
        avatarColor: roleColor,
        avatar: u.avatar,
      });
    });

    // 4. Add Admins from `classes`
    classes.forEach((c) => {
      if (c.adminName && c.adminId !== currentUser?.id) {
        if (currentUser?.role !== 'owner') {
          const matchesClass =
            (activeClassId && c.id === activeClassId) ||
            (activeClassCode && c.code === activeClassCode);
          if (!matchesClass) return; // Strict class isolation!
        }

        if (!map.has(c.adminId)) {
          map.set(c.adminId, {
            id: c.adminId,
            name: c.adminName,
            role: 'admin',
            className: c.name,
            classCode: c.code,
            avatarColor: 'from-purple-600 to-indigo-600',
          });
        }
      }
    });

    return Array.from(map.values());
  }, [users, classes, currentClass, currentUser]);

  // Combine and normalize all relevant messages involving currentUser
  const allUserMessages = useMemo(() => {
    if (!currentUser) return [];
    const myId = currentUser.id;
    const myName = currentUser.name.toLowerCase();

    // Collect matching classChats
    const matchingClassChats = classChats.filter((c) => {
      const isMine =
        c.senderId === myId ||
        c.recipientId === myId ||
        (currentUser.role === 'admin' && (c.recipientId === 'admin' || c.recipientName === currentUser.name)) ||
        (currentUser.role === 'owner' && (c.recipientId === 'owner' || c.senderRole === 'owner'));
      return isMine;
    });

    return matchingClassChats.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [classChats, currentUser]);

  // Group into conversation threads (Kotak Masuk) - ONLY for contacts with actual chat history!
  const conversationThreads = useMemo(() => {
    if (!currentUser) return [];
    const myId = currentUser.id;
    const threadsMap = new Map<string, {
      otherUserId: string;
      otherUserName: string;
      otherUserRole: 'owner' | 'admin' | 'member';
      otherUserClass?: string;
      otherUserAvatar?: string;
      lastMessage: string;
      lastTimestamp: string;
      unreadCount: number;
    }>();

    allUserMessages.forEach((msg) => {
      const isMyMsg = msg.senderId === myId || (currentUser.role === 'owner' && msg.senderRole === 'owner');
      let otherId = isMyMsg ? msg.recipientId : msg.senderId;
      let otherName = isMyMsg ? msg.recipientName : msg.senderName;
      let otherRole = isMyMsg
        ? (msg.recipientId === 'owner' || msg.recipientId.startsWith('owner') ? 'owner' : msg.recipientId.startsWith('admin') ? 'admin' : 'member')
        : (msg.senderRole as 'owner' | 'admin' | 'member');

      if (!otherId || otherId === myId) return;

      // Consolidate all Owner contacts into a single 'owner' thread ID
      if (currentUser.role !== 'owner' && (otherRole === 'owner' || otherId === 'owner' || otherId.startsWith('owner'))) {
        otherId = 'owner';
        otherRole = 'owner';
      }

      // Find contact info if available
      const contactInfo = allContacts.find((c) => c.id === otherId || (c.role === 'owner' && otherRole === 'owner'));
      const resolvedRole = contactInfo?.role || otherRole;
      const resolvedName = contactInfo?.name || otherName;
      const resolvedClass = contactInfo?.className || (msg.classId ? `Kelas ${msg.classId}` : undefined);
      const resolvedAvatar = contactInfo?.avatar;

      const existing = threadsMap.get(otherId);
      const isUnread = !isMyMsg && !msg.isRead;
      const unreadCount = (existing?.unreadCount || 0) + (isUnread ? 1 : 0);

      threadsMap.set(otherId, {
        otherUserId: otherId,
        otherUserName: resolvedName,
        otherUserRole: resolvedRole,
        otherUserClass: resolvedClass,
        otherUserAvatar: resolvedAvatar,
        lastMessage: msg.message,
        lastTimestamp: msg.createdAt,
        unreadCount,
      });
    });

    // Sort by latest message timestamp descending
    return Array.from(threadsMap.values()).sort(
      (a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime()
    );
  }, [allUserMessages, currentUser, allContacts]);

  // Filtered conversation threads based on search in inbox
  const filteredThreads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversationThreads;
    return conversationThreads.filter(
      (t) =>
        t.otherUserName.toLowerCase().includes(q) ||
        t.lastMessage.toLowerCase().includes(q) ||
        (t.otherUserClass && t.otherUserClass.toLowerCase().includes(q))
    );
  }, [conversationThreads, searchQuery]);

  // Active contact details
  const activeContact = useMemo(() => {
    if (!selectedUserId) return null;
    const found = allContacts.find((c) => c.id === selectedUserId);
    if (found) return found;

    // Fallback if contact only exists in thread history
    const thread = conversationThreads.find((t) => t.otherUserId === selectedUserId);
    if (thread) {
      return {
        id: thread.otherUserId,
        name: thread.otherUserName,
        role: thread.otherUserRole,
        className: thread.otherUserClass,
        avatarColor:
          thread.otherUserRole === 'owner'
            ? 'from-amber-500 to-orange-600'
            : thread.otherUserRole === 'admin'
            ? 'from-purple-600 to-indigo-600'
            : 'from-pink-500 to-purple-600',
      };
    }

    return {
      id: selectedUserId,
      name: 'Pengguna',
      role: 'member' as const,
      className: 'Ruang Kelas',
      avatarColor: 'from-pink-500 to-purple-600',
    };
  }, [selectedUserId, allContacts, conversationThreads]);

  // Messages in active thread
  const activeThreadMessages = useMemo(() => {
    if (!selectedUserId || !currentUser) return [];
    const myId = currentUser.id;

    return allUserMessages.filter((msg) => {
      // If selected target is Owner, match all messages to/from Owner
      if (selectedUserId === 'owner' || selectedUserId.startsWith('owner')) {
        return (
          msg.recipientId === 'owner' ||
          msg.recipientId.startsWith('owner') ||
          msg.senderRole === 'owner' ||
          msg.senderId === 'owner' ||
          msg.senderId.startsWith('owner')
        );
      }

      const match1 = msg.senderId === selectedUserId && (msg.recipientId === myId || (currentUser.role === 'owner' && (msg.recipientId === 'owner' || msg.recipientId.startsWith('owner'))));
      const match2 = msg.recipientId === selectedUserId && (msg.senderId === myId || (currentUser.role === 'owner' && (msg.senderRole === 'owner' || msg.senderId.startsWith('owner'))));
      const matchAdmin =
        currentUser.role === 'admin' &&
        ((msg.senderId === selectedUserId && msg.recipientId === 'admin') ||
          (msg.recipientId === selectedUserId && msg.senderId === myId));
      return match1 || match2 || matchAdmin;
    });
  }, [allUserMessages, selectedUserId, currentUser]);

  // Mark active thread messages as read
  useEffect(() => {
    if (selectedUserId) {
      markClassChatsAsRead(selectedUserId);
    }
  }, [selectedUserId, activeThreadMessages.length]);

  // Auto scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [activeThreadMessages.length, selectedUserId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedUserId || !activeContact) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      await sendClassChatMessage(
        activeContact.id,
        activeContact.name,
        messageText
      );
      playNotificationSound('beep');
    } catch (err) {
      console.warn('Send chat message error:', err);
      showToast('Gagal mengirim pesan.', 'warn');
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectContactToChat = (contact: typeof allContacts[0]) => {
    setSelectedUserId(contact.id);
    setShowNewChatModal(false);
    setMobileShowThread(true);
  };

  // Filter contacts for New Chat Directory Modal
  const modalFilteredContacts = useMemo(() => {
    const q = contactSearchQuery.trim().toLowerCase();
    return allContacts.filter((c) => {
      const matchRole = contactFilterRole === 'all' || c.role === contactFilterRole;
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.className && c.className.toLowerCase().includes(q)) ||
        (c.classCode && c.classCode.toLowerCase().includes(q));
      return matchRole && matchSearch;
    });
  }, [allContacts, contactSearchQuery, contactFilterRole]);

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="p-5 rounded-3xl bg-[#141126] border border-[#272144] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-5 h-5 text-pink-400" />
            <h3 className="text-lg font-black text-white">{title}</h3>
          </div>
          <p className="text-xs text-slate-400 font-medium">{effectiveSubtitle}</p>
        </div>

        <button
          onClick={() => {
            setContactSearchQuery('');
            setShowNewChatModal(true);
          }}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-pink-500/25 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Mulai Chat Baru</span>
        </button>
      </div>

      {/* Main Chat Layout Container */}
      <div className="bg-[#141126] border border-[#272144] rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[calc(100vh-200px)] min-h-[480px] max-h-[750px] md:h-[620px]">
        {/* LEFT COLUMN: Inbox & Conversation History */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-[#272144] flex flex-col bg-[#100d22] shrink-0 ${
            mobileShowThread ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Inbox Search & Action Bar */}
          <div className="p-3.5 border-b border-[#231b40] bg-[#14102c] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white uppercase tracking-wider">Kotak Masuk</span>
                <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[10px] font-mono font-bold">
                  {conversationThreads.length}
                </span>
              </div>

              <button
                onClick={() => {
                  setContactSearchQuery('');
                  setShowNewChatModal(true);
                }}
                className="text-[11px] font-bold text-pink-400 hover:text-pink-300 flex items-center gap-1 cursor-pointer"
                title="Mulai obrolan ke orang lain"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Chat Baru</span>
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari riwayat chat..."
                className="w-full bg-[#0d0a1c] border border-[#261d47] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-pink-500 font-medium transition-colors"
              />
            </div>
          </div>

          {/* Conversation Thread List (ONLY threads with actual messages) */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-[#20173d]/40">
            {filteredThreads.length === 0 ? (
              <div className="py-16 px-4 text-center text-slate-500 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#181335] text-pink-400 flex items-center justify-center mx-auto border border-[#2b2154]">
                  <MessageCircle className="w-6 h-6 opacity-60" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-300">Belum Ada Riwayat Chat</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] mx-auto leading-relaxed">
                    Kotak masuk Anda masih bersih. Klik tombol di bawah untuk mulai chat ke teman atau pengelola.
                  </p>
                </div>
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Kirim Pesan Pertama</span>
                </button>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isActive = thread.otherUserId === selectedUserId;
                const isOwner = thread.otherUserRole === 'owner';
                const isAdmin = thread.otherUserRole === 'admin';

                return (
                  <button
                    key={thread.otherUserId}
                    onClick={() => {
                      setSelectedUserId(thread.otherUserId);
                      setMobileShowThread(true);
                    }}
                    className={`w-full text-left p-3 rounded-2xl transition-all flex items-start gap-3 cursor-pointer border ${
                      isActive
                        ? 'bg-gradient-to-r from-pink-500/20 to-purple-600/20 border-pink-500/50 text-white shadow-md'
                        : 'hover:bg-[#181338] border-transparent text-slate-300'
                    }`}
                  >
                    {/* Avatar with Role Badge */}
                    <div className="relative shrink-0">
                      <div
                        className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${
                          isOwner
                            ? 'from-amber-500 to-orange-600'
                            : isAdmin
                            ? 'from-purple-600 to-indigo-600'
                            : 'from-pink-500 to-purple-600'
                        } text-white flex items-center justify-center font-bold text-xs shadow-md overflow-hidden`}
                      >
                        {thread.otherUserAvatar ? (
                          <img
                            src={thread.otherUserAvatar}
                            alt={thread.otherUserName}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          thread.otherUserName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1">
                        {isOwner ? (
                          <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[9px] font-black ring-2 ring-[#100d22]">
                            👑
                          </span>
                        ) : isAdmin ? (
                          <span className="w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center text-[9px] font-black ring-2 ring-[#100d22]">
                            🛡️
                          </span>
                        ) : (
                          <span className="w-4 h-4 rounded-full bg-pink-500 text-white flex items-center justify-center text-[9px] font-black ring-2 ring-[#100d22]">
                            🎓
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-bold text-xs text-white truncate">
                          {thread.otherUserName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {new Date(thread.lastTimestamp).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            isOwner
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : isAdmin
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                          }`}
                        >
                          {isOwner ? 'Owner' : isAdmin ? `Admin (${terms.educatorTitle})` : terms.memberTitle}
                        </span>
                        {thread.otherUserClass && (
                          <span className="text-[10px] text-slate-400 truncate">
                            • {thread.otherUserClass}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 truncate font-medium">
                        {thread.lastMessage}
                      </p>
                    </div>

                    {/* Unread badge */}
                    {thread.unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-pink-500 text-white text-[9px] font-black font-mono shrink-0 shadow-sm shadow-pink-500/50">
                        {thread.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Thread Chat Room */}
        <div
          className={`flex-1 flex flex-col bg-[#0f0c1e] min-w-0 ${
            !mobileShowThread ? 'hidden md:flex' : 'flex'
          }`}
        >
          {selectedUserId && activeContact ? (
            <>
              {/* Chat Room Header */}
              <div className="p-3.5 sm:p-4 bg-[#15102d] border-b border-[#261d47] flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back to Inbox Button */}
                  <button
                    onClick={() => setMobileShowThread(false)}
                    className="md:hidden p-1.5 rounded-xl bg-[#201840] text-slate-300 hover:text-white"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div
                    className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${
                      activeContact.avatarColor || 'from-pink-500 to-purple-600'
                    } text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0 overflow-hidden`}
                  >
                    {activeContact.avatar ? (
                      <img
                        src={activeContact.avatar}
                        alt={activeContact.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      activeContact.name.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0">
                    <h4 className="font-extrabold text-sm text-white flex items-center gap-2 truncate">
                      <span className="truncate">{activeContact.name}</span>
                      <span
                        className={`px-2 py-0.2 rounded-full text-[9px] font-bold border shrink-0 ${
                          activeContact.role === 'owner'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : activeContact.role === 'admin'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : 'bg-pink-500/20 text-pink-300 border-pink-500/40'
                        }`}
                      >
                        {activeContact.role === 'owner'
                          ? '👑 Owner Platform'
                          : activeContact.role === 'admin'
                          ? '🛡️ Pengelola Kelas'
                          : '🎓 Peserta Didik'}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {activeContact.className || 'Ruang Kelas RemindTask'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeThreadMessages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(true)}
                      className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                      title="Bersihkan seluruh riwayat chat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Bersihkan Chat</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowNewChatModal(true)}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#221844] hover:bg-[#30225e] text-pink-300 text-xs font-bold border border-pink-500/20 cursor-pointer transition-colors shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ganti Chat</span>
                  </button>
                </div>
              </div>

              {/* Chat Message Scroll Feed */}
              <div
                ref={chatContainerRef}
                className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#0b0818]"
              >
                {activeThreadMessages.length === 0 ? (
                  <div className="py-20 text-center text-slate-500 space-y-2 max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-[#161131] text-pink-400 flex items-center justify-center mx-auto border border-[#2b2152]">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-200">
                      Mulai Percakapan dengan {activeContact.name}
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Tulis pertanyaan, konsultasi tugas, atau diskusi santai di bawah. Pesan akan langsung terkirim secara realtime.
                    </p>
                  </div>
                ) : (
                  activeThreadMessages.map((msg) => {
                    const isMyMsg =
                      msg.senderId === currentUser?.id ||
                      (currentUser?.role === 'owner' && msg.senderRole === 'owner');

                    // Di semua menu chat & pesan (admin, owner, member), pengguna dapat menghapus pesan
                    const canDelete = true;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col group ${isMyMsg ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`relative max-w-[85%] sm:max-w-md p-3.5 rounded-2xl text-xs shadow-md leading-relaxed ${
                            isMyMsg
                              ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-br-xs'
                              : 'bg-[#1a1435] border border-[#2c2250] text-slate-100 rounded-bl-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 mb-1 text-[10px] opacity-80 border-b border-white/10 pb-1">
                            <span className="font-bold">{isMyMsg ? 'Anda' : msg.senderName}</span>
                            <span className="font-mono text-[9px]">
                              {new Date(msg.createdAt).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap font-medium">{msg.message}</p>
                          <div className="flex justify-between items-center mt-1.5 pt-1 border-t border-white/10">
                            {canDelete ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMsgToDelete(msg);
                                }}
                                className="p-1 rounded-md text-red-300 hover:text-white hover:bg-red-500/30 transition-all cursor-pointer flex items-center gap-1 text-[10px]"
                                title="Hapus pesan ini"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span className="text-[9px]">Hapus</span>
                              </button>
                            ) : (
                              <span />
                            )}
                            <div className="flex items-center gap-1">
                              <CheckCheck className="w-3.5 h-3.5 text-white/70" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input Box */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-[#15102d] border-t border-[#261d47] flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Ketik pesan untuk ${activeContact.name}... (Tekan Enter)`}
                  className="flex-1 bg-[#0b0818] border border-[#291f4d] rounded-2xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-pink-500 font-medium transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className="p-2.5 sm:px-4 sm:py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-pink-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Kirim</span>
                </button>
              </form>
            </>
          ) : (
            /* Empty State: No Thread Selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-pink-500/20 to-purple-600/20 border border-pink-500/30 flex items-center justify-center text-pink-400 shadow-xl">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div className="max-w-xs">
                <h4 className="text-base font-bold text-white mb-1">
                  Pusat Komunikasi &amp; Chat
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pilih percakapan dari kotak masuk di samping, atau mulai obrolan baru dengan {terms.memberTitlePlural.toLowerCase()}, admin, atau owner.
                </p>
              </div>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-pink-500/25 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Mulai Chat ke Orang Lain</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Mulai Chat Baru / Direktori Kontak */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#14102b] border border-[#2f2355] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#261d47] flex items-center justify-between bg-[#191436]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white flex items-center justify-center shadow-md">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">Mulai Chat ke Orang Lain</h3>
                  <p className="text-[11px] text-slate-400">
                    Pilih teman sekelas, admin, atau owner platform
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#251d4d]"
              >
                <X className="w-5 h-5 text-pink-400" />
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 border-b border-[#231a42] space-y-3 bg-[#120e26]">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={contactSearchQuery}
                  onChange={(e) => setContactSearchQuery(e.target.value)}
                  placeholder={`Cari nama ${terms.memberTitle.toLowerCase()}, admin, atau ruang kelas...`}
                  className="w-full bg-[#0d091e] border border-[#2a2050] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-pink-500 font-medium transition-colors"
                  autoFocus
                />
              </div>

              {/* Role filter buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setContactFilterRole('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    contactFilterRole === 'all'
                      ? 'bg-pink-500 text-white shadow-sm'
                      : 'bg-[#1a1435] text-slate-400 hover:text-white'
                  }`}
                >
                  Semua ({allContacts.length})
                </button>
                <button
                  onClick={() => setContactFilterRole('owner')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    contactFilterRole === 'owner'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-[#1a1435] text-slate-400 hover:text-white'
                  }`}
                >
                  👑 Owner
                </button>
                <button
                  onClick={() => setContactFilterRole('admin')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    contactFilterRole === 'admin'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-[#1a1435] text-slate-400 hover:text-white'
                  }`}
                >
                  🛡️ Admin ({terms.educatorTitle})
                </button>
                <button
                  onClick={() => setContactFilterRole('member')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    contactFilterRole === 'member'
                      ? 'bg-pink-600 text-white shadow-sm'
                      : 'bg-[#1a1435] text-slate-400 hover:text-white'
                  }`}
                >
                  🎓 {terms.memberTitle} / Member
                </button>
              </div>
            </div>

            {/* Contact List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {modalFilteredContacts.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Tidak ditemukan kontak dengan kriteria tersebut.
                </div>
              ) : (
                modalFilteredContacts.map((contact) => {
                  const isOwner = contact.role === 'owner';
                  const isAdmin = contact.role === 'admin';

                  return (
                    <button
                      key={contact.id}
                      onClick={() => handleSelectContactToChat(contact)}
                      className="w-full text-left p-3 rounded-2xl bg-[#181335] hover:bg-[#221a48] border border-[#2b204f] hover:border-pink-500/50 flex items-center justify-between gap-3 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${
                            contact.avatarColor || 'from-pink-500 to-purple-600'
                          } text-white flex items-center justify-center font-bold text-xs shadow-md shrink-0 overflow-hidden`}
                        >
                          {contact.avatar ? (
                            <img
                              src={contact.avatar}
                              alt={contact.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            contact.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-white group-hover:text-pink-300 transition-colors truncate">
                            {contact.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                isOwner
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : isAdmin
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                  : 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                              }`}
                            >
                              {isOwner ? '👑 Owner' : isAdmin ? `🛡️ Admin (${terms.educatorTitle})` : `🎓 ${terms.memberTitle}`}
                            </span>
                            {contact.className && (
                              <span className="text-[10px] text-slate-400 truncate">
                                • {contact.className}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-bold text-pink-400 group-hover:translate-x-0.5 transition-transform shrink-0">
                        <span>Pilih</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-[#171233] border-t border-[#261d47] flex justify-end">
              <button
                onClick={() => setShowNewChatModal(false)}
                className="px-4 py-2 rounded-xl bg-[#201840] hover:bg-[#2b2154] text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Individual Message */}
      {msgToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-[#141126] border border-red-500/30 rounded-3xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mb-3 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white text-center mb-1">Hapus Pesan?</h3>
            <p className="text-xs text-slate-300 text-center mb-4 line-clamp-3 bg-[#1b1533] p-2.5 rounded-xl border border-[#2b214f] italic">
              &ldquo;{msgToDelete.message}&rdquo;
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMsgToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#1d1736] text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (!msgToDelete) return;
                  setIsDeleting(true);
                  try {
                    await deleteClassChatMessage(msgToDelete.id);
                  } finally {
                    setIsDeleting(false);
                    setMsgToDelete(null);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/30 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Clear Entire Chat Thread */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-[#141126] border border-red-500/30 rounded-3xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mb-3 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white text-center mb-1">Bersihkan Riwayat Chat?</h3>
            <p className="text-xs text-slate-300 text-center mb-4">
              Seluruh riwayat obrolan dengan <strong className="text-white">{activeContact?.name}</strong> akan dihapus permanen dari sistem.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#1d1736] text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (!selectedUserId) return;
                  setIsDeleting(true);
                  try {
                    await clearChatThread(selectedUserId);
                  } finally {
                    setIsDeleting(false);
                    setShowClearConfirm(false);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/30 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Membersihkan...' : 'Ya, Bersihkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
