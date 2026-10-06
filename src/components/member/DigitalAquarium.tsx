import React, { useState, useEffect } from 'react';
import { Waves, Fish, Sparkles, Heart, Trophy, Zap, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const DigitalAquarium: React.FC = () => {
  const { tasks, submissions, currentUser, showToast } = useApp();

  const completedCount = submissions.filter(
    (s) => s.memberId === currentUser?.id && s.status === 'completed'
  ).length;

  const totalXP = Number(localStorage.getItem('remindtask_study_xp') || '150') + completedCount * 50;
  const fishCount = Math.max(4, Math.min(30, 4 + Math.floor(completedCount / 2)));
  const coralLevel = Math.min(5, 1 + Math.floor(totalXP / 200));

  const [feedCount, setFeedCount] = useState(0);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);

  const handleFeedFish = () => {
    setFeedCount((prev) => prev + 1);
    
    // Create feeding particles
    const newParticles = Array.from({ length: 6 }).map((_, i) => ({
      id: Date.now() + i,
      x: 20 + Math.random() * 60,
      y: 10 + Math.random() * 20,
    }));
    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.includes(p)));
    }, 2000);

    showToast('🍖 Makanan ikan disebarkan! Ikan-ikan berenang mendekat dan semakin aktif!', 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950 via-indigo-900 to-[#120f26] border border-cyan-500/40 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold mb-3">
              <Waves className="w-3.5 h-3.5" />
              <span>Digital Aquarium 3D Terintegrasi 🐠</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Ekosistem Bawah Laut &amp; Produktivitas
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-xl leading-relaxed">
              Aquarium virtual 3D yang hidup. Penyelesaian tugas dan sesi belajarmu menambah populasi ikan, menumbuhkan coral, dan menjaga kesegaran ekosistem!
            </p>
          </div>

          <button
            type="button"
            onClick={handleFeedFish}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white font-extrabold text-xs shadow-xl shadow-cyan-500/25 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <Fish className="w-4 h-4" />
            <span>Beri Makan Ikan (🍖)</span>
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-[#141126] border border-[#272144] flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <Fish className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">POPULASI IKAN</span>
              <h4 className="text-xl font-black text-white">{fishCount} Ekor 🐠</h4>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-semibold">Aktif 3D</span>
        </div>

        <div className="p-5 rounded-3xl bg-[#141126] border border-[#272144] flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">LEVEL CORAL</span>
              <h4 className="text-xl font-black text-white">Level {coralLevel} 🪸</h4>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-semibold">Berkembang</span>
        </div>

        <div className="p-5 rounded-3xl bg-[#141126] border border-[#272144] flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">KESEHATAN AIR</span>
              <h4 className="text-xl font-black text-white">100% Prima ✨</h4>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-semibold">Stabil</span>
        </div>
      </div>

      {/* 3D Immersive Aquarium Stage */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-cyan-950 via-blue-950 to-[#060b1e] border-2 border-cyan-500/40 h-[450px] sm:h-[500px] shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col justify-between p-6 perspective-[1000px]">
        {/* Underwater Caustic Lighting & Depth Layers */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-400/20 via-blue-600/10 to-transparent pointer-events-none animate-pulse duration-1000" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/80 via-transparent to-cyan-900/10 pointer-events-none" />

        {/* Floating Bubbles */}
        <div className="absolute bottom-4 left-10 w-2.5 h-2.5 rounded-full bg-cyan-300/60 animate-[bounce_4s_infinite]" />
        <div className="absolute bottom-8 left-1/3 w-3 h-3 rounded-full bg-cyan-200/50 animate-[bounce_6s_infinite_1s]" />
        <div className="absolute bottom-6 right-1/4 w-2 h-2 rounded-full bg-cyan-300/40 animate-[bounce_5s_infinite_0.5s]" />
        <div className="absolute bottom-10 right-16 w-3.5 h-3.5 rounded-full bg-cyan-200/60 animate-[bounce_7s_infinite_2s]" />

        {/* Feeding Particles */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute z-30 w-3 h-3 bg-amber-400 rounded-full shadow-lg shadow-amber-400 animate-ping"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          />
        ))}

        {/* Top Status Bar */}
        <div className="relative z-20 flex items-center justify-between">
          <div className="px-3.5 py-1.5 rounded-full bg-blue-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold shadow-lg backdrop-blur-md">
            🌊 Suhu Air: 27.2°C • pH: 7.4 (3D Realtime)
          </div>
          <div className="px-3.5 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-500/50 text-cyan-200 text-xs font-bold shadow-lg backdrop-blur-md">
            {feedCount > 0 ? `🍖 Makanan disebar (${feedCount}x)` : '🐠 Ikan berenang aktif'}
          </div>
        </div>

        {/* 3D Swimming Fish Stage */}
        <div className="relative z-10 flex-1 flex items-center justify-center transform-gpu [transform-style:preserve-3d]">
          <div className="absolute inset-0 flex items-center justify-around pointer-events-none text-4xl sm:text-5xl">
            <span className="transform-gpu transition-transform animate-[bounce_3.5s_ease-in-out_infinite] hover:scale-125 drop-shadow-[0_10px_15px_rgba(6,182,212,0.5)]">🐠</span>
            <span className="transform-gpu transition-transform animate-[bounce_4.5s_ease-in-out_infinite_0.5s] hover:scale-125 drop-shadow-[0_10px_15px_rgba(59,130,246,0.5)]">🐟</span>
            <span className="transform-gpu transition-transform animate-[bounce_4s_ease-in-out_infinite_1s] hover:scale-125 drop-shadow-[0_10px_15px_rgba(236,72,153,0.5)]">🐡</span>
            <span className="transform-gpu transition-transform animate-[bounce_5s_ease-in-out_infinite_1.5s] hover:scale-125 drop-shadow-[0_10px_15px_rgba(16,185,129,0.5)]">🐢</span>
            {fishCount > 4 && <span className="transform-gpu transition-transform animate-[bounce_3.8s_ease-in-out_infinite_0.2s]">🐠</span>}
            {fishCount > 6 && <span className="transform-gpu transition-transform animate-[bounce_4.8s_ease-in-out_infinite_0.7s]">🐟</span>}
            {fishCount > 10 && <span className="transform-gpu transition-transform animate-[bounce_5.2s_ease-in-out_infinite_1.2s]">🦈</span>}
          </div>
        </div>

        {/* Seabed 3D Glowing Corals & Plants */}
        <div className="relative z-20 flex items-end justify-between px-6 text-3xl sm:text-4xl pb-3 drop-shadow-[0_5px_10px_rgba(0,0,0,0.8)]">
          <span className="animate-pulse">🪸</span>
          <span>🌿</span>
          <span className="animate-pulse">🪨</span>
          {coralLevel >= 2 && <span className="animate-pulse">🪸</span>}
          <span>🌿</span>
          <span>⚓</span>
          {coralLevel >= 3 && <span className="animate-pulse">🪸</span>}
          <span>🌿</span>
        </div>
      </div>
    </div>
  );
};
