import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Heart,
  Utensils,
  Droplets,
  Zap,
  Smile,
  Crown,
  ShoppingBag,
  Award,
  RefreshCw,
  Gift,
  Check,
  Star,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PetType, VirtualPetData } from '../../types';
import { VirtualPet3DCanvas } from './VirtualPet3DCanvas';
import { playNotificationSound } from '../../utils/notification';

const ACCESSORIES_LIST = [
  { id: 'grad_cap', name: 'Toga Wisuda', price: 100, icon: '🎓', desc: 'Topi akademik kebanggaan' },
  { id: 'crown', name: 'Mahkota Emas', price: 200, icon: '👑', desc: 'Simbol juara kelas' },
  { id: 'glasses', name: 'Kacamata AI', price: 80, icon: '👓', desc: 'Kacamata kecerdasan' },
  { id: 'headphones', name: 'Headphone Fokus', price: 120, icon: '🎧', desc: 'Untuk sesi musik belajar' },
  { id: 'sparkles', name: 'Aura Bintang', price: 150, icon: '✨', desc: 'Aura kilau magis 3D' },
];

const PET_TYPES: { id: PetType; name: string; icon: string; desc: string }[] = [
  { id: 'fox', name: 'Rubah Cerdas (Foxy)', icon: '🦊', desc: 'Lincah, cerdik, dan suka tantangan kuis' },
  { id: 'bunny', name: 'Kelinci Gemoy (Bunnii)', icon: '🐰', desc: 'Manis, rajin, dan menambah motivasi belajar' },
  { id: 'panda', name: 'Panda Santai (Pandy)', icon: '🐼', desc: 'Tenang, suka fokus, dan penyeimbang stres' },
  { id: 'dragon', name: 'Naga Bintang (Draco)', icon: '🐉', desc: 'Langka, legendaris, dan membakar semangat' },
];

export const VirtualPetView: React.FC = () => {
  const { currentUser, showToast } = useApp();

  const petStorageKey = `rt_virtual_pet_${currentUser?.id || 'default'}`;

  const [pet, setPet] = useState<VirtualPetData>(() => {
    try {
      const saved = localStorage.getItem(petStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      id: 'pet-' + (currentUser?.id || '1'),
      petType: 'fox',
      name: 'Foxy Remind',
      level: 1,
      xp: 20,
      maxXp: 100,
      hunger: 80,
      happiness: 85,
      cleanliness: 90,
      energy: 75,
      coins: 250,
      equippedAccessory: 'grad_cap',
      unlockedAccessories: ['grad_cap'],
      stage: 'baby',
      lastInteraction: new Date().toISOString(),
    };
  });

  const [actionTrigger, setActionTrigger] = useState<'idle' | 'eat' | 'wash' | 'pet' | 'sleep' | 'levelUp'>('idle');

  // Sync pet data to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(petStorageKey, JSON.stringify(pet));
    } catch {}
  }, [pet, petStorageKey]);

  // Handle Action Trigger reset
  const triggerAction = (action: 'eat' | 'wash' | 'pet' | 'sleep' | 'levelUp') => {
    setActionTrigger(action);
    setTimeout(() => {
      setActionTrigger('idle');
    }, 2500);
  };

  // Interactions
  const handleFeed = () => {
    if (pet.hunger >= 100) {
      showToast(`${pet.name} sudah sangat kenyang!`, 'info');
      return;
    }
    setPet((prev) => {
      const newHunger = Math.min(100, prev.hunger + 25);
      const newXp = prev.xp + 15;
      let newLevel = prev.level;
      let newMaxXp = prev.maxXp;
      let newCoins = prev.coins + 10;

      if (newXp >= prev.maxXp) {
        newLevel += 1;
        newMaxXp = Math.floor(prev.maxXp * 1.5);
        showToast(`🎉 Selamat! ${prev.name} naik ke Level ${newLevel}!`, 'success');
        triggerAction('levelUp');
      } else {
        showToast(`Yummy! Makanan menambah +25 kenyang & +10 koin.`, 'success');
        triggerAction('eat');
      }

      return {
        ...prev,
        hunger: newHunger,
        xp: newXp % newMaxXp,
        level: newLevel,
        maxXp: newMaxXp,
        coins: newCoins,
      };
    });
    playNotificationSound('beep');
  };

  const handleWash = () => {
    if (pet.cleanliness >= 100) {
      showToast(`${pet.name} sudah sangat bersih dan wangi!`, 'info');
      return;
    }
    setPet((prev) => {
      const newClean = Math.min(100, prev.cleanliness + 30);
      showToast(`Byur! ${prev.name} jadi segar dan bersih wangi!`, 'success');
      triggerAction('wash');
      return { ...prev, cleanliness: newClean, coins: prev.coins + 5 };
    });
    playNotificationSound('beep');
  };

  const handlePet = () => {
    setPet((prev) => {
      const newHappy = Math.min(100, prev.happiness + 20);
      showToast(`Purr~ ${prev.name} sangat senang diusap! (+20 Kebahagiaan)`, 'success');
      triggerAction('pet');
      return { ...prev, happiness: newHappy, coins: prev.coins + 5 };
    });
    playNotificationSound('chime');
  };

  const handleBuyAccessory = (acc: typeof ACCESSORIES_LIST[0]) => {
    if (pet.unlockedAccessories.includes(acc.id)) {
      setPet((prev) => ({
        ...prev,
        equippedAccessory: prev.equippedAccessory === acc.id ? undefined : acc.id,
      }));
      showToast(
        pet.equippedAccessory === acc.id ? `Melepas ${acc.name}.` : `Memakai ${acc.name}!`,
        'info'
      );
      return;
    }

    if (pet.coins < acc.price) {
      showToast(`Koin tidak cukup! Butuh ${acc.price} koin. Selesaikan tugas/kuis untuk dapat koin.`, 'warn');
      return;
    }

    setPet((prev) => ({
      ...prev,
      coins: prev.coins - acc.price,
      unlockedAccessories: [...prev.unlockedAccessories, acc.id],
      equippedAccessory: acc.id,
    }));
    playNotificationSound('success');
    showToast(`Berhasil membeli ${acc.name}!`, 'success');
  };

  const handleChangePetType = (type: PetType, typeName: string) => {
    setPet((prev) => ({
      ...prev,
      petType: type,
      name: `${typeName.split(' ')[0]} Remind`,
    }));
    showToast(`Berhasil mengubah maskot 3D menjadi ${typeName}!`, 'success');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#22143d] via-[#1a1233] to-[#120f26] border border-[#382860] p-6 sm:p-7 shadow-xl">
        <div className="absolute right-0 top-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-500 to-pink-600 p-0.5 shadow-lg shadow-amber-500/25 flex items-center justify-center text-white shrink-0">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] uppercase tracking-wider border border-amber-500/30">
                  Virtual Pet 3D Live Mascot
                </span>
                <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-mono text-xs font-bold border border-pink-500/30">
                  🪙 {pet.coins} Koin
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Maskot Pendamping Belajar 3D
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 font-medium">
                Pelihara, beri makan, mandikan, dan pasang aksesoris lucu untuk maskot 3D kamu sambil menyelesaikan tugas harian!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: 3D Mascot Canvas Left, Pet Controls Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: 3D Interactive Mascot Canvas */}
        <div className="lg:col-span-5 bg-[#141126] border border-[#282148] rounded-3xl p-6 flex flex-col items-center justify-between relative overflow-hidden shadow-2xl">
          <div className="w-full flex items-center justify-between border-b border-[#231d42] pb-3 mb-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">
                Level {pet.level} • {pet.petType.toUpperCase()}
              </span>
              <h3 className="text-base font-black text-white">{pet.name}</h3>
            </div>
            <div className="flex items-center gap-1 bg-[#1a1436] px-2.5 py-1 rounded-xl border border-[#2f2458] text-xs font-mono text-pink-300 font-bold">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>{pet.xp} / {pet.maxXp} XP</span>
            </div>
          </div>

          {/* Interactive 3D Canvas Box */}
          <div className="w-full h-80 relative flex items-center justify-center my-2">
            <VirtualPet3DCanvas
              pet={pet}
              actionTrigger={actionTrigger}
              onPetClick={handlePet}
            />
          </div>

          {/* Stats Progress Bars */}
          <div className="w-full space-y-2.5 pt-3 border-t border-[#231d42] text-xs">
            {/* Hunger */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="font-semibold text-slate-300 flex items-center gap-1">
                  <Utensils className="w-3.5 h-3.5 text-amber-400" /> Kenyang
                </span>
                <span className="font-mono text-amber-300 font-bold">{pet.hunger}%</span>
              </div>
              <div className="h-2 w-full bg-[#0d0a1b] rounded-full overflow-hidden border border-[#271d47]">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-300"
                  style={{ width: `${pet.hunger}%` }}
                />
              </div>
            </div>

            {/* Happiness */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="font-semibold text-slate-300 flex items-center gap-1">
                  <Smile className="w-3.5 h-3.5 text-pink-400" /> Kebahagiaan
                </span>
                <span className="font-mono text-pink-300 font-bold">{pet.happiness}%</span>
              </div>
              <div className="h-2 w-full bg-[#0d0a1b] rounded-full overflow-hidden border border-[#271d47]">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${pet.happiness}%` }}
                />
              </div>
            </div>

            {/* Cleanliness */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="font-semibold text-slate-300 flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-cyan-400" /> Kebersihan
                </span>
                <span className="font-mono text-cyan-300 font-bold">{pet.cleanliness}%</span>
              </div>
              <div className="h-2 w-full bg-[#0d0a1b] rounded-full overflow-hidden border border-[#271d47]">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${pet.cleanliness}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Care Actions & Accessory Shop */}
        <div className="lg:col-span-7 space-y-6">
          {/* Care Quick Action Buttons */}
          <div className="bg-[#141126] border border-[#282148] rounded-3xl p-5 shadow-lg">
            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-400" />
              <span>Aksi Rawat &amp; Interaksi Maskot</span>
            </h4>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={handleFeed}
                className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 hover:border-amber-400 text-white font-bold text-xs flex flex-col items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md"
              >
                <Utensils className="w-5 h-5 text-amber-400" />
                <span>Beri Makan</span>
                <span className="text-[10px] text-amber-300 font-mono">+25 Kenyang</span>
              </button>

              <button
                onClick={handleWash}
                className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 hover:border-cyan-400 text-white font-bold text-xs flex flex-col items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md"
              >
                <Droplets className="w-5 h-5 text-cyan-400" />
                <span>Mandikan</span>
                <span className="text-[10px] text-cyan-300 font-mono">+30 Bersih</span>
              </button>

              <button
                onClick={handlePet}
                className="p-3.5 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/40 hover:border-pink-400 text-white font-bold text-xs flex flex-col items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md"
              >
                <Heart className="w-5 h-5 text-pink-400" />
                <span>Elus Maskot</span>
                <span className="text-[10px] text-pink-300 font-mono">+20 Senang</span>
              </button>
            </div>
          </div>

          {/* Accessory Shop */}
          <div className="bg-[#141126] border border-[#282148] rounded-3xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span>Toko Aksesoris Maskot 3D</span>
              </h4>
              <span className="text-xs font-mono text-amber-300 font-bold bg-[#1d163a] px-2.5 py-1 rounded-xl border border-[#34265f]">
                🪙 {pet.coins} Koin
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ACCESSORIES_LIST.map((acc) => {
                const isUnlocked = pet.unlockedAccessories.includes(acc.id);
                const isEquipped = pet.equippedAccessory === acc.id;

                return (
                  <div
                    key={acc.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isEquipped
                        ? 'bg-amber-500/20 border-amber-500/50'
                        : isUnlocked
                        ? 'bg-[#1b1538] border-[#312558]'
                        : 'bg-[#141029] border-[#251e44]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#231a48] text-lg flex items-center justify-center shrink-0">
                        {acc.icon}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-white text-xs block truncate">{acc.name}</span>
                        <span className="text-[10px] text-slate-400 block truncate">{acc.desc}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleBuyAccessory(acc)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 cursor-pointer transition-all ${
                        isEquipped
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : isUnlocked
                          ? 'bg-[#291e4c] text-amber-300 hover:bg-[#372863]'
                          : 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 hover:from-amber-400 shadow-md'
                      }`}
                    >
                      {isEquipped ? 'Dipakai' : isUnlocked ? 'Pakai' : `🪙 ${acc.price}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mascot Type Switcher */}
          <div className="bg-[#141126] border border-[#282148] rounded-3xl p-5 shadow-lg">
            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Crown className="w-4 h-4 text-purple-400" />
              <span>Ganti Spesies Maskot 3D</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {PET_TYPES.map((p) => {
                const isSelected = pet.petType === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleChangePetType(p.id, p.name)}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-br from-pink-500/20 to-purple-500/20 border-pink-500 shadow-md'
                        : 'bg-[#181333] border-[#2c224e] hover:border-[#3d2e68]'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{p.icon}</span>
                    <span className="text-xs font-bold text-white block truncate">{p.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
