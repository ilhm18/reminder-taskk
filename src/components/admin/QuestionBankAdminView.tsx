import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Plus,
  Eye,
  EyeOff,
  Clock,
  CheckCircle2,
  FileText,
  Trash2,
  Edit3,
  Award,
  Users,
  Search,
  Sparkles,
  BookOpen,
  AlertCircle,
  X,
  Check,
  Send,
  Lock,
  Unlock,
  ChevronRight,
  BarChart2,
  Trophy,
  Download,
  Calendar,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { QuestionBankItem, QuestionItem, QuestionType, QuizStatus, QuizSubmission, LiveQuiz, LiveQuizResponse } from '../../types';
import { getTerminology, resolveEducatorType } from '../../utils/terminology';
import { playNotificationSound } from '../../utils/notification';

export const QuestionBankAdminView: React.FC<{ initialMode?: 'normal' | 'live' }> = ({ initialMode = 'normal' }) => {
  const {
    currentClass,
    questionBanks,
    quizSubmissions,
    addQuestionBank,
    updateQuestionBank,
    toggleQuestionBankStatus,
    deleteQuestionBank,
    showToast,
    currentUser,
    liveQuizzes,
    liveQuizResponses,
    createLiveQuiz,
    updateLiveQuizStatus,
    nextLiveQuizQuestion,
    deleteLiveQuiz,
    setLiveQuizShowAnswers,
    setLiveQuizTimer,
  } = useApp();

  const educatorType = resolveEducatorType(currentUser, currentClass);
  const terms = getTerminology(educatorType);

  // Filter question banks for current class and type (soal/ujian vs kuis_live)
  const targetClassId = currentClass?.id || currentUser?.classId || '';
  const classQuestionBanks = questionBanks.filter((qb) => {
    // 1. Class ID check
    const isSameClass = !targetClassId ||
      qb.classId === targetClassId ||
      (currentClass?.code && qb.classId === currentClass.code) ||
      !qb.classId;

    if (!isSameClass) return false;

    // 2. Quiz type division check
    if (initialMode === 'live') {
      return qb.quizType === 'kuis_live' || (!qb.quizType && qb.questions.every((q) => q.type === 'pilihan_ganda'));
    } else {
      return qb.quizType === 'bank_soal' || !qb.quizType;
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'hidden'>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmissionsModalOpen, setIsSubmissionsModalOpen] = useState(false);
  const [selectedQuizForSubmissions, setSelectedQuizForSubmissions] = useState<QuestionBankItem | null>(null);
  const [viewingSubmission, setViewingSubmission] = useState<QuizSubmission | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<QuestionBankItem | null>(null);

  // Live Quiz States & Navigation Tabs
  const [liveTab, setLiveTab] = useState<'launch' | 'history'>('launch');
  const [viewingHistoryQuiz, setViewingHistoryQuiz] = useState<LiveQuiz | null>(null);
  const [activeLiveQuiz, setActiveLiveQuiz] = useState<LiveQuiz | null>(null);
  const [showLiveStats, setShowLiveStats] = useState(false);

  // Ended Live Quizzes for History View
  const endedLiveQuizzes = React.useMemo(() => {
    return liveQuizzes.filter((l) => {
      const matchClass = !targetClassId || l.classId === targetClassId || (currentClass?.code && l.classId === currentClass.code);
      return matchClass && l.status === 'ended';
    });
  }, [liveQuizzes, targetClassId, currentClass]);

  // Form State for Creating / Editing Question Bank
  const [formTitle, setFormTitle] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDurationMinutes, setFormDurationMinutes] = useState<number>(30);
  const [enableTimeLimitPerQuestion, setEnableTimeLimitPerQuestion] = useState<boolean>(false);
  const [durationModeWithPerQ, setDurationModeWithPerQ] = useState<'auto_sync' | 'hide_total'>('auto_sync');
  const [formTimeLimitPerQuestionSeconds, setFormTimeLimitPerQuestionSeconds] = useState<number>(60);
  const [formStatus, setFormStatus] = useState<QuizStatus>('hidden'); // Default: simpan di persembunyian

  // List of questions inside form
  const [formQuestions, setFormQuestions] = useState<QuestionItem[]>([
    {
      id: 'q-temp-1',
      type: 'pilihan_ganda',
      questionText: '',
      options: ['', '', '', ''],
      correctOptionIndex: 0,
      points: 10,
    },
  ]);

  // Reconnect to active live quiz if present
  useEffect(() => {
    const classId = currentClass?.id || currentUser?.classId || '';
    // If admin is currently looking at an ended quiz (podium screen), keep it until explicitly closed
    if (activeLiveQuiz?.status === 'ended') {
      return;
    }
    // Check if the current live quiz just transitioned to ended
    if (activeLiveQuiz) {
      const matchInList = liveQuizzes.find((l) => l.id === activeLiveQuiz.id);
      if (matchInList && matchInList.status === 'ended') {
        setActiveLiveQuiz(matchInList);
        return;
      }
    }
    const ongoing = liveQuizzes.find(
      (l) => (!classId || l.classId === classId || (currentClass?.code && l.classId === currentClass.code)) &&
             (l.status === 'active' || l.status === 'waiting')
    );
    if (ongoing && !activeLiveQuiz) {
      setActiveLiveQuiz(ongoing);
    } else if (!ongoing && activeLiveQuiz && (activeLiveQuiz.status as string) !== 'ended') {
      setActiveLiveQuiz(null);
    } else if (ongoing && activeLiveQuiz && activeLiveQuiz.id === ongoing.id) {
      if (ongoing.status !== activeLiveQuiz.status || ongoing.currentQuestionIndex !== activeLiveQuiz.currentQuestionIndex || ongoing.showAnswers !== activeLiveQuiz.showAnswers) {
        setActiveLiveQuiz(ongoing);
      }
    }
  }, [liveQuizzes, currentClass, currentUser, activeLiveQuiz]);

  const handleExportLiveQuizCsv = (targetLiveQuiz: LiveQuiz) => {
    const quiz = questionBanks.find((q) => q.id === targetLiveQuiz.quizId);
    const lobbyStudents = liveQuizResponses.filter(
      (r) => r.liveQuizId === targetLiveQuiz.id && r.questionIndex === -1
    );
    const studentScores: Record<string, { name: string; score: number; answersCount: number }> = {};
    lobbyStudents.forEach((student) => {
      studentScores[student.memberId] = {
        name: student.memberName,
        score: 0,
        answersCount: 0,
      };
    });
    liveQuizResponses
      .filter((r) => r.liveQuizId === targetLiveQuiz.id && r.questionIndex >= 0)
      .forEach((res) => {
        if (!studentScores[res.memberId]) {
          studentScores[res.memberId] = {
            name: res.memberName,
            score: 0,
            answersCount: 0,
          };
        }
        studentScores[res.memberId].score += res.pointsEarned || 0;
        studentScores[res.memberId].answersCount++;
      });
    const rankings = Object.entries(studentScores)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.score - a.score);

    const lines = [
      `"REKAP PERINGKAT KUIS LIVE - ${targetLiveQuiz.title}"`,
      `"Tanggal Sesi","${new Date(targetLiveQuiz.createdAt).toLocaleString('id-ID')}"`,
      `"Paket Soal","${quiz?.title || targetLiveQuiz.title}"`,
      `"Total Peserta","${rankings.length}"`,
      '""',
      '"Peringkat","Nama Siswa","Total Skor Poin","Jumlah Soal Terjawab"'
    ];
    rankings.forEach((r, idx) => {
      lines.push(`"${idx + 1}","${r.name.replace(/"/g, '""')}","${r.score}","${r.answersCount}"`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rekap_Kuis_Live_${targetLiveQuiz.title.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getQuizLeaderboard = (targetLiveQuiz: LiveQuiz) => {
    const lobbyStudents = liveQuizResponses.filter(
      (r) => r.liveQuizId === targetLiveQuiz.id && r.questionIndex === -1
    );
    const studentScores: Record<string, { name: string; score: number; answersCount: number }> = {};
    lobbyStudents.forEach((student) => {
      studentScores[student.memberId] = {
        name: student.memberName,
        score: 0,
        answersCount: 0,
      };
    });
    liveQuizResponses
      .filter((r) => r.liveQuizId === targetLiveQuiz.id && r.questionIndex >= 0)
      .forEach((res) => {
        if (!studentScores[res.memberId]) {
          studentScores[res.memberId] = {
            name: res.memberName,
            score: 0,
            answersCount: 0,
          };
        }
        studentScores[res.memberId].score += res.pointsEarned || 0;
        studentScores[res.memberId].answersCount++;
      });
    return Object.entries(studentScores)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.score - a.score);
  };

  const handleDeleteEndedQuiz = async (quizId: string) => {
    await deleteLiveQuiz(quizId);
    showToast('Riwayat sesi kuis live berhasil dihapus.', 'info');
  };

  const handleStartLiveQuiz = async (quiz: QuestionBankItem) => {
    try {
      const live = await createLiveQuiz(quiz.id, quiz.title);
      setActiveLiveQuiz(live);
      setShowLiveStats(false);
    } catch (err) {
      showToast('Gagal memulai kuis live.', 'warn');
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingQuiz(null);
    setFormTitle('');
    setFormSubject('');
    setFormDescription('');
    setFormDurationMinutes(30);
    setEnableTimeLimitPerQuestion(false);
    setDurationModeWithPerQ('auto_sync');
    setFormTimeLimitPerQuestionSeconds(60);
    setFormStatus('hidden'); // Default: Di persembunyian
    setFormQuestions([
      {
        id: 'q-temp-1',
        type: 'pilihan_ganda',
        questionText: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        points: 10,
      },
    ]);
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (quiz: QuestionBankItem) => {
    setEditingQuiz(quiz);
    setFormTitle(quiz.title);
    setFormSubject(quiz.subject || '');
    setFormDescription(quiz.description || '');
    setFormDurationMinutes(quiz.durationMinutes || 0);
    const hasPerQ = Boolean(quiz.timeLimitPerQuestionSeconds && quiz.timeLimitPerQuestionSeconds > 0);
    setEnableTimeLimitPerQuestion(hasPerQ);
    setFormTimeLimitPerQuestionSeconds(quiz.timeLimitPerQuestionSeconds || 60);
    if (hasPerQ) {
      if (quiz.durationMinutes <= 0) {
        setDurationModeWithPerQ('hide_total');
      } else {
        setDurationModeWithPerQ('auto_sync');
      }
    } else {
      setDurationModeWithPerQ('auto_sync');
    }
    setFormStatus(quiz.status);
    setFormQuestions(
      quiz.questions && quiz.questions.length > 0
        ? JSON.parse(JSON.stringify(quiz.questions))
        : [
            {
              id: 'q-temp-1',
              type: 'pilihan_ganda',
              questionText: '',
              options: ['', '', '', ''],
              correctOptionIndex: 0,
              points: 10,
            },
          ]
    );
    setIsCreateModalOpen(true);
  };

  // Question manipulation inside form
  const handleAddQuestion = (type: QuestionType = 'pilihan_ganda') => {
    const newQ: QuestionItem = {
      id: 'q-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      type,
      questionText: '',
      options: type === 'pilihan_ganda' ? ['', '', '', ''] : undefined,
      correctOptionIndex: 0,
      essayAnswerKey: type === 'essay' ? '' : undefined,
      points: 10,
    };
    setFormQuestions((prev) => [...prev, newQ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (formQuestions.length <= 1) {
      showToast('Minimal harus ada 1 soal dalam bank soal.', 'warn');
      return;
    }
    setFormQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateQuestion = (index: number, updates: Partial<QuestionItem>) => {
    setFormQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== index) return q;
        const updated = { ...q, ...updates };
        // If type changed to essay, remove options
        if (updates.type === 'essay') {
          delete updated.options;
          delete updated.correctOptionIndex;
          updated.essayAnswerKey = updated.essayAnswerKey || '';
        } else if (updates.type === 'pilihan_ganda') {
          updated.options = updated.options || ['', '', '', ''];
          updated.correctOptionIndex = updated.correctOptionIndex ?? 0;
          delete updated.essayAnswerKey;
        }
        return updated;
      })
    );
  };

  const handleUpdateOption = (qIndex: number, optIndex: number, value: string) => {
    setFormQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const opts = [...(q.options || ['', '', '', ''])];
        opts[optIndex] = value;
        return { ...q, options: opts };
      })
    );
  };

  // Save Question Bank
  const handleSaveQuestionBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('Harap masukkan judul bank soal / ujian.', 'warn');
      return;
    }

    // Validate that questions have text
    for (let i = 0; i < formQuestions.length; i++) {
      const q = formQuestions[i];
      if (!q.questionText.trim()) {
        showToast(`Soal nomor ${i + 1} belum memiliki teks pertanyaan.`, 'warn');
        return;
      }
      if (q.type === 'pilihan_ganda') {
        const hasEmptyOption = (q.options || []).some((opt) => !opt.trim());
        if (hasEmptyOption) {
          showToast(`Semua pilihan jawaban (A, B, C, D) pada soal nomor ${i + 1} harus diisi.`, 'warn');
          return;
        }
      }
    }

    const totalQuestions = formQuestions.length;
    const totalPoints = formQuestions.reduce((sum, q) => sum + (Number(q.points) || 10), 0);
    const timeLimitPerQuestionSeconds = enableTimeLimitPerQuestion ? (Number(formTimeLimitPerQuestionSeconds) || 60) : 0;
    const calculatedTotalMinutes = Math.max(1, Math.ceil((formQuestions.length * (Number(formTimeLimitPerQuestionSeconds) || 60)) / 60));
    const finalDurationMinutes = enableTimeLimitPerQuestion
      ? (durationModeWithPerQ === 'hide_total' ? 0 : calculatedTotalMinutes)
      : (Number(formDurationMinutes) || 0);

    if (editingQuiz) {
      await updateQuestionBank(editingQuiz.id, {
        title: formTitle.trim(),
        subject: formSubject.trim(),
        description: formDescription.trim(),
        durationMinutes: finalDurationMinutes,
        timeLimitPerQuestionSeconds,
        status: formStatus,
        questions: formQuestions,
        totalQuestions,
        totalPoints,
        quizType: editingQuiz.quizType || (initialMode === 'live' ? 'kuis_live' : 'bank_soal'),
      });
    } else {
      const effectiveClassId = currentClass?.id || currentUser?.classId || 'class-default';
      await addQuestionBank({
        classId: effectiveClassId,
        title: formTitle.trim(),
        subject: formSubject.trim(),
        description: formDescription.trim(),
        durationMinutes: finalDurationMinutes,
        timeLimitPerQuestionSeconds,
        status: formStatus,
        questions: formQuestions,
        totalQuestions,
        totalPoints,
        createdBy: currentUser?.id || 'admin',
        createdByName: currentUser?.name || 'Admin Kelas',
        quizType: initialMode === 'live' ? 'kuis_live' : 'bank_soal',
      });
    }

    // Reset status filter and search query so the newly created question bank is immediately visible
    setStatusFilter('all');
    setSearchQuery('');
    setIsCreateModalOpen(false);
  };

  // Filtered List
  const subjects = Array.from(new Set(classQuestionBanks.map((q) => q.subject).filter(Boolean)));
  const filteredQuestionBanks = classQuestionBanks.filter((qb) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      qb.title.toLowerCase().includes(q) ||
      (qb.subject && qb.subject.toLowerCase().includes(q)) ||
      (qb.description && qb.description.toLowerCase().includes(q));

    const matchStatus = statusFilter === 'all' || qb.status === statusFilter;
    const matchSubj = selectedSubject === 'all' || qb.subject === selectedSubject;

    return matchSearch && matchStatus && matchSubj;
  });

  // Calculate Statistics
  const totalCount = classQuestionBanks.length;
  const publishedCount = classQuestionBanks.filter((qb) => qb.status === 'published').length;
  const hiddenCount = classQuestionBanks.filter((qb) => qb.status === 'hidden').length;
  const totalQuestionsAll = classQuestionBanks.reduce((sum, qb) => sum + qb.totalQuestions, 0);

  // Auto-calculated total duration for modal form based on questions and seconds per question
  const calculatedTotalMinutes = Math.max(1, Math.ceil((formQuestions.length * (Number(formTimeLimitPerQuestionSeconds) || 60)) / 60));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1c153d] via-[#161131] to-[#0f0c22] border border-[#2e2354] p-6 sm:p-8 shadow-2xl">
        <div className="absolute -right-10 -top-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {initialMode === 'live' ? (
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-bold mb-3">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span>Kuis Interaktif Real-Time</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Kuis Live 🎙️
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-xl leading-relaxed">
                Pilih salah satu paket bank soal pilihan ganda di bawah ini untuk meluncurkan sesi kuis live interaktif bergaya Kahoot secara realtime, atau lihat riwayat sesi &amp; peringkat juara terdahulu!
              </p>
            </div>
          ) : (
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-bold mb-3">
                <HelpCircle className="w-3.5 h-3.5 text-pink-400" />
                <span>Sistem Bank Soal &amp; Ujian Terintegrasi</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Bank Soal &amp; Manajemen Ujian
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-xl leading-relaxed">
                Buat paket soal pilihan ganda &amp; essay secara manual. Anda dapat menyimpan soal di{' '}
                <strong className="text-amber-400">Persembunyian (Rahasia)</strong> sehingga {terms.memberTitle.toLowerCase()} kelas tidak mengetahuinya sampai Anda membukanya!
              </p>
            </div>
          )}

          {initialMode === 'live' ? (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xs shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Buat Soal Kuis Live Baru</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-black text-xs shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Buat Paket Soal Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-tabs for Kuis Live: Luncurkan vs Riwayat */}
      {initialMode === 'live' && (
        <div className="flex items-center gap-2 border-b border-[#291e4f] pb-3">
          <button
            type="button"
            onClick={() => setLiveTab('launch')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              liveTab === 'launch'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-[#140f2b] border border-[#271d49]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Luncurkan Kuis Live ({classQuestionBanks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setLiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              liveTab === 'history'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-[#140f2b] border border-[#271d49]'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Riwayat Sesi &amp; Peringkat ({endedLiveQuizzes.length})</span>
          </button>
        </div>
      )}

      {/* Stats Cards */}
      {initialMode !== 'live' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-[#141029] border border-[#271f49] flex items-center gap-3.5 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">TOTAL PAKET</span>
              <span className="text-xl font-black text-white">{totalCount} Paket</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#141029] border border-[#271f49] flex items-center gap-3.5 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">TERBUKA (PUBLIK)</span>
              <span className="text-xl font-black text-white">{publishedCount} Paket</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#141029] border border-[#271f49] flex items-center gap-3.5 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">DI PERSEMBUNYIAN</span>
              <span className="text-xl font-black text-white">{hiddenCount} Paket</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#141029] border border-[#271f49] flex items-center gap-3.5 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">TOTAL BUTIR SOAL</span>
              <span className="text-xl font-black text-white">{totalQuestionsAll} Soal</span>
            </div>
          </div>
        </div>
      )}

      {/* Render Sub-tab Content: If in Live mode and History tab selected, render ended quizzes history */}
      {initialMode === 'live' && liveTab === 'history' ? (
        endedLiveQuizzes.length === 0 ? (
          <div className="p-12 rounded-3xl bg-[#141029] border border-[#251d45] text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Trophy className="w-8 h-8 opacity-80" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">Belum Ada Riwayat Kuis Live Selesai</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Setelah Anda meluncurkan kuis live di tab &quot;Luncurkan Kuis Live&quot; dan menyelesaikannya bersama {terms.memberTitlePlural.toLowerCase()}, seluruh riwayat sesi, podium juara 3 besar, dan peringkat akan otomatis tersimpan rapi di sini!
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLiveTab('launch')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Luncurkan Kuis Live Sekarang</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">
                Menampilkan {endedLiveQuizzes.length} Sesi Kuis Live yang Telah Selesai
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {endedLiveQuizzes.map((sess) => {
                const quizDef = questionBanks.find((q) => q.id === sess.quizId);
                const rankings = getQuizLeaderboard(sess);
                const top1 = rankings[0];
                const top2 = rankings[1];
                const top3 = rankings[2];

                return (
                  <div
                    key={sess.id}
                    className="p-5 sm:p-6 rounded-3xl bg-[#14102b] border border-[#2d2252] shadow-xl hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Header Pill */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold text-[10px] font-mono">
                          {new Date(sess.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[10px] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Selesai &amp; Tersimpan</span>
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
                          {sess.title}
                        </h3>
                        {quizDef?.title && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            Paket Soal: <span className="text-purple-300 font-semibold">{quizDef.title}</span>
                          </p>
                        )}
                      </div>

                      {/* Stats pill */}
                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-[#1b1538] border border-[#2a1f4d] text-center">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">TOTAL PESERTA</span>
                          <span className="text-sm font-black text-pink-400">{rankings.length} {terms.memberTitle}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">JUMLAH SOAL</span>
                          <span className="text-sm font-black text-amber-400">{quizDef?.totalQuestions || sess.currentQuestionIndex + 1} Soal</span>
                        </div>
                      </div>

                      {/* Podium Preview */}
                      <div className="p-3 rounded-2xl bg-[#120e26] border border-[#241a45] space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                          🏆 PODIUM JUARA KUIS
                        </span>
                        {rankings.length === 0 ? (
                          <p className="text-xs text-slate-500 italic">Belum ada peserta menjawab</p>
                        ) : (
                          <div className="space-y-1 text-xs">
                            {top1 && (
                              <div className="flex items-center justify-between text-amber-300 font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg">
                                <span className="truncate flex items-center gap-1.5">
                                  <span>🥇</span>
                                  <span className="truncate">{top1.name}</span>
                                </span>
                                <span className="font-mono text-xs">{top1.score} Pts</span>
                              </div>
                            )}
                            {top2 && (
                              <div className="flex items-center justify-between text-slate-300 font-semibold bg-white/5 px-2.5 py-1 rounded-lg">
                                <span className="truncate flex items-center gap-1.5">
                                  <span>🥈</span>
                                  <span className="truncate">{top2.name}</span>
                                </span>
                                <span className="font-mono text-xs">{top2.score} Pts</span>
                              </div>
                            )}
                            {top3 && (
                              <div className="flex items-center justify-between text-amber-600 font-semibold bg-amber-900/10 px-2.5 py-1 rounded-lg">
                                <span className="truncate flex items-center gap-1.5">
                                  <span>🥉</span>
                                  <span className="truncate">{top3.name}</span>
                                </span>
                                <span className="font-mono text-xs">{top3.score} Pts</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-[#261d47] flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setViewingHistoryQuiz(sess)}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
                      >
                        <Trophy className="w-3.5 h-3.5 text-amber-300" />
                        <span>Lihat Peringkat &amp; Podium</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportLiveQuizCsv(sess)}
                        className="py-2.5 px-3 rounded-xl bg-[#1f173d] hover:bg-[#2c2055] border border-[#352562] text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        title="Unduh Rekap CSV"
                      >
                        <Download className="w-3.5 h-3.5 text-purple-400" />
                        <span className="hidden sm:inline">CSV</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteEndedQuiz(sess.id)}
                        className="py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
                        title="Hapus riwayat sesi ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : (
        <>
          {/* Filter and Search Bar */}
          <div className="p-4 rounded-2xl bg-[#14102b] border border-[#271e4d] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul soal atau mapel..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#1b1538] border border-[#2e2354] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-1 p-1 bg-[#1a1438] rounded-xl border border-[#2d2354]">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'all' ? 'bg-pink-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Semua ({totalCount})
                </button>
                <button
                  onClick={() => setStatusFilter('published')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'published' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Terbuka ({publishedCount})
                </button>
                <button
                  onClick={() => setStatusFilter('hidden')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'hidden' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Persembunyian ({hiddenCount})
                </button>
              </div>

              {subjects.length > 0 && (
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#1a1438] border border-[#2d2354] text-xs text-slate-300 font-bold focus:outline-none"
                >
                  <option value="all">Semua Mapel</option>
                  {subjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Question Banks List */}
          {filteredQuestionBanks.length === 0 ? (
            <div className="p-12 rounded-3xl bg-[#141029] border border-[#251d45] text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 opacity-75" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Belum Ada Bank Soal</h3>
              <p className="text-xs text-slate-400 max-w-sm mb-5 leading-relaxed">
                Mulai susun paket soal ujian, kuis pilihan ganda, dan uraian essay. Anda bisa menyimpannya secara rahasia di persembunyian terlebih dahulu!
              </p>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="px-4 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-pink-500/20"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Buat Soal Pertama Sekarang</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredQuestionBanks.map((quiz) => {
                const isHidden = quiz.status === 'hidden';
                const mcCount = quiz.questions.filter((q) => q.type === 'pilihan_ganda').length;
                const essayCount = quiz.questions.filter((q) => q.type === 'essay').length;
                const submissionCount = quizSubmissions.filter((qs) => qs.quizId === quiz.id).length;

                return (
                  <div
                    key={quiz.id}
                    className={`p-5 sm:p-6 rounded-3xl border transition-all duration-200 flex flex-col justify-between ${
                      isHidden
                        ? 'bg-[#151128]/95 border-amber-500/30 shadow-lg shadow-amber-500/5'
                        : 'bg-[#14102b] border-[#2d2252] shadow-xl hover:border-pink-500/40'
                    }`}
                  >
                    <div>
                      {/* Status Banner / Pill */}
                      <div className="flex items-center justify-between gap-3 mb-3.5">
                        <div className="flex items-center gap-2">
                          {quiz.subject && (
                            <span className="px-2.5 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold text-[10px]">
                              {quiz.subject}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{quiz.durationMinutes > 0 ? `${quiz.durationMinutes} Menit` : 'Tanpa Batas Waktu'}</span>
                          </span>
                          {quiz.timeLimitPerQuestionSeconds && quiz.timeLimitPerQuestionSeconds > 0 ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-[10px] font-mono flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-amber-400" />
                              <span>{quiz.timeLimitPerQuestionSeconds}s / soal</span>
                            </span>
                          ) : null}
                        </div>

                        {/* Secret vs Published Pill */}
                        {isHidden ? (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-black">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Di Persembunyian (Rahasia)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-black">
                            <Eye className="w-3.5 h-3.5" />
                            <span>Terbuka untuk {terms.memberTitle}</span>
                          </div>
                        )}
                      </div>

                      {/* Title and Description */}
                      <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug mb-2">
                        {quiz.title}
                      </h3>
                      {quiz.description && (
                        <p className="text-xs text-slate-300 line-clamp-2 mb-3.5 leading-relaxed">
                          {quiz.description}
                        </p>
                      )}

                      {/* Question Stats Breakdown */}
                      <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-[#1b1538] border border-[#2a1f4d] mb-4 text-center">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">PILIHAN GANDA</span>
                          <span className="text-sm font-black text-pink-400">{mcCount} Soal</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">ESSAY</span>
                          <span className="text-sm font-black text-purple-300">{essayCount} Soal</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">TOTAL POIN</span>
                          <span className="text-sm font-black text-amber-400">{quiz.totalPoints} Poin</span>
                        </div>
                      </div>

                      {/* Privacy notice info */}
                      {isHidden && (
                        <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2 mb-4">
                          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                          <span>{terms.memberTitle} kelas tidak dapat melihat soal ini sampai Anda mengklik tombol "Buka Soal".</span>
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="space-y-2 pt-2 border-t border-[#261d47]">
                      {initialMode === 'live' ? (
                        /* Live Quiz Launcher */
                        <button
                          type="button"
                          onClick={() => handleStartLiveQuiz(quiz)}
                          className="w-full py-3 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-500/20 active:scale-95 mb-1"
                        >
                          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse stroke-[2.5]" />
                          <span>Mulai Kuis Live 🎙️</span>
                        </button>
                      ) : (
                        /* Primary Toggle: Buka vs Sembunyikan */
                        <button
                          type="button"
                          onClick={() => toggleQuestionBankStatus(quiz.id)}
                          className={`w-full py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                            isHidden
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20'
                              : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-500/20'
                          }`}
                        >
                          {isHidden ? (
                            <>
                              <Unlock className="w-4 h-4 stroke-[2.5]" />
                              <span>Buka Soal untuk {terms.memberTitle} 🚀</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4 stroke-[2.5]" />
                              <span>Kunci &amp; Simpan ke Persembunyian 🔒</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Secondary Actions (History/Hasil, Edit, Hapus - ALWAYS visible in both modes!) */}
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedQuizForSubmissions(quiz);
                            setIsSubmissionsModalOpen(true);
                          }}
                          className="py-2 px-2.5 rounded-xl bg-[#20183f] hover:bg-[#2b2154] text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-[#31255c] transition-colors cursor-pointer"
                          title={`Lihat hasil ${terms.memberTitle.toLowerCase()}`}
                        >
                          <Award className="w-3.5 h-3.5 text-amber-400" />
                          <span className="truncate">Hasil ({submissionCount})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(quiz)}
                          className="py-2 px-2.5 rounded-xl bg-[#20183f] hover:bg-[#2b2154] text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-[#31255c] transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-pink-400" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Hapus bank soal "${quiz.title}"? Seluruh butir soal dan data nilai ujian ini akan dihapus permanen.`)) {
                              deleteQuestionBank(quiz.id);
                            }
                          }}
                          className="py-2 px-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold flex items-center justify-center gap-1.5 border border-red-500/20 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* MODAL 1: CREATE / EDIT QUESTION BANK */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-[#130f28] border border-[#2b214d] rounded-3xl p-5 sm:p-7 shadow-2xl my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#241a45]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {editingQuiz ? 'Edit Bank Soal & Ujian' : 'Buat Paket Bank Soal Baru'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Susun butir pertanyaan pilihan ganda &amp; essay secara fleksibel
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#20183b] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Form Body */}
            <form onSubmit={handleSaveQuestionBank} className="flex-1 overflow-y-auto pr-1 space-y-6 scrollbar-thin">
              {/* Basic Info Grid */}
              <div className="p-4 rounded-2xl bg-[#181335] border border-[#291e4f] space-y-4">
                <h4 className="text-xs font-bold text-pink-400 uppercase tracking-wider">
                  1. Informasi Dasar Paket Ujian
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Judul Bank Soal / Ujian <span className="text-pink-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Contoh: Kuis Harian Bab 2 Logika Algoritma"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#120e26] border border-[#291e4f] text-xs text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Mata Pelajaran / Topik
                    </label>
                    <input
                      type="text"
                      value={formSubject}
                      onChange={(e) => setFormSubject(e.target.value)}
                      placeholder="Contoh: Informatika, Matematika, IPA"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#120e26] border border-[#291e4f] text-xs text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Durasi Pengerjaan: Menyesuaikan secara pintar jika Batas Waktu diaktifkan */}
                  {enableTimeLimitPerQuestion ? (
                    <div className="p-3.5 rounded-2xl bg-[#161033] border border-amber-500/30 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Durasi Pengerjaan Ujian</span>
                        </label>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono font-bold">
                          {durationModeWithPerQ === 'auto_sync' ? `${calculatedTotalMinutes} Menit` : 'Hilang (Hanya Per Soal)'}
                        </span>
                      </div>

                      {/* Dua Pilihan Fleksibel Sesuai Kebutuhan Admin */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setDurationModeWithPerQ('auto_sync');
                            setFormDurationMinutes(calculatedTotalMinutes);
                          }}
                          className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                            durationModeWithPerQ === 'auto_sync'
                              ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-sm ring-1 ring-amber-400/50'
                              : 'bg-[#120e26] border-[#291e4f] text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="font-bold text-[11px] flex items-center gap-1">
                            ⏱️ Sesuai Batas Soal
                          </span>
                          <span className="text-[10px] text-slate-300 mt-1 leading-tight">
                            {formQuestions.length} soal × {formTimeLimitPerQuestionSeconds}s = <strong>{calculatedTotalMinutes} menit</strong>
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDurationModeWithPerQ('hide_total');
                            setFormDurationMinutes(0);
                          }}
                          className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                            durationModeWithPerQ === 'hide_total'
                              ? 'bg-purple-600/30 border-purple-400 text-purple-200 shadow-sm ring-1 ring-purple-400/50'
                              : 'bg-[#120e26] border-[#291e4f] text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="font-bold text-[11px] flex items-center gap-1">
                            🚫 Hilangkan Durasi Total
                          </span>
                          <span className="text-[10px] text-slate-300 mt-1 leading-tight">
                            Durasi total hilang, {terms.memberTitle.toLowerCase()} hanya fokus timer per butir soal
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">
                        Durasi Pengerjaan (Menit)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formDurationMinutes}
                        onChange={(e) => setFormDurationMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                        placeholder="30 (0 = Tanpa batas waktu)"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#120e26] border border-[#291e4f] text-xs text-white focus:outline-none focus:border-pink-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Atur menit pengerjaan (0 = Bebas tanpa batas waktu).
                      </p>
                    </div>
                  )}

                  {/* Status: Simpan di Persembunyian vs Langsung Buka */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Status Visibilitas {terms.memberTitle}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormStatus('hidden')}
                        className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                          formStatus === 'hidden'
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm'
                            : 'bg-[#120e26] border-[#291e4f] text-slate-400 hover:text-white'
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Persembunyian 🔒</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormStatus('published')}
                        className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                          formStatus === 'published'
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                            : 'bg-[#120e26] border-[#291e4f] text-slate-400 hover:text-white'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Buka ke {terms.memberTitle} 🚀</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Batas Waktu Mengerjakan Dalam Satu Soal (Timer Per Butir Soal) */}
                <div className="p-4 rounded-2xl bg-[#110d24] border border-[#2b1f50] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-white">
                          Batas Waktu Mengerjakan Dalam Satu Soal
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        Pilihan untuk membatasi waktu pengerjaan per butir soal. Jika dinonaktifkan, {terms.memberTitle.toLowerCase()} bebas tanpa timer per soal.
                      </p>
                    </div>

                    {/* Toggle: Bebas vs Ada Waktu */}
                    <div className="flex items-center gap-1 bg-[#181235] p-1 rounded-xl border border-[#2e2154] shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEnableTimeLimitPerQuestion(false);
                          if (formDurationMinutes <= 0) setFormDurationMinutes(30);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          !enableTimeLimitPerQuestion
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Bebas (Tanpa Waktu)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEnableTimeLimitPerQuestion(true);
                          if (durationModeWithPerQ === 'auto_sync') {
                            setFormDurationMinutes(calculatedTotalMinutes);
                          } else {
                            setFormDurationMinutes(0);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          enableTimeLimitPerQuestion
                            ? 'bg-amber-500 text-black shadow-sm font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        ⏱️ Ada Batas Waktu
                      </button>
                    </div>
                  </div>

                  {enableTimeLimitPerQuestion && (
                    <div className="pt-3 border-t border-[#231942] flex flex-wrap items-center gap-4 animate-in fade-in duration-150">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-semibold text-slate-300">Waktu per soal:</span>
                        <input
                          type="number"
                          min={5}
                          max={600}
                          value={formTimeLimitPerQuestionSeconds}
                          onChange={(e) => {
                            const val = Math.max(5, parseInt(e.target.value) || 30);
                            setFormTimeLimitPerQuestionSeconds(val);
                            if (durationModeWithPerQ === 'auto_sync') {
                              setFormDurationMinutes(Math.max(1, Math.ceil((formQuestions.length * val) / 60)));
                            }
                          }}
                          className="w-20 px-3 py-1.5 rounded-xl bg-[#181335] border border-amber-500/50 text-white font-mono text-xs text-center font-bold focus:outline-none focus:border-amber-400"
                        />
                        <span className="text-xs font-mono text-amber-300 font-bold">Detik</span>
                      </div>

                      {/* Quick preset buttons */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-semibold mr-1">Preset Cepat:</span>
                        {[15, 30, 45, 60, 90, 120].map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => {
                              setFormTimeLimitPerQuestionSeconds(sec);
                              if (durationModeWithPerQ === 'auto_sync') {
                                setFormDurationMinutes(Math.max(1, Math.ceil((formQuestions.length * sec) / 60)));
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-colors cursor-pointer border ${
                              formTimeLimitPerQuestionSeconds === sec
                                ? 'bg-amber-500 text-black border-amber-400 font-black'
                                : 'bg-[#181335] border-[#2e2154] text-slate-300 hover:text-white'
                            }`}
                          >
                            {sec}s
                          </button>
                        ))}
                      </div>

                      <span className="text-[10px] text-amber-400/90 w-full font-medium">
                        💡 Catatan: Saat {terms.memberTitle.toLowerCase()} mengerjakan, countdown waktu soal ini akan berjalan. Ketika waktu habis, otomatis lanjut ke soal berikutnya!
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Instruksi / Catatan Tambahan (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder={`Instruksi pengerjaan untuk ${terms.memberTitle.toLowerCase()}...`}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#120e26] border border-[#291e4f] text-xs text-white focus:outline-none focus:border-pink-500 resize-none"
                  />
                </div>
              </div>

              {/* Questions Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-pink-400 uppercase tracking-wider">
                      2. Daftar Butir Soal ({formQuestions.length} Soal)
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('pilihan_ganda')}
                      className="px-3 py-1.5 rounded-xl bg-[#221845] hover:bg-[#2e205c] border border-[#392873] text-pink-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Pilihan Ganda</span>
                    </button>
                    {initialMode !== 'live' && (
                      <button
                        type="button"
                        onClick={() => handleAddQuestion('essay')}
                        className="px-3 py-1.5 rounded-xl bg-[#221845] hover:bg-[#2e205c] border border-[#392873] text-purple-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Essay / Uraian</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Question Items Editor */}
                <div className="space-y-4">
                  {formQuestions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className="p-4 sm:p-5 rounded-2xl bg-[#181335] border border-[#2d2154] space-y-3 relative group"
                    >
                      {/* Top Bar for each question */}
                      <div className="flex items-center justify-between pb-2 border-b border-[#291d4e]">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-pink-500/20 text-pink-400 font-black text-xs flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-white">Soal Nomor {idx + 1}</span>

                          {/* Switch Type */}
                          {initialMode !== 'live' && (
                            <div className="flex items-center gap-1 ml-3 bg-[#110d24] p-0.5 rounded-lg border border-[#261947]">
                              <button
                                type="button"
                                onClick={() => handleUpdateQuestion(idx, { type: 'pilihan_ganda' })}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                                  q.type === 'pilihan_ganda' ? 'bg-pink-500 text-white' : 'text-slate-400'
                                }`}
                              >
                                Pilihan Ganda
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateQuestion(idx, { type: 'essay' })}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                                  q.type === 'essay' ? 'bg-purple-600 text-white' : 'text-slate-400'
                                }`}
                              >
                                Essay
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-slate-400 text-[10px] font-bold">Poin:</span>
                            <input
                              type="number"
                              min={1}
                              value={q.points || 10}
                              onChange={(e) => handleUpdateQuestion(idx, { points: Math.max(1, parseInt(e.target.value) || 10) })}
                              className="w-14 px-2 py-0.5 rounded-lg bg-[#110d24] border border-[#271b4a] text-center text-xs font-bold text-amber-300"
                            />
                          </div>
                          {formQuestions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(idx)}
                              className="p-1 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                              title="Hapus soal ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Question Textarea */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">
                          Pertanyaan / Teks Soal:
                        </label>
                        <textarea
                          rows={2}
                          required
                          value={q.questionText}
                          onChange={(e) => handleUpdateQuestion(idx, { questionText: e.target.value })}
                          placeholder={`Tuliskan pertanyaan untuk soal nomor ${idx + 1}...`}
                          className="w-full px-3 py-2 rounded-xl bg-[#110e26] border border-[#291e4f] text-xs text-white focus:outline-none focus:border-pink-500 resize-none"
                        />
                      </div>

                      {/* Multiple Choice Options */}
                      {q.type === 'pilihan_ganda' ? (
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                            <span>Pilihan Jawaban (Pilih lingkaran pada opsi yang merupakan Kunci Jawaban Benar):</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {['A', 'B', 'C', 'D'].map((optLabel, optIdx) => {
                              const isCorrect = q.correctOptionIndex === optIdx;
                              return (
                                <div
                                  key={optIdx}
                                  className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                                    isCorrect
                                      ? 'bg-emerald-950/30 border-emerald-500/50 text-white'
                                      : 'bg-[#120e26] border-[#291e4f] text-slate-300'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQuestion(idx, { correctOptionIndex: optIdx })}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 cursor-pointer transition-all ${
                                      isCorrect
                                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 scale-105'
                                        : 'bg-[#21183f] text-slate-400 hover:text-white border border-[#31255c]'
                                    }`}
                                    title="Tandai sebagai kunci jawaban benar"
                                  >
                                    {isCorrect ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : optLabel}
                                  </button>
                                  <input
                                    type="text"
                                    required
                                    value={q.options?.[optIdx] || ''}
                                    onChange={(e) => handleUpdateOption(idx, optIdx, e.target.value)}
                                    placeholder={`Jawaban ${optLabel}...`}
                                    className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        /* Essay Answer Key / Guidelines */
                        <div className="pt-1">
                          <label className="text-[11px] font-bold text-purple-300 block mb-1">
                            Kunci Jawaban / Pedoman Penilaian Essay (Untuk Koreksi {terms.educatorTitle}):
                          </label>
                          <textarea
                            rows={2}
                            value={q.essayAnswerKey || ''}
                            onChange={(e) => handleUpdateQuestion(idx, { essayAnswerKey: e.target.value })}
                            placeholder={`Tuliskan kata kunci atau jawaban lengkap yang diharapkan dari ${terms.memberTitle.toLowerCase()}...`}
                            className="w-full px-3 py-2 rounded-xl bg-[#110e26] border border-[#2e2059] text-xs text-slate-200 focus:outline-none focus:border-purple-500 resize-none"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Actions inside Form */}
              <div className="pt-4 border-t border-[#251b47] flex items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  Total: <strong className="text-white">{formQuestions.length} Soal</strong> • Bobot:{' '}
                  <strong className="text-amber-400">
                    {formQuestions.reduce((sum, q) => sum + (Number(q.points) || 10), 0)} Poin
                  </strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-[#1d163a] hover:bg-[#281f4f] text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-black shadow-lg shadow-pink-500/25 transition-all cursor-pointer"
                  >
                    {editingQuiz ? 'Simpan Perubahan Soal' : 'Simpan Paket Bank Soal'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SUBMISSIONS / RESULTS RECAP */}
      {isSubmissionsModalOpen && selectedQuizForSubmissions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-[#130f28] border border-[#2b214d] rounded-3xl p-5 sm:p-7 shadow-2xl my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#241a45]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Hasil Ujian: {selectedQuizForSubmissions.title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Daftar {terms.memberTitlePlural.toLowerCase()} yang telah menyelesaikan paket soal ini
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSubmissionsModalOpen(false);
                  setViewingSubmission(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#20183b] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Submissions List or Detail */}
            {viewingSubmission ? (
              /* Viewing One Student's Detailed Submission */
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#181335] border border-[#2a1f4d]">
                  <div>
                    <h4 className="text-sm font-black text-white">{viewingSubmission.memberName}</h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Waktu submit: {new Date(viewingSubmission.submittedAt).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-pink-400">
                      {viewingSubmission.totalScore} / {viewingSubmission.maxScore}
                    </span>
                    <span className="text-xs font-bold text-slate-400 block">
                      ({viewingSubmission.scorePercentage}%)
                    </span>
                  </div>
                </div>

                {/* Answers breakdown */}
                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Lembar Jawaban {terms.memberTitle}:
                  </h5>
                  {selectedQuizForSubmissions.questions.map((q, idx) => {
                    const ans = viewingSubmission.answers.find((a) => a.questionId === q.id);
                    const isMC = q.type === 'pilihan_ganda';
                    return (
                      <div key={q.id || idx} className="p-3.5 rounded-xl bg-[#181335] border border-[#271d49] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-white">Soal {idx + 1} ({q.type === 'pilihan_ganda' ? 'Pilihan Ganda' : 'Essay'}):</span>
                          {isMC && (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                ans?.isCorrect ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                              }`}
                            >
                              {ans?.isCorrect ? `Benar (+${ans.pointsEarned} poin)` : 'Salah (0 poin)'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300">{q.questionText}</p>

                        {isMC ? (
                          <div className="p-2.5 rounded-lg bg-[#110e24] text-xs space-y-1">
                            <div className="text-slate-300">
                              Jawaban {terms.memberTitle}:{' '}
                              <strong className={ans?.isCorrect ? 'text-emerald-400' : 'text-red-400'}>
                                {ans?.selectedOptionIndex !== undefined ? `${['A', 'B', 'C', 'D'][ans.selectedOptionIndex]}. ${q.options?.[ans.selectedOptionIndex]}` : 'Tidak dijawab'}
                              </strong>
                            </div>
                            {!ans?.isCorrect && q.correctOptionIndex !== undefined && (
                              <div className="text-slate-400 text-[11px]">
                                Kunci Benar: {['A', 'B', 'C', 'D'][q.correctOptionIndex]}. {q.options?.[q.correctOptionIndex]}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-lg bg-[#110e24] text-xs space-y-1">
                            <span className="text-[10px] text-purple-300 block font-bold">Uraian Jawaban {terms.memberTitle}:</span>
                            <p className="text-slate-200 whitespace-pre-wrap">{ans?.essayAnswerText || '(Kosong)'}</p>
                            {q.essayAnswerKey && (
                              <div className="mt-2 pt-2 border-t border-[#251b47] text-[11px] text-slate-400">
                                <strong>Pedoman Jawaban {terms.educatorTitle}:</strong> {q.essayAnswerKey}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setViewingSubmission(null)}
                  className="w-full py-2.5 rounded-xl bg-[#1e173d] text-slate-300 text-xs font-bold hover:text-white"
                >
                  ← Kembali ke Daftar Nilai {terms.memberTitle}
                </button>
              </div>
            ) : (
              /* All Submissions Table */
              <div className="flex-1 overflow-y-auto">
                {quizSubmissions.filter((qs) => qs.quizId === selectedQuizForSubmissions.id).length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <p className="text-xs">Belum ada {terms.memberTitle.toLowerCase()} yang mengerjakan paket soal ini.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {quizSubmissions
                      .filter((qs) => qs.quizId === selectedQuizForSubmissions.id)
                      .map((sub) => (
                        <div
                          key={sub.id}
                          className="p-3.5 rounded-2xl bg-[#181335] border border-[#2b2052] flex items-center justify-between gap-3 hover:border-pink-500/40 transition-colors"
                        >
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-white">{sub.memberName}</h4>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(sub.submittedAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-base sm:text-lg font-black text-pink-400">
                                {sub.totalScore}/{sub.maxScore}
                              </span>
                              <span className="text-[11px] font-bold text-slate-400 block">
                                {sub.scorePercentage}%
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setViewingSubmission(sub)}
                              className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-bold transition-colors cursor-pointer"
                            >
                              Detail Jawaban →
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* REMINDQUIZ LIVE - TEACHER DASHBOARD OVERLAY          */}
      {/* ==================================================== */}
      {activeLiveQuiz && (
        <LiveQuizTeacherDashboard
          activeLiveQuiz={activeLiveQuiz}
          setActiveLiveQuiz={setActiveLiveQuiz}
          showLiveStats={showLiveStats}
          setShowLiveStats={setShowLiveStats}
          liveQuizResponses={liveQuizResponses}
          updateLiveQuizStatus={updateLiveQuizStatus}
          nextLiveQuizQuestion={nextLiveQuizQuestion}
          deleteLiveQuiz={deleteLiveQuiz}
          questionBanks={questionBanks}
          showToast={showToast}
          submitQuizAnswers={useApp().submitQuizAnswers}
          setLiveQuizShowAnswers={setLiveQuizShowAnswers}
          setLiveQuizTimer={setLiveQuizTimer}
          setLiveTab={setLiveTab}
        />
      )}

      {/* MODAL: DETAIL RIWAYAT SESI & PODIUM JUARA (ADMIN POV) */}
      {viewingHistoryQuiz && (() => {
        const rankings = getQuizLeaderboard(viewingHistoryQuiz);
        const top1 = rankings[0];
        const top2 = rankings[1];
        const top3 = rankings[2];

        return (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
            <div className="w-full max-w-3xl rounded-3xl bg-[#130d2b] border border-[#3b2569] shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-5 sm:p-6 border-b border-[#291b4f] flex items-center justify-between bg-gradient-to-r from-[#1c123d] to-[#140e2d]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                      RIWAYAT PODIUM &amp; PERINGKAT KUIS LIVE
                    </span>
                    <h2 className="text-lg sm:text-xl font-black text-white">{viewingHistoryQuiz.title}</h2>
                    <p className="text-xs text-slate-400">
                      {new Date(viewingHistoryQuiz.createdAt).toLocaleString('id-ID')} • {rankings.length} Peserta {terms.memberTitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportLiveQuizCsv(viewingHistoryQuiz)}
                    className="px-3.5 py-2 rounded-xl bg-[#221845] hover:bg-[#2e205c] border border-[#392873] text-purple-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-purple-400" />
                    <span className="hidden sm:inline">Unduh CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingHistoryQuiz(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
                {/* 3D-like Stacked Podium */}
                {rankings.length > 0 && (
                  <div className="p-6 rounded-3xl bg-[#0c081e] border border-[#231744] text-center">
                    <span className="text-xs font-black uppercase text-slate-400 tracking-widest block mb-4">
                      🏆 PODIUM JUARA 3 BESAR
                    </span>
                    <div className="flex items-end justify-center gap-3 max-w-md mx-auto pt-4 pb-2">
                      {/* 2nd Place */}
                      {top2 ? (
                        <div className="flex flex-col items-center gap-1.5 flex-1">
                          <span className="text-xs font-black text-slate-300 truncate max-w-[100px]" title={top2.name}>
                            🥈 {top2.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">{top2.score} pts</span>
                          <div className="w-full h-24 rounded-t-2xl bg-gradient-to-t from-slate-600/30 to-slate-400/40 border-t-2 border-slate-300 flex items-center justify-center font-black text-slate-300 text-base shadow-lg">
                            2
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 opacity-20 h-16 border-t border-dashed border-slate-600" />
                      )}

                      {/* 1st Place */}
                      {top1 ? (
                        <div className="flex flex-col items-center gap-1.5 flex-1">
                          <span className="text-sm font-black text-amber-300 truncate max-w-[120px]" title={top1.name}>
                            🥇 {top1.name}
                          </span>
                          <span className="text-xs text-amber-400 font-black">{top1.score} pts</span>
                          <div className="w-full h-32 rounded-t-2xl bg-gradient-to-t from-amber-600/30 to-amber-400/40 border-t-2 border-amber-400 flex items-center justify-center font-black text-amber-400 text-xl shadow-2xl relative">
                            <div className="absolute -top-3.5 text-lg animate-bounce">👑</div>
                            1
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 opacity-20 h-20 border-t border-dashed border-slate-600" />
                      )}

                      {/* 3rd Place */}
                      {top3 ? (
                        <div className="flex flex-col items-center gap-1.5 flex-1">
                          <span className="text-xs font-black text-amber-600 truncate max-w-[100px]" title={top3.name}>
                            🥉 {top3.name}
                          </span>
                          <span className="text-[10px] text-amber-700 font-bold">{top3.score} pts</span>
                          <div className="w-full h-16 rounded-t-2xl bg-gradient-to-t from-amber-800/30 to-amber-700/40 border-t-2 border-amber-700 flex items-center justify-center font-black text-amber-600 text-sm shadow-md">
                            3
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 opacity-20 h-12 border-t border-dashed border-slate-600" />
                      )}
                    </div>
                  </div>
                )}

                {/* Complete Leaderboard Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider">
                      Daftar Lengkap Peringkat Peserta ({rankings.length})
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Urut berdasarkan total perolehan skor
                    </span>
                  </div>

                  {rankings.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-[#0e0a22] border border-[#231742] text-center text-slate-500 text-xs">
                      Tidak ada peserta yang tercatat pada sesi kuis ini.
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-[#281b4d] overflow-hidden bg-[#0e0a22]">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-[#231742] bg-[#171033] text-slate-400 text-[10px] uppercase font-bold">
                            <th className="py-2.5 px-3 text-center w-14">Rank</th>
                            <th className="py-2.5 px-3">Nama {terms.memberTitle}</th>
                            <th className="py-2.5 px-3 text-right">Skor Poin</th>
                            <th className="py-2.5 px-3 text-center">Soal Dijawab</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1f153a]">
                          {rankings.map((stud: any, idx: number) => (
                            <tr key={stud.id} className="hover:bg-white/[0.03] transition-colors">
                              <td className="py-2.5 px-3 text-center font-bold">
                                {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `${idx + 1}`}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-white">
                                {stud.name}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                                {stud.score}
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                                {stud.answersCount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[#291b4f] flex justify-end bg-[#0f0a24]">
                <button
                  type="button"
                  onClick={() => setViewingHistoryQuiz(null)}
                  className="px-5 py-2.5 rounded-xl bg-[#221845] hover:bg-[#2f215d] text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

interface LiveQuizTeacherDashboardProps {
  activeLiveQuiz: LiveQuiz;
  setActiveLiveQuiz: (val: LiveQuiz | null | ((prev: LiveQuiz | null) => LiveQuiz | null)) => void;
  showLiveStats: boolean;
  setShowLiveStats: (val: boolean) => void;
  liveQuizResponses: LiveQuizResponse[];
  updateLiveQuizStatus: (id: string, status: 'waiting' | 'active' | 'ended') => Promise<void>;
  nextLiveQuizQuestion: (id: string, newIndex: number) => Promise<void>;
  deleteLiveQuiz: (id: string) => Promise<void>;
  questionBanks: QuestionBankItem[];
  showToast: (msg: string, type: 'info' | 'success' | 'warn') => void;
  submitQuizAnswers: any;
  setLiveQuizShowAnswers: (id: string, show: boolean) => Promise<void>;
  setLiveQuizTimer: (id: string, seconds: number) => Promise<void>;
  setLiveTab?: (val: 'launch' | 'history') => void;
}

const LiveQuizTeacherDashboard: React.FC<LiveQuizTeacherDashboardProps> = ({
  activeLiveQuiz,
  setActiveLiveQuiz,
  showLiveStats,
  setShowLiveStats,
  liveQuizResponses,
  updateLiveQuizStatus,
  nextLiveQuizQuestion,
  deleteLiveQuiz,
  questionBanks,
  showToast,
  submitQuizAnswers,
  setLiveQuizShowAnswers,
  setLiveQuizTimer,
  setLiveTab,
}) => {
  const [isConfirmExitOpen, setIsConfirmExitOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  // Finding the quiz data
  const quiz = questionBanks.find((q) => q.id === activeLiveQuiz.quizId);
  
  // Real-time responses submitted for the current active question index
  const currentAnswers = liveQuizResponses.filter(
    (r) => r.liveQuizId === activeLiveQuiz.id && r.questionIndex === activeLiveQuiz.currentQuestionIndex
  );
  
  // Connected students (in lobby) have questionIndex === -1
  const lobbyStudents = liveQuizResponses.filter(
    (r) => r.liveQuizId === activeLiveQuiz.id && r.questionIndex === -1
  );

  // Active question info
  const currentQuestion = quiz?.questions?.[activeLiveQuiz.currentQuestionIndex];
  const isLastQuestion = quiz ? activeLiveQuiz.currentQuestionIndex >= quiz.questions.length - 1 : true;

  // Real-time option counts for rendering bar charts
  const optionCounts = [0, 0, 0, 0];
  currentAnswers.forEach((ans) => {
    if (ans.selectedOptionIndex !== undefined && ans.selectedOptionIndex >= 0 && ans.selectedOptionIndex < 4) {
      optionCounts[ans.selectedOptionIndex]++;
    }
  });

  // Calculate real-time live Leaderboard scores (sum of pointsEarned)
  const studentScores: Record<string, { name: string; score: number; answersCount: number }> = {};
  
  // Pre-fill with lobby students so everyone in the room is listed
  lobbyStudents.forEach((student) => {
    studentScores[student.memberId] = {
      name: student.memberName,
      score: 0,
      answersCount: 0,
    };
  });

  // Sum up points for all responses
  liveQuizResponses
    .filter((r) => r.liveQuizId === activeLiveQuiz.id && r.questionIndex >= 0)
    .forEach((res) => {
      if (!studentScores[res.memberId]) {
        studentScores[res.memberId] = {
          name: res.memberName,
          score: 0,
          answersCount: 0,
        };
      }
      studentScores[res.memberId].score += res.pointsEarned || 0;
      studentScores[res.memberId].answersCount++;
    });

  const leaderboard = Object.entries(studentScores)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.score - a.score);

  // Sync with showAnswers value in DB
  useEffect(() => {
    if (activeLiveQuiz.showAnswers !== showLiveStats) {
      setShowLiveStats(activeLiveQuiz.showAnswers || false);
    }
  }, [activeLiveQuiz.showAnswers]);

  // Countdown timer logic
  useEffect(() => {
    if (!activeLiveQuiz.activeQuestionEndsAt || activeLiveQuiz.status !== 'active') {
      setSecondsLeft(0);
      return;
    }
    const ends = new Date(activeLiveQuiz.activeQuestionEndsAt).getTime();
    const updateTimer = () => {
      const diff = Math.max(0, Math.ceil((ends - Date.now()) / 1000));
      setSecondsLeft(diff);
      if (diff === 0 && !activeLiveQuiz.showAnswers) {
        // Auto show answers when timer runs out
        setLiveQuizShowAnswers(activeLiveQuiz.id, true);
        setShowLiveStats(true);
        playNotificationSound('success');
      }
    };
    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [activeLiveQuiz.activeQuestionEndsAt, activeLiveQuiz.status, activeLiveQuiz.showAnswers]);

  const handleStartQuiz = async () => {
    const limit = currentQuestion?.points ? currentQuestion.points * 3 : (quiz?.timeLimitPerQuestionSeconds || 30);
    const finalLimit = limit > 0 ? limit : 30;

    await updateLiveQuizStatus(activeLiveQuiz.id, 'active');
    await setLiveQuizTimer(activeLiveQuiz.id, finalLimit);
    showToast('Kuis live resmi dimulai! Semoga sukses untuk para siswa! 🚀', 'success');
  };

  const handleNextQuestion = async () => {
    if (isLastQuestion) {
      setActiveLiveQuiz({ ...activeLiveQuiz, status: 'ended' });
      await updateLiveQuizStatus(activeLiveQuiz.id, 'ended');
      showToast('Kuis selesai! Mari kita lihat sang juara di podium! 🏆', 'success');
    } else {
      const nextIdx = activeLiveQuiz.currentQuestionIndex + 1;
      const nextQ = quiz?.questions?.[nextIdx];
      const limit = nextQ?.points ? nextQ.points * 3 : (quiz?.timeLimitPerQuestionSeconds || 30);
      const finalLimit = limit > 0 ? limit : 30;

      await nextLiveQuizQuestion(activeLiveQuiz.id, nextIdx);
      await setLiveQuizTimer(activeLiveQuiz.id, finalLimit);
      setShowLiveStats(false);
    }
  };

  const handleRevealStats = async () => {
    await setLiveQuizShowAnswers(activeLiveQuiz.id, true);
    setShowLiveStats(true);
    playNotificationSound('success');
  };

  const handleSaveToGradebook = async () => {
    if (!quiz) return;
    try {
      // Loop through participating students and submit their final scores with actual student IDs
      for (const entry of leaderboard) {
        const studentResponses = liveQuizResponses.filter(
          (r) => r.liveQuizId === activeLiveQuiz.id && r.memberId === entry.id && r.questionIndex >= 0
        );
        const submissionAnswers = quiz.questions.map((q, idx) => {
          const matched = studentResponses.find((r) => r.questionIndex === idx);
          return {
            questionId: q.id,
            type: q.type,
            selectedOptionIndex: matched?.selectedOptionIndex,
            essayAnswerText: '',
            isCorrect: matched?.isCorrect,
            pointsEarned: matched?.pointsEarned || 0,
          };
        });

        // Save properly with student credentials so gradebook reflects individual students
        await submitQuizAnswers(quiz.id, submissionAnswers, 0, {
          id: entry.id,
          name: entry.name,
        });
      }
      showToast('Seluruh nilai kuis live berhasil diintegrasikan ke Rekap Tugas Kelas & tersimpan di Riwayat Sesi! 💾', 'success');
      // DO NOT delete activeLiveQuiz — keep it ended in history!
      setActiveLiveQuiz(null);
      setLiveTab?.('history');
    } catch (err) {
      showToast('Gagal merekam nilai. Silakan coba lagi.', 'warn');
    }
  };

  const handleForceClose = () => {
    setIsConfirmExitOpen(true);
  };

  const handleConfirmExit = async () => {
    // If exiting, end the quiz so history is kept, do not wipe data
    if (activeLiveQuiz.status === 'active' || activeLiveQuiz.status === 'waiting') {
      await updateLiveQuizStatus(activeLiveQuiz.id, 'ended');
    }
    setActiveLiveQuiz(null);
    setIsConfirmExitOpen(false);
    setLiveTab?.('history');
    showToast('Sesi kuis ditutup. Riwayat sesi dan perolehan skor tersimpan di Riwayat Sesi & Peringkat.', 'info');
  };

  if (!quiz) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0c081e] text-white flex flex-col overflow-y-auto animate-in fade-in zoom-in duration-300">
      {/* Background neon glows */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 px-6 py-4 bg-[#140e2d] border-b border-[#2d1e57] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center font-black animate-pulse">
            🎙️
          </div>
          <div>
            <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest block">REMINDQUIZ LIVE</span>
            <h2 className="text-sm sm:text-base font-black text-white">{quiz.title}</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold font-mono">
            📌 PIN: {quiz.id.substring(3, 7).toUpperCase()}
          </span>
          <button
            type="button"
            onClick={handleForceClose}
            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/25 border border-red-500/25 text-red-400 transition-colors cursor-pointer"
            title="Tutup Sesi"
          >
            <X className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </header>

      {/* Main Panel Content */}
      <main className="relative z-10 flex-1 p-6 flex flex-col justify-center max-w-5xl w-full mx-auto gap-6">
        
        {/* LOBBY STATUS: Waiting for students to join */}
        {activeLiveQuiz.status === 'waiting' && (
          <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-6 duration-300">
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 animate-pulse tracking-tight">
                Menunggu Siswa Bergabung...
              </h1>
              <p className="text-sm sm:text-base text-slate-300 max-w-lg mx-auto">
                Beri tahu para siswa kelas untuk masuk ke menu <strong className="text-purple-300">Bank Soal &amp; Ujian</strong> lalu klik tombol gabung kuis live!
              </p>
            </div>

            {/* Giant Connected Counter */}
            <div className="inline-flex flex-col items-center p-6 sm:p-8 rounded-3xl bg-[#1a133d] border-2 border-[#3d2179] shadow-2xl">
              <div className="text-5xl sm:text-7xl font-black text-pink-400 animate-bounce">
                {lobbyStudents.length}
              </div>
              <span className="text-xs sm:text-sm font-black text-slate-300 uppercase tracking-widest mt-2">SISWA TERHUBUNG</span>
            </div>

            {/* Connected Students List Grid */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Daftar Ruang Tunggu</h3>
              {lobbyStudents.length === 0 ? (
                <div className="py-8 text-slate-500 text-xs italic">Belum ada siswa yang masuk ke lobby...</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-48 overflow-y-auto p-2">
                  {lobbyStudents.map((stud) => (
                    <div
                      key={stud.id}
                      className="p-3 rounded-2xl bg-[#1e1742] border border-[#37236d] text-center font-bold text-xs truncate text-white animate-in zoom-in duration-300 hover:scale-105 transition-transform"
                    >
                      🎭 {stud.memberName}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Start Button */}
            <div className="pt-4">
              <button
                type="button"
                onClick={handleStartQuiz}
                disabled={lobbyStudents.length === 0}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-base shadow-xl shadow-emerald-500/25 transition-all transform active:scale-95 cursor-pointer"
              >
                MULAI KUIS SEKARANG 🚀
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE STATUS: Quiz is running */}
        {activeLiveQuiz.status === 'active' && currentQuestion && (
          <div className="space-y-6 animate-in zoom-in-95 duration-300 flex-1 flex flex-col justify-between">
            {/* Question Header & Counter */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold">
                <span>Soal {activeLiveQuiz.currentQuestionIndex + 1} dari {quiz.questions.length}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white leading-relaxed">
                {currentQuestion.questionText}
              </h1>
            </div>

            {/* Response Statistics Card */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              
              {/* Option Distribution Bars or Essay Student Answers */}
              <div className="md:col-span-8 p-5 sm:p-6 rounded-3xl bg-[#140e2b] border border-[#2d1e57] space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                  {currentQuestion.type === 'essay'
                    ? 'Jawaban Essay Siswa 📝'
                    : showLiveStats
                    ? 'Distribusi Jawaban Siswa 📊'
                    : 'Pilihan Jawaban'}
                </h3>
                
                {currentQuestion.type === 'essay' ? (
                  <div className="space-y-4">
                    {/* Key answer display */}
                    <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30">
                      <span className="text-[10px] font-black text-purple-300 block mb-1">KUNCI KATA KUNCI JAWABAN (ESSAY)</span>
                      <p className="text-sm font-bold text-white">
                        {currentQuestion.essayAnswerKey || 'Bebas / Auto Benar (tanpa filter kata kunci)'}
                      </p>
                    </div>

                    {/* Student answers list */}
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {currentAnswers.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-4 text-center">Belum ada siswa yang menjawab...</p>
                      ) : (
                        currentAnswers.map((ans) => (
                          <div key={ans.id} className="p-3.5 rounded-2xl bg-[#1b153a] border border-[#2e1d5a] flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                            <div className="space-y-1">
                              <span className="text-xs font-black text-pink-300 block">🎭 {ans.memberName}</span>
                              <p className="text-xs text-white bg-[#0e0924] p-2.5 rounded-xl border border-[#251744] font-mono leading-relaxed whitespace-pre-wrap">
                                {ans.essayAnswer || '(kosong)'}
                              </p>
                            </div>
                            <div className="shrink-0 flex items-center gap-2">
                              {showLiveStats && (
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                  ans.isCorrect
                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                    : 'bg-red-500/15 border-red-500/30 text-red-400'
                                }`}>
                                  {ans.isCorrect ? '✓ Cocok' : '✗ Belum Cocok'}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 font-mono">
                                +{ans.pointsEarned || 0} Poin
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {['A', 'B', 'C', 'D'].map((lbl, idx) => {
                      const optText = currentQuestion.options?.[idx] || '';
                      const count = optionCounts[idx];
                      const percentage = currentAnswers.length > 0 ? Math.round((count / currentAnswers.length) * 100) : 0;
                      const isCorrect = currentQuestion.correctOptionIndex === idx;

                      // Option branding colors (Kahoot style!)
                      const colors = [
                        'bg-red-500/20 border-red-500/40 text-red-300',
                        'bg-blue-500/20 border-blue-500/40 text-blue-300',
                        'bg-amber-500/20 border-amber-500/40 text-amber-300',
                        'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
                      ];

                      const barColors = [
                        'bg-red-500',
                        'bg-blue-500',
                        'bg-amber-500',
                        'bg-emerald-500',
                      ];

                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between ${
                            showLiveStats && isCorrect
                              ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                              : showLiveStats
                              ? 'bg-[#181335]/40 border-[#2d2252]/40 opacity-55'
                              : colors[idx]
                          }`}>
                            <div className="flex items-center gap-2 truncate">
                              <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center font-black">
                                {lbl}
                              </span>
                              <span className="truncate">{optText}</span>
                            </div>
                            {showLiveStats && (
                              <div className="flex items-center gap-2 shrink-0 font-mono">
                                <span>{count} Siswa ({percentage}%)</span>
                                {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                              </div>
                            )}
                          </div>

                          {/* Bar Distribution */}
                          {showLiveStats && (
                            <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-1000 ${isCorrect ? 'bg-emerald-500' : barColors[idx]}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Connected response count wheel */}
              <div className="md:col-span-4 flex flex-col items-center justify-center p-6 rounded-3xl bg-[#1b123d] border border-[#3b2374] text-center shadow-lg">
                <div className="text-4xl sm:text-5xl font-black text-pink-400">
                  {currentAnswers.length}
                </div>
                <div className="text-[10px] sm:text-xs font-bold text-slate-300 uppercase tracking-widest mt-2">
                  SISWA TELAH MENJAWAB
                </div>
                <div className="text-xs text-slate-400 mt-1 font-mono">
                  Lobby: {lobbyStudents.length} Siswa
                </div>

                {/* Show Answers/Leaderboard trigger */}
                <div className="mt-5 w-full">
                  {!showLiveStats ? (
                    <button
                      type="button"
                      onClick={handleRevealStats}
                      className="w-full py-3 px-4 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-black tracking-tight transition-all active:scale-95 shadow-lg shadow-pink-500/20"
                    >
                      TAMPILKAN JAWABAN 📊
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleNextQuestion}
                      className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black tracking-tight transition-all active:scale-95 shadow-lg shadow-purple-500/20"
                    >
                      {isLastQuestion ? 'SELESAIKAN KUIS 🏁' : 'PERTANYAAN BERIKUTNYA ➡️'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Current Top 5 Leaderboard on running screen */}
            {showLiveStats && (
              <div className="p-4 rounded-3xl bg-[#110e24] border border-[#2b2052] space-y-3">
                <h3 className="text-xs font-black text-center text-amber-400 uppercase tracking-widest flex items-center justify-center gap-2">
                  ⭐ LIVE LEADERBOARD (KLASEMEN SEMENTARA) ⭐
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {leaderboard.slice(0, 5).map((stud, idx) => {
                    const podiumColors = [
                      'border-amber-400/50 bg-amber-500/15 text-amber-300',
                      'border-slate-400/50 bg-slate-500/15 text-slate-300',
                      'border-amber-700/50 bg-amber-800/15 text-amber-500',
                      'border-[#2a1d5c] bg-[#1a133f] text-slate-300',
                      'border-[#2a1d5c] bg-[#1a133f] text-slate-300',
                    ];

                    return (
                      <div
                        key={stud.id}
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold ${podiumColors[idx]}`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-mono font-black">{idx + 1}.</span>
                          <span className="truncate">{stud.name}</span>
                        </div>
                        <span className="font-mono text-pink-400 shrink-0">{stud.score} Poin</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ENDED STATUS: Show Podium */}
        {activeLiveQuiz.status === 'ended' && (
          <div className="space-y-6 text-center animate-in zoom-in duration-300">
            <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-pink-400 to-purple-400 tracking-tight animate-bounce">
              🏆 PODIUM JUARA 🏆
            </h1>

            {/* Visual Podium Graphic (3 Columns: Silver, Gold, Bronze) */}
            <div className="flex items-end justify-center gap-3 sm:gap-6 max-w-md mx-auto pt-12 pb-6">
              
              {/* 2nd Place (Silver) */}
              {leaderboard[1] && (
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="text-sm font-black text-slate-300 truncate max-w-[100px]" title={leaderboard[1].name}>
                    🥈 {leaderboard[1].name}
                  </div>
                  <span className="text-[10px] text-slate-400">{leaderboard[1].score} Poin</span>
                  <div className="w-full h-24 rounded-t-2xl bg-gradient-to-t from-slate-600/30 to-slate-400/40 border-t-2 border-slate-300 flex items-center justify-center font-black text-slate-300 text-lg shadow-xl">
                    2
                  </div>
                </div>
              )}

              {/* 1st Place (Gold) */}
              {leaderboard[0] && (
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="text-base font-black text-amber-300 truncate max-w-[120px] animate-pulse" title={leaderboard[0].name}>
                    🥇 {leaderboard[0].name}
                  </div>
                  <span className="text-xs text-amber-400 font-mono font-black">{leaderboard[0].score} Poin</span>
                  <div className="w-full h-32 rounded-t-2xl bg-gradient-to-t from-amber-600/30 to-amber-400/40 border-t-2 border-amber-400 flex items-center justify-center font-black text-amber-400 text-2xl shadow-2xl relative">
                    <div className="absolute -top-4 text-xl">👑</div>
                    1
                  </div>
                </div>
              )}

              {/* 3rd Place (Bronze) */}
              {leaderboard[2] && (
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="text-sm font-black text-amber-600 truncate max-w-[100px]" title={leaderboard[2].name}>
                    🥉 {leaderboard[2].name}
                  </div>
                  <span className="text-[10px] text-amber-700">{leaderboard[2].score} Poin</span>
                  <div className="w-full h-16 rounded-t-2xl bg-gradient-to-t from-amber-800/30 to-amber-700/40 border-t-2 border-amber-700 flex items-center justify-center font-black text-amber-600 text-base shadow-lg">
                    3
                  </div>
                </div>
              )}
            </div>

            {/* Rest of the Leaderboard Table */}
            {leaderboard.length > 3 && (
              <div className="max-w-md mx-auto p-4 rounded-3xl bg-[#110e24] border border-[#2d1f56] space-y-2 max-h-40 overflow-y-auto">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Peringkat Lainnya</h3>
                {leaderboard.slice(3).map((stud, idx) => (
                  <div key={stud.id} className="flex items-center justify-between text-xs font-bold text-slate-300 px-2.5 py-1.5 rounded-xl bg-white/5">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-slate-400">{idx + 4}.</span>
                      <span className="truncate">{stud.name}</span>
                    </div>
                    <span>{stud.score} Poin</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons to save gradebook */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleSaveToGradebook}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-pink-500/25 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <span>Simpan Nilai ke Tugas Kelas 💾</span>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setActiveLiveQuiz(null);
                  setLiveTab?.('history');
                  showToast('Sesi kuis ditutup. Riwayat sesi dan perolehan skor tersimpan di Riwayat Sesi & Peringkat.', 'info');
                }}
                className="px-6 py-3.5 rounded-2xl bg-[#1e173e] hover:bg-[#2b2158] border border-[#3b2374] text-slate-300 font-bold text-xs sm:text-sm active:scale-95 transition-all cursor-pointer"
              >
                Tutup &amp; Lihat Riwayat Sesi 🏁
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Sleek Custom Confirm Modal instead of native browser popup to prevent iFrame blockages */}
      {isConfirmExitOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-[#140e2d] border border-[#3c256d] text-center space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200">
            {/* Tanda silang (X close button) */}
            <button
              type="button"
              onClick={() => setIsConfirmExitOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#20183b] transition-all cursor-pointer active:scale-95"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 text-xl mx-auto">
              ⚠️
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-white">Akhiri Sesi Kuis Live?</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Apakah Anda yakin ingin mengakhiri sesi kuis live ini? Sesi akan diselesaikan dan riwayat skor serta peringkat peserta akan otomatis tersimpan di tab Riwayat Sesi &amp; Peringkat.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmExit}
                className="py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black transition-all cursor-pointer shadow-lg shadow-red-600/20 active:scale-95"
              >
                Ya, Akhiri Kuis
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmExitOpen(false)}
                className="py-2.5 rounded-xl bg-[#1e173e] hover:bg-[#2c2058] border border-[#3b2374] text-slate-300 text-xs font-bold transition-all cursor-pointer active:scale-95"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
