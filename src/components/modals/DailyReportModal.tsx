import React from 'react';
import { Award, CheckCircle2, Clock, Copy, Download, FileSpreadsheet, FileText, Printer, Send, ShieldAlert, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TaskSubmission } from '../../types';
import { formatIndonesianDate, getTaskDeadlineStatus, sendBrowserPushNotification } from '../../utils/notification';

interface DailyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTask?: (taskId: string, submission?: TaskSubmission) => void;
}

export const DailyReportModal: React.FC<DailyReportModalProps> = ({ isOpen, onClose, onSelectTask }) => {
  const { currentClass, tasks, submissions, showToast, sendCustomNotification } = useApp();

  if (!isOpen) return null;

  // Filter tasks for current class
  const classTasks = tasks.filter((t) => t.classId === currentClass?.id);
  const classSubmissions = submissions.filter((s) => s.classId === currentClass?.id);

  const totalTasks = classTasks.length;
  const completedSubmissions = classSubmissions.filter((s) => s.status === 'completed');
  const pendingSubmissions = classSubmissions.filter((s) => s.status === 'pending_review');

  const overdueTasks = classTasks.filter((t) => getTaskDeadlineStatus(t.dueDate).status === 'overdue');
  const dueTodayTasks = classTasks.filter((t) => getTaskDeadlineStatus(t.dueDate).status === 'due-today');

  const completionRate = totalTasks > 0 ? Math.min(100, Math.round((completedSubmissions.length / totalTasks) * 100)) : 0;

  const todayDateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleCopySummary = () => {
    const text = `📊 *LAPORAN HARIAN REMINDTASK*
🏢 Kelas: ${currentClass?.name} (${currentClass?.code})
📅 Tanggal: ${todayDateStr}
----------------------------------------
📈 Tingkat Penyelesaian: ${completionRate}%
📌 Total Tugas: ${totalTasks}
✅ Tugas Selesai: ${completedSubmissions.length}
⏳ Menunggu Review: ${pendingSubmissions.length}
⚠️ Tugas Terlambat: ${overdueTasks.length}

🔔 *Daftar Tugas Mendesak / Hari Ini:*
${dueTodayTasks.map((t) => `• ${t.title} (Deadline: ${formatIndonesianDate(t.dueDate)})`).join('\n') || 'Tidak ada tugas berdeadline hari ini.'}

Tetap semangat dan selesaikan tugas tepat waktu! 💪`;

    navigator.clipboard.writeText(text);
    showToast('Ringkasan laporan berhasil disalin ke clipboard!', 'success');
  };

  const handleBroadcastReminder = () => {
    const msg = `Pengingat otomatis laporan harian: Ada ${overdueTasks.length + dueTodayTasks.length} tugas yang perlu perhatian di ${currentClass?.name}.`;
    sendCustomNotification(
      'Pengingat Laporan Harian Otomatis',
      msg,
      'deadline_soon',
      currentClass?.id,
      undefined,
      'all'
    );
    sendBrowserPushNotification('Pengingat Laporan Harian', msg);
    showToast('Notifikasi pengingat otomatis telah dikirim ke seluruh member!', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#141126] border border-[#2e2652] rounded-3xl p-6 shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#261f42]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">Laporan Kemajuan Harian</h2>
              <p className="text-xs text-slate-400">
                Otomatisasi pelacakan produktivitas dan kepatuhan tenggat waktu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#25203f] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Class Banner Info */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#20183b] to-[#18132d] border border-[#372b5a] flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-pink-400 uppercase tracking-wider block">
                REKAP KELAS OTOMATIS
              </span>
              <h3 className="text-xl font-black text-white">{currentClass?.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Kode Kelas: <span className="font-mono text-purple-300 font-bold">{currentClass?.code}</span> · {todayDateStr}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 block">Tingkat Penyelesaian</span>
              <span className="text-3xl font-black text-white font-mono tabular-nums">
                {completionRate}%
              </span>
            </div>
          </div>

          {/* Metric Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-[#1b1536] border border-[#2d2352]">
              <span className="text-[11px] text-slate-400 block">Total Tugas</span>
              <span className="text-xl font-bold text-white font-mono mt-1 block">{totalTasks}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#1b1536] border border-[#2d2352]">
              <span className="text-[11px] text-emerald-400 block">Tugas Selesai</span>
              <span className="text-xl font-bold text-emerald-400 font-mono mt-1 block">
                {completedSubmissions.length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#1b1536] border border-[#2d2352]">
              <span className="text-[11px] text-amber-300 block">Perlu Pemeriksaan</span>
              <span className="text-xl font-bold text-amber-300 font-mono mt-1 block">
                {pendingSubmissions.length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#1b1536] border border-[#2d2352]">
              <span className="text-[11px] text-red-400 block">Tugas Terlambat</span>
              <span className="text-xl font-bold text-red-400 font-mono mt-1 block">
                {overdueTasks.length}
              </span>
            </div>
          </div>

          {/* Progress Bar Visual */}
          <div className="p-4 rounded-2xl bg-[#17132e] border border-[#272044]">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-200">Indeks Kinerja Kelas Hari Ini</span>
              <span className="font-mono text-pink-400 font-bold">{completedSubmissions.length} dari {totalTasks} tugas selesai</span>
            </div>
            <div className="h-3 w-full bg-[#0e0c1c] rounded-full overflow-hidden p-0.5 border border-[#282147]">
              <div
                className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(5, completionRate)}%` }}
              />
            </div>
          </div>

          {/* Task Status Breakdown Table */}
          <div className="rounded-2xl border border-[#2a224c] overflow-hidden">
            <div className="px-4 py-3 bg-[#1c1638] font-bold text-xs text-white border-b border-[#2a224c] flex items-center justify-between">
              <span>Status Tugas Kelas</span>
              <span className="text-[11px] text-slate-400">Sinkronisasi Real-Time</span>
            </div>
            <div className="divide-y divide-[#231c40] bg-[#141029]">
              {classTasks.map((t) => {
                const status = getTaskDeadlineStatus(t.dueDate);
                const sub = classSubmissions.find((s) => s.taskId === t.id);

                return (
                  <div key={t.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            if (onSelectTask) {
                              onSelectTask(t.id, sub);
                            }
                          }}
                          className="font-bold text-white hover:text-pink-300 hover:underline text-left cursor-pointer transition-colors truncate"
                          title="Klik untuk membuka & meninjau tugas ini"
                        >
                          {t.title}
                        </button>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.badgeClass}`}>
                          {status.label}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                        Tenggat: {formatIndonesianDate(t.dueDate)} · {t.category}
                      </span>
                    </div>

                    <div className="shrink-0 text-right">
                      {sub?.status === 'completed' && (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
                        </span>
                      )}
                      {sub?.status === 'pending_review' && (
                        <span className="text-purple-400 font-semibold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Ditinjau
                        </span>
                      )}
                      {!sub && (
                        <span className="text-slate-400 font-medium">Belum Dikerjakan</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Member activity highlight */}
          <div className="p-4 rounded-2xl bg-[#17132e] border border-[#272044]">
            <h4 className="text-xs font-bold text-white mb-2.5 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              Keaktifan & Pengumpulan Terbaru
            </h4>
            <div className="space-y-2">
              {classSubmissions.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  Belum ada catatan pengumpulan tugas pada kelas ini.
                </div>
              ) : (
                classSubmissions.map((s) => {
                  const taskObj = tasks.find((t) => t.id === s.taskId);
                  return (
                    <div key={s.id} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-[#1b1536] border border-[#2c2350]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-pink-500/20 text-pink-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                          {s.memberName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <span className="text-white font-bold block truncate">{s.memberName}</span>
                          <span className="text-[11px] text-pink-300 block truncate mt-0.5">
                            menyelesaikan tugas{' '}
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                if (onSelectTask) {
                                  onSelectTask(s.taskId, s);
                                }
                              }}
                              className="underline font-semibold hover:text-white transition-colors cursor-pointer"
                              title="Klik untuk membuka & meninjau tugas ini"
                            >
                              {taskObj?.title || 'Tugas Kelas'}
                            </button>
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <span className="text-[10px] text-slate-400 block font-mono">{formatIndonesianDate(s.submittedAt)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#261f42] flex flex-wrap items-center justify-between gap-2.5">
          <button
            onClick={handleCopySummary}
            className="px-3.5 py-2 rounded-xl bg-[#20193d] hover:bg-[#2b2250] text-pink-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Salin Ringkasan Teks</span>
          </button>

          <button
            onClick={handleBroadcastReminder}
            className="px-3.5 py-2 rounded-xl bg-[#291e4a] hover:bg-[#362763] text-purple-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-pink-400" />
            <span>Broadcast Pengingat</span>
          </button>
        </div>
      </div>
    </div>
  );
};
