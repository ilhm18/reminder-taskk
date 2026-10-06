import React, { useState } from 'react';
import {
  HelpCircle,
  Clock,
  CheckCircle2,
  FileText,
  Trash2,
  Award,
  Users,
  Search,
  BookOpen,
  Lock,
  Eye,
  Unlock,
  AlertCircle,
  BarChart2,
  Building2,
  X,
  Timer,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { QuestionBankItem, QuizSubmission, QuizStatus } from '../../types';
import { formatIndonesianDate } from '../../utils/notification';

export const QuestionBankOwnerView: React.FC = () => {
  const {
    classes,
    questionBanks,
    quizSubmissions,
    toggleQuestionBankStatus,
    deleteQuestionBank,
    showToast,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'banks' | 'submissions'>('banks');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'hidden'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [viewingQuizDetails, setViewingQuizDetails] = useState<QuestionBankItem | null>(null);
  const [viewingSubmission, setViewingSubmission] = useState<QuizSubmission | null>(null);

  // Statistics across all classes
  const totalBanks = questionBanks.length;
  const publishedBanks = questionBanks.filter((q) => q.status === 'published').length;
  const hiddenBanks = questionBanks.filter((q) => q.status === 'hidden').length;
  const totalSubmissions = quizSubmissions.length;

  // Filtered Question Banks
  const filteredBanks = questionBanks.filter((qb) => {
    const matchClass = selectedClassId === 'all' || qb.classId === selectedClassId;
    const matchStatus = statusFilter === 'all' || qb.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      qb.title.toLowerCase().includes(q) ||
      (qb.subject && qb.subject.toLowerCase().includes(q)) ||
      (qb.createdByName && qb.createdByName.toLowerCase().includes(q));

    return matchClass && matchStatus && matchSearch;
  });

  // Filtered Submissions
  const filteredSubmissions = quizSubmissions.filter((qs) => {
    const matchClass = selectedClassId === 'all' || qs.classId === selectedClassId;
    const q = searchQuery.toLowerCase().trim();
    const targetQuiz = questionBanks.find((qb) => qb.id === qs.quizId);
    const matchSearch =
      !q ||
      qs.memberName.toLowerCase().includes(q) ||
      (targetQuiz && targetQuiz.title.toLowerCase().includes(q));

    return matchClass && matchSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1c143d] via-[#151030] to-[#0d091e] border border-[#2e2354] p-6 sm:p-8 shadow-2xl">
        <div className="absolute -right-10 -top-10 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-bold mb-3">
              <HelpCircle className="w-3.5 h-3.5 text-pink-400" />
              <span>Owner Central Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Manajemen Bank Soal &amp; Ujian Seluruh Kelas
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-xl leading-relaxed">
              Pantau seluruh paket soal ujian dan kuis dari seluruh admin kelas di platform RemindTask, termasuk status persembunyian, batas waktu per soal, serta riwayat hasil pengerjaan siswa.
            </p>
          </div>
        </div>
      </div>

      {/* Global Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#141029] border border-[#271f49] flex items-center gap-3.5 shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">TOTAL PAKET</span>
            <span className="text-xl font-black text-white">{totalBanks} Paket</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#141029] border border-[#271f49] flex items-center gap-3.5 shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">DIBUKA SISWA</span>
            <span className="text-xl font-black text-white">{publishedBanks} Paket</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#141029] border border-[#271f49] flex items-center gap-3.5 shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">PERSEMBUNYIAN</span>
            <span className="text-xl font-black text-white">{hiddenBanks} Paket</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#141029] border border-[#271f49] flex items-center gap-3.5 shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PENGERJAAN SISWA</span>
            <span className="text-xl font-black text-white">{totalSubmissions} Selesai</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Filters */}
      <div className="p-4 rounded-2xl bg-[#14102b] border border-[#271e4d] flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-[#1a1438] rounded-xl border border-[#2d2354] w-full md:w-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('banks')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeSubTab === 'banks'
                ? 'bg-pink-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Paket Bank Soal ({filteredBanks.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('submissions')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeSubTab === 'submissions'
                ? 'bg-pink-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Hasil Ujian Siswa ({filteredSubmissions.length})</span>
          </button>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Class Filter */}
          <div className="flex items-center gap-1.5 bg-[#1a1438] px-3 py-1.5 rounded-xl border border-[#2d2354]">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-transparent text-xs text-slate-300 font-bold focus:outline-none"
            >
              <option value="all">Semua Ruang Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {activeSubTab === 'banks' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-[#1a1438] px-3 py-2 rounded-xl border border-[#2d2354] text-xs text-slate-300 font-bold focus:outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="published">Dibuka Siswa</option>
              <option value="hidden">Di Persembunyian</option>
            </select>
          )}

          {/* Search box */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul atau nama..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#1b1538] border border-[#2e2354] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
            />
          </div>
        </div>
      </div>

      {/* TAB 1: BANK SOAL LIST (OWNER VIEW) */}
      {activeSubTab === 'banks' && (
        <div className="space-y-4">
          {filteredBanks.length === 0 ? (
            <div className="p-12 rounded-3xl bg-[#141029] border border-[#251d45] text-center">
              <p className="text-slate-400 text-xs">Tidak ada paket bank soal yang sesuai filter pencarian.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBanks.map((quiz) => {
                const targetClass = classes.find((c) => c.id === quiz.classId);
                const isHidden = quiz.status === 'hidden';
                const submissionCount = quizSubmissions.filter((s) => s.quizId === quiz.id).length;
                const mcCount = quiz.questions.filter((q) => q.type === 'pilihan_ganda').length;
                const essayCount = quiz.questions.filter((q) => q.type === 'essay').length;

                return (
                  <div
                    key={quiz.id}
                    className={`p-5 sm:p-6 rounded-3xl border transition-all flex flex-col justify-between ${
                      isHidden
                        ? 'bg-[#151128]/95 border-amber-500/30'
                        : 'bg-[#14102b] border-[#2d2252]'
                    }`}
                  >
                    <div>
                      {/* Top Pills */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold text-[10px]">
                            {targetClass?.name || 'Kelas Terkait'}
                          </span>
                          {quiz.subject && (
                            <span className="px-2 py-0.5 rounded-md bg-[#221845] text-slate-300 font-semibold text-[10px]">
                              {quiz.subject}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>
                              {quiz.timeLimitPerQuestionSeconds && quiz.timeLimitPerQuestionSeconds > 0
                                ? quiz.durationMinutes > 0
                                  ? `${quiz.durationMinutes}m`
                                  : `Timer ${quiz.timeLimitPerQuestionSeconds}s / soal`
                                : quiz.durationMinutes > 0
                                ? `${quiz.durationMinutes}m`
                                : 'Bebas'}
                            </span>
                          </span>
                          {quiz.timeLimitPerQuestionSeconds && quiz.timeLimitPerQuestionSeconds > 0 && quiz.durationMinutes > 0 ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-[10px] font-mono flex items-center gap-1">
                              <Timer className="w-2.5 h-2.5 text-amber-400" />
                              <span>{quiz.timeLimitPerQuestionSeconds}s / soal</span>
                            </span>
                          ) : null}
                        </div>

                        {isHidden ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-[10px] flex items-center gap-1 shrink-0">
                            <Lock className="w-3 h-3" />
                            <span>Persembunyian</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[10px] flex items-center gap-1 shrink-0">
                            <Eye className="w-3 h-3" />
                            <span>Dibuka</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-black text-white tracking-tight mb-1">
                        {quiz.title}
                      </h3>
                      <p className="text-xs text-slate-400 mb-3">
                        Dibuat oleh: <strong className="text-slate-300">{quiz.createdByName || 'Admin'}</strong> • {formatIndonesianDate(quiz.createdAt)}
                      </p>

                      {/* Stat Breakdown */}
                      <div className="grid grid-cols-4 gap-2 p-3 rounded-2xl bg-[#1a1438] border border-[#2a1f4d] text-center mb-4 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">PIL. GANDA</span>
                          <span className="font-black text-pink-400">{mcCount}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">ESSAY</span>
                          <span className="font-black text-purple-300">{essayCount}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">TOTAL POIN</span>
                          <span className="font-black text-amber-400">{quiz.totalPoints}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">SELESAI</span>
                          <span className="font-black text-emerald-400">{submissionCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Owner Actions */}
                    <div className="pt-3 border-t border-[#261d47] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleQuestionBankStatus(quiz.id)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                          isHidden
                            ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {isHidden ? (
                          <>
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Buka ke Siswa</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>Sembunyikan</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingQuizDetails(quiz)}
                          className="px-3 py-1.5 rounded-xl bg-[#221845] hover:bg-[#2d205c] text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Lihat Butir Soal ({quiz.questions.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Hapus permanen paket bank soal "${quiz.title}"?`)) {
                              deleteQuestionBank(quiz.id);
                            }
                          }}
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors cursor-pointer"
                          title="Hapus paket soal"
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
      )}

      {/* TAB 2: SUBMISSIONS LIST (OWNER VIEW) */}
      {activeSubTab === 'submissions' && (
        <div className="bg-[#141029] border border-[#271f49] rounded-3xl p-6 overflow-x-auto shadow-xl">
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              Belum ada siswa yang mengumpulkan jawaban ujian pada filter ini.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#241a45] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3">Siswa</th>
                  <th className="pb-3">Ruang Kelas</th>
                  <th className="pb-3">Paket Ujian</th>
                  <th className="pb-3">Skor &amp; Nilai</th>
                  <th className="pb-3">Waktu Submit</th>
                  <th className="pb-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#20173e]">
                {filteredSubmissions.map((sub) => {
                  const targetClass = classes.find((c) => c.id === sub.classId);
                  const targetQuiz = questionBanks.find((q) => q.id === sub.quizId);

                  return (
                    <tr key={sub.id} className="hover:bg-[#1a1438] transition-colors">
                      <td className="py-3.5 font-bold text-white flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-300 flex items-center justify-center text-[10px] font-black">
                          {sub.memberName.charAt(0)}
                        </div>
                        <div>
                          <span>{sub.memberName}</span>
                          {sub.memberEmail && (
                            <span className="text-[10px] text-slate-400 block font-normal">{sub.memberEmail}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 text-slate-300 font-medium">
                        {targetClass?.name || 'Kelas'}
                      </td>
                      <td className="py-3.5 text-white font-semibold">
                        {targetQuiz?.title || 'Ujian'}
                      </td>
                      <td className="py-3.5">
                        <span className="font-mono font-bold text-pink-400 mr-2">
                          {sub.totalScore}/{sub.maxScore}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          sub.scorePercentage >= 75
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        }`}>
                          {sub.scorePercentage}%
                        </span>
                      </td>
                      <td className="py-3.5 font-mono text-slate-400 text-[11px]">
                        {formatIndonesianDate(sub.submittedAt)}
                      </td>
                      <td className="py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setViewingSubmission(sub)}
                          className="px-3 py-1.5 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 hover:text-white font-bold text-xs border border-pink-500/30 transition-colors cursor-pointer"
                        >
                          Rincian Jawaban
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* MODAL: VIEW QUIZ QUESTIONS (OWNER) */}
      {viewingQuizDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl bg-[#161131] border border-[#3b2a68] shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#2d2150]">
              <div>
                <h3 className="text-base font-black text-white">{viewingQuizDetails.title}</h3>
                <span className="text-xs text-slate-400">
                  {viewingQuizDetails.questions.length} Butir Soal • Total {viewingQuizDetails.totalPoints} Poin
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingQuizDetails(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {viewingQuizDetails.questions.map((q, idx) => (
                <div key={q.id || idx} className="p-4 rounded-xl bg-[#110d24] border border-[#261d47] space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-pink-400 pb-1 border-b border-[#221842]">
                    <span>Nomor {idx + 1} ({q.type === 'pilihan_ganda' ? 'Pilihan Ganda' : 'Essay'})</span>
                    <span className="text-amber-400">{q.points || 10} Poin</span>
                  </div>
                  <p className="text-white font-medium whitespace-pre-wrap">{q.questionText}</p>
                  {q.type === 'pilihan_ganda' && q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-slate-300">
                      {q.options.map((opt, optIdx) => (
                        <div
                          key={optIdx}
                          className={`p-2 rounded-lg text-[11px] ${
                            q.correctOptionIndex === optIdx
                              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold'
                              : 'bg-[#181235] text-slate-400'
                          }`}
                        >
                          {['A', 'B', 'C', 'D'][optIdx]}. {opt} {q.correctOptionIndex === optIdx && '✓ (Kunci)'}
                        </div>
                      ))}
                    </div>
                  )}
                  {q.type === 'essay' && q.essayAnswerKey && (
                    <div className="p-2 rounded-lg bg-purple-950/30 border border-purple-500/20 text-purple-300 text-[11px]">
                      <span className="font-bold block text-purple-400">Pedoman Kunci:</span>
                      <span>{q.essayAnswerKey}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingQuizDetails(null)}
                className="px-5 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW SUBMISSION ANSWERS (OWNER) */}
      {viewingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl bg-[#161131] border border-[#3b2a68] shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#2d2150]">
              <div>
                <h3 className="text-base font-black text-white">Jawaban: {viewingSubmission.memberName}</h3>
                <span className="text-xs text-slate-400">
                  Nilai: {viewingSubmission.totalScore}/{viewingSubmission.maxScore} ({viewingSubmission.scorePercentage}%)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingSubmission(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {viewingSubmission.answers.map((ans, idx) => {
                const targetQuiz = questionBanks.find((q) => q.id === viewingSubmission.quizId);
                const qItem = targetQuiz?.questions.find((q) => q.id === ans.questionId);

                return (
                  <div key={ans.questionId || idx} className="p-4 rounded-xl bg-[#110d24] border border-[#261d47] space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold pb-1 border-b border-[#221842]">
                      <span className="text-white">Soal {idx + 1} ({ans.type === 'pilihan_ganda' ? 'Pil. Ganda' : 'Essay'})</span>
                      {ans.type === 'pilihan_ganda' ? (
                        ans.isCorrect ? (
                          <span className="text-emerald-400 font-bold">Benar (+{ans.pointsEarned} Poin)</span>
                        ) : (
                          <span className="text-red-400 font-bold">Salah (0 Poin)</span>
                        )
                      ) : (
                        <span className="text-purple-300 font-bold">Essay</span>
                      )}
                    </div>
                    {qItem && <p className="text-slate-300 font-medium">{qItem.questionText}</p>}
                    {ans.type === 'pilihan_ganda' ? (
                      <div className="text-slate-400">
                        <p>Jawaban Siswa: <strong className="text-white">{ans.selectedOptionIndex !== undefined && qItem?.options ? `${['A','B','C','D'][ans.selectedOptionIndex]}. ${qItem.options[ans.selectedOptionIndex]}` : 'Tidak dijawab'}</strong></p>
                        {qItem?.correctOptionIndex !== undefined && qItem.options && (
                          <p className="text-emerald-400">Kunci Benar: <strong>{['A','B','C','D'][qItem.correctOptionIndex]}. {qItem.options[qItem.correctOptionIndex]}</strong></p>
                        )}
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-[#181235] text-white italic">
                        "{ans.essayAnswerText || 'Tidak diisi'}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingSubmission(null)}
                className="px-5 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
