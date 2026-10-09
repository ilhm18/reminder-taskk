import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  FileText,
  Award,
  AlertCircle,
  Play,
  RotateCcw,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  Send,
  BookOpen,
  X,
  HelpCircle,
  AlertTriangle,
  Timer,
  Zap,
  Lock,
  Eye,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getTerminology, resolveEducatorType } from '../../utils/terminology';
import { QuestionBankItem, QuizSubmission, QuizSubmissionAnswer } from '../../types';
import { playNotificationSound } from '../../utils/notification';

export const QuestionBankMemberView: React.FC = () => {
  const {
    currentClass,
    questionBanks,
    quizSubmissions,
    submitQuizAnswers,
    currentUser,
    showToast,
    liveQuizzes,
    liveQuizResponses,
    submitLiveQuizResponse,
  } = useApp();

  const educatorType = resolveEducatorType(currentUser, currentClass);
  const terms = getTerminology(educatorType);

  // STRICT SECURITY: Members can ONLY see question banks where status === 'published'
  // Hidden question banks (in persembunyian) are completely filtered out!
  const publishedQuizzes = questionBanks.filter((qb) => {
    const isForClass = !currentClass?.id || qb.classId === currentClass.id;
    return isForClass && qb.status === 'published';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuizForTest, setActiveQuizForTest] = useState<QuestionBankItem | null>(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Live Quiz Client States
  const [joinedLiveQuizId, setJoinedLiveQuizId] = useState<string | null>(null);
  const [selectedLiveOptionIndex, setSelectedLiveOptionIndex] = useState<number | null>(null);
  const [isLiveSubmitted, setIsLiveSubmitted] = useState(false);

  // Find if there is an active live quiz in the class
  const classId = currentClass?.id || currentUser?.classId || '';
  const activeDbLiveQuiz = liveQuizzes.find((l) => l.classId === classId && l.status !== 'ended');

  // Sync state if active live quiz ends
  useEffect(() => {
    if (!activeDbLiveQuiz && joinedLiveQuizId) {
      setJoinedLiveQuizId(null);
    }
  }, [activeDbLiveQuiz, joinedLiveQuizId]);

  // Sync state if active live quiz shifts question index
  useEffect(() => {
    if (activeDbLiveQuiz && joinedLiveQuizId) {
      // Find if student already submitted a response for the current question
      const myResp = liveQuizResponses.find(
        (r) =>
          r.liveQuizId === activeDbLiveQuiz.id &&
          r.memberId === currentUser?.id &&
          r.questionIndex === activeDbLiveQuiz.currentQuestionIndex
      );
      if (myResp) {
        setSelectedLiveOptionIndex(myResp.selectedOptionIndex ?? null);
        setIsLiveSubmitted(true);
      } else {
        setSelectedLiveOptionIndex(null);
        setIsLiveSubmitted(false);
      }
    }
  }, [activeDbLiveQuiz?.currentQuestionIndex, joinedLiveQuizId, liveQuizResponses, currentUser]);

  // User's answers during the test
  const [userAnswers, setUserAnswers] = useState<Record<string, { selectedOptionIndex?: number; essayAnswerText?: string }>>({});

  // Overall Countdown Timer
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);
  const [isTestSubmitting, setIsTestSubmitting] = useState(false);

  // Modal States
  const [isConfirmSubmitModalOpen, setIsConfirmSubmitModalOpen] = useState(false);
  const [viewingResultSubmission, setViewingResultSubmission] = useState<QuizSubmission | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);

  // Per-Question Timer State
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number>(0);

  // Reset & setup per-question timer when activeQuestionIndex or activeQuizForTest changes
  useEffect(() => {
    if (!activeQuizForTest || !activeQuizForTest.timeLimitPerQuestionSeconds || activeQuizForTest.timeLimitPerQuestionSeconds <= 0) {
      setQuestionTimeLeft(0);
      return;
    }
    setQuestionTimeLeft(activeQuizForTest.timeLimitPerQuestionSeconds);
  }, [activeQuizForTest, activeQuestionIndex]);

  // Per-Question Countdown Interval
  useEffect(() => {
    if (!activeQuizForTest || !activeQuizForTest.timeLimitPerQuestionSeconds || activeQuizForTest.timeLimitPerQuestionSeconds <= 0) {
      return;
    }

    if (questionTimeLeft <= 0) {
      // Question time ran out!
      if (activeQuestionIndex < activeQuizForTest.questions.length - 1) {
        showToast(`Waktu pengerjaan soal nomor ${activeQuestionIndex + 1} telah habis! Lanjut ke soal berikutnya.`, 'warn');
        setActiveQuestionIndex((prev) => prev + 1);
      } else {
        // Last question time ran out, auto submit
        showToast('Waktu pengerjaan soal terakhir telah habis! Lembar jawaban dikumpulkan.', 'warn');
        handleFinishTest(true);
      }
      return;
    }

    const interval = setInterval(() => {
      setQuestionTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeQuizForTest, activeQuestionIndex, questionTimeLeft]);

  // Overall Exam Countdown Timer
  useEffect(() => {
    if (!activeQuizForTest || activeQuizForTest.durationMinutes <= 0) return;

    if (timeLeftSeconds <= 0) {
      // Auto-submit when overall time runs out
      handleFinishTest(true);
      return;
    }

    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeQuizForTest, timeLeftSeconds]);

  const handleJoinLiveQuiz = async () => {
    if (!activeDbLiveQuiz) return;
    setJoinedLiveQuizId(activeDbLiveQuiz.id);
    
    // Register in lobby by inserting a response with questionIndex = -1
    await submitLiveQuizResponse(
      activeDbLiveQuiz.id,
      -1, // lobby index
      -1,
      false,
      0,
      0
    );
  };

  // Start Exam
  const handleStartQuiz = (quiz: QuestionBankItem) => {
    // Check if member already completed this exam
    const existingSubmission = quizSubmissions.find(
      (qs) => qs.quizId === quiz.id && qs.memberId === currentUser?.id
    );
    if (existingSubmission) {
      showToast('Ujian ini hanya dapat dikerjakan satu kali dan Anda telah menyelesaikannya.', 'warn');
      setViewingResultSubmission(existingSubmission);
      setIsResultModalOpen(true);
      return;
    }

    setActiveQuizForTest(quiz);
    setActiveQuestionIndex(0);
    setUserAnswers({});
    if (quiz.durationMinutes > 0) {
      setTimeLeftSeconds(quiz.durationMinutes * 60);
    } else {
      setTimeLeftSeconds(0);
    }
    if (quiz.timeLimitPerQuestionSeconds && quiz.timeLimitPerQuestionSeconds > 0) {
      setQuestionTimeLeft(quiz.timeLimitPerQuestionSeconds);
    } else {
      setQuestionTimeLeft(0);
    }
    setIsConfirmSubmitModalOpen(false);
    setViewingResultSubmission(null);
    setIsResultModalOpen(false);
  };

  // Submit & Finish Exam
  const handleFinishTest = async (autoSubmitted = false) => {
    if (!activeQuizForTest || isTestSubmitting) return;

    setIsTestSubmitting(true);
    setIsConfirmSubmitModalOpen(false);

    try {
      const answers: QuizSubmissionAnswer[] = activeQuizForTest.questions.map((q) => {
        const recorded = userAnswers[q.id];
        return {
          questionId: q.id,
          type: q.type,
          selectedOptionIndex: recorded?.selectedOptionIndex,
          essayAnswerText: recorded?.essayAnswerText || '',
        };
      });

      const durationUsed =
        activeQuizForTest.durationMinutes > 0
          ? activeQuizForTest.durationMinutes * 60 - timeLeftSeconds
          : 0;

      const sub = await submitQuizAnswers(activeQuizForTest.id, answers, durationUsed);

      if (autoSubmitted) {
        showToast('Waktu ujian telah habis! Jawaban Anda telah dikumpulkan secara otomatis.', 'warn');
      } else {
        showToast('Ujian berhasil diselesaikan dan dikumpulkan! 🎉', 'success');
      }

      setViewingResultSubmission(sub);
      setIsResultModalOpen(true);
      setActiveQuizForTest(null);
    } catch (err) {
      console.error('Failed to submit quiz:', err);
      showToast('Gagal mengumpulkan jawaban. Silakan coba klik Kumpulkan lagi.', 'warn');
    } finally {
      setIsTestSubmitting(false);
    }
  };

  // Filtered List
  const filteredQuizzes = publishedQuizzes.filter((qb) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      qb.title.toLowerCase().includes(q) ||
      (qb.subject && qb.subject.toLowerCase().includes(q)) ||
      (qb.description && qb.description.toLowerCase().includes(q))
    );
  });

  // Format Timer mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // RENDER 0: REMINDQUIZ LIVE - STUDENT SCREEN
  if (joinedLiveQuizId && activeDbLiveQuiz) {
    const liveQuizData = questionBanks.find((q) => q.id === activeDbLiveQuiz.quizId);
    if (liveQuizData) {
      const currentQ = liveQuizData.questions?.[activeDbLiveQuiz.currentQuestionIndex];
      const isMC = currentQ?.type === 'pilihan_ganda';
      const myResp = liveQuizResponses.find(
        (r) =>
          r.liveQuizId === activeDbLiveQuiz.id &&
          r.memberId === currentUser?.id &&
          r.questionIndex === activeDbLiveQuiz.currentQuestionIndex
      );

      const handleSelectOption = async (optIdx: number) => {
        if (isLiveSubmitted || !currentQ) return;
        const isCorrect = currentQ.correctOptionIndex === optIdx;
        const points = isCorrect ? currentQ.points : 0;
        setSelectedLiveOptionIndex(optIdx);
        setIsLiveSubmitted(true);
        playNotificationSound('beep');
        
        await submitLiveQuizResponse(
          activeDbLiveQuiz.id,
          activeDbLiveQuiz.currentQuestionIndex,
          optIdx,
          isCorrect,
          points,
          0 // response time
        );
      };

      // Calculate total points earned by this member so far
      const totalPointsEarned = liveQuizResponses
        .filter((r) => r.liveQuizId === activeDbLiveQuiz.id && r.memberId === currentUser?.id && r.questionIndex >= 0)
        .reduce((sum, r) => sum + (r.pointsEarned || 0), 0);

      return (
        <div className="max-w-2xl mx-auto space-y-6 text-white animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#140e2d] border border-[#2d1e57] flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🎙️</span>
              <div>
                <span className="text-[9px] font-black text-pink-400 uppercase tracking-widest block">KUIS LIVE BERLANGSUNG</span>
                <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-xs">{activeDbLiveQuiz.title}</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm('Keluar dari Kuis Live? Anda bisa bergabung kembali selama kuis belum selesai.')) {
                  setJoinedLiveQuizId(null);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all"
            >
              Keluar Kuis
            </button>
          </div>

          {/* Body Panels */}
          {activeDbLiveQuiz.status === 'waiting' && (
            <div className="p-8 rounded-3xl bg-[#1b123e] border border-[#3b2179] text-center space-y-6">
              <div className="space-y-2">
                <div className="w-16 h-16 rounded-full bg-purple-500/10 border-2 border-purple-500/30 flex items-center justify-center text-3xl mx-auto animate-bounce mb-4">
                  🎮
                </div>
                <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                  Anda Sudah di Lobby!
                </h1>
                <p className="text-xs text-slate-300 max-w-sm mx-auto">
                  Menunggu guru memulai kuis... Silakan santai sejenak selagi teman sekelasmu berkumpul.
                </p>
              </div>

              {/* Connected students ticker */}
              <div className="p-4 rounded-2xl bg-[#140e2d] border border-[#261754]">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">PESERTA LAIN YANG BERGABUNG</span>
                <div className="flex flex-wrap gap-2 justify-center max-h-32 overflow-y-auto">
                  {liveQuizResponses
                    .filter((r) => r.liveQuizId === activeDbLiveQuiz.id && r.questionIndex === -1)
                    .map((p) => (
                      <span key={p.id} className="px-2.5 py-1 rounded-lg bg-purple-950/40 border border-purple-500/20 text-xs font-bold">
                        🎭 {p.memberName} {p.memberId === currentUser?.id ? '(Anda)' : ''}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          )}

          {activeDbLiveQuiz.status === 'active' && currentQ && (
            <div className="space-y-6">
              {/* Question Banner */}
              <div className="text-center p-6 rounded-3xl bg-[#140e2d] border border-[#2d1e57] space-y-2">
                <span className="px-2.5 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 text-[10px] font-bold font-mono">
                  Soal {activeDbLiveQuiz.currentQuestionIndex + 1} ({currentQ.points} Poin)
                </span>
                <h1 className="text-lg sm:text-xl font-black leading-relaxed">
                  {currentQ.questionText}
                </h1>
              </div>

              {/* Answering area */}
              {!isLiveSubmitted ? (
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center block">PILIH JAWABAN ANDA SEKARANG:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['A', 'B', 'C', 'D'].map((lbl, idx) => {
                      const optText = currentQ.options?.[idx] || '';
                      
                      const colors = [
                        'bg-red-500 hover:bg-red-600 shadow-red-500/25',
                        'bg-blue-500 hover:bg-blue-600 shadow-blue-500/25',
                        'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25',
                        'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25',
                      ];

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectOption(idx)}
                          className={`p-4 sm:p-5 rounded-2xl text-left font-black text-sm text-white shadow-lg transition-all active:scale-95 flex items-center gap-3 cursor-pointer ${colors[idx]}`}
                        >
                          <span className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-lg font-black font-mono shrink-0">
                            {lbl}
                          </span>
                          <span className="truncate">{optText}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Submitted - Waiting Screen / Result Screen */
                <div className="p-8 rounded-3xl bg-[#1b123d] border border-[#3b2179] text-center space-y-6">
                  {myResp && selectedLiveOptionIndex !== null ? (
                    <div className="space-y-4">
                      <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-3xl mx-auto animate-pulse mb-2">
                        🔒
                      </div>
                      <h2 className="text-lg sm:text-xl font-black text-white">
                        Jawaban Terkunci!
                      </h2>
                      <p className="text-xs text-slate-300 max-w-sm mx-auto">
                        Anda memilih: <strong className="text-pink-400">{['A', 'B', 'C', 'D'][selectedLiveOptionIndex]}. {currentQ.options?.[selectedLiveOptionIndex]}</strong>.
                      </p>
                      <p className="text-[11px] text-slate-400 italic">
                        Menunggu guru menampilkan pembahasan &amp; kunci jawaban...
                      </p>

                      <div className="p-3 rounded-xl bg-[#140e2d]/60 border border-[#281a54] text-xs font-mono text-purple-300">
                        Total Skor Sementara: <strong className="text-amber-400 font-bold">{totalPointsEarned} Poin</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <h2 className="text-base font-bold text-white">Mengirim Jawaban...</h2>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
  }

  // RENDER 1: ACTIVE EXAM RUNNER SCREEN
  if (activeQuizForTest) {
    const currentQ = activeQuizForTest.questions[activeQuestionIndex];
    const isMC = currentQ.type === 'pilihan_ganda';
    const currentAnswer = userAnswers[currentQ.id];
    const totalQ = activeQuizForTest.questions.length;
    const answeredCount = Object.keys(userAnswers).filter(
      (k) => userAnswers[k].selectedOptionIndex !== undefined || (userAnswers[k].essayAnswerText && userAnswers[k].essayAnswerText!.trim().length > 0)
    ).length;
    const unansweredCount = totalQ - answeredCount;

    const hasPerQuestionLimit = Boolean(
      activeQuizForTest.timeLimitPerQuestionSeconds && activeQuizForTest.timeLimitPerQuestionSeconds > 0
    );
    const maxPerQ = activeQuizForTest.timeLimitPerQuestionSeconds || 60;
    const perQPercent = hasPerQuestionLimit ? Math.max(0, Math.min(100, (questionTimeLeft / maxPerQ) * 100)) : 100;
    const isPerQCritical = hasPerQuestionLimit && questionTimeLeft <= 10;

    return (
      <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in duration-200">
        {/* Top Sticky Test Bar */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#15112e] border border-[#2b2154] flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-16 z-20 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-9 h-9 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-white truncate max-w-sm">
                {activeQuizForTest.title}
              </h2>
              <span className="text-[11px] text-purple-300 font-semibold block">
                {activeQuizForTest.subject || 'Ujian Siswa'} • {answeredCount} dari {totalQ} terjawab
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto flex-wrap">
            {/* Overall Countdown Timer */}
            {activeQuizForTest.durationMinutes > 0 ? (
              <div
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-mono font-black text-xs ${
                  timeLeftSeconds <= 300
                    ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse'
                    : 'bg-[#1e173e] border-[#31255e] text-pink-300'
                }`}
                title="Sisa waktu total ujian"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Sisa Total: {formatTime(timeLeftSeconds)}</span>
              </div>
            ) : hasPerQuestionLimit ? (
              <div
                className="px-3 py-1.5 rounded-xl border bg-amber-500/15 border-amber-500/30 text-amber-300 flex items-center gap-1.5 font-mono font-bold text-xs"
                title="Durasi global dihilangkan, pengerjaan diatur per butir soal"
              >
                <Timer className="w-3.5 h-3.5 text-amber-400" />
                <span>Timer Per Butir Soal</span>
              </div>
            ) : null}

            {/* In-app trigger button (NO window.confirm!) */}
            <button
              type="button"
              onClick={() => setIsConfirmSubmitModalOpen(true)}
              disabled={isTestSubmitting}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md shadow-emerald-500/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all active:scale-95 ml-auto sm:ml-0"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Kumpulkan Ujian</span>
            </button>
          </div>
        </div>

        {/* Per-Question Countdown Bar (jika diaktifkan oleh admin) */}
        {hasPerQuestionLimit && (
          <div className="p-3.5 rounded-2xl bg-[#171233] border border-[#2e2154] space-y-1.5 shadow-md">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Timer className={`w-4 h-4 ${isPerQCritical ? 'text-red-400 animate-pulse' : 'text-amber-400'}`} />
                <span className="font-bold text-slate-300">Batas Waktu Soal Ini:</span>
              </div>
              <div className={`font-mono font-black text-xs ${isPerQCritical ? 'text-red-400 animate-bounce' : 'text-amber-300'}`}>
                {questionTimeLeft} Detik Tersisa
              </div>
            </div>
            {/* Realtime shrinking progress bar */}
            <div className="w-full h-2 rounded-full bg-[#0d091e] overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                  isPerQCritical ? 'bg-red-500' : perQPercent <= 50 ? 'bg-amber-400' : 'bg-gradient-to-r from-pink-500 to-purple-500'
                }`}
                style={{ width: `${perQPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Navigation Grid of Question Numbers */}
        <div className="p-3.5 rounded-2xl bg-[#14102b] border border-[#261d4a] flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
            Nomor:
          </span>
          <div className="flex items-center gap-1.5">
            {activeQuizForTest.questions.map((q, idx) => {
              const isAnswered =
                userAnswers[q.id]?.selectedOptionIndex !== undefined ||
                (userAnswers[q.id]?.essayAnswerText && userAnswers[q.id].essayAnswerText!.trim().length > 0);
              const isCurrent = activeQuestionIndex === idx;

              return (
                <button
                  key={q.id || idx}
                  type="button"
                  onClick={() => setActiveQuestionIndex(idx)}
                  className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white ring-2 ring-pink-400 shadow-md'
                      : isAnswered
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                      : 'bg-[#1b1538] border border-[#2c2050] text-slate-400 hover:text-white'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question Content Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#141029] border border-[#2b214d] space-y-6 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#251b47]">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-300 font-black text-sm flex items-center justify-center">
                {activeQuestionIndex + 1}
              </span>
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Soal {activeQuestionIndex + 1} dari {totalQ} ({isMC ? 'Pilihan Ganda' : 'Essay / Uraian'})
              </span>
            </div>
            <div className="flex items-center gap-2">
              {hasPerQuestionLimit && (
                <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <Timer className="w-3 h-3 text-amber-400" />
                  <span>{maxPerQ}s / soal</span>
                </span>
              )}
              <span className="text-xs font-bold text-pink-400 bg-pink-500/15 border border-pink-500/30 px-2.5 py-1 rounded-lg">
                Bobot: {currentQ.points || 10} Poin
              </span>
            </div>
          </div>

          {/* Question Text */}
          <div className="text-base sm:text-lg font-bold text-slate-100 leading-relaxed whitespace-pre-wrap">
            {currentQ.questionText}
          </div>

          {/* Answer Form */}
          {isMC ? (
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-slate-400 block mb-1">
                Pilih Jawaban yang Paling Tepat:
              </span>
              <div className="grid grid-cols-1 gap-2.5">
                {(currentQ.options || []).map((optText, optIdx) => {
                  const isSelected = currentAnswer?.selectedOptionIndex === optIdx;
                  const optLabel = ['A', 'B', 'C', 'D'][optIdx] || String(optIdx + 1);

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => {
                        setUserAnswers((prev) => ({
                          ...prev,
                          [currentQ.id]: {
                            ...prev[currentQ.id],
                            selectedOptionIndex: optIdx,
                          },
                        }));
                      }}
                      className={`w-full p-4 rounded-2xl border text-left flex items-center gap-3.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-pink-500 text-white shadow-md shadow-pink-500/10'
                          : 'bg-[#181335] border-[#291e4f] text-slate-300 hover:border-[#3d2b6e] hover:bg-[#1e173f]'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? 'bg-pink-500 text-white shadow-md'
                            : 'bg-[#211942] border border-[#31255e] text-slate-400'
                        }`}
                      >
                        {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : optLabel}
                      </div>
                      <span className="text-xs sm:text-sm font-semibold">{optText}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Essay Textarea */
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-400 block">
                Ketikkan Uraian Jawaban Anda:
              </label>
              <textarea
                rows={5}
                value={currentAnswer?.essayAnswerText || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setUserAnswers((prev) => ({
                    ...prev,
                    [currentQ.id]: {
                      ...prev[currentQ.id],
                      essayAnswerText: val,
                    },
                  }));
                }}
                placeholder="Tuliskan uraian jawaban Anda di sini..."
                className="w-full p-4 rounded-2xl bg-[#171233] border border-[#2b2052] text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 leading-relaxed resize-none"
              />
            </div>
          )}

          {/* Bottom Next / Prev controls */}
          <div className="flex items-center justify-between pt-4 border-t border-[#251b47]">
            <button
              type="button"
              disabled={activeQuestionIndex === 0}
              onClick={() => setActiveQuestionIndex((prev) => prev - 1)}
              className="px-4 py-2.5 rounded-xl bg-[#1b1538] hover:bg-[#261e4e] text-slate-300 text-xs font-bold disabled:opacity-40 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            {activeQuestionIndex < totalQ - 1 ? (
              <button
                type="button"
                onClick={() => setActiveQuestionIndex((prev) => prev + 1)}
                className="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-md shadow-pink-500/20 active:scale-95"
              >
                <span>Berikutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsConfirmSubmitModalOpen(true)}
                disabled={isTestSubmitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-emerald-600/20 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Selesai &amp; Kumpulkan</span>
              </button>
            )}
          </div>
        </div>

        {/* IN-APP CONFIRMATION SUBMIT MODAL (No window.confirm!) */}
        {isConfirmSubmitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md p-6 rounded-3xl bg-[#171131] border border-[#3b2a68] shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-[#2b1f4e]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Kumpulkan Ujian?</h3>
                    <span className="text-xs text-slate-400">Konfirmasi pengumpulan lembar jawaban</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConfirmSubmitModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status summary */}
              <div className="p-4 rounded-2xl bg-[#110d24] border border-[#261b47] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Soal:</span>
                  <span className="text-white font-mono font-bold">{totalQ} Soal</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Terjawab:</span>
                  <span className="text-emerald-400 font-mono font-bold">{answeredCount} Soal</span>
                </div>
                {unansweredCount > 0 ? (
                  <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 mt-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Perhatian: Masih ada <strong>{unansweredCount} soal</strong> yang belum dijawab.</span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 mt-2">
                    <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>Luar biasa! Seluruh {totalQ} soal telah Anda jawab dengan lengkap.</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmSubmitModalOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-[#231a47] hover:bg-[#312560] text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Periksa Kembali
                </button>
                <button
                  type="button"
                  onClick={() => handleFinishTest(false)}
                  disabled={isTestSubmitting}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isTestSubmitting ? (
                    <span>Mengumpulkan...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Ya, Kumpulkan Sekarang!</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // RENDER 2: LIST OF AVAILABLE EXAMS
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1f1642] via-[#171133] to-[#0d0a20] border border-[#2e2354] p-6 sm:p-8 shadow-2xl">
        <div className="absolute -right-10 -top-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-bold mb-3">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Ujian &amp; Latihan Soal Mandiri</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Bank Soal &amp; Ujian Kelas
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-xl leading-relaxed">
              Kerjakan paket latihan soal, kuis pilihan ganda, dan uraian essay yang telah dibuka oleh {terms.educatorTitle.toLowerCase()}/admin kelas Anda.
            </p>
          </div>
        </div>
      </div>

      {/* REMINDQUIZ LIVE - JOIN ACTIVE SESSION CARD */}
      {activeDbLiveQuiz && !joinedLiveQuizId && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-900/60 to-pink-900/60 border border-purple-500/40 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-bounce">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center text-3xl shrink-0">
              🎙️
            </div>
            <div>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase tracking-widest">
                LIVE INTERAKTIF
              </span>
              <h3 className="text-sm sm:text-base font-black text-white mt-1">
                Kuis Live Kelas Sedang Berlangsung!
              </h3>
              <p className="text-xs text-purple-200">
                Ayo gabung ke kuis <strong className="text-white">"{activeDbLiveQuiz.title}"</strong> bersama teman sekelasmu sekarang!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleJoinLiveQuiz}
            className="px-5 py-3 rounded-xl bg-white text-purple-950 font-black text-xs hover:bg-purple-100 transition-all shrink-0 active:scale-95 cursor-pointer shadow-md"
          >
            Gabung Sekarang 🎮
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-[#14102b] border border-[#271e4d] flex items-center justify-between gap-3 shadow-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari soal atau mata pelajaran..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#1b1538] border border-[#2e2354] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors"
          />
        </div>

        <span className="text-xs text-slate-400 font-semibold shrink-0">
          {filteredQuizzes.length} Paket Ujian Tersedia
        </span>
      </div>

      {/* Quizzes Grid */}
      {filteredQuizzes.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[#141029] border border-[#251d45] text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 opacity-75" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Belum Ada Soal yang Dibuka</h3>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            {terms.educatorTitle} atau Admin belum membuka paket soal ujian untuk kelas ini. Paket soal yang masih berada di persembunyian akan muncul di sini setelah dibuka.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredQuizzes.map((quiz) => {
            const mcCount = quiz.questions.filter((q) => q.type === 'pilihan_ganda').length;
            const essayCount = quiz.questions.filter((q) => q.type === 'essay').length;

            // Check if current member already completed this exam
            const mySubmission = quizSubmissions.find(
              (qs) => qs.quizId === quiz.id && qs.memberId === currentUser?.id
            );

            return (
              <div
                key={quiz.id}
                className="p-5 sm:p-6 rounded-3xl bg-[#14102b] border border-[#2d2252] shadow-xl hover:border-pink-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      {quiz.subject && (
                        <span className="px-2.5 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold text-[10px]">
                          {quiz.subject}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>
                          {quiz.timeLimitPerQuestionSeconds && quiz.timeLimitPerQuestionSeconds > 0
                            ? quiz.durationMinutes > 0
                              ? `${quiz.durationMinutes} Menit`
                              : `Timer ${quiz.timeLimitPerQuestionSeconds}s / soal`
                            : quiz.durationMinutes > 0
                            ? `${quiz.durationMinutes} Menit`
                            : 'Tanpa Batas'}
                        </span>
                      </span>
                    </div>

                    {quiz.timeLimitPerQuestionSeconds && quiz.timeLimitPerQuestionSeconds > 0 && quiz.durationMinutes > 0 ? (
                      <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <Timer className="w-3 h-3 text-amber-400" />
                        <span>{quiz.timeLimitPerQuestionSeconds}s / soal</span>
                      </span>
                    ) : null}
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug mb-2">
                    {quiz.title}
                  </h3>

                  {quiz.description && (
                    <p className="text-xs text-slate-300 line-clamp-2 mb-3.5 leading-relaxed">
                      {quiz.description}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-[#1b1538] border border-[#2a1f4d] mb-4 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">PIL. GANDA</span>
                      <span className="text-sm font-black text-pink-400">{mcCount} Soal</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">ESSAY</span>
                      <span className="text-sm font-black text-purple-300">{essayCount} Soal</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">TOTAL POIN</span>
                      <span className="text-sm font-black text-amber-400">{quiz.totalPoints}</span>
                    </div>
                  </div>
                </div>

                {/* Member Action: Start or View Result */}
                <div className="pt-2 border-t border-[#261d47]">
                  {mySubmission ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/30">
                        <div>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>SUDAH DIKERJAKAN</span>
                          </div>
                          <span className="text-xs font-black text-white">
                            Nilai: {mySubmission.totalScore} / {mySubmission.maxScore} ({mySubmission.scorePercentage}%)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setViewingResultSubmission(mySubmission);
                            setIsResultModalOpen(true);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat Hasil &amp; Jawaban</span>
                        </button>
                      </div>

                      <div className="py-2.5 px-3.5 rounded-xl bg-[#140f2b] border border-[#271d49] text-[11px] text-slate-300 flex items-center justify-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="font-medium text-slate-300">
                          Ujian ini hanya dapat dikerjakan 1 kali. Hasil jawaban telah disimpan.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartQuiz(quiz)}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25 transition-all cursor-pointer active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Mulai Kerjakan Ujian Sekarang</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULL RESULT & REVIEW MODAL */}
      {isResultModalOpen && viewingResultSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-3xl bg-[#161131] border border-[#3b2a68] shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#2d2150]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-pink-500/20">
                  <Award className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Lembar Hasil Ujian</h3>
                  <span className="text-xs text-slate-400">
                    Nilai dan rincian jawaban Anda telah tercatat aman
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsResultModalOpen(false);
                  setViewingResultSubmission(null);
                }}
                className="p-1.5 rounded-xl bg-[#231a47] text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score Showcase Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-[#1c1540] to-[#140e2d] border border-pink-500/30 flex flex-col sm:flex-row items-center justify-around gap-4 text-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  SKOR DIPEROLEH
                </span>
                <span className="text-3xl sm:text-4xl font-black text-pink-400 font-mono">
                  {viewingResultSubmission.totalScore} <span className="text-base text-slate-400 font-normal">/ {viewingResultSubmission.maxScore}</span>
                </span>
              </div>

              <div className="hidden sm:block w-px h-12 bg-[#2d2150]" />

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  PERSENTASE
                </span>
                <span className={`text-3xl sm:text-4xl font-black font-mono ${
                  viewingResultSubmission.scorePercentage >= 75 ? 'text-emerald-400' : viewingResultSubmission.scorePercentage >= 50 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {viewingResultSubmission.scorePercentage}%
                </span>
              </div>

              <div className="hidden sm:block w-px h-12 bg-[#2d2150]" />

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  STATUS
                </span>
                <span className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                  viewingResultSubmission.scorePercentage >= 75
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {viewingResultSubmission.scorePercentage >= 75 ? 'Tuntas / Hebat 🎉' : 'Perlu Evaluasi 📚'}
                </span>
              </div>
            </div>

            {/* Answer Breakdown Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Rincian Jawaban Soal:
              </h4>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {viewingResultSubmission.answers.map((ans, idx) => {
                  const targetQuiz = questionBanks.find((q) => q.id === viewingResultSubmission.quizId);
                  const qItem = targetQuiz?.questions.find((q) => q.id === ans.questionId);

                  return (
                    <div
                      key={ans.questionId || idx}
                      className="p-4 rounded-xl bg-[#110d24] border border-[#261d47] space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b border-[#21183d]">
                        <span className="font-bold text-white">Soal Nomor {idx + 1} ({ans.type === 'pilihan_ganda' ? 'Pilihan Ganda' : 'Essay'})</span>
                        {ans.type === 'pilihan_ganda' ? (
                          ans.isCorrect ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[10px]">
                              Benar (+{ans.pointsEarned} Poin)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 font-bold text-[10px]">
                              Salah (0 Poin)
                            </span>
                          )
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold text-[10px]">
                            Essay Dikumpulkan
                          </span>
                        )}
                      </div>

                      {qItem && (
                        <p className="text-slate-300 font-medium whitespace-pre-wrap">{qItem.questionText}</p>
                      )}

                      {ans.type === 'pilihan_ganda' ? (
                        <div className="pt-1 text-slate-400">
                          <p>
                            Jawaban Anda:{' '}
                            <strong className="text-white">
                              {ans.selectedOptionIndex !== undefined && qItem?.options
                                ? `${['A', 'B', 'C', 'D'][ans.selectedOptionIndex]}. ${qItem.options[ans.selectedOptionIndex]}`
                                : 'Tidak dijawab'}
                            </strong>
                          </p>
                          {qItem?.correctOptionIndex !== undefined && qItem.options && (
                            <p className="text-emerald-400 mt-0.5">
                              Kunci Jawaban Benar:{' '}
                              <strong>
                                {['A', 'B', 'C', 'D'][qItem.correctOptionIndex]}. {qItem.options[qItem.correctOptionIndex]}
                              </strong>
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="pt-1 text-slate-300">
                          <span className="text-[10px] text-slate-400 block font-bold">Jawaban Anda:</span>
                          <p className="p-2.5 rounded-lg bg-[#181235] text-white mt-1 italic whitespace-pre-wrap">
                            "{ans.essayAnswerText || 'Tidak diisi'}"
                          </p>
                          {qItem?.essayAnswerKey && (
                            <div className="mt-2 p-2 rounded-lg bg-purple-950/30 border border-purple-500/20 text-purple-300">
                              <span className="text-[10px] font-bold block text-purple-400">Pedoman Kunci Jawaban:</span>
                              <p className="mt-0.5">{qItem.essayAnswerKey}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-[#2d2150] flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsResultModalOpen(false);
                  setViewingResultSubmission(null);
                }}
                className="px-6 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup &amp; Kembali ke Daftar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
