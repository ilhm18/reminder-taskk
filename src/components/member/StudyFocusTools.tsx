import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Flame,
  Zap,
  VolumeX,
  Sparkles,
  Coffee,
  CheckCircle2,
  CloudRain,
  Radio,
  FileEdit,
  Save,
  Sliders,
  Plus,
  Minus,
  Settings2,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const StudyFocusTools: React.FC<{ onAskAIWithNotes?: (notes: string) => void }> = ({
  onAskAIWithNotes,
}) => {
  const { showToast } = useApp();

  // Custom Durations (in minutes)
  const [customFocusMins, setCustomFocusMins] = useState<number>(() => {
    return Number(localStorage.getItem('remindtask_custom_focus_mins') || '25');
  });
  const [customBreakMins, setCustomBreakMins] = useState<number>(() => {
    return Number(localStorage.getItem('remindtask_custom_break_mins') || '5');
  });

  // Pomodoro Timer States
  const [timerMode, setTimerMode] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');
  const [initialDuration, setInitialDuration] = useState<number>(() => customFocusMins * 60);
  const [timeLeft, setTimeLeft] = useState<number>(() => customFocusMins * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [manualInputMinutes, setManualInputMinutes] = useState<string>(customFocusMins.toString());

  const [completedSessions, setCompletedSessions] = useState(() => {
    return Number(localStorage.getItem('remindtask_pomodoro_sessions') || '0');
  });

  // Daily Streak & XP
  const [studyStreak] = useState(() => {
    return Number(localStorage.getItem('remindtask_study_streak') || '1');
  });
  const [studyXP, setStudyXP] = useState(() => {
    return Number(localStorage.getItem('remindtask_study_xp') || '150');
  });

  // Ambience Audio using Web Audio API
  const [activeAmbience, setActiveAmbience] = useState<'none' | 'rain' | 'whitenoise' | 'cafe'>('none');
  const audioContextRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioNode | null>(null);

  // Scratchpad Notes
  const [quickNote, setQuickNote] = useState(() => {
    return localStorage.getItem('remindtask_quick_scratchpad') || '';
  });

  // Simple Web Audio Beep
  const playSimpleBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {}
  };

  // Timer Tick with Background Persistence & Window Title Ticker
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isRunning) {
      const targetTime = Date.now() + timeLeft * 1000;
      localStorage.setItem('remindtask_focus_target_timestamp', targetTime.toString());

      interval = setInterval(() => {
        const now = Date.now();
        const storedTarget = Number(localStorage.getItem('remindtask_focus_target_timestamp') || targetTime);
        const remaining = Math.max(0, Math.round((storedTarget - now) / 1000));
        
        setTimeLeft(remaining);
        
        // Update document title for background window visibility
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        document.title = `(${formatted}) Zona Fokus Aktif - RemindTask`;

        if (remaining <= 0) {
          setIsRunning(false);
          document.title = 'RemindTask - Pengingat Tugas & Manajemen Kelas';
        }
      }, 1000);
    } else {
      document.title = 'RemindTask - Pengingat Tugas & Manajemen Kelas';
      localStorage.removeItem('remindtask_focus_target_timestamp');
    }

    // Sync on window visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning) {
        const storedTarget = Number(localStorage.getItem('remindtask_focus_target_timestamp') || 0);
        if (storedTarget > 0) {
          const remaining = Math.max(0, Math.round((storedTarget - Date.now()) / 1000));
          setTimeLeft(remaining);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (timeLeft === 0 && !isRunning) {
      playSimpleBeep();
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('RemindTask - Zona Fokus', {
            body: timerMode === 'focus' ? '🎉 Sesi fokus selesai! Waktunya rehat sejenak.' : '⏰ Waktu istirahat selesai! Siap untuk sesi fokus berikutnya?',
          });
        } catch {}
      }
      if (timerMode === 'focus') {
        const nextSessions = completedSessions + 1;
        setCompletedSessions(nextSessions);
        setStudyXP((prev) => prev + 50);
        localStorage.setItem('remindtask_pomodoro_sessions', nextSessions.toString());
        localStorage.setItem('remindtask_study_xp', (studyXP + 50).toString());
        showToast(`🎉 Sesi Fokus ${customFocusMins} menit selesai! Istirahat sejenak (+50 XP)`, 'success');
        setTimerMode('shortBreak');
        const nextSecs = customBreakMins * 60;
        setInitialDuration(nextSecs);
        setTimeLeft(nextSecs);
      } else {
        showToast('⏰ Waktu istirahat selesai! Siap untuk sesi fokus berikutnya? 🚀', 'info');
        setTimerMode('focus');
        const nextSecs = customFocusMins * 60;
        setInitialDuration(nextSecs);
        setTimeLeft(nextSecs);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.title = 'RemindTask - Pengingat Tugas & Manajemen Kelas';
    };
  }, [isRunning, timeLeft, timerMode, completedSessions, studyXP, customFocusMins, customBreakMins, showToast]);

  // Apply custom duration in minutes
  const applyCustomMinutes = (mins: number) => {
    const validMins = Math.max(1, Math.min(240, mins));
    setIsRunning(false);
    if (timerMode === 'focus') {
      setCustomFocusMins(validMins);
      localStorage.setItem('remindtask_custom_focus_mins', validMins.toString());
      setInitialDuration(validMins * 60);
      setTimeLeft(validMins * 60);
      showToast(`Durasi Sesi Fokus diubah menjadi ${validMins} menit.`, 'success');
    } else {
      setCustomBreakMins(validMins);
      localStorage.setItem('remindtask_custom_break_mins', validMins.toString());
      setInitialDuration(validMins * 60);
      setTimeLeft(validMins * 60);
      showToast(`Durasi Rehat diubah menjadi ${validMins} menit.`, 'success');
    }
    setShowCustomModal(false);
  };

  // Quick adjust step (+ / - minutes)
  const adjustMinutesStep = (deltaMinutes: number) => {
    const currentMins = Math.floor(timeLeft / 60);
    const newMins = Math.max(1, Math.min(240, currentMins + deltaMinutes));
    setIsRunning(false);
    const newSecs = newMins * 60;
    setInitialDuration(newSecs);
    setTimeLeft(newSecs);
    if (timerMode === 'focus') {
      setCustomFocusMins(newMins);
      localStorage.setItem('remindtask_custom_focus_mins', newMins.toString());
    } else {
      setCustomBreakMins(newMins);
      localStorage.setItem('remindtask_custom_break_mins', newMins.toString());
    }
  };

  // Mode Switch
  const switchMode = (mode: 'focus' | 'shortBreak' | 'longBreak') => {
    setIsRunning(false);
    setTimerMode(mode);
    let targetSecs = customFocusMins * 60;
    if (mode === 'shortBreak') targetSecs = customBreakMins * 60;
    if (mode === 'longBreak') targetSecs = 15 * 60;
    setInitialDuration(targetSecs);
    setTimeLeft(targetSecs);
    setManualInputMinutes(Math.floor(targetSecs / 60).toString());
  };

  const resetTimer = () => {
    setIsRunning(false);
    let targetSecs = customFocusMins * 60;
    if (timerMode === 'shortBreak') targetSecs = customBreakMins * 60;
    if (timerMode === 'longBreak') targetSecs = 15 * 60;
    setInitialDuration(targetSecs);
    setTimeLeft(targetSecs);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const stopAmbience = () => {
    if (noiseNodeRef.current) {
      try {
        (noiseNodeRef.current as any).stop?.();
      } catch {}
      noiseNodeRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    setActiveAmbience('none');
  };

  // Ambience Generator (Web Audio Synthetic Pink/Brown Noise)
  const toggleAmbience = (type: 'rain' | 'whitenoise' | 'cafe') => {
    if (activeAmbience === type) {
      stopAmbience();
      return;
    }

    stopAmbience();
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      if (type === 'rain') {
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = output[i];
          output[i] *= 2.5;
        }
      } else if (type === 'whitenoise') {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          output[i] *= 0.1;
          b6 = white * 0.115926;
        }
      } else {
        for (let i = 0; i < bufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * 0.08;
        }
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = type === 'rain' ? 'lowpass' : 'bandpass';
      filter.frequency.value = type === 'rain' ? 800 : 1200;

      const gain = ctx.createGain();
      gain.gain.value = 0.15;

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      whiteNoise.start(0);
      noiseNodeRef.current = whiteNoise;
      setActiveAmbience(type);
      showToast(`Suara latar ${type === 'rain' ? 'Hujan Rintik' : type === 'whitenoise' ? 'White Noise' : 'Kafe Santai'} aktif.`, 'info');
    } catch (e) {
      console.warn('Audio context error:', e);
    }
  };

  useEffect(() => {
    return () => {
      stopAmbience();
    };
  }, []);

  const saveQuickNote = () => {
    localStorage.setItem('remindtask_quick_scratchpad', quickNote);
    showToast('Catatan berhasil disimpan otomatis!', 'success');
  };

  const totalBaseSecs = initialDuration > 0 ? initialDuration : 25 * 60;
  const progressPercent = Math.min(100, Math.max(0, Math.round(((totalBaseSecs - timeLeft) / totalBaseSecs) * 100)));

  const focusPresets = [15, 25, 30, 45, 60, 90];
  const breakPresets = [5, 10, 15, 20];

  return (
    <div className="space-y-6">
      {/* GAMIFICATION & STREAK BANNER */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Streak */}
        <div className="p-4 rounded-3xl bg-[#141126] border border-[#272144] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                DAILY STUDY STREAK
              </span>
              <h4 className="text-xl font-extrabold text-white">{studyStreak} Hari 🔥</h4>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-semibold">Aktif Hari Ini</span>
        </div>

        {/* XP */}
        <div className="p-4 rounded-3xl bg-[#141126] border border-[#272144] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                PENGALAMAN (XP)
              </span>
              <h4 className="text-xl font-extrabold text-white">{studyXP} XP</h4>
            </div>
          </div>
          <span className="px-2 py-1 rounded-lg bg-purple-500/15 text-purple-300 text-[10px] font-bold">
            Level 2 Siswa
          </span>
        </div>

        {/* Completed Sessions */}
        <div className="p-4 rounded-3xl bg-[#141126] border border-[#272144] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                SESI FOKUS SELESAI
              </span>
              <h4 className="text-xl font-extrabold text-white">{completedSessions} Sesi</h4>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {completedSessions * customFocusMins} Menit
          </span>
        </div>
      </div>

      {/* MAIN TWO COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: POMODORO TIMER */}
        <div className="lg:col-span-7 bg-[#141126] border border-[#272144] p-6 sm:p-8 rounded-3xl flex flex-col justify-between items-center text-center shadow-xl relative">
          
          {/* Header & Modes */}
          <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div className="text-left">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-pink-400" />
                Pomodoro Focus Timer
              </h3>
              <p className="text-xs text-slate-400">
                Sesuaikan durasi fokus belajar &amp; istirahat sesuai ritme belajarmu
              </p>
            </div>
            
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#1b1533] border border-[#2d244f] self-start sm:self-auto">
              <button
                onClick={() => switchMode('focus')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  timerMode === 'focus'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Fokus ({customFocusMins}m)
              </button>
              <button
                onClick={() => switchMode('shortBreak')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  timerMode === 'shortBreak'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Rehat ({customBreakMins}m)
              </button>
            </div>
          </div>

          {/* QUICK PRESET CHIPS & MANUAL SETTING BUTTON */}
          <div className="w-full flex flex-wrap items-center justify-center gap-2 mb-4">
            <span className="text-[11px] font-bold text-slate-400 mr-1">Pilihan Durasi:</span>
            {(timerMode === 'focus' ? focusPresets : breakPresets).map((preset) => {
              const currentMinutes = Math.floor(timeLeft / 60);
              const isSelected = currentMinutes === preset && !isRunning;
              return (
                <button
                  key={preset}
                  onClick={() => applyCustomMinutes(preset)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-pink-500 text-white border-pink-400 shadow-sm shadow-pink-500/30 scale-105'
                      : 'bg-[#1b1536] text-slate-300 border-[#2f2454] hover:bg-[#271e4d] hover:text-white'
                  }`}
                >
                  {preset}m
                </button>
              );
            })}

            <button
              onClick={() => {
                setManualInputMinutes(Math.floor(timeLeft / 60).toString());
                setShowCustomModal(true);
              }}
              className="px-2.5 py-1 rounded-xl text-xs font-bold bg-[#221844] hover:bg-[#302260] text-pink-300 hover:text-white border border-pink-500/30 flex items-center gap-1 transition-colors cursor-pointer"
              title="Atur Waktu Kustom"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Atur Manual</span>
            </button>
          </div>

          {/* CIRCULAR TIMER DISPLAY WITH DIRECT STEPPERS */}
          <div className="my-3 relative flex items-center justify-center gap-3 sm:gap-6">
            {/* Quick Minus 5m Button */}
            <button
              onClick={() => adjustMinutesStep(-5)}
              disabled={timeLeft <= 300}
              className="p-2.5 sm:p-3 rounded-2xl bg-[#1b1536] hover:bg-[#281f50] text-slate-300 hover:text-white border border-[#302456] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-md"
              title="Kurang 5 Menit"
            >
              <Minus className="w-4 h-4" />
            </button>

            <div className="relative flex items-center justify-center">
              {/* Ambient pulse effect when running */}
              {isRunning && (
                <div className="absolute inset-0 rounded-full bg-pink-500/10 blur-xl animate-pulse" />
              )}
              
              <div
                onClick={() => {
                  setManualInputMinutes(Math.floor(timeLeft / 60).toString());
                  setShowCustomModal(true);
                }}
                className="w-56 h-56 sm:w-64 sm:h-64 rounded-full border-4 border-[#241c40] hover:border-pink-500/50 flex flex-col items-center justify-center bg-[#100d20] shadow-inner relative z-10 cursor-pointer group transition-all"
                title="Klik untuk ubah waktu secara manual"
              >
                <span className="text-5xl sm:text-6xl font-mono font-black tracking-tight text-white group-hover:text-pink-300 transition-colors">
                  {formatTime(timeLeft)}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-pink-400 mt-2 flex items-center gap-1">
                  <span>{timerMode === 'focus' ? '🎯 Sesi Belajar Fokus' : '☕ Waktu Rehat Santai'}</span>
                </span>
                <span className="text-[9px] text-slate-500 group-hover:text-slate-300 mt-0.5 font-medium transition-colors">
                  (Klik untuk atur menit)
                </span>
                
                <div className="w-32 bg-[#1b1533] h-1.5 rounded-full overflow-hidden mt-2 border border-[#2b2150]">
                  <div
                    className="bg-gradient-to-r from-pink-500 to-purple-500 h-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Plus 5m Button */}
            <button
              onClick={() => adjustMinutesStep(5)}
              disabled={timeLeft >= 240 * 60}
              className="p-2.5 sm:p-3 rounded-2xl bg-[#1b1536] hover:bg-[#281f50] text-slate-300 hover:text-white border border-[#302456] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-md"
              title="Tambah 5 Menit"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* MAIN PLAY / PAUSE / RESET CONTROLS */}
          <div className="flex items-center gap-3 sm:gap-4 mt-4">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`px-8 sm:px-10 py-3.5 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-900 shadow-amber-500/20 scale-105'
                  : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white shadow-pink-500/25 hover:scale-105'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5" />
                  <span>Jeda Sementara</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>Mulai Belajar Sekarang</span>
                </>
              )}
            </button>
            <button
              onClick={resetTimer}
              className="p-3.5 rounded-2xl bg-[#1b1533] hover:bg-[#251e47] border border-[#2d244f] text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Reset Waktu Semula"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* RIGHT: AMBIENCE & SCRATCHPAD */}
        <div className="lg:col-span-5 space-y-6">
          {/* AMBIENCE SOUNDSCAPES */}
          <div className="bg-[#141126] border border-[#272144] p-5 rounded-3xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-purple-400" />
                Suara Latar Penenang (Ambience)
              </h4>
              {activeAmbience !== 'none' && (
                <button
                  onClick={stopAmbience}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Matikan</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                onClick={() => toggleAmbience('rain')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  activeAmbience === 'rain'
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                    : 'bg-[#18132f] border-[#292048] text-slate-400 hover:text-white hover:bg-[#20193e]'
                }`}
              >
                <CloudRain className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                <span className="text-[11px] font-bold block">Hujan</span>
              </button>

              <button
                onClick={() => toggleAmbience('whitenoise')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  activeAmbience === 'whitenoise'
                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                    : 'bg-[#18132f] border-[#292048] text-slate-400 hover:text-white hover:bg-[#20193e]'
                }`}
              >
                <Sparkles className="w-5 h-5 mx-auto mb-1 text-purple-400" />
                <span className="text-[11px] font-bold block">White Noise</span>
              </button>

              <button
                onClick={() => toggleAmbience('cafe')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  activeAmbience === 'cafe'
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-[#18132f] border-[#292048] text-slate-400 hover:text-white hover:bg-[#20193e]'
                }`}
              >
                <Coffee className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                <span className="text-[11px] font-bold block">Kafe Santai</span>
              </button>
            </div>
          </div>

          {/* QUICK SCRATCHPAD NOTES */}
          <div className="bg-[#141126] border border-[#272144] p-5 rounded-3xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <FileEdit className="w-4 h-4 text-pink-400" />
                Coretan Cepat (Scratchpad)
              </h4>
              <button
                onClick={saveQuickNote}
                className="px-2.5 py-1 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 text-xs font-bold flex items-center gap-1 border border-pink-500/30 transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan</span>
              </button>
            </div>

            <textarea
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              placeholder="Tulis ide cepat, rumus penting, atau ringkasan materi saat belajar..."
              rows={5}
              className="w-full p-3.5 rounded-2xl bg-[#110d22] border border-[#292048] text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-pink-500/60 resize-none"
            />

            {onAskAIWithNotes && quickNote.trim() && (
              <button
                onClick={() => onAskAIWithNotes(quickNote)}
                className="mt-3 w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-purple-500/20 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Bahas Catatan Ini dengan AI Assistant</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MODAL / POPUP ATUR DURASI MANUAL */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#17122e] border border-[#36295c] rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-pink-400" />
                <span>Atur Waktu {timerMode === 'focus' ? 'Fokus' : 'Rehat'}</span>
              </h3>
              <button
                onClick={() => setShowCustomModal(false)}
                className="p-1.5 rounded-xl bg-[#221844] text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4">
              Masukkan durasi waktu yang Anda inginkan (1 hingga 240 menit):
            </p>

            <div className="flex items-center gap-3 mb-5">
              <input
                type="number"
                min="1"
                max="240"
                value={manualInputMinutes}
                onChange={(e) => setManualInputMinutes(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    applyCustomMinutes(Number(manualInputMinutes) || 25);
                  }
                }}
                autoFocus
                className="flex-1 px-4 py-3 rounded-2xl bg-[#0f0b20] border border-[#3b2c66] text-white font-mono font-black text-2xl text-center focus:outline-hidden focus:border-pink-500"
              />
              <span className="text-sm font-bold text-slate-400">Menit</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="w-full py-2.5 rounded-xl bg-[#221844] hover:bg-[#2e215c] text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => applyCustomMinutes(Number(manualInputMinutes) || 25)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-pink-500/25 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Terapkan Waktu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
