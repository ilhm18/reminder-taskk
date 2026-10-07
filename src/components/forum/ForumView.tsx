import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Heart,
  Share2,
  Tag,
  Plus,
  Send,
  Image as ImageIcon,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  Phone,
  CheckCircle2,
  Crown,
  Shield,
  User,
  Search,
  Filter,
  X,
  Copy,
  Trash2,
  Globe,
  Building2,
  MessageCircle,
  Instagram,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  ForumPost,
  ForumCategory,
  ForumComment,
} from '../../types';
import { formatIndonesianDate, playNotificationSound } from '../../utils/notification';

/**
 * Helper to parse contact info string:
 * - If begins with @ or is an Instagram handle -> redirect to Instagram profile
 * - If phone number -> redirect to WhatsApp (wa.me)
 * - If URL -> open URL
 */
const parseContactInfo = (contactStr?: string) => {
  if (!contactStr) return null;
  const trimmed = contactStr.trim();
  if (!trimmed) return null;

  // 1. Explicit or implicit Instagram handle (@namaig or ig:namaig or instagram.com/namaig)
  if (trimmed.startsWith('@')) {
    const username = trimmed.replace(/^@+/, '').trim();
    return {
      type: 'instagram' as const,
      label: `@${username}`,
      url: `https://instagram.com/${encodeURIComponent(username)}`,
      displayText: `@${username}`,
    };
  }

  if (trimmed.toLowerCase().includes('instagram.com/')) {
    const match = trimmed.match(/instagram\.com\/([a-zA-Z0-9._]+)/i);
    const username = match ? match[1] : trimmed;
    return {
      type: 'instagram' as const,
      label: `@${username}`,
      url: trimmed.startsWith('http') ? trimmed : `https://${trimmed}`,
      displayText: `@${username}`,
    };
  }

  if (
    trimmed.toLowerCase().startsWith('ig:') ||
    trimmed.toLowerCase().startsWith('ig :') ||
    trimmed.toLowerCase().startsWith('instagram:')
  ) {
    const username = trimmed.replace(/^(ig|instagram)\s*:\s*@?/i, '').trim();
    return {
      type: 'instagram' as const,
      label: `@${username}`,
      url: `https://instagram.com/${encodeURIComponent(username)}`,
      displayText: `@${username}`,
    };
  }

  // 2. Direct external links
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return {
      type: 'link' as const,
      label: 'Kunjungi Tautan',
      url: trimmed,
      displayText: trimmed.replace(/^https?:\/\//, '').slice(0, 25),
    };
  }

  // 3. WhatsApp phone numbers (digits with optional +, 08, 62)
  const cleanDigits = trimmed.replace(/[^0-9]/g, '');
  if (cleanDigits.length >= 8 && !trimmed.includes('@')) {
    const waNumber = cleanDigits.startsWith('0')
      ? '62' + cleanDigits.slice(1)
      : cleanDigits.startsWith('8')
      ? '62' + cleanDigits
      : cleanDigits;
    return {
      type: 'whatsapp' as const,
      label: 'WhatsApp',
      url: `https://wa.me/${waNumber}`,
      displayText: trimmed,
    };
  }

  // 4. Default fallback: if it looks like a username, direct to Instagram
  if (/^[a-zA-Z0-9._]+$/.test(trimmed)) {
    return {
      type: 'instagram' as const,
      label: `@${trimmed}`,
      url: `https://instagram.com/${encodeURIComponent(trimmed)}`,
      displayText: `@${trimmed}`,
    };
  }

  return {
    type: 'link' as const,
    label: trimmed,
    url: `https://instagram.com/${encodeURIComponent(trimmed.replace(/\s+/g, ''))}`,
    displayText: trimmed,
  };
};

/**
 * Parses and renders text with clickable @mentions linking directly to Instagram profiles
 */
const renderFormattedTextWithMentions = (text: string) => {
  if (!text) return null;
  const parts = text.split(/(@[a-zA-Z0-9._]+|https?:\/\/[^\s]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@') && part.length > 1) {
      const username = part.slice(1);
      return (
        <a
          key={i}
          href={`https://instagram.com/${encodeURIComponent(username)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-bold text-pink-400 hover:text-pink-300 bg-gradient-to-r from-purple-500/15 to-pink-500/15 hover:from-purple-500/25 hover:to-pink-500/25 px-1.5 py-0.5 rounded-md border border-pink-500/30 transition-all cursor-pointer mx-0.5"
          onClick={(e) => e.stopPropagation()}
          title={`Buka profil Instagram @${username}`}
        >
          <Instagram className="w-3 h-3 text-pink-400 shrink-0" />
          <span>{part}</span>
        </a>
      );
    }
    if (part.startsWith('http://') || part.startsWith('https://')) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 underline font-semibold transition-colors mx-0.5 inline-flex items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <span>{part}</span>
          <ExternalLink className="w-3 h-3 inline" />
        </a>
      );
    }
    return part;
  });
};

export const ForumView: React.FC = () => {
  const {
    currentUser,
    currentRole,
    currentClass,
    classes,
    forumPosts,
    addForumPost,
    likeForumPost,
    addForumComment,
    deleteForumPost,
    showToast,
  } = useApp();

  const [activeScope, setActiveScope] = useState<'class' | 'global'>('class');
  const [selectedOwnerClassId, setSelectedOwnerClassId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');

  // Create post form states
  const [postScope, setPostScope] = useState<'class' | 'global'>('class');
  const [ownerTargetClassId, setOwnerTargetClassId] = useState<string>(() => classes[0]?.id || 'class-1');
  const [postCategory, setPostCategory] = useState<ForumCategory>('diskusi');
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postPrice, setPostPrice] = useState('');
  const [postContact, setPostContact] = useState('');
  const [postTags, setPostTags] = useState('');
  const [postImageUrl, setPostImageUrl] = useState('');
  const [postImageFileName, setPostImageFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter posts
  const filteredPosts = useMemo(() => {
    return forumPosts
      .filter((p: ForumPost) => {
        // Scope filter
        if (activeScope === 'class') {
          if (p.scope !== 'class') return false;
          if (currentRole === 'owner') {
            if (selectedOwnerClassId !== 'all' && p.classId !== selectedOwnerClassId) return false;
          } else {
            if (currentClass?.id && p.classId && p.classId !== currentClass.id) return false;
          }
        } else {
          if (p.scope !== 'global') return false;
        }

        // Category filter
        if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = p.title.toLowerCase().includes(q);
          const matchContent = p.content.toLowerCase().includes(q);
          const matchAuthor = p.authorName.toLowerCase().includes(q);
          const matchTags = p.tags.some((t: string) => t.toLowerCase().includes(q));
          return matchTitle || matchContent || matchAuthor || matchTags;
        }

        return true;
      })
      .sort((a: ForumPost, b: ForumPost) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [forumPosts, activeScope, selectedCategory, searchQuery, currentClass?.id, currentRole, selectedOwnerClassId]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      showToast('Ukuran foto melebihi batas 8MB.', 'warn');
      return;
    }

    setPostImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPostImageUrl((ev.target?.result as string) || '');
      showToast('Foto postingan berhasil diunggah!', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) {
      showToast('Judul dan isi postingan wajib diisi.', 'warn');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedTags = postTags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter((t) => t.length > 0);

      const targetClassObj = classes.find((c) => c.id === ownerTargetClassId) || currentClass;
      const finalClassId =
        postScope === 'class'
          ? currentRole === 'owner'
            ? ownerTargetClassId || 'class-1'
            : currentClass?.id || 'class-1'
          : 'global';

      const finalClassName =
        postScope === 'class'
          ? targetClassObj?.name || currentClass?.name || 'Ruang Kelas'
          : 'Global Platform';

      await addForumPost({
        scope: postScope,
        classId: finalClassId,
        className: finalClassName,
        authorId: currentUser?.id || 'user-' + Date.now(),
        authorName: currentUser?.name || (currentRole === 'owner' ? 'Owner Platform' : 'Siswa'),
        authorRole: currentRole,
        authorAvatar: currentUser?.avatar,
        title: postTitle.trim(),
        content: postContent.trim(),
        category: postCategory,
        imageUrl: postImageUrl || undefined,
        price: postCategory === 'jasa' && postPrice.trim() ? postPrice.trim() : undefined,
        contact: postCategory === 'jasa' && postContact.trim() ? postContact.trim() : undefined,
        tags: parsedTags,
      });

      setIsCreateModalOpen(false);
      setPostTitle('');
      setPostContent('');
      setPostPrice('');
      setPostContact('');
      setPostTags('');
      setPostImageUrl('');
      setPostImageFileName('');
      playNotificationSound('success');
      showToast('Postingan berhasil diterbitkan di Forum!', 'success');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendComment = async (postId: string) => {
    if (!commentInput.trim()) return;
    const text = commentInput.trim();
    setCommentInput('');
    await addForumComment(postId, text);
    showToast('Komentar Anda berhasil dikirim!', 'success');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#20153f] via-[#1a1233] to-[#120f26] border border-[#37275f] p-6 sm:p-7 shadow-xl">
        <div className="absolute right-0 top-0 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5 shadow-lg shadow-pink-500/25 flex items-center justify-center text-white shrink-0">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold text-[10px] uppercase tracking-wider border border-pink-500/30">
                  Forum Akademik &amp; Layanan Siswa
                </span>
                <span className="text-xs font-mono text-purple-300 font-bold">
                  Feed Interaktif
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Forum Komunitas &amp; Layanan Akademik Siswa
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 font-medium">
                Wadah publikasi karya ilmiah dan kreatif, diskusi akademik, publikasi layanan keahlian siswa, serta sarana komunikasi interaktif antarsiswa.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setPostScope(activeScope);
              setIsCreateModalOpen(true);
            }}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-pink-500/25 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Buat Postingan Baru</span>
          </button>
        </div>
      </div>

      {/* Scope Switcher: Forum Kelas vs Forum Global */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141126] border border-[#272144] p-3 rounded-2xl shadow-md">
        <div className="flex flex-wrap items-center gap-2 p-1 bg-[#181333] border border-[#2c224e] rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveScope('class')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeScope === 'class'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Forum Kelas</span>
          </button>
          <button
            onClick={() => setActiveScope('global')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeScope === 'global'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Forum Global</span>
          </button>

          {/* Owner Class Selector Dropdown for Forum Kelas */}
          {activeScope === 'class' && currentRole === 'owner' && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-[#2e2354] my-0.5">
              <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1 shrink-0">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Pilih Kelas:</span>
              </span>
              <select
                value={selectedOwnerClassId}
                onChange={(e) => setSelectedOwnerClassId(e.target.value)}
                className="bg-[#100d20] border border-amber-500/40 text-amber-200 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-amber-400 cursor-pointer max-w-[200px] truncate"
              >
                <option value="all">🌟 Semua Ruang Kelas ({classes.length})</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    🏫 {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari postingan, layanan akademik, atau karya..."
            className="w-full bg-[#181333] border border-[#2c224e] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-pink-500"
          />
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        {[
          { id: 'all', label: '🌟 Semua Postingan' },
          { id: 'jasa', label: '💼 Layanan & Keahlian Siswa' },
          { id: 'karya', label: '🎨 Karya & Portofolio Siswa' },
          { id: 'diskusi', label: '💡 Diskusi & Tanya Jawab' },
          { id: 'pengumuman', label: '📢 Informasi & Pengumuman' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap font-bold transition-all border cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-pink-500/20 border-pink-500 text-pink-300 shadow-sm'
                : 'bg-[#141126] border-[#272144] text-slate-400 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Instagram-Style Post Feed Grid */}
      <div className="space-y-6">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-16 bg-[#141126] border border-[#272144] rounded-3xl p-8 space-y-3">
            <MessageSquare className="w-12 h-12 text-slate-600 mx-auto" />
            <h4 className="text-base font-bold text-white">Belum Ada Postingan di Forum Ini</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Jadilah yang pertama membagikan materi diskusi, portofolio karya, atau informasi layanan akademik di forum ini.
            </p>
            <button
              onClick={() => {
                setPostScope(activeScope);
                setIsCreateModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Postingan Pertama</span>
            </button>
          </div>
        ) : (
          filteredPosts.map((post: ForumPost) => {
            const isLiked = currentUser ? post.likedBy?.includes(currentUser.id) : false;
            const isOwnerPost = post.authorRole === 'owner';
            const isAdminPost = post.authorRole === 'admin';
            const isCommentsOpen = activeCommentPostId === post.id;
            const commentsCount = post.comments?.length || 0;

            return (
              <article
                key={post.id}
                className="bg-[#141126] border border-[#272144] hover:border-[#382b60] rounded-3xl overflow-hidden shadow-2xl transition-all"
              >
                {/* 1. Header (Instagram style) */}
                <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[#211a3d]">
                  <div className="flex items-center gap-3">
                    {/* Author Avatar */}
                    {post.authorAvatar ? (
                      <img
                        src={post.authorAvatar}
                        alt={post.authorName}
                        className="w-10 h-10 rounded-full object-cover border-2 border-pink-500"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                        {post.authorName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-sm">
                          {post.authorName}
                        </span>
                        {isOwnerPost ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold flex items-center gap-1">
                            <Crown className="w-3 h-3" />
                            Owner
                          </span>
                        ) : isAdminPost ? (
                          <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-bold flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Admin
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-pink-500/15 text-pink-300 border border-pink-500/30 text-[9px] font-bold">
                            Siswa
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                        <span>{formatIndonesianDate(post.createdAt)}</span>
                        <span>•</span>
                        <span className="text-pink-300 font-semibold">
                          {post.scope === 'global' ? '🌍 Global' : `🏫 ${post.className || 'Kelas'}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                        post.category === 'jasa'
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : post.category === 'karya'
                          ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                          : post.category === 'informasi'
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                          : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                      }`}
                    >
                      {post.category === 'jasa' ? '💼 Jasa Pelajar' : post.category}
                    </span>

                    {(currentUser?.id === post.authorId || currentRole === 'owner') && (
                      <button
                        onClick={() => deleteForumPost(post.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Hapus postingan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Image Banner (if available) */}
                {post.imageUrl && (
                  <div className="relative max-h-[460px] overflow-hidden bg-black flex items-center justify-center">
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full object-cover max-h-[460px]"
                    />
                  </div>
                )}

                {/* 3. Post Content & Marketplace Service Details */}
                <div className="p-5 space-y-3">
                  {/* Service Price & Contact Box (Khusus Marketplace Jasa) */}
                  {post.category === 'jasa' && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-[#20173d] to-[#1a1233] border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 shadow-md">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">
                          TARIF / BIAYA JASA:
                        </span>
                        <span className="text-lg font-black text-white font-mono">
                          {post.price || 'Nego / Sukarela'}
                        </span>
                      </div>
                      {post.contact && (() => {
                        const parsed = parseContactInfo(post.contact);
                        if (!parsed) return null;
                        if (parsed.type === 'instagram') {
                          return (
                            <a
                              href={parsed.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:via-pink-500 hover:to-amber-400 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-pink-500/20 active:scale-95 transition-all hover:scale-105 cursor-pointer"
                              title={`Buka Akun Instagram ${parsed.label}`}
                            >
                              <Instagram className="w-4 h-4" />
                              <span>Instagram ({parsed.label})</span>
                            </a>
                          );
                        }
                        if (parsed.type === 'whatsapp') {
                          return (
                            <a
                              href={parsed.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all hover:scale-105 cursor-pointer"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>WhatsApp ({parsed.displayText})</span>
                            </a>
                          );
                        }
                        return (
                          <a
                            href={parsed.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all hover:scale-105 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Hubungi ({parsed.displayText})</span>
                          </a>
                        );
                      })()}
                    </div>
                  )}

                  <h3 className="text-base sm:text-lg font-extrabold text-white leading-snug">
                    {post.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {renderFormattedTextWithMentions(post.content)}
                  </p>

                  {/* Hashtags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {post.tags.map((t: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-[11px] font-mono text-pink-400 hover:underline cursor-pointer"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Action Bar (Likes, Comment Count, Share) */}
                <div className="px-5 py-3 border-t border-[#211a3d] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => likeForumPost(post.id)}
                      className={`flex items-center gap-1.5 font-bold transition-all cursor-pointer ${
                        isLiked ? 'text-rose-500' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Heart
                        className={`w-5 h-5 ${
                          isLiked ? 'fill-rose-500 text-rose-500 scale-110' : ''
                        } transition-transform active:scale-125`}
                      />
                      <span>{post.likes || 0} Suka</span>
                    </button>

                    <button
                      onClick={() =>
                        setActiveCommentPostId(isCommentsOpen ? null : post.id)
                      }
                      className="flex items-center gap-1.5 text-slate-400 hover:text-white font-semibold cursor-pointer"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>{commentsCount} Komentar</span>
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `[Forum RemindTask] ${post.title}\n${post.content.slice(0, 80)}...`
                      );
                      showToast('Tautan postingan berhasil disalin!', 'success');
                    }}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Bagikan postingan"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

                {/* 5. Instagram Comments Section */}
                {isCommentsOpen && (
                  <div className="p-4 sm:p-5 bg-[#0f0c1e] border-t border-[#211a3d] space-y-3 animate-in fade-in duration-150">
                    <span className="text-xs font-bold text-slate-300 block">
                      Komentar ({commentsCount})
                    </span>

                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                      {commentsCount === 0 ? (
                        <p className="text-xs text-slate-500 italic py-2">
                          Belum ada komentar. Jadilah yang pertama berkomentar!
                        </p>
                      ) : (
                        post.comments.map((c: ForumComment) => (
                          <div
                            key={c.id}
                            className="p-3 rounded-2xl bg-[#141029] border border-[#271d44] text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white flex items-center gap-1.5">
                                <span>{c.authorName}</span>
                                {c.authorRole === 'admin' && (
                                  <span className="text-[9px] text-purple-300 px-1.5 py-0.2 rounded bg-purple-500/20">
                                    Admin
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {formatIndonesianDate(c.createdAt)}
                              </span>
                            </div>
                            <p className="text-slate-300 leading-relaxed">
                              {renderFormattedTextWithMentions(c.content)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Comment Input */}
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="text"
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendComment(post.id);
                        }}
                        placeholder="Tambahkan komentar Anda..."
                        className="flex-1 bg-[#181333] border border-[#2d2250] rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-pink-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendComment(post.id)}
                        disabled={!commentInput.trim()}
                        className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-40"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Kirim</span>
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: BUAT POSTINGAN FORUM BARU */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-[#141126] border border-[#2d2452] rounded-3xl p-6 shadow-2xl relative text-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#241e42] mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-pink-400" />
                <h3 className="font-bold text-white text-base">Buat Postingan Forum Baru</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4 text-xs">
              {/* Scope & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Target Ruang Forum</label>
                  <select
                    value={postScope}
                    onChange={(e) => setPostScope(e.target.value as any)}
                    className="w-full bg-[#181333] border border-[#2f2554] rounded-xl px-3 py-2 text-white outline-none focus:border-pink-500"
                  >
                    <option value="class">Forum Kelas</option>
                    <option value="global">Forum Global</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Kategori Postingan</label>
                  <select
                    value={postCategory}
                    onChange={(e) => setPostCategory(e.target.value as any)}
                    className="w-full bg-[#181333] border border-[#2f2554] rounded-xl px-3 py-2 text-white outline-none focus:border-pink-500"
                  >
                    <option value="diskusi">💡 Diskusi & Tanya PR</option>
                    <option value="jasa">💼 Jasa & Marketplace Pelajar</option>
                    <option value="karya">🎨 Karya & Portofolio</option>
                    <option value="pengumuman">📢 Pengumuman</option>
                  </select>
                </div>

                {/* Target Class selection for Owner role when posting in Forum Kelas */}
                {currentRole === 'owner' && postScope === 'class' && (
                  <div className="col-span-2">
                    <label className="block text-amber-300 font-bold mb-1 flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span>Pilih Ruang Kelas Target Postingan:</span>
                    </label>
                    <select
                      value={ownerTargetClassId}
                      onChange={(e) => setOwnerTargetClassId(e.target.value)}
                      className="w-full bg-[#100d20] border border-amber-500/40 rounded-xl px-3 py-2 text-amber-200 font-semibold outline-none focus:border-amber-400"
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          🏫 {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Special Marketplace Inputs if Category is JASA */}
              {postCategory === 'jasa' && (
                <div className="p-4 rounded-2xl bg-[#1b1538] border border-amber-500/30 space-y-3 animate-in fade-in duration-200">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4" />
                    <span>Informasi Jasa / Layanan yang Ditawarkan:</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] text-slate-300 mb-0.5">Tarif / Harga:</label>
                      <input
                        type="text"
                        value={postPrice}
                        onChange={(e) => setPostPrice(e.target.value)}
                        placeholder="Contoh: Rp 20.000 / Nego"
                        className="w-full bg-[#100d20] border border-[#2f2554] rounded-xl px-3 py-2 text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-300 mb-0.5">No WhatsApp / IG:</label>
                      <input
                        type="text"
                        value={postContact}
                        onChange={(e) => setPostContact(e.target.value)}
                        placeholder="Contoh: @namaig atau 08123456789"
                        className="w-full bg-[#100d20] border border-[#2f2554] rounded-xl px-3 py-2 text-white outline-none focus:border-pink-500"
                      />
                      {postContact.trim() && (() => {
                        const parsed = parseContactInfo(postContact);
                        if (parsed?.type === 'instagram') {
                          return (
                            <span className="text-[10px] text-pink-400 font-bold flex items-center gap-1 mt-1 animate-in fade-in duration-200">
                              <Instagram className="w-3 h-3 text-pink-400 shrink-0" />
                              <span>Otomatis dialihkan ke: instagram.com/{parsed.label.replace(/^@/, '')}</span>
                            </span>
                          );
                        }
                        if (parsed?.type === 'whatsapp') {
                          return (
                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-1 animate-in fade-in duration-200">
                              <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>Otomatis dialihkan ke WhatsApp Chat ({parsed.displayText})</span>
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Judul Postingan <span className="text-pink-400">*</span>
                </label>
                <input
                  type="text"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="Contoh: Buka Jasa Desain Canva & Slide Presentasi / Bedah Soal Fisika Bab 3"
                  required
                  className="w-full bg-[#181333] border border-[#2f2554] rounded-xl px-4 py-2.5 text-white outline-none focus:border-pink-500"
                />
              </div>

              {/* Caption / Content */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Isi / Caption Postingan <span className="text-pink-400">*</span>
                </label>
                <textarea
                  rows={4}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Jelaskan detail postingan, rincian jasa yang ditawarkan, atau topik diskusi belajar..."
                  required
                  className="w-full bg-[#181333] border border-[#2f2554] rounded-xl p-3.5 text-white outline-none focus:border-pink-500 resize-none leading-relaxed"
                />
              </div>

              {/* Image Upload Banner */}
              <div>
                <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-pink-400" />
                  <span>Lampirkan Foto / Poster Banner (Opsional):</span>
                </label>
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-[#3d2e66] hover:border-pink-500 rounded-xl bg-[#120e24] cursor-pointer transition-colors">
                  <ImageIcon className="w-6 h-6 text-pink-400 mb-1" />
                  <span className="text-xs font-bold text-white">
                    {postImageFileName || 'Pilih Gambar (JPG, PNG, WebP)'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">Maks. 8MB</span>
                  <input
                    type="file"
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </label>
                {postImageUrl && (
                  <div className="mt-2 text-center">
                    <img
                      src={postImageUrl}
                      alt="Preview"
                      className="max-h-36 mx-auto rounded-xl object-contain border border-[#2f2250]"
                    />
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Tag / Hashtags (Pisahkan dengan koma):
                </label>
                <input
                  type="text"
                  value={postTags}
                  onChange={(e) => setPostTags(e.target.value)}
                  placeholder="desain, tugas, fisika, joki, coding"
                  className="w-full bg-[#181333] border border-[#2f2554] rounded-xl px-4 py-2 text-white outline-none focus:border-pink-500 font-mono"
                />
              </div>

              <div className="pt-3 border-t border-[#261f42] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Menerbitkan...' : 'Terbitkan Postingan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
