import React, { useState, useEffect, useRef } from 'react';
import {
  Shuffle,
  Users,
  Sparkles,
  Trophy,
  RotateCcw,
  Play,
  Copy,
  Check,
  Download,
  Flame,
  UserCheck,
  Dice5,
  Trash2,
  Plus,
  Layers,
  Award,
  Clock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

// Sound effect synthesizer for spin wheel
function playSpinSound(type: 'tick' | 'winner' | 'shuffle') {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'tick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } else if (type === 'winner') {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.35);
      });
    } else if (type === 'shuffle') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    }
  } catch {}
}

const WHEEL_COLORS = [
  '#ec4899', // pink-500
  '#8b5cf6', // purple-500
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#a855f7', // purple-600
  '#14b8a6', // teal-500
];

const DEFAULT_SAMPLE_NAMES: string[] = [];

export const SpinWheelView: React.FC = () => {
  const { currentClass, users, showToast, addActivityLog, currentUser } = useApp();
  const [mode, setMode] = useState<'spin' | 'groups'>('spin');

  const historyStorageKey = `rt_spin_history_${currentClass?.id || 'default'}`;

  // Candidate names - initialized as empty unless class members exist
  const [namesText, setNamesText] = useState(() => {
    const classMembers = users.filter((u) => u.classId === currentClass?.id && u.role === 'member');
    if (classMembers.length > 0) {
      return classMembers.map((m) => m.name).join('\n');
    }
    return '';
  });

  const parsedNames = namesText
    .split('\n')
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  // Spin Wheel States
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [spinHistory, setSpinHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(historyStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [removeWinnerOnSpin, setRemoveWinnerOnSpin] = useState(false);

  // Pending deletion timer states for 5-second delay
  const [pendingDeleteWinner, setPendingDeleteWinner] = useState<string | null>(null);
  const [deleteCountdown, setDeleteCountdown] = useState<number>(0);
  const deleteTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const cancelPendingDelete = () => {
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setPendingDeleteWinner(null);
    setDeleteCountdown(0);
  };

  const scheduleWinnerRemoval = (winnerName: string) => {
    cancelPendingDelete();
    setPendingDeleteWinner(winnerName);
    setDeleteCountdown(5);

    countdownIntervalRef.current = setInterval(() => {
      setDeleteCountdown((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    deleteTimerRef.current = setTimeout(() => {
      setNamesText((prev) =>
        prev
          .split('\n')
          .filter((n) => n.trim() !== winnerName)
          .join('\n')
      );
      showToast(`Nama '${winnerName}' telah dihapus dari daftar roda spin.`, 'info');
      setPendingDeleteWinner(null);
      setDeleteCountdown(0);
    }, 5000);
  };

  const handleImmediateDeleteWinner = (winnerName: string) => {
    cancelPendingDelete();
    setNamesText((prev) =>
      prev
        .split('\n')
        .filter((n) => n.trim() !== winnerName)
        .join('\n')
    );
    showToast(`Nama '${winnerName}' langsung dihapus dari daftar.`, 'info');
  };

  // Sync spinHistory to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(historyStorageKey, JSON.stringify(spinHistory));
    } catch {}
  }, [spinHistory, historyStorageKey]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      cancelPendingDelete();
    };
  }, []);

  // Group Generator States
  const [groupCount, setGroupCount] = useState<number>(5); // e.g. 5 groups for 40 people
  const [generatedGroups, setGeneratedGroups] = useState<Array<{ name: string; members: string[] }>>([]);
  const [copiedGroups, setCopiedGroups] = useState(false);

  // Load class members automatically
  const handleLoadClassMembers = () => {
    const classMembers = users.filter((u) => u.classId === currentClass?.id && u.role === 'member');
    if (classMembers.length === 0) {
      setNamesText('');
      showToast('Belum ada siswa terdaftar di kelas ini.', 'info');
    } else {
      setNamesText(classMembers.map((m) => m.name).join('\n'));
      showToast(`Berhasil memuat ${classMembers.length} siswa dari database kelas ${currentClass?.name}.`, 'success');
    }
  };

  // SPIN WHEEL LOGIC
  const handleSpin = () => {
    cancelPendingDelete();

    const activeItems = parsedNames.slice(0, 36);
    if (isSpinning || activeItems.length < 2) {
      if (activeItems.length < 2) {
        showToast('Masukkan minimal 2 nama siswa untuk memutar roda spin!', 'warn');
      }
      return;
    }

    setIsSpinning(true);
    setWinner(null);
    playSpinSound('tick');

    const count = activeItems.length;
    const sliceDeg = 360 / count;
    const selectedIndex = Math.floor(Math.random() * count);
    
    // In SVG slice drawing, slice idx spans [idx * sliceDeg, (idx + 1) * sliceDeg] starting from 12 o'clock (0 deg)
    // Add safe jitter inside the selected slice for natural look
    const sectorJitter = (Math.random() - 0.5) * (sliceDeg * 0.5);
    const targetSliceCenter = selectedIndex * sliceDeg + sliceDeg / 2 + sectorJitter;
    const targetMod = ((360 - (targetSliceCenter % 360)) % 360 + 360) % 360;
    const currentMod = ((rotationAngle % 360) + 360) % 360;
    let delta = targetMod - currentMod;
    if (delta <= 0) delta += 360;
    const extraSpins = (Math.floor(Math.random() * 3) + 7) * 360; // 7 to 9 full spins
    const totalRotation = rotationAngle + extraSpins + delta;

    // Compute the exact physical sector under the top pointer (12 o'clock)
    const finalNormalizedAngle = ((360 - (totalRotation % 360)) % 360 + 360) % 360;
    const exactWinnerIndex = Math.floor(finalNormalizedAngle / sliceDeg) % count;
    const chosenWinner = activeItems[exactWinnerIndex] || activeItems[selectedIndex];

    // Sound ticking effect during spin
    const startTime = Date.now();
    const duration = 4500; // 4.5 seconds

    const tickInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed < duration) {
        playSpinSound('tick');
      } else {
        clearInterval(tickInterval);
      }
    }, 180);

    setRotationAngle(totalRotation);

    setTimeout(() => {
      clearInterval(tickInterval);
      setIsSpinning(false);
      setWinner(chosenWinner);
      setSpinHistory((prev) => [chosenWinner, ...prev]);
      playSpinSound('winner');
      showToast(`🎉 Terpilih: ${chosenWinner}!`, 'success');

      // Sync log to database activity logs
      try {
        addActivityLog(
          currentUser?.name || 'Admin',
          'admin',
          'Roda Spin Undian Kelas',
          `Siswa terpilih: ${chosenWinner} pada kelas ${currentClass?.name || 'Aktif'}`,
          'submission'
        );
      } catch {}

      // Schedule removal with 5-second delay if option enabled
      if (removeWinnerOnSpin) {
        scheduleWinnerRemoval(chosenWinner);
      }
    }, duration);
  };

  // GROUP GENERATOR LOGIC
  const handleGenerateGroups = () => {
    if (parsedNames.length === 0) {
      showToast('Masukkan daftar nama siswa terlebih dahulu.', 'warn');
      return;
    }

    playSpinSound('shuffle');

    // Shuffle array
    const shuffled = [...parsedNames].sort(() => Math.random() - 0.5);
    const groups: Array<{ name: string; members: string[] }> = [];

    for (let i = 0; i < groupCount; i++) {
      groups.push({
        name: `Kelompok ${i + 1}`,
        members: [],
      });
    }

    // Distribute round-robin
    shuffled.forEach((name, index) => {
      const groupIdx = index % groupCount;
      groups[groupIdx].members.push(name);
    });

    setGeneratedGroups(groups);
    showToast(`Berhasil membagi ${parsedNames.length} orang ke dalam ${groupCount} kelompok!`, 'success');
  };

  const handleCopyGroups = () => {
    if (generatedGroups.length === 0) return;
    const text = generatedGroups
      .map((g) => `${g.name} (${g.members.length} Orang):\n` + g.members.map((m, idx) => `  ${idx + 1}. ${m}`).join('\n'))
      .join('\n\n');

    navigator.clipboard.writeText(text);
    setCopiedGroups(true);
    showToast('Daftar pembagian kelompok disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedGroups(false), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-gradient-to-r dark:from-[#21163e] dark:via-[#1a1233] dark:to-[#120f26] border border-slate-200 dark:border-[#37275f] p-6 sm:p-7 shadow-sm">
        <div className="absolute right-0 top-0 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5 shadow-lg shadow-pink-500/25 flex items-center justify-center text-white shrink-0">
              <Dice5 className="w-7 h-7 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-pink-50 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 font-bold text-[10px] uppercase tracking-wider border border-pink-200 dark:border-pink-500/30">
                  Tool Guru &amp; Admin
                </span>
                <span className="text-xs font-mono text-purple-700 dark:text-purple-300 font-bold">
                  {parsedNames.length} Siswa Terdaftar
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                Roda Spin &amp; Acak Kelompok Siswa
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                Putar roda undian giliran presentasi, kuis interaktif, atau bagi 40+ siswa ke dalam kelompok otomatis!
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-[#141028] border border-slate-200 dark:border-[#2b224d] rounded-2xl self-stretch md:self-auto">
            <button
              onClick={() => setMode('spin')}
              className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mode === 'spin'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#1d1738]'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Roda Spin Undian</span>
            </button>
            <button
              onClick={() => setMode('groups')}
              className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mode === 'groups'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#1d1738]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Bagi Kelompok</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Input List on Left, Interactive Tool on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Daftar Nama Input (4 cols) */}
        <div className="lg:col-span-4 bg-[#141126] border border-[#272144] rounded-3xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#231d3f] mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-pink-400" />
                <h3 className="font-bold text-white text-sm">Daftar Nama Siswa</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#1e173e] text-purple-300 font-mono text-xs font-bold">
                {parsedNames.length} Orang
              </span>
            </div>

            <p className="text-[11px] text-slate-400 mb-3">
              Ketik atau tempel nama siswa (satu baris untuk setiap nama).
            </p>

            <textarea
              rows={12}
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
              placeholder="Ahmad Fauzi&#10;Budi Santoso&#10;Citra Dewi..."
              className="w-full bg-[#181333] border border-[#2e2452] focus:border-pink-500 rounded-2xl p-3.5 text-xs text-slate-200 outline-none transition-colors font-mono leading-relaxed resize-none"
            />
          </div>

          <div className="space-y-2 pt-4 border-t border-[#231d3f] mt-4">
            <button
              onClick={handleLoadClassMembers}
              className="w-full py-2.5 rounded-xl bg-[#1f183d] hover:bg-[#2b2154] text-pink-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#34275a]"
            >
              <UserCheck className="w-3.5 h-3.5 text-pink-400" />
              <span>Muat Siswa Dari Kelas ({currentClass?.name || 'Aktif'})</span>
            </button>
            <div className="flex items-center justify-end text-xs text-slate-400 pt-1">
              <button
                onClick={() => setNamesText('')}
                className="hover:text-red-400 cursor-pointer transition-colors flex items-center gap-1 font-semibold text-red-400/80"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kosongkan Seluruh Nama</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Tool (8 cols) */}
        <div className="lg:col-span-8 bg-[#141126] border border-[#272144] rounded-3xl p-6 relative overflow-hidden">
          {/* ================================================================= */}
          {/* TAB 1: RODA SPIN UNDIAN (LUCKY WHEEL) */}
          {/* ================================================================= */}
          {mode === 'spin' && (
            <div className="flex flex-col items-center">
              <div className="w-full flex items-center justify-between pb-4 mb-4 border-b border-[#231d3f]">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Roda Spin Interaktif</span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    Klik tombol "PUTAR SEKARANG" untuk memilih pemenang secara acak
                  </span>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={removeWinnerOnSpin}
                    onChange={(e) => setRemoveWinnerOnSpin(e.target.checked)}
                    className="w-4 h-4 accent-pink-500 rounded"
                  />
                  <span>Hapus nama setelah terpilih</span>
                </label>
              </div>

              {/* Spin Wheel Container with Pointer */}
              <div className="relative my-4 flex items-center justify-center">
                {/* Pointer Marker at Top (Pointing strictly DOWN into 12 o'clock) */}
                <div className="absolute -top-5 z-30 flex flex-col items-center pointer-events-none drop-shadow-2xl">
                  <svg width="34" height="42" viewBox="0 0 34 42" fill="none" className="filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">
                    <path
                      d="M17 42 L3 12 C0 7 3 2 9 2 L25 2 C31 2 34 7 31 12 Z"
                      fill="url(#wheelPointerGrad)"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                    />
                    <circle cx="17" cy="14" r="4.5" fill="#ffffff" />
                    <circle cx="17" cy="14" r="2.5" fill="#f59e0b" />
                    <defs>
                      <linearGradient id="wheelPointerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#fbbf24" />
                        <stop offset="60%" stopColor="#ec4899" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                {/* SVG Spinning Wheel */}
                <div
                  className="w-72 h-72 sm:w-88 sm:h-88 rounded-full shadow-2xl relative transition-transform duration-[4500ms] ease-out-cubic"
                  style={{
                    transform: `rotate(${rotationAngle}deg)`,
                    transitionTimingFunction: 'cubic-bezier(0.15, 0.9, 0.2, 1)',
                  }}
                >
                  <svg viewBox="0 0 100 100" className="w-full h-full rounded-full border-4 border-[#2d2250] shadow-inner">
                    {parsedNames.length === 1 ? (
                      <g>
                        <circle cx="50" cy="50" r="50" fill={WHEEL_COLORS[0]} />
                        <text
                          x="50"
                          y="50"
                          fill="#ffffff"
                          fontSize="4.5"
                          fontWeight="bold"
                          textAnchor="middle"
                          alignmentBaseline="middle"
                          className="select-none font-sans drop-shadow-sm"
                        >
                          {parsedNames[0].length > 12 ? parsedNames[0].substring(0, 11) + '..' : parsedNames[0]}
                        </text>
                      </g>
                    ) : parsedNames.length > 1 ? (
                      parsedNames.slice(0, 36).map((name, idx) => {
                        const count = Math.min(parsedNames.length, 36);
                        const sliceAngle = 360 / count;
                        const startAngle = idx * sliceAngle;
                        const endAngle = (idx + 1) * sliceAngle;

                        const startRad = (startAngle - 90) * (Math.PI / 180);
                        const endRad = (endAngle - 90) * (Math.PI / 180);

                        const x1 = 50 + 50 * Math.cos(startRad);
                        const y1 = 50 + 50 * Math.sin(startRad);
                        const x2 = 50 + 50 * Math.cos(endRad);
                        const y2 = 50 + 50 * Math.sin(endRad);

                        const largeArcFlag = sliceAngle > 180 ? 1 : 0;
                        const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                        const color = WHEEL_COLORS[idx % WHEEL_COLORS.length];

                        // Text position
                        const midAngle = startAngle + sliceAngle / 2;
                        const midRad = (midAngle - 90) * (Math.PI / 180);
                        const textX = 50 + 32 * Math.cos(midRad);
                        const textY = 50 + 32 * Math.sin(midRad);

                        return (
                          <g key={idx}>
                            <path d={pathData} fill={color} stroke="#141126" strokeWidth="0.6" />
                            <text
                              x={textX}
                              y={textY}
                              fill="#ffffff"
                              fontSize={count > 20 ? '2.5' : count > 12 ? '3.2' : '4'}
                              fontWeight="bold"
                              textAnchor="middle"
                              alignmentBaseline="middle"
                              transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                              className="select-none font-sans drop-shadow-sm"
                            >
                              {name.length > 10 ? name.substring(0, 9) + '..' : name}
                            </text>
                          </g>
                        );
                      })
                    ) : (
                      <circle cx="50" cy="50" r="50" fill="#1b1536" />
                    )}
                  </svg>

                  {/* Wheel Center Cap */}
                  <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-gradient-to-tr from-[#120e24] to-[#2c204d] border-4 border-pink-500 flex items-center justify-center text-white shadow-xl z-20">
                    <Sparkles className="w-6 h-6 text-amber-400" />
                  </div>
                </div>
              </div>

              {/* Spin Action Buttons */}
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={handleSpin}
                  disabled={isSpinning || parsedNames.length < 2}
                  className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 text-white font-black text-sm shadow-xl shadow-pink-500/30 flex items-center gap-2.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{isSpinning ? 'Sedang Memutar Roda...' : 'PUTAR RODA SEKARANG!'}</span>
                </button>
              </div>

              {/* Winner Announcement Banner */}
              {winner && (
                <div className="mt-6 w-full p-5 rounded-2xl bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-amber-500/20 border-2 border-pink-500 text-center animate-in zoom-in-95 duration-200 relative overflow-hidden shadow-xl space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-pink-300">
                      Siswa Yang Terpilih:
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    🎉 {winner} 🎉
                  </h3>

                  {/* 5-second countdown timer alert if pending delete */}
                  {pendingDeleteWinner === winner && deleteCountdown > 0 && (
                    <div className="p-3 rounded-xl bg-[#120e24]/90 border border-amber-500/50 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-2 max-w-lg mx-auto shadow-md">
                      <div className="flex items-center gap-2 font-medium">
                        <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                        <span>
                          Menghapus <strong>{winner}</strong> dari roda dalam <span className="font-mono font-bold text-amber-300 text-sm px-1.5 py-0.5 rounded bg-amber-500/20">{deleteCountdown}s</span>...
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={cancelPendingDelete}
                          className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-[11px] cursor-pointer transition-colors"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={() => handleImmediateDeleteWinner(winner)}
                          className="px-2.5 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-[11px] cursor-pointer transition-colors"
                        >
                          Hapus Sekarang
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Manual delete trigger with 5s delay if not already pending */}
                  {pendingDeleteWinner !== winner && parsedNames.includes(winner) && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => scheduleWinnerRemoval(winner)}
                        className="px-3.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Nama Ini (Jeda 5 Detik)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Recent Spin History */}
              {spinHistory.length > 0 && (
                <div className="w-full mt-6 pt-4 border-t border-[#231d3f]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Riwayat Terpilih:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {spinHistory.slice(0, 8).map((name, idx) => (
                      <span
                        key={`spin-hist-${name}-${idx}`}
                        className="px-3 py-1 rounded-xl bg-[#1b1538] border border-[#312558] text-xs font-semibold text-slate-300"
                      >
                        #{idx + 1} {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: BAGI KELOMPOK OTOMATIS (GROUP GENERATOR) */}
          {/* ================================================================= */}
          {mode === 'groups' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#231d3f]">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-pink-400" />
                    <span>Generator Pembagian Kelompok</span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    Bagi {parsedNames.length} siswa secara adil dan acak
                  </span>
                </div>

                {/* Group Count Selector */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-300 font-semibold">Jumlah Kelompok:</span>
                  <div className="flex items-center gap-1 bg-[#181333] border border-[#2f2554] p-1 rounded-xl">
                    {[3, 4, 5, 6, 8].map((count) => (
                      <button
                        key={count}
                        onClick={() => setGroupCount(count)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          groupCount === count
                            ? 'bg-pink-500 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleGenerateGroups}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Acak Sekarang</span>
                  </button>
                </div>
              </div>

              {/* Group Cards Grid */}
              {generatedGroups.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-300">
                      Hasil Pembagian ({generatedGroups.length} Kelompok):
                    </span>
                    <button
                      onClick={handleCopyGroups}
                      className="px-3 py-1.5 rounded-xl bg-[#1e173d] hover:bg-[#2c2154] border border-[#372a60] text-pink-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      {copiedGroups ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedGroups ? 'Tersalin!' : 'Salin Semua Kelompok'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {generatedGroups.map((grp, gIdx) => {
                      const color = WHEEL_COLORS[gIdx % WHEEL_COLORS.length];
                      return (
                        <div
                          key={`grp-${grp.name}-${gIdx}`}
                          className="p-4 rounded-2xl bg-[#17122e] border border-[#2a204d] flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between pb-2.5 border-b border-[#251d44] mb-2.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: color }}
                                />
                                <h4 className="font-bold text-white text-xs">{grp.name}</h4>
                              </div>
                              <span className="text-[10px] font-mono font-bold text-slate-400 bg-[#120e24] px-2 py-0.5 rounded-md">
                                {grp.members.length} Orang
                              </span>
                            </div>

                            <ol className="space-y-1.5 list-decimal list-inside text-xs text-slate-300">
                              {grp.members.map((mem, mIdx) => (
                                <li key={`mem-${gIdx}-${mIdx}-${mem}`} className="truncate">
                                  <span className="font-medium">{mem}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 bg-[#16122d] border border-[#271f49] rounded-2xl">
                  <Users className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-white">Belum Ada Kelompok Yang Diacak</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                    Pilih jumlah kelompok yang diinginkan lalu klik "Acak Sekarang" untuk membagi daftar siswa secara instan.
                  </p>
                  <button
                    onClick={handleGenerateGroups}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xs cursor-pointer shadow-md"
                  >
                    Acak Kelompok Sekarang
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
