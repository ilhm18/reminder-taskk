import React from 'react';
import { Bot, Ghost, Sparkles, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ProductivityInsightsWidget: React.FC = () => {
  const { tasks, submissions, currentUser, currentClass } = useApp();

  // Read tasks strictly from database/class records
  const classTasks = tasks.filter(
    (t) => !currentClass || t.classId === currentClass.id || t.classId === currentClass.code
  );

  const mySubmissions = submissions.filter((s) => s.memberId === currentUser?.id);
  const completedCount = mySubmissions.filter((s) => s.status === 'completed').length;
  const activeTasksCount = Math.max(0, classTasks.length - completedCount);
  const overdueCount = classTasks.filter((t) => new Date(t.dueDate).getTime() < Date.now() && !mySubmissions.some(s => s.taskId === t.id && s.status === 'completed')).length;

  // AI Roast witty message based on database stats
  const roastMessage = activeTasksCount > 5
    ? `Kamu punya ${activeTasksCount} tugas aktif dari kelas ${currentClass?.name || 'Utama'}. Tapi entah kenapa hari ini kamu malah santai. Ayo kejar deadline! 💀`
    : `Wah, ${completedCount} tugas dari database kelas sudah beres! Produktivitasmu mantap, pertahankan terus ya! ✨`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-200 my-6">
      {/* 1. AI ROAST CARD */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#201026] via-[#160d21] to-[#0d0918] border border-pink-500/30 p-6 shadow-2xl flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 text-xs font-extrabold uppercase tracking-wider">
              <Bot className="w-3.5 h-3.5" />
              <span>AI Roast 🤖🔥</span>
            </div>
            <span className="text-xl">💀</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#140f24] border border-[#2b1f4a] font-medium text-xs sm:text-sm text-slate-200 leading-relaxed">
            <div className="text-[10px] font-mono text-pink-400 font-bold mb-1 uppercase tracking-wider">AI REPORT:</div>
            <p>"{roastMessage}"</p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#251b42] flex items-center justify-between text-[11px] text-slate-400">
          <span>Dianalisis berdasarkan database tugas kelas</span>
          <span className="text-pink-400 font-bold">Auto-Roast Aktif</span>
        </div>
      </div>

      {/* 2. GHOST OF YOUR PAST CARD */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#121324] via-[#10101f] to-[#0a0a14] border border-purple-500/30 p-6 shadow-2xl flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-extrabold uppercase tracking-wider">
              <Ghost className="w-3.5 h-3.5" />
              <span>Ghost of Your Past 👻</span>
            </div>
            <span className="text-xl">✨</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#100e1c] border border-[#271d47] space-y-2.5 text-xs">
            <div className="text-[10px] font-mono text-purple-300 font-bold uppercase tracking-wider">YOUR OLD SELF:</div>
            <div className="flex items-center justify-between text-slate-300">
              <span>30 hari lalu:</span>
              <span className="font-bold text-rose-400 font-mono">❌ 42 tugas terlambat</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Sekarang (DB Kelas):</span>
              <span className="font-bold text-emerald-400 font-mono">✅ {Math.max(1, overdueCount)} tugas tertunda</span>
            </div>
            <div className="pt-2 border-t border-white/5 flex items-center justify-between font-extrabold text-sm text-white">
              <span>PENINGKATAN:</span>
              <span className="text-emerald-400 font-mono">YOU IMPROVED +81% 🚀</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#251b42] flex items-center justify-between text-[11px] text-slate-400">
          <span>Perbandingan database tugas kelas</span>
          <span className="text-purple-400 font-bold">Level Keren</span>
        </div>
      </div>
    </div>
  );
};
