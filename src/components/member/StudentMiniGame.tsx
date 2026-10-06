import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Trophy,
  Flame,
  RotateCcw,
  Zap,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Timer,
  Award,
  Gamepad2,
  Brain,
  Layers,
  ChevronRight,
  Target,
  ArrowRight,
  BookOpen,
  Shuffle,
  Lightbulb,
  Calculator,
  Compass,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

// Sound effects generator for mini-game
function playMiniGameSound(type: 'correct' | 'wrong' | 'win' | 'click' | 'flip') {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'correct') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'wrong') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(130, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'win') {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.3);
      });
    } else if (type === 'flip' || type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    }
  } catch {}
}

interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  category: string;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    category: 'Matematika Kilat',
    question: 'Berapakah nilai dari (15 × 4) - (30 ÷ 2)?',
    options: ['45', '50', '55', '60'],
    answer: 0,
    explanation: '15 × 4 = 60; 30 ÷ 2 = 15; 60 - 15 = 45.',
  },
  {
    category: 'Sains & Alam',
    question: 'Organel sel yang berfungsi sebagai "pembangkit tenaga" penghasil energi ATP adalah...',
    options: ['Ribosom', 'Mitokondria', 'Kloroplas', 'Badan Golgi'],
    answer: 1,
    explanation: 'Mitokondria adalah respirasi seluler penghasil energi utama (ATP).',
  },
  {
    category: 'Logika Pemrograman',
    question: 'Jika x = 5 dan y = 3, apa hasil dari logika boolean (x > 3 && y < 2)?',
    options: ['true', 'false', 'undefined', 'null'],
    answer: 1,
    explanation: 'x > 3 bernilai true, namun y < 2 bernilai false. Karena operator AND (&&), hasilnya false.',
  },
  {
    category: 'Fisika Dasar',
    question: 'Satuan internasional (SI) untuk mengukur gaya adalah...',
    options: ['Joule', 'Watt', 'Newton', 'Pascal'],
    answer: 2,
    explanation: 'Gaya diukur dalam satuan Newton (N = kg·m/s²).',
  },
  {
    category: 'Pengetahuan Umum',
    question: 'Bulan apa yang memiliki 28 atau 29 hari?',
    options: ['Januari', 'Februari', 'Maret', 'April'],
    answer: 1,
    explanation: 'Februari memiliki 28 hari pada tahun biasa dan 29 hari pada tahun kabisat.',
  },
  {
    category: 'Matematika Aljabar',
    question: 'Jika 3x + 9 = 24, maka nilai x adalah...',
    options: ['3', '5', '7', '9'],
    answer: 1,
    explanation: '3x = 24 - 9 = 15; x = 15 / 3 = 5.',
  },
  {
    category: 'Teknologi & Web',
    question: 'Protokol internet yang digunakan untuk transfer data web yang aman dan terenkripsi adalah...',
    options: ['FTP', 'HTTP', 'HTTPS', 'SMTP'],
    answer: 2,
    explanation: 'HTTPS (Hypertext Transfer Protocol Secure) menggunakan enkripsi SSL/TLS.',
  },
  {
    category: 'Kimia Ceria',
    question: 'Rumus molekul dari gas Oksigen yang kita hirup setiap hari adalah...',
    options: ['O', 'O2', 'O3', 'CO2'],
    answer: 1,
    explanation: 'Gas oksigen bebas di atmosfer berbentuk diatomik (O2).',
  },
  {
    category: 'Matematika Kilat',
    question: 'Berapakah 25% dari 240?',
    options: ['50', '60', '70', '80'],
    answer: 1,
    explanation: '25% = 1/4; 240 / 4 = 60.',
  },
  {
    category: 'Logika Cepat',
    question: 'Sebuah kereta listrik bergerak ke arah utara dengan kecepatan 100 km/jam. Ke arah manakah asapnya berhembus?',
    options: ['Selatan', 'Utara', 'Timur', 'Tidak ada asap'],
    answer: 3,
    explanation: 'Kereta listrik tidak menghasilkan asap!',
  },
];

const MEMORY_ICONS = ['🧠', '⚡', '🚀', '🔥', '💎', '🎯'];

interface WordScrambleItem {
  word: string;
  hint: string;
  category: string;
}

const WORD_SCRAMBLE_ITEMS: WordScrambleItem[] = [
  { word: 'ALGORITMA', hint: 'Langkah terstruktur logis untuk menyelesaikan masalah sistematis', category: 'Informatika' },
  { word: 'FOTOSINTESIS', hint: 'Proses tumbuhan hijau memasak makanan menggunakan sinar matahari', category: 'Biologi' },
  { word: 'GRAVITASI', hint: 'Gaya tarik bumi yang membuat semua benda jatuh ke bawah', category: 'Fisika' },
  { word: 'PYTHAGORAS', hint: 'Teorema segitiga siku-siku kuadrat sisi miring a² + b² = c²', category: 'Matematika' },
  { word: 'DEMOKRASI', hint: 'Sistem pemerintahan dari rakyat, oleh rakyat, dan untuk rakyat', category: 'PPKN' },
  { word: 'EKOSISTEM', hint: 'Hubungan timbal balik antara makhluk hidup dengan lingkungannya', category: 'Biologi' },
];

interface LogicRiddleItem {
  question: string;
  options: string[];
  answer: number;
  hint: string;
  explanation: string;
}

const LOGIC_RIDDLES: LogicRiddleItem[] = [
  {
    question: 'Aku punya kota tanpa rumah, hutan tanpa pohon, dan sungai tanpa air. Apakah aku?',
    options: ['Peta', 'Lukisan', 'Mimpi', 'Kaca'],
    answer: 0,
    hint: 'Biasa dibuka saat mencari jalan atau tempat di bumi.',
    explanation: 'Peta menampilkan representasi kota, hutan, dan sungai secara geografis tanpa wujud fisik sebenarnya.',
  },
  {
    question: 'Semakin banyak kamu mengambil dariku, semakin besar aku menjadi. Apakah aku?',
    options: ['Lubang', 'Waktu', 'Bayangan', 'Rahasia'],
    answer: 0,
    hint: 'Kamu menggalinya di tanah.',
    explanation: 'Semakin banyak tanah yang kamu ambil, lubang tersebut akan semakin membesar.',
  },
  {
    question: 'Aku bisa terbang tanpa sayap dan menangis tanpa mata. Kegelapan mengikutiku ke mana pun aku pergi. Apakah aku?',
    options: ['Awan Mendung', 'Angin', 'Bayangan', 'Malam'],
    answer: 0,
    hint: 'Melayang di langit membawa hujan.',
    explanation: 'Awan mendung melayang di angkasa dan menjatuhkan butiran air hujan.',
  },
  {
    question: 'Jika ada 3 buah apel dan kamu mengambil 2 buah, berapa banyak apel yang kamu miliki?',
    options: ['2 buah', '1 buah', '3 buah', '0 buah'],
    answer: 0,
    hint: 'Perhatikan kata: "kamu mengambil".',
    explanation: 'Kamu mengambil 2 buah apel, jadi kamu memiliki 2 buah apel di tanganmu.',
  },
];

export const StudentMiniGame: React.FC = () => {
  const { showToast, currentUser } = useApp();
  const [activeGame, setActiveGame] = useState<'quiz' | 'word' | 'memory' | 'reflex' | 'math' | 'riddle'>('quiz');

  // Overall player gamification stats
  const storageKey = `remindtask_game_stats_${currentUser?.id || 'guest'}`;
  const [stats, setStats] = useState<{
    highScoreQuiz: number;
    bestMemoryMoves: number;
    wordsCompleted: number;
    bestReflexScore: number;
    bestMathScore: number;
    riddlesSolved: number;
    totalXp: number;
    streak: number;
  }>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      highScoreQuiz: 0,
      bestMemoryMoves: 0,
      wordsCompleted: 0,
      bestReflexScore: 0,
      bestMathScore: 0,
      riddlesSolved: 0,
      totalXp: 120,
      streak: 1,
    };
  });

  const saveStats = (newStats: typeof stats) => {
    setStats(newStats);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newStats));
    } catch {}
  };

  // ==========================================
  // GAME 1: SPEED QUIZ (WAKTU 20 DETIK - REQUEST 4)
  // ==========================================
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizStreak, setQuizStreak] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [quizGameOver, setQuizGameOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20); // 20 DETIK
  const timerRef = useRef<any>(null);

  const currentQ = QUIZ_QUESTIONS[quizIndex % QUIZ_QUESTIONS.length];

  useEffect(() => {
    if (activeGame !== 'quiz' || isAnswered || quizGameOver) return;
    setTimeLeft(20); // Reset to 20 seconds for each question

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAnswer(-1); // Timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [quizIndex, activeGame, isAnswered, quizGameOver]);

  const handleAnswer = (optionIdx: number) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedOption(optionIdx);
    clearInterval(timerRef.current);

    const isCorrect = optionIdx === currentQ.answer;

    if (isCorrect) {
      playMiniGameSound('correct');
      const bonus = (quizStreak + 1) * 20;
      const addedScore = 100 + bonus + timeLeft * 5;
      const newScore = quizScore + addedScore;
      const newStreak = quizStreak + 1;
      setQuizScore(newScore);
      setQuizStreak(newStreak);

      const newTotalXp = stats.totalXp + addedScore;
      const newHigh = Math.max(stats.highScoreQuiz, newScore);
      saveStats({
        ...stats,
        highScoreQuiz: newHigh,
        totalXp: newTotalXp,
        streak: Math.max(stats.streak, newStreak),
      });
    } else {
      playMiniGameSound('wrong');
      setQuizStreak(0);
    }
  };

  const handleNextQuestion = () => {
    if (quizIndex + 1 >= QUIZ_QUESTIONS.length) {
      setQuizGameOver(true);
      playMiniGameSound('win');
      showToast(`Kuis Selesai! Skor Akhir: ${quizScore} Poin! 🏆`, 'success');
    } else {
      setQuizIndex((prev) => prev + 1);
      setIsAnswered(false);
      setSelectedOption(null);
    }
  };

  const restartQuiz = () => {
    setQuizIndex(0);
    setQuizScore(0);
    setQuizStreak(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setQuizGameOver(false);
    setTimeLeft(20);
  };

  // ==========================================
  // GAME 2: MEMORY MATCH
  // ==========================================
  const generateCards = () => {
    const deck = [...MEMORY_ICONS, ...MEMORY_ICONS]
      .sort(() => Math.random() - 0.5)
      .map((icon, id) => ({ id, icon, matched: false }));
    return deck;
  };

  const [memoryCards, setMemoryCards] = useState(generateCards);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [memoryMoves, setMemoryMoves] = useState(0);
  const [memoryWin, setMemoryWin] = useState(false);

  const handleFlipCard = (index: number) => {
    if (flippedCards.length >= 2 || flippedCards.includes(index) || memoryCards[index].matched) return;
    playMiniGameSound('flip');
    const newFlipped = [...flippedCards, index];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMemoryMoves((m) => m + 1);
      const [firstIdx, secondIdx] = newFlipped;
      if (memoryCards[firstIdx].icon === memoryCards[secondIdx].icon) {
        // Matched
        setTimeout(() => {
          playMiniGameSound('correct');
          setMemoryCards((prev) =>
            prev.map((c, i) => (i === firstIdx || i === secondIdx ? { ...c, matched: true } : c))
          );
          setFlippedCards([]);
        }, 400);
      } else {
        // Not matched
        setTimeout(() => {
          setFlippedCards([]);
        }, 900);
      }
    }
  };

  useEffect(() => {
    if (memoryCards.every((c) => c.matched) && memoryCards.length > 0) {
      setMemoryWin(true);
      playMiniGameSound('win');
      const best = stats.bestMemoryMoves === 0 ? memoryMoves : Math.min(stats.bestMemoryMoves, memoryMoves);
      saveStats({
        ...stats,
        bestMemoryMoves: best,
        totalXp: stats.totalXp + 250,
      });
    }
  }, [memoryCards]);

  const restartMemory = () => {
    setMemoryCards(generateCards());
    setFlippedCards([]);
    setMemoryMoves(0);
    setMemoryWin(false);
  };

  // ==========================================
  // GAME 3: WORD SCRAMBLE
  // ==========================================
  const [wordIndex, setWordIndex] = useState(0);
  const currentWordItem = WORD_SCRAMBLE_ITEMS[wordIndex % WORD_SCRAMBLE_ITEMS.length];

  const shuffleWord = (word: string) => {
    const letters = word.split('');
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    if (letters.join('') === word && word.length > 3) {
      [letters[0], letters[letters.length - 1]] = [letters[letters.length - 1], letters[0]];
    }
    return letters.map((char, id) => ({ id, char, used: false }));
  };

  const [availableLetters, setAvailableLetters] = useState(() => shuffleWord(currentWordItem.word));
  const [selectedWordLetters, setSelectedWordLetters] = useState<Array<{ id: number; char: string }>>([]);
  const [wordSolved, setWordSolved] = useState(false);
  const [wordError, setWordError] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    setAvailableLetters(shuffleWord(currentWordItem.word));
    setSelectedWordLetters([]);
    setWordSolved(false);
    setWordError(false);
    setShowHint(false);
  }, [wordIndex]);

  const handlePickLetter = (item: { id: number; char: string; used: boolean }) => {
    if (item.used || wordSolved) return;
    playMiniGameSound('click');
    setAvailableLetters((prev) => prev.map((l) => (l.id === item.id ? { ...l, used: true } : l)));
    const updated = [...selectedWordLetters, { id: item.id, char: item.char }];
    setSelectedWordLetters(updated);

    if (updated.length === currentWordItem.word.length) {
      const spelled = updated.map((u) => u.char).join('');
      if (spelled === currentWordItem.word) {
        playMiniGameSound('win');
        setWordSolved(true);
        setWordError(false);
        saveStats({
          ...stats,
          wordsCompleted: stats.wordsCompleted + 1,
          totalXp: stats.totalXp + 150,
        });
      } else {
        playMiniGameSound('wrong');
        setWordError(true);
        setTimeout(() => setWordError(false), 800);
      }
    }
  };

  const handleRemoveLetter = (indexToRemove: number) => {
    if (wordSolved) return;
    playMiniGameSound('click');
    const removed = selectedWordLetters[indexToRemove];
    setSelectedWordLetters((prev) => prev.filter((_, i) => i !== indexToRemove));
    setAvailableLetters((prev) => prev.map((l) => (l.id === removed.id ? { ...l, used: false } : l)));
  };

  const handleResetWord = () => {
    setSelectedWordLetters([]);
    setAvailableLetters((prev) => prev.map((l) => ({ ...l, used: false })));
    setWordSolved(false);
    setWordError(false);
  };

  const handleNextWord = () => {
    setWordIndex((prev) => prev + 1);
  };

  // ==========================================
  // GAME 4: REFLEX SPEED TAP
  // ==========================================
  const [reflexActive, setReflexActive] = useState(false);
  const [reflexScore, setReflexScore] = useState(0);
  const [reflexTime, setReflexTime] = useState(25);
  const [targetPosition, setTargetPosition] = useState<{ top: number; left: number }>({ top: 40, left: 50 });
  const reflexTimerRef = useRef<any>(null);

  const startReflexGame = () => {
    setReflexActive(true);
    setReflexScore(0);
    setReflexTime(25);
    moveTarget();

    reflexTimerRef.current = setInterval(() => {
      setReflexTime((t) => {
        if (t <= 1) {
          clearInterval(reflexTimerRef.current);
          setReflexActive(false);
          playMiniGameSound('win');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const moveTarget = () => {
    const top = Math.floor(Math.random() * 70) + 15;
    const left = Math.floor(Math.random() * 75) + 12;
    setTargetPosition({ top, left });
  };

  const handleTargetClick = () => {
    if (!reflexActive) return;
    playMiniGameSound('correct');
    const newScore = reflexScore + 1;
    setReflexScore(newScore);
    moveTarget();

    const bestReflex = Math.max(stats.bestReflexScore, newScore);
    saveStats({
      ...stats,
      bestReflexScore: bestReflex,
      totalXp: stats.totalXp + 15,
    });
  };

  // ==========================================
  // GAME 5: MATH SPRINT TURBO (FITUR BARU)
  // ==========================================
  const [mathProblem, setMathProblem] = useState<{ q: string; a: number; options: number[] }>({
    q: '12 + 15',
    a: 27,
    options: [25, 27, 29, 31],
  });
  const [mathActive, setMathActive] = useState(false);
  const [mathScore, setMathScore] = useState(0);
  const [mathTime, setMathTime] = useState(30);
  const mathTimerRef = useRef<any>(null);

  const generateMathProblem = () => {
    const ops = ['+', '-', '×'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let n1 = 0;
    let n2 = 0;
    let ans = 0;

    if (op === '+') {
      n1 = Math.floor(Math.random() * 50) + 5;
      n2 = Math.floor(Math.random() * 50) + 5;
      ans = n1 + n2;
    } else if (op === '-') {
      n1 = Math.floor(Math.random() * 60) + 20;
      n2 = Math.floor(Math.random() * n1) + 1;
      ans = n1 - n2;
    } else {
      n1 = Math.floor(Math.random() * 12) + 2;
      n2 = Math.floor(Math.random() * 12) + 2;
      ans = n1 * n2;
    }

    const distractors = new Set<number>([ans]);
    while (distractors.size < 4) {
      const offset = (Math.floor(Math.random() * 7) + 1) * (Math.random() > 0.5 ? 1 : -1);
      const val = ans + offset;
      if (val >= 0) distractors.add(val);
    }

    const shuffledOpts = Array.from(distractors).sort(() => Math.random() - 0.5);
    setMathProblem({ q: `${n1} ${op} ${n2}`, a: ans, options: shuffledOpts });
  };

  const startMathSprint = () => {
    setMathActive(true);
    setMathScore(0);
    setMathTime(30);
    generateMathProblem();

    mathTimerRef.current = setInterval(() => {
      setMathTime((t) => {
        if (t <= 1) {
          clearInterval(mathTimerRef.current);
          setMathActive(false);
          playMiniGameSound('win');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const handleMathOption = (selectedVal: number) => {
    if (!mathActive) return;
    if (selectedVal === mathProblem.a) {
      playMiniGameSound('correct');
      const newScore = mathScore + 10;
      setMathScore(newScore);
      const best = Math.max(stats.bestMathScore, newScore);
      saveStats({
        ...stats,
        bestMathScore: best,
        totalXp: stats.totalXp + 20,
      });
      generateMathProblem();
    } else {
      playMiniGameSound('wrong');
      generateMathProblem();
    }
  };

  // ==========================================
  // GAME 6: LOGIC RIDDLES (FITUR BARU)
  // ==========================================
  const [riddleIndex, setRiddleIndex] = useState(0);
  const [riddleAnswered, setRiddleAnswered] = useState(false);
  const [riddleSelected, setRiddleSelected] = useState<number | null>(null);
  const [riddleShowHint, setRiddleShowHint] = useState(false);

  const currentRiddle = LOGIC_RIDDLES[riddleIndex % LOGIC_RIDDLES.length];

  const handleRiddleAnswer = (idx: number) => {
    if (riddleAnswered) return;
    setRiddleAnswered(true);
    setRiddleSelected(idx);

    if (idx === currentRiddle.answer) {
      playMiniGameSound('win');
      saveStats({
        ...stats,
        riddlesSolved: stats.riddlesSolved + 1,
        totalXp: stats.totalXp + 100,
      });
    } else {
      playMiniGameSound('wrong');
    }
  };

  const handleNextRiddle = () => {
    setRiddleIndex((r) => r + 1);
    setRiddleAnswered(false);
    setRiddleSelected(null);
    setRiddleShowHint(false);
  };

  const getRankTitle = (xp: number) => {
    if (xp >= 3000) return { title: 'Genius RemindTask', color: 'text-amber-400', badge: '👑 S-Rank' };
    if (xp >= 1500) return { title: 'Master Logika', color: 'text-purple-400', badge: '⭐ A-Rank' };
    if (xp >= 600) return { title: 'Pejuang Tugas', color: 'text-pink-400', badge: '🔥 B-Rank' };
    return { title: 'Pemula Belajar', color: 'text-emerald-400', badge: '🌱 C-Rank' };
  };

  const rank = getRankTitle(stats.totalXp);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#231745] via-[#1a1233] to-[#120f26] border border-[#3b2d6a] p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-pink-500/15 via-purple-500/15 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5 shadow-lg shadow-pink-500/25 flex items-center justify-center text-white shrink-0">
              <Gamepad2 className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold text-[10px] uppercase tracking-wider border border-pink-500/30">
                  Zona Refreshing Siswa
                </span>
                <span className={`text-xs font-bold ${rank.color}`}>{rank.badge}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Arena Game &amp; Asah Otak
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Istirahat sejenak sambil melatih kecepatan berpikir, logika, dan memori fokus!
              </p>
            </div>
          </div>

          {/* Player Stats */}
          <div className="flex items-center gap-3 w-full md:w-auto bg-[#141029]/80 p-3 rounded-2xl border border-[#2b224d]">
            <div className="text-center px-3 border-r border-[#261f42]">
              <span className="text-[10px] text-slate-400 block font-bold">TOTAL XP</span>
              <span className="text-sm sm:text-base font-black text-amber-400">{stats.totalXp} XP</span>
            </div>
            <div className="text-center px-3 border-r border-[#261f42]">
              <span className="text-[10px] text-slate-400 block font-bold">MAX STREAK</span>
              <span className="text-sm sm:text-base font-black text-pink-400 flex items-center justify-center gap-0.5">
                <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                {stats.streak}x
              </span>
            </div>
            <div className="text-center px-3">
              <span className="text-[10px] text-slate-400 block font-bold">GELAR</span>
              <span className={`text-xs sm:text-sm font-black ${rank.color}`}>{rank.title}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Game Mode Selector - 6 Exciting Games */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-1.5 bg-[#141029] border border-[#271f49] rounded-2xl">
        <button
          onClick={() => setActiveGame('quiz')}
          className={`py-3 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeGame === 'quiz'
              ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25'
              : 'text-slate-300 hover:text-white hover:bg-[#1d1738]'
          }`}
        >
          <Brain className="w-4 h-4 text-pink-300" />
          <span>Kuis Kilat (20s)</span>
        </button>

        <button
          onClick={() => setActiveGame('math')}
          className={`py-3 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeGame === 'math'
              ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25'
              : 'text-slate-300 hover:text-white hover:bg-[#1d1738]'
          }`}
        >
          <Calculator className="w-4 h-4 text-amber-300" />
          <span>Math Sprint</span>
        </button>

        <button
          onClick={() => setActiveGame('riddle')}
          className={`py-3 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeGame === 'riddle'
              ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25'
              : 'text-slate-300 hover:text-white hover:bg-[#1d1738]'
          }`}
        >
          <Compass className="w-4 h-4 text-emerald-300" />
          <span>Teka-Teki Nalar</span>
        </button>

        <button
          onClick={() => setActiveGame('word')}
          className={`py-3 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeGame === 'word'
              ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25'
              : 'text-slate-300 hover:text-white hover:bg-[#1d1738]'
          }`}
        >
          <BookOpen className="w-4 h-4 text-cyan-300" />
          <span>Susun Kata</span>
        </button>

        <button
          onClick={() => setActiveGame('memory')}
          className={`py-3 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeGame === 'memory'
              ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25'
              : 'text-slate-300 hover:text-white hover:bg-[#1d1738]'
          }`}
        >
          <Layers className="w-4 h-4 text-purple-300" />
          <span>Memory Match</span>
        </button>

        <button
          onClick={() => setActiveGame('reflex')}
          className={`py-3 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeGame === 'reflex'
              ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25'
              : 'text-slate-300 hover:text-white hover:bg-[#1d1738]'
          }`}
        >
          <Target className="w-4 h-4 text-rose-300" />
          <span>Reflex Tap</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. SPEED QUIZ GAME VIEW (20 DETIK) */}
      {/* ========================================================================= */}
      {activeGame === 'quiz' && (
        <div className="bg-[#141029] border border-[#2b224d] rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
          {!quizGameOver ? (
            <div>
              {/* Quiz Header Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-[#251e44] mb-6">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold">
                    {currentQ.category}
                  </span>
                  <span className="text-xs text-slate-400">
                    Soal {quizIndex + 1} dari {QUIZ_QUESTIONS.length}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {quizStreak > 0 && (
                    <div className="flex items-center gap-1 text-xs font-black text-orange-400 bg-orange-500/15 border border-orange-500/30 px-2.5 py-1 rounded-xl animate-pulse">
                      <Flame className="w-3.5 h-3.5 fill-orange-400" />
                      <span>{quizStreak}x Combo!</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#1d163a] border border-[#32255e] text-xs font-mono font-bold text-amber-300">
                    <Timer className="w-3.5 h-3.5 text-amber-400" />
                    <span>{timeLeft}s</span>
                  </div>

                  <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-bold">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>{quizScore} Pts</span>
                  </div>
                </div>
              </div>

              {/* Question Box */}
              <div className="mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
                  {currentQ.question}
                </h3>
              </div>

              {/* 4 Answer Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
                {currentQ.options.map((opt, idx) => {
                  let btnStyle = 'bg-[#1a1436] hover:bg-[#251d4d] border-[#2e2358] text-slate-200';

                  if (isAnswered) {
                    if (idx === currentQ.answer) {
                      btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-lg shadow-emerald-500/20';
                    } else if (idx === selectedOption) {
                      btnStyle = 'bg-red-500/20 border-red-500 text-red-300 font-bold';
                    } else {
                      btnStyle = 'bg-[#141029]/50 border-[#221a3b] text-slate-500 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(idx)}
                      disabled={isAnswered}
                      className={`p-4 rounded-2xl border text-left text-sm font-semibold transition-all flex items-center justify-between cursor-pointer disabled:cursor-default ${btnStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-xl bg-[#110e22] flex items-center justify-center text-xs font-bold text-slate-400 border border-[#2d2250]">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{opt}</span>
                      </div>
                      {isAnswered && idx === currentQ.answer && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      )}
                      {isAnswered && idx === selectedOption && idx !== currentQ.answer && (
                        <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation & Next */}
              {isAnswered && (
                <div className="p-4 rounded-2xl bg-[#181333] border border-[#2e2358] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-150">
                  <div className="text-xs text-slate-300">
                    <span className="font-bold text-pink-400 block mb-0.5">Penjelasan Singkat:</span>
                    <span>{currentQ.explanation}</span>
                  </div>
                  <button
                    onClick={handleNextQuestion}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25 transition-all cursor-pointer active:scale-95 shrink-0"
                  >
                    <span>Lanjut Soal Berikutnya</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 max-w-md mx-auto animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 p-1 mx-auto mb-5 shadow-xl shadow-pink-500/25 flex items-center justify-center">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-black text-white">Luar Biasa! Kuis Selesai</h3>
              <p className="text-sm text-slate-300 mt-1">Kamu berhasil menuntaskan seluruh tantangan soal!</p>

              <div className="my-6 p-4 rounded-2xl bg-[#181333] border border-[#2e2358] grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-400 block">Skor Kamu</span>
                  <span className="text-2xl font-black text-pink-400">{quizScore}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Rekor Tertinggi</span>
                  <span className="text-2xl font-black text-amber-400">{stats.highScoreQuiz}</span>
                </div>
              </div>

              <button
                onClick={restartQuiz}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-sm shadow-lg shadow-pink-500/25 transition-all cursor-pointer"
              >
                Main Lagi Dari Awal
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MATH SPRINT TURBO */}
      {/* ========================================================================= */}
      {activeGame === 'math' && (
        <div className="bg-[#141029] border border-[#2b224d] rounded-3xl p-6 sm:p-8 shadow-xl">
          {!mathActive ? (
            <div className="text-center py-10 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 mx-auto mb-4">
                <Calculator className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">Math Sprint Turbo</h3>
              <p className="text-xs text-slate-300 mt-2">
                Uji kecepatan mental berhitungmu dalam 30 detik! Pilih jawaban yang benar secepat mungkin.
              </p>
              <div className="my-4 text-xs font-mono text-amber-400 font-bold">
                Rekor Skor: {stats.bestMathScore} Poin
              </div>
              <button
                onClick={startMathSprint}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-600 text-white font-bold text-sm shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
              >
                Mulai Tantangan Hitung (30s)
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#251e44] mb-8">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-bold">
                    Hitung Cepat
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#1d163a] border border-[#32255e] text-xs font-mono font-bold text-amber-300">
                    <Timer className="w-3.5 h-3.5" />
                    <span>{mathTime}s</span>
                  </div>
                  <div className="px-3.5 py-1 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-bold">
                    Skor: {mathScore}
                  </div>
                </div>
              </div>

              <div className="text-center py-6">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-2">Berapa hasil dari:</span>
                <div className="text-4xl sm:text-5xl font-black text-white font-mono tracking-wider">
                  {mathProblem.q} = ?
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto mt-6">
                {mathProblem.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleMathOption(opt)}
                    className="p-5 rounded-2xl bg-[#1c1538] hover:bg-gradient-to-r hover:from-pink-500 hover:to-purple-600 border border-[#322659] hover:border-transparent text-white font-mono text-2xl font-black transition-all cursor-pointer active:scale-95 text-center shadow-md"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. LOGIC RIDDLES */}
      {/* ========================================================================= */}
      {activeGame === 'riddle' && (
        <div className="bg-[#141029] border border-[#2b224d] rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-[#251e44] mb-6">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                Teka-Teki Logika #{riddleIndex + 1}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Total Terpecahkan: {stats.riddlesSolved}</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#1a1436] border border-[#2d2354] mb-6">
            <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
              "{currentRiddle.question}"
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {currentRiddle.options.map((opt, idx) => {
              let style = 'bg-[#181232] hover:bg-[#231a48] border-[#2c224e] text-slate-200';
              if (riddleAnswered) {
                if (idx === currentRiddle.answer) {
                  style = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold';
                } else if (idx === riddleSelected) {
                  style = 'bg-red-500/20 border-red-500 text-red-300';
                } else {
                  style = 'bg-[#141029]/50 border-[#221a3b] text-slate-500';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleRiddleAnswer(idx)}
                  disabled={riddleAnswered}
                  className={`p-4 rounded-2xl border text-left font-semibold text-sm transition-all cursor-pointer disabled:cursor-default flex items-center justify-between ${style}`}
                >
                  <span>{opt}</span>
                  {riddleAnswered && idx === currentRiddle.answer && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#231d40]">
            <button
              onClick={() => setShowHint(!showHint)}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 cursor-pointer"
            >
              <Lightbulb className="w-4 h-4" />
              <span>{showHint ? 'Sembunyikan Petunjuk' : 'Buka Petunjuk'}</span>
            </button>

            {riddleAnswered && (
              <button
                onClick={handleNextRiddle}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <span>Teka-Teki Berikutnya</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {showHint && (
            <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs animate-in fade-in">
              💡 <strong>Petunjuk:</strong> {currentRiddle.hint}
            </div>
          )}

          {riddleAnswered && (
            <div className="mt-4 p-4 rounded-2xl bg-[#16122d] border border-[#2c2250] text-xs text-slate-300">
              <span className="font-bold text-pink-400 block mb-1">Penjelasan Teka-Teki:</span>
              <span>{currentRiddle.explanation}</span>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. WORD SCRAMBLE */}
      {/* ========================================================================= */}
      {activeGame === 'word' && (
        <div className="bg-[#141029] border border-[#2b224d] rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-[#251e44] mb-6">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
                Kategori: {currentWordItem.category}
              </span>
            </div>
            <span className="text-xs text-slate-400">Kata #{wordIndex + 1}</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#181333] border border-[#2e2358] mb-6 flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-amber-400 block">Petunjuk Istilah:</span>
              <p className="text-xs text-slate-300 mt-0.5">{currentWordItem.hint}</p>
            </div>
          </div>

          {/* Letter Slots */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8 min-h-[60px]">
            {Array.from({ length: currentWordItem.word.length }).map((_, idx) => {
              const selected = selectedWordLetters[idx];
              return (
                <button
                  key={idx}
                  onClick={() => selected && handleRemoveLetter(idx)}
                  className={`w-11 h-13 sm:w-13 sm:h-15 rounded-2xl border-2 font-mono text-xl sm:text-2xl font-black flex items-center justify-center transition-all cursor-pointer ${
                    selected
                      ? wordSolved
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/20 scale-105'
                        : wordError
                        ? 'bg-red-500/20 border-red-500 text-red-300 animate-shake'
                        : 'bg-[#1e173e] border-pink-500 text-white shadow-md shadow-pink-500/20'
                      : 'bg-[#120e24] border-[#2c2250] text-slate-600 border-dashed'
                  }`}
                >
                  {selected ? selected.char : ''}
                </button>
              );
            })}
          </div>

          {/* Available Scrambled Letters */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-8">
            {availableLetters.map((item) => (
              <button
                key={item.id}
                onClick={() => handlePickLetter(item)}
                disabled={item.used || wordSolved}
                className={`w-10 h-12 sm:w-12 sm:h-14 rounded-2xl font-mono text-lg sm:text-xl font-black transition-all cursor-pointer ${
                  item.used
                    ? 'bg-[#100c1e] text-slate-600 border border-[#21183b] opacity-30 cursor-default'
                    : 'bg-[#1e173e] hover:bg-[#281f54] text-pink-300 border border-[#3b2d6a] hover:border-pink-500 active:scale-95 shadow-md'
                }`}
              >
                {item.char}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#231d40]">
            <button
              onClick={handleResetWord}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Pilihan</span>
            </button>

            {wordSolved && (
              <button
                onClick={handleNextWord}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-pink-500/25 transition-all cursor-pointer active:scale-95"
              >
                <span>Kata Berikutnya</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MEMORY MATCH */}
      {/* ========================================================================= */}
      {activeGame === 'memory' && (
        <div className="bg-[#141029] border border-[#2b224d] rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-[#251e44] mb-6">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 text-xs font-bold">
                Langkah: {memoryMoves}
              </span>
            </div>
            <button
              onClick={restartMemory}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Acak Ulang Kartu</span>
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-w-md mx-auto my-6">
            {memoryCards.map((card, idx) => {
              const isFlipped = flippedCards.includes(idx) || card.matched;
              return (
                <button
                  key={idx}
                  onClick={() => handleFlipCard(idx)}
                  className={`h-20 sm:h-24 rounded-2xl text-2xl sm:text-3xl font-bold flex items-center justify-center transition-all cursor-pointer ${
                    isFlipped
                      ? card.matched
                        ? 'bg-emerald-500/20 border-2 border-emerald-500 shadow-md shadow-emerald-500/20 scale-95'
                        : 'bg-gradient-to-tr from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25'
                      : 'bg-[#1b1538] hover:bg-[#251e4c] border border-[#322659] text-slate-500'
                  }`}
                >
                  {isFlipped ? card.icon : '❓'}
                </button>
              );
            })}
          </div>

          {memoryWin && (
            <div className="text-center p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-bold mt-4 animate-in fade-in">
              🎉 Selamat! Kamu menyelesaikan memori dalam {memoryMoves} langkah! (+250 XP)
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. REFLEX SPEED TAP */}
      {/* ========================================================================= */}
      {activeGame === 'reflex' && (
        <div className="bg-[#141029] border border-[#2b224d] rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-[#251e44] mb-6">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-xl bg-rose-500/20 text-rose-300 text-xs font-bold">
                Skor Refleks: {reflexScore}
              </span>
              <span className="text-xs text-slate-400">Rekor: {stats.bestReflexScore}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#1d163a] border border-[#32255e] text-xs font-mono font-bold text-amber-300">
              <Timer className="w-3.5 h-3.5" />
              <span>{reflexTime}s</span>
            </div>
          </div>

          {!reflexActive ? (
            <div className="text-center py-12">
              <Target className="w-16 h-16 text-rose-400 mx-auto mb-4 animate-bounce" />
              <h3 className="text-lg font-bold text-white">Uji Kecepatan Refleks</h3>
              <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
                Klik target yang muncul secepat mungkin sebelum waktu 25 detik habis!
              </p>
              <button
                onClick={startReflexGame}
                className="mt-6 px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 text-white font-bold text-sm shadow-lg shadow-pink-500/25 transition-all cursor-pointer"
              >
                Mulai Uji Refleks
              </button>
            </div>
          ) : (
            <div className="relative w-full h-80 bg-[#120e24] border border-[#271f49] rounded-2xl overflow-hidden cursor-crosshair">
              <button
                onClick={handleTargetClick}
                style={{ top: `${targetPosition.top}%`, left: `${targetPosition.left}%` }}
                className="absolute w-14 h-14 -ml-7 -mt-7 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 border-2 border-white shadow-xl shadow-pink-500/40 flex items-center justify-center text-white font-black text-xs animate-pulse cursor-pointer transform active:scale-75 transition-transform"
              >
                TAP!
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
