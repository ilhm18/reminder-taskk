import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Heart,
  Utensils,
  Bath,
  Gamepad2,
  Moon,
  Crown,
  Zap,
  Award,
  Flame,
  Shirt,
  ShoppingBag,
  RotateCcw,
  Check,
  Star,
  Compass,
  Trophy,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PetType, VirtualPetData } from '../../types';
import { VirtualPet3DCanvas } from './VirtualPet3DCanvas';

function playPetSound(type: 'happy' | 'eat' | 'wash' | 'level' | 'click') {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'happy') {
      [600, 800, 1000].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.1, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.2);
      });
    } else if (type === 'eat') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'wash') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'level') {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.3);
      });
    }
  } catch {}
}

const PET_CHARACTERS = [
  {
    type: 'cat' as PetType,
    name: 'Mochi',
    title: 'Kucing Jenius',
    avatar: '🐱',
    color: 'from-amber-400 to-pink-500',
    description: 'Suka belajar dengan tenang, suka makan kue stroberi, dan selalu menemani mengerjakan tugas!',
    favFood: '🍰 Kue Stroberi',
  },
  {
    type: 'fox' as PetType,
    name: 'Foxy',
    title: 'Rubah Cerdik',
    avatar: '🦊',
    color: 'from-orange-400 to-amber-500',
    description: 'Pintar memecahkan soal logika dan teka-teki sulit. Sangat lincah dan berenergi!',
    favFood: '🍇 Buah Anggur',
  },
  {
    type: 'panda' as PetType,
    name: 'Boba',
    title: 'Panda Santuy',
    avatar: '🐼',
    color: 'from-emerald-400 to-teal-500',
    description: 'Tenang, santai namun fokus tinggi saat belajar. Mengingatkanmu untuk istirahat cukup.',
    favFood: '🎋 Rebung Manis',
  },
  {
    type: 'bunny' as PetType,
    name: 'Bunny',
    title: 'Kelinci Rajin',
    avatar: '🐰',
    color: 'from-pink-400 to-purple-500',
    description: 'Selalu bersemangat mengumpulkan tugas sebelum tenggat waktu tiba!',
    favFood: '🥕 Wortel Renyah',
  },
  {
    type: 'dragon' as PetType,
    name: 'Ignis',
    title: 'Naga Api Juara',
    avatar: '🐲',
    color: 'from-red-400 to-purple-600',
    description: 'Membakar semangat belajarmu hingga mencapai ranking tertinggi di kelas!',
    favFood: '🍖 Daging Bakar',
  },
];

const ACCESSORIES = [
  { id: 'grad_cap', name: 'Topi Sarjana', icon: '🎓', levelReq: 1, cost: 50 },
  { id: 'glasses', name: 'Kacamata Einstein', icon: '👓', levelReq: 2, cost: 80 },
  { id: 'crown', name: 'Mahkota Emas Juara', icon: '👑', levelReq: 3, cost: 150 },
  { id: 'headphones', name: 'Gamer Headset', icon: '🎧', levelReq: 4, cost: 200 },
  { id: 'sparkles', name: 'Aura Kristal Ajaib', icon: '✨', levelReq: 5, cost: 300 },
];

export const VirtualPetView: React.FC = () => {
  const { currentUser, showToast, tasks, submissions } = useApp();

  const storageKey = `remindtask_virtual_pet_${currentUser?.id || 'guest'}`;
  const [pet, setPet] = useState<VirtualPetData>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      id: 'pet-' + Date.now(),
      petType: 'cat',
      name: 'Mochi',
      level: 1,
      xp: 40,
      maxXp: 100,
      hunger: 75,
      happiness: 80,
      cleanliness: 85,
      energy: 90,
      coins: 120,
      equippedAccessory: 'grad_cap',
      unlockedAccessories: ['grad_cap'],
      stage: 'baby',
      lastInteraction: new Date().toISOString(),
    };
  });

  const [activeTab, setActiveTab] = useState<'status' | 'wardrobe' | 'change_pet'>('status');
  const [isBubbleActive, setIsBubbleActive] = useState(false);
  const [actionTrigger, setActionTrigger] = useState<'idle' | 'eat' | 'wash' | 'pet' | 'sleep' | 'levelUp'>('idle');
  const [petMoodSpeech, setPetMoodSpeech] = useState('Semangat belajarnya hari ini ya!');

  const trigger3DAction = (action: 'eat' | 'wash' | 'pet' | 'sleep' | 'levelUp', duration = 2000) => {
    setActionTrigger(action);
    setTimeout(() => {
      setActionTrigger('idle');
    }, duration);
  };

  const handlePetClick = () => {
    playPetSound('happy');
    trigger3DAction('pet', 1800);
    setPetMoodSpeech('Hehe geli dielus! Sayang banget sama kamu!');
    handleGainXp(10, 5);
  };

  const savePet = (updated: VirtualPetData) => {
    setPet(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}
  };

  const currentPetConfig = PET_CHARACTERS.find((p) => p.type === pet.petType) || PET_CHARACTERS[0];

  // Increase pet stats whenever user completes tasks
  const completedTaskCount = submissions.filter((s) => s.memberId === currentUser?.id && s.status === 'completed').length;

  const handleGainXp = (amount: number, coinAmount = 10) => {
    let newXp = pet.xp + amount;
    let newLevel = pet.level;
    let newMaxXp = pet.maxXp;
    let newStage = pet.stage;

    if (newXp >= pet.maxXp) {
      newXp = newXp - pet.maxXp;
      newLevel += 1;
      newMaxXp = Math.floor(pet.maxXp * 1.5);
      newStage = newLevel >= 5 ? 'master' : newLevel >= 3 ? 'teen' : 'baby';
      playPetSound('level');
      trigger3DAction('levelUp', 3000);
      showToast(`🎉 LEVEL UP! ${pet.name} sekarang Level ${newLevel}! (${newStage.toUpperCase()})`, 'success');
    }

    savePet({
      ...pet,
      level: newLevel,
      xp: newXp,
      maxXp: newMaxXp,
      stage: newStage,
      coins: pet.coins + coinAmount,
    });
  };

  const handleFeed = () => {
    if (pet.hunger >= 100) {
      showToast(`${pet.name} sudah sangat kenyang!`, 'info');
      return;
    }
    playPetSound('eat');
    trigger3DAction('eat', 2200);
    const newHunger = Math.min(100, pet.hunger + 25);
    const newHappiness = Math.min(100, pet.happiness + 10);
    setPetMoodSpeech('Nyam nyam! Enak banget makanannya, makasih ya!');
    handleGainXp(15, 5);
    savePet({
      ...pet,
      hunger: newHunger,
      happiness: newHappiness,
    });
  };

  const handleWash = () => {
    if (pet.cleanliness >= 100) {
      showToast(`${pet.name} sudah bersih dan wangi!`, 'info');
      return;
    }
    playPetSound('wash');
    trigger3DAction('wash', 2200);
    setIsBubbleActive(true);
    setTimeout(() => setIsBubbleActive(false), 2000);
    setPetMoodSpeech('Segar banget rasanya sehabis mandi gelembung!');
    handleGainXp(15, 5);
    savePet({
      ...pet,
      cleanliness: 100,
      happiness: Math.min(100, pet.happiness + 15),
    });
  };

  const handlePlay = () => {
    if (pet.energy <= 20) {
      showToast(`${pet.name} sedang lelah, biarkan istirahat dulu ya.`, 'warn');
      return;
    }
    playPetSound('happy');
    trigger3DAction('pet', 2500);
    setPetMoodSpeech('Yey seru banget main bareng kamu! Selalu ceria!');
    handleGainXp(25, 15);
    savePet({
      ...pet,
      happiness: 100,
      energy: Math.max(0, pet.energy - 15),
    });
  };

  const handleRest = () => {
    playPetSound('happy');
    trigger3DAction('sleep', 2500);
    setPetMoodSpeech('Zzz... Istirahat sejenak untuk memulihkan energi...');
    savePet({
      ...pet,
      energy: 100,
      happiness: Math.min(100, pet.happiness + 5),
    });
    showToast(`${pet.name} telah pulih 100% energi!`, 'success');
  };

  const handleEquipAccessory = (accId: string) => {
    if (!pet.unlockedAccessories.includes(accId)) {
      const acc = ACCESSORIES.find((a) => a.id === accId);
      if (acc && pet.coins >= acc.cost) {
        savePet({
          ...pet,
          coins: pet.coins - acc.cost,
          unlockedAccessories: [...pet.unlockedAccessories, accId],
          equippedAccessory: accId,
        });
        showToast(`Berhasil membeli dan mengenakan ${acc.name}!`, 'success');
      } else {
        showToast('Koin tidak mencukupi atau level belum memenuhi!', 'warn');
      }
      return;
    }

    const nextEquip = pet.equippedAccessory === accId ? undefined : accId;
    savePet({
      ...pet,
      equippedAccessory: nextEquip,
    });
    playPetSound('happy');
  };

  const handleChangePetType = (newType: PetType) => {
    const selected = PET_CHARACTERS.find((p) => p.type === newType);
    if (!selected) return;
    savePet({
      ...pet,
      petType: newType,
      name: selected.name,
    });
    playPetSound('happy');
    showToast(`Kamu sekarang mengadopsi ${selected.name} (${selected.title})!`, 'success');
    setActiveTab('status');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#221541] via-[#1a1233] to-[#120f26] border border-[#37275f] p-6 shadow-xl">
        <div className="absolute right-0 top-0 w-80 h-80 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5 shadow-lg shadow-pink-500/25 flex items-center justify-center text-white shrink-0">
              <Sparkles className="w-7 h-7 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold text-[10px] uppercase tracking-wider border border-pink-500/30">
                  Teman Virtual Belajar
                </span>
                <span className="text-xs font-mono text-amber-300 font-bold">
                  Level {pet.level} • {pet.stage.toUpperCase()}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Peliharaan Virtual: {pet.name} ({currentPetConfig.title})
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Rawat, beri makan, dan naikkan level karaktermu dengan menyelesaikan tugas dan belajar setiap hari!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-[#141029] p-2.5 rounded-2xl border border-[#2b224d]">
            <div className="text-center px-3 border-r border-[#261f42]">
              <span className="text-[10px] text-slate-400 block font-bold">KOIN REWARD</span>
              <span className="text-sm font-black text-amber-400">🪙 {pet.coins}</span>
            </div>
            <div className="text-center px-3">
              <span className="text-[10px] text-slate-400 block font-bold">TUGAS SELESAI</span>
              <span className="text-sm font-black text-emerald-400">✅ {completedTaskCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Pet Sanctuary Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT & CENTER: PET INTERACTIVE DISPLAY (7 cols) */}
        <div className="lg:col-span-7 bg-[#141126] border border-[#272144] rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden shadow-xl">
          {/* Ambient Lighting Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-pink-900/10 to-transparent pointer-events-none" />

          {/* Speech Bubble from Pet */}
          <div className="relative z-10 mx-auto max-w-sm p-3.5 rounded-2xl bg-[#1b1538] border border-pink-500/40 text-center shadow-lg mb-6">
            <p className="text-xs sm:text-sm font-bold text-pink-200">
              💬 "{petMoodSpeech}"
            </p>
            <div className="w-3 h-3 bg-[#1b1538] border-r border-b border-pink-500/40 transform rotate-45 mx-auto -mb-5 mt-2" />
          </div>

          {/* 3D Animated Pet Character Canvas */}
          <div className="relative z-10 my-2 flex flex-col items-center justify-center">
            <div className="w-full relative rounded-3xl bg-gradient-to-b from-[#1b143a]/60 via-[#140e2d]/80 to-[#0d091e] border border-[#34245c] p-2 overflow-hidden shadow-inner">
              <VirtualPet3DCanvas
                pet={pet}
                actionTrigger={actionTrigger}
                onPetClick={handlePetClick}
              />

              {/* Soap bubbles animation */}
              {isBubbleActive && (
                <div className="absolute inset-0 flex items-center justify-center text-4xl animate-ping pointer-events-none">
                  🫧 🧼 🫧
                </div>
              )}
            </div>

            <div className="mt-3 text-center">
              <h3 className="text-xl font-black text-white flex items-center justify-center gap-1.5">
                <span>{pet.name}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30">
                  {currentPetConfig.title}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 max-w-xs">{currentPetConfig.description}</p>
            </div>
          </div>

          {/* EXP & Level Bar */}
          <div className="relative z-10 bg-[#191433] p-4 rounded-2xl border border-[#2e2452] mt-4">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                EXP Level {pet.level}
              </span>
              <span className="font-mono text-pink-300">
                {pet.xp} / {pet.maxXp} XP
              </span>
            </div>
            <div className="w-full h-3 bg-[#110e22] rounded-full overflow-hidden p-0.5 border border-[#2b214f]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-600 transition-all duration-500"
                style={{ width: `${Math.min(100, (pet.xp / pet.maxXp) * 100)}%` }}
              />
            </div>
          </div>

          {/* Quick Interactive Actions */}
          <div className="relative z-10 grid grid-cols-4 gap-2.5 mt-4">
            <button
              onClick={handleFeed}
              className="p-3 rounded-2xl bg-[#1b1538] hover:bg-pink-500/20 border border-[#312558] hover:border-pink-500/50 flex flex-col items-center justify-center gap-1.5 text-slate-200 hover:text-white transition-all cursor-pointer active:scale-95"
            >
              <Utensils className="w-5 h-5 text-pink-400" />
              <span className="text-[11px] font-bold">Beri Makan</span>
            </button>

            <button
              onClick={handleWash}
              className="p-3 rounded-2xl bg-[#1b1538] hover:bg-cyan-500/20 border border-[#312558] hover:border-cyan-500/50 flex flex-col items-center justify-center gap-1.5 text-slate-200 hover:text-white transition-all cursor-pointer active:scale-95"
            >
              <Bath className="w-5 h-5 text-cyan-400" />
              <span className="text-[11px] font-bold">Mandikan</span>
            </button>

            <button
              onClick={handlePlay}
              className="p-3 rounded-2xl bg-[#1b1538] hover:bg-amber-500/20 border border-[#312558] hover:border-amber-500/50 flex flex-col items-center justify-center gap-1.5 text-slate-200 hover:text-white transition-all cursor-pointer active:scale-95"
            >
              <Gamepad2 className="w-5 h-5 text-amber-400" />
              <span className="text-[11px] font-bold">Ajak Main</span>
            </button>

            <button
              onClick={handleRest}
              className="p-3 rounded-2xl bg-[#1b1538] hover:bg-purple-500/20 border border-[#312558] hover:border-purple-500/50 flex flex-col items-center justify-center gap-1.5 text-slate-200 hover:text-white transition-all cursor-pointer active:scale-95"
            >
              <Moon className="w-5 h-5 text-purple-400" />
              <span className="text-[11px] font-bold">Istirahat</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: STATS, WARDROBE & ADOPT (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Sub Navigation */}
          <div className="flex items-center gap-2 p-1.5 bg-[#141029] border border-[#271f49] rounded-2xl">
            <button
              onClick={() => setActiveTab('status')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'status'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Kondisi Pet
            </button>
            <button
              onClick={() => setActiveTab('wardrobe')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'wardrobe'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Lemari Kostum
            </button>
            <button
              onClick={() => setActiveTab('change_pet')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'change_pet'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Adopsi Hewan
            </button>
          </div>

          {/* TAB 1: KONDISI STATISTIK */}
          {activeTab === 'status' && (
            <div className="bg-[#141126] border border-[#272144] rounded-3xl p-5 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-400" />
                <span>Kebutuhan &amp; Vitalitas {pet.name}</span>
              </h4>

              {/* Hunger */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-300">🍗 Kenyang (Hunger)</span>
                  <span className="text-pink-400 font-mono">{pet.hunger}%</span>
                </div>
                <div className="w-full h-2 bg-[#1b1538] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-pink-500 rounded-full transition-all duration-300"
                    style={{ width: `${pet.hunger}%` }}
                  />
                </div>
              </div>

              {/* Happiness */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-300">💖 Kebahagiaan (Happiness)</span>
                  <span className="text-amber-400 font-mono">{pet.happiness}%</span>
                </div>
                <div className="w-full h-2 bg-[#1b1538] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${pet.happiness}%` }}
                  />
                </div>
              </div>

              {/* Cleanliness */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-300">🧼 Kebersihan (Cleanliness)</span>
                  <span className="text-cyan-400 font-mono">{pet.cleanliness}%</span>
                </div>
                <div className="w-full h-2 bg-[#1b1538] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                    style={{ width: `${pet.cleanliness}%` }}
                  />
                </div>
              </div>

              {/* Energy */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-300">⚡ Energi (Energy)</span>
                  <span className="text-purple-400 font-mono">{pet.energy}%</span>
                </div>
                <div className="w-full h-2 bg-[#1b1538] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-300"
                    style={{ width: `${pet.energy}%` }}
                  />
                </div>
              </div>

              {/* Tips for EXP */}
              <div className="p-3.5 rounded-2xl bg-[#1a1436] border border-[#2e2354] text-xs text-slate-300 mt-4">
                <span className="font-bold text-amber-300 block mb-1">💡 Cara Menaikkan Level Pet:</span>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                  <li>Selesaikan tugas kelas (+50 EXP &amp; 30 Koin)</li>
                  <li>Belajar &amp; tanya materi ke RemindAI SuperTutor (+20 EXP)</li>
                  <li>Main game asah otak di Arena Game (+15 EXP)</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: LEMARI KOSTUM & AKSESORIS */}
          {activeTab === 'wardrobe' && (
            <div className="bg-[#141126] border border-[#272144] rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>Aksesoris &amp; Hiasan Pet</span>
                </h4>
                <span className="text-xs font-bold text-amber-400">🪙 {pet.coins} Koin</span>
              </div>

              <div className="space-y-2.5">
                {ACCESSORIES.map((acc) => {
                  const isUnlocked = pet.unlockedAccessories.includes(acc.id);
                  const isEquipped = pet.equippedAccessory === acc.id;
                  const isLevelMet = pet.level >= acc.levelReq;

                  return (
                    <div
                      key={acc.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                        isEquipped
                          ? 'bg-pink-500/20 border-pink-500'
                          : isUnlocked
                          ? 'bg-[#181333] border-[#2e2452]'
                          : 'bg-[#120e24] border-[#231b40] opacity-75'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{acc.icon}</span>
                        <div>
                          <span className="font-bold text-white text-xs block">{acc.name}</span>
                          <span className="text-[10px] text-slate-400">
                            Level Req: {acc.levelReq} • Harga: 🪙 {acc.cost} Koin
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleEquipAccessory(acc.id)}
                        disabled={!isUnlocked && !isLevelMet}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isEquipped
                            ? 'bg-pink-500 text-white shadow-sm'
                            : isUnlocked
                            ? 'bg-[#251c47] hover:bg-[#342761] text-pink-300'
                            : isLevelMet
                            ? 'bg-amber-500 hover:bg-amber-600 text-black'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {isEquipped ? 'Dikenakan' : isUnlocked ? 'Pakai' : `Beli (🪙 ${acc.cost})`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: GANTI / ADOPSI HEWAN */}
          {activeTab === 'change_pet' && (
            <div className="bg-[#141126] border border-[#272144] rounded-3xl p-5 space-y-3">
              <h4 className="text-sm font-bold text-white mb-2">Pilih Hewan Peliharaan Favoritmu</h4>
              <div className="space-y-2.5">
                {PET_CHARACTERS.map((char) => {
                  const isCurrent = pet.petType === char.type;
                  return (
                    <div
                      key={char.type}
                      className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                        isCurrent ? 'bg-pink-500/20 border-pink-500' : 'bg-[#181333] border-[#2e2452]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{char.avatar}</span>
                        <div>
                          <span className="font-bold text-white text-xs block">{char.name}</span>
                          <span className="text-[10px] text-purple-300 font-semibold">{char.title}</span>
                          <span className="text-[10px] text-slate-400 block">{char.favFood}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleChangePetType(char.type)}
                        disabled={isCurrent}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-pink-500 text-white'
                            : 'bg-[#251c47] hover:bg-pink-500/20 text-pink-300 hover:text-white'
                        }`}
                      >
                        {isCurrent ? 'Aktif' : 'Pilih Ini'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
