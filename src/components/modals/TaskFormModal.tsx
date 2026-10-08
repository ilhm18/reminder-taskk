import React, { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, CalendarPlus, CheckSquare, Clock, FileText, Layers, Sparkles, Tag, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Task, TaskCategory, TaskPriority } from '../../types';
import { getTerminology, resolveEducatorType } from '../../utils/terminology';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTask?: Task | null;
  targetDate?: string; // Preselected date from Calendar
}

/**
 * Otomatis menghitung prioritas berdasarkan deadline:
 * - Kurang dari 2 hari (< 48 jam) => 'tinggi' (Sangat Prioritas)
 * - Kurang dari 7 hari (< 7 hari) => 'sedang' (Standar)
 * - Lebih dari 7 hari (>= 7 hari) => 'rendah' (Rendah)
 */
export function calculateAutoPriority(deadlineIsoOrLocal: string): {
  priority: TaskPriority;
  label: string;
  sublabel: string;
  badgeClass: string;
} {
  try {
    const now = new Date().getTime();
    const target = new Date(deadlineIsoOrLocal).getTime();
    if (isNaN(target)) {
      return {
        priority: 'sedang',
        label: 'Standar',
        sublabel: '< 7 Hari',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      };
    }
    const diffMs = target - now;
    const diffHours = diffMs / (1000 * 60 * 60);
    const daysDiff = diffHours / 24;

    if (daysDiff < 2) {
      return {
        priority: 'tinggi',
        label: 'Sangat Prioritas',
        sublabel: '< 2 Hari',
        badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40',
      };
    } else if (daysDiff < 7) {
      return {
        priority: 'sedang',
        label: 'Standar',
        sublabel: '< 7 Hari',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      };
    } else {
      return {
        priority: 'rendah',
        label: 'Rendah',
        sublabel: '> 7 Hari',
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      };
    }
  } catch {
    return {
      priority: 'sedang',
      label: 'Standar',
      sublabel: '< 7 Hari',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    };
  }
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  initialTask,
  targetDate,
}) => {
  const { addTask, updateTask, classes, currentClass, currentRole, currentUser } = useApp();

  const educatorType = resolveEducatorType(currentUser, currentClass);
  const terms = getTerminology(educatorType);

  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const [dueDate, setDueDate] = useState(() => {
    if (initialTask?.dueDate) {
      return initialTask.dueDate.substring(0, 16);
    }
    if (targetDate) {
      return `${targetDate}T17:00`;
    }
    // Default to tomorrow 17:00
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(17, 0, 0, 0);
    return d.toISOString().substring(0, 16);
  });

  const [category, setCategory] = useState<TaskCategory>(initialTask?.category || 'Tugas Mandiri');
  
  // SS 3: Default is unchecked (false / kosong) initially
  const [requiresUpload, setRequiresUpload] = useState<boolean>(
    initialTask?.requiresUpload !== undefined ? initialTask.requiresUpload : false
  );
  const [classId, setClassId] = useState(initialTask?.classId || currentClass?.id || classes[0]?.id || 'class-1');

  // Synchronize state when initialTask or isOpen changes so editing loads existing data
  useEffect(() => {
    if (isOpen) {
      if (initialTask) {
        setTitle(initialTask.title || '');
        setDescription(initialTask.description || '');
        setDueDate(initialTask.dueDate ? initialTask.dueDate.substring(0, 16) : '');
        setCategory(initialTask.category || 'Tugas Mandiri');
        setRequiresUpload(initialTask.requiresUpload !== undefined ? initialTask.requiresUpload : false);
        setClassId(initialTask.classId || currentClass?.id || classes[0]?.id || 'class-1');
      } else {
        setTitle('');
        setDescription('');
        if (targetDate) {
          setDueDate(`${targetDate}T17:00`);
        } else {
          const d = new Date();
          d.setDate(d.getDate() + 1);
          d.setHours(17, 0, 0, 0);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          setDueDate(`${year}-${month}-${day}T${hours}:${minutes}`);
        }
        setCategory('Tugas Mandiri');
        setRequiresUpload(false);
        setClassId(currentClass?.id || classes[0]?.id || 'class-1');
      }
    }
  }, [initialTask, isOpen, targetDate, currentClass?.id]);

  if (!isOpen) return null;

  const autoPriorityInfo = calculateAutoPriority(dueDate);
  const isOverdue = new Date(dueDate).getTime() < Date.now();

  const handleExtendByDays = (days: number) => {
    const base = new Date(dueDate).getTime() > Date.now() ? new Date(dueDate) : new Date();
    base.setDate(base.getDate() + days);
    base.setHours(23, 59, 0, 0);
    const year = base.getFullYear();
    const month = String(base.getMonth() + 1).padStart(2, '0');
    const day = String(base.getDate()).padStart(2, '0');
    const hours = String(base.getHours()).padStart(2, '0');
    const minutes = String(base.getMinutes()).padStart(2, '0');
    setDueDate(`${year}-${month}-${day}T${hours}:${minutes}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const calculatedPriority = calculateAutoPriority(dueDate).priority;

    if (initialTask) {
      updateTask(initialTask.id, {
        title: title.trim(),
        description: description.trim(),
        dueDate,
        priority: calculatedPriority,
        category,
        requiresUpload,
        classId,
      });
    } else {
      addTask({
        title: title.trim(),
        description: description.trim(),
        dueDate,
        priority: calculatedPriority,
        category,
        requiresUpload,
        classId,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#141126] border border-[#2e2652] rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[#261f42]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">
                {initialTask ? 'Edit Tugas' : 'Buat Tugas Baru'}
              </h2>
              <p className="text-xs text-slate-400">
                Lengkapi rincian tugas untuk dipantau seluruh anggota
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Class selection (if Owner) */}
          {currentRole === 'owner' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                Target Kelas
              </label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full bg-[#1b1633] border border-[#342a5a] rounded-xl px-3.5 py-2.5 text-white text-xs outline-none focus:border-pink-500 transition-colors"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id} className="bg-[#1b1633]">
                    {cls.name} ({cls.code}) - Admin: {cls.adminName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-pink-400" />
              Judul Tugas
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Laporan Praktikum Jaringan Komputer"
              required
              className="w-full bg-[#1b1633] border border-[#342a5a] focus:border-pink-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors placeholder:text-slate-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Instruksi &amp; Deskripsi
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tuliskan petunjuk pengerjaan tugas, format berkas, atau referensi..."
              className="w-full bg-[#1b1633] border border-[#342a5a] focus:border-pink-500 rounded-xl px-4 py-2.5 text-white text-xs outline-none transition-colors placeholder:text-slate-500 resize-none"
            />
          </div>

          {/* Tenggat Waktu with integrated automatic priority indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Tenggat Waktu (Deadline)</span>
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-pink-400" />
                  Prioritas:
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${autoPriorityInfo.badgeClass}`}>
                  {autoPriorityInfo.label} ({autoPriorityInfo.sublabel})
                </span>
              </div>
            </div>

            {/* Overdue Alert Banner with extension helper */}
            {isOverdue && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Tugas Telah Berakhir (Terkunci untuk {terms.memberTitle})</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Tambahkan durasi waktu baru di bawah agar pengerjaan dan pengunggahan tugas terbuka kembali untuk {terms.memberTitle.toLowerCase()}.
                </p>
              </div>
            )}

            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              className="w-full bg-[#1b1633] border border-[#342a5a] focus:border-pink-500 rounded-xl px-3.5 py-2.5 text-white text-xs outline-none transition-colors [color-scheme:dark]"
            />

            {/* Quick Extension Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 mr-1">
                <CalendarPlus className="w-3 h-3 text-purple-400" />
                Tambah Durasi:
              </span>
              <button
                type="button"
                onClick={() => handleExtendByDays(1)}
                className="px-2.5 py-1 rounded-lg bg-[#241c45] hover:bg-[#34265e] text-pink-300 hover:text-white text-[11px] font-semibold border border-[#3b2c6b] transition-colors cursor-pointer"
                title="Perpanjang 1 hari dari sekarang"
              >
                +1 Hari
              </button>
              <button
                type="button"
                onClick={() => handleExtendByDays(3)}
                className="px-2.5 py-1 rounded-lg bg-[#241c45] hover:bg-[#34265e] text-purple-300 hover:text-white text-[11px] font-semibold border border-[#3b2c6b] transition-colors cursor-pointer"
                title="Perpanjang 3 hari"
              >
                +3 Hari
              </button>
              <button
                type="button"
                onClick={() => handleExtendByDays(7)}
                className="px-2.5 py-1 rounded-lg bg-[#241c45] hover:bg-[#34265e] text-cyan-300 hover:text-white text-[11px] font-semibold border border-[#3b2c6b] transition-colors cursor-pointer"
                title="Perpanjang 1 minggu"
              >
                +1 Minggu
              </button>
              <button
                type="button"
                onClick={() => handleExtendByDays(14)}
                className="px-2.5 py-1 rounded-lg bg-[#241c45] hover:bg-[#34265e] text-emerald-300 hover:text-white text-[11px] font-semibold border border-[#3b2c6b] transition-colors cursor-pointer"
                title="Perpanjang 2 minggu"
              >
                +2 Minggu
              </button>
            </div>
          </div>

          {/* Category & Upload Requirement (SS 3: Awalnya kosong / tidak terceklis) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-cyan-400" />
                Kategori Tugas
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full bg-[#1b1633] border border-[#342a5a] rounded-xl px-3.5 py-2.5 text-white text-xs outline-none focus:border-pink-500 transition-colors"
              >
                <option value="Tugas Mandiri" className="bg-[#1b1633]">Tugas Mandiri</option>
                <option value="Tugas Kelompok" className="bg-[#1b1633]">Tugas Kelompok</option>
                <option value="Kuis" className="bg-[#1b1633]">Kuis Online</option>
                <option value="Proyek" className="bg-[#1b1633]">Proyek Besar</option>
                <option value="Praktikum" className="bg-[#1b1633]">Praktikum Lab</option>
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#1b1633] border border-[#342a5a] cursor-pointer hover:border-pink-500 transition-colors">
                <input
                  type="checkbox"
                  checked={requiresUpload}
                  onChange={(e) => setRequiresUpload(e.target.checked)}
                  className="w-4 h-4 accent-pink-500 rounded cursor-pointer"
                />
                <span className="text-xs text-slate-200 font-medium">
                  Wajib Unggah Bukti Pengerjaan
                </span>
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-[#261f42] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#25203f] transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-pink-500/20 cursor-pointer transition-all"
            >
              {initialTask ? 'Simpan Perubahan' : 'Publikasikan Tugas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
