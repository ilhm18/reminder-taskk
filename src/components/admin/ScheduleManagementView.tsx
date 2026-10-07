import React, { useState } from 'react';
import {
  CalendarDays,
  Plus,
  Clock,
  BookOpen,
  User,
  MapPin,
  Bell,
  Trash2,
  Edit,
  CheckCircle2,
  Send,
  AlertCircle,
  Sparkles,
  Layers,
  FileText,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DayOfWeek, ScheduleItem } from '../../types';

const DAYS_OF_WEEK: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

const SUBJECT_COLORS = [
  { name: 'Pink', bg: 'bg-pink-500/20', text: 'text-pink-300', border: 'border-pink-500/40' },
  { name: 'Purple', bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/40' },
  { name: 'Blue', bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/40' },
  { name: 'Emerald', bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/40' },
  { name: 'Amber', bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/40' },
  { name: 'Cyan', bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/40' },
];

export const ScheduleManagementView: React.FC = () => {
  const {
    currentClass,
    schedules,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    sendScheduleReminderNotification,
    showToast,
  } = useApp();

  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Senin');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);

  // Form states
  const [formSubject, setFormSubject] = useState('');
  const [formDay, setFormDay] = useState<DayOfWeek>('Senin');
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('09:40');
  const [formRoom, setFormRoom] = useState('');
  const [formTeacher, setFormTeacher] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formColor, setFormColor] = useState(SUBJECT_COLORS[0].bg);

  const classSchedules = schedules.filter(
    (s) =>
      !currentClass ||
      s.classId === currentClass.id ||
      s.classId === currentClass.code ||
      (currentClass.name && s.classId === currentClass.name) ||
      s.classId === 'class-1' ||
      s.classId === 'global'
  );
  const daySchedules = classSchedules
    .filter((s) => s.day === selectedDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormSubject('');
    setFormDay(selectedDay);
    setFormStartTime('08:00');
    setFormEndTime('09:40');
    setFormRoom('');
    setFormTeacher('');
    setFormNotes('');
    setFormColor(SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)].bg);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ScheduleItem) => {
    setEditingItem(item);
    setFormSubject(item.subject);
    setFormDay(item.day);
    setFormStartTime(item.startTime);
    setFormEndTime(item.endTime);
    setFormRoom(item.room || '');
    setFormTeacher(item.teacherName || '');
    setFormNotes(item.notes || '');
    setFormColor(item.color || SUBJECT_COLORS[0].bg);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubject.trim() || !formStartTime || !formEndTime) {
      showToast('Harap isi mata pelajaran dan jam mulai/selesai.', 'warn');
      return;
    }

    if (editingItem) {
      updateSchedule(editingItem.id, {
        subject: formSubject.trim(),
        day: formDay,
        startTime: formStartTime,
        endTime: formEndTime,
        room: formRoom.trim(),
        teacherName: formTeacher.trim(),
        notes: formNotes.trim(),
        color: formColor,
      });
      showToast('Jadwal pelajaran berhasil diperbarui!', 'success');
    } else {
      addSchedule({
        classId: currentClass?.id || 'class-1',
        subject: formSubject.trim(),
        day: formDay,
        startTime: formStartTime,
        endTime: formEndTime,
        room: formRoom.trim(),
        teacherName: formTeacher.trim(),
        notes: formNotes.trim(),
        color: formColor,
      });
      showToast(`Jadwal ${formSubject} hari ${formDay} berhasil ditambahkan!`, 'success');
    }

    setIsModalOpen(false);
  };

  const handleSendDayReminder = () => {
    if (daySchedules.length === 0) {
      showToast(`Tidak ada jadwal pelajaran di hari ${selectedDay}.`, 'warn');
      return;
    }
    sendScheduleReminderNotification(selectedDay);
    showToast(`Notifikasi pengingat jadwal hari ${selectedDay} berhasil dikirim ke seluruh siswa!`, 'success');
  };

  const handleSend2HourReminder = (item: ScheduleItem) => {
    sendScheduleReminderNotification(item.day, item.id);
    showToast(`Pengingat 2 jam sebelum kelas "${item.subject}" disiarkan ke notifikasi siswa!`, 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-gradient-to-r dark:from-[#20153f] dark:via-[#1a1233] dark:to-[#120f26] border border-slate-200 dark:border-[#37275f] p-6 sm:p-7 shadow-sm">
        <div className="absolute right-0 top-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5 shadow-lg shadow-pink-500/25 flex items-center justify-center text-white shrink-0">
              <CalendarDays className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-pink-50 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 font-bold text-[10px] uppercase tracking-wider border border-pink-200 dark:border-pink-500/30">
                  Manajemen Jadwal Kelas
                </span>
                <span className="text-xs font-mono text-purple-700 dark:text-purple-300 font-bold">
                  {classSchedules.length} Jadwal Terdaftar
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                Jadwal Mata Pelajaran &amp; Kuliah
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                Kelola jadwal harian, jam pelajaran, ruang kelas, dan kirim notifikasi otomatis 2 jam sebelum kelas dimulai!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-stretch md:self-auto">
            <button
              onClick={handleSendDayReminder}
              className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#20173d] hover:bg-slate-200 dark:hover:bg-[#2b2050] text-slate-700 dark:text-pink-300 text-xs font-bold flex items-center justify-center gap-2 border border-slate-200 dark:border-[#3b2b62] transition-all cursor-pointer shadow-xs"
            >
              <Bell className="w-4 h-4 text-pink-500" />
              <span>Broadcast Jadwal {selectedDay}</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-pink-500/25 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jadwal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Days of Week Tab Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {DAYS_OF_WEEK.map((day, dIdx) => {
          const count = classSchedules.filter((s) => s.day === day).length;
          const isSelected = selectedDay === day;
          return (
            <button
              key={`day-${day}-${dIdx}`}
              onClick={() => setSelectedDay(day)}
              className={`px-5 py-3 rounded-2xl text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/20'
                  : 'bg-[#141126] border border-[#272144] text-slate-400 hover:text-white hover:bg-[#1b1535]'
              }`}
            >
              <span>{day}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-[#1c1638] text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Schedule Items for Selected Day */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">
              Jadwal Hari {selectedDay} ({daySchedules.length} Pelajaran)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Terintegrasi real-time ke halaman siswa &amp; notifikasi 2 jam sebelum kelas
          </span>
        </div>

        {daySchedules.length === 0 ? (
          <div className="text-center py-16 bg-[#141126] border border-[#272144] rounded-3xl p-6">
            <CalendarDays className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white">Belum Ada Jadwal di Hari {selectedDay}</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              Tambahkan mata pelajaran atau mata kuliah baru untuk hari {selectedDay} agar siswa menerima pengingat.
            </p>
            <button
              onClick={handleOpenAdd}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xs cursor-pointer shadow-md"
            >
              + Buat Jadwal Hari {selectedDay}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {daySchedules.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-3xl bg-[#141126] border border-[#292248] hover:border-[#3d2f66] flex flex-col justify-between transition-all relative overflow-hidden shadow-lg group"
              >
                <div className="relative z-10">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#231d3f] mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-pink-300 bg-[#1d163a] px-2.5 py-1 rounded-xl border border-[#332658]">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {item.startTime} - {item.endTime}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg bg-[#1c1538] text-slate-400 hover:text-white hover:bg-[#281f50] transition-colors cursor-pointer"
                        title="Edit Jadwal"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteSchedule(item.id)}
                        className="p-1.5 rounded-lg bg-[#1c1538] text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors cursor-pointer"
                        title="Hapus Jadwal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Subject Title */}
                  <h4 className="text-base font-extrabold text-white mb-2 leading-snug">
                    {item.subject}
                  </h4>

                  {/* Teacher & Room Meta */}
                  <div className="space-y-1.5 text-xs text-slate-300 mb-4">
                    {item.teacherName && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="truncate">Pengampu: {item.teacherName}</span>
                      </div>
                    )}
                    {item.room && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">Ruangan / Lab: {item.room}</span>
                      </div>
                    )}
                    {item.notes && (
                      <p className="text-[11px] text-slate-400 italic mt-1 bg-[#181230] p-2 rounded-xl border border-[#2b214f]">
                        "{item.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Action: Send 2-hour pre-class alert */}
                <button
                  onClick={() => handleSend2HourReminder(item)}
                  className="w-full py-2 px-3 rounded-xl bg-[#1d163a] hover:bg-pink-500/20 text-pink-300 hover:text-pink-200 border border-[#32255e] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                >
                  <Send className="w-3.5 h-3.5 text-pink-400" />
                  <span>Kirim Notifikasi Pengingat (2 Jam Sebelum)</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADD / EDIT SCHEDULE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#141126] border border-[#2d2452] rounded-3xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#241e42] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-300 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {editingItem ? 'Edit Jadwal Pelajaran' : 'Tambah Jadwal Pelajaran'}
                  </h3>
                  <span className="text-xs text-slate-400">
                    Kelas: {currentClass?.name || 'Ruang Kelas'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#20183b] transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Mata Pelajaran / Mata Kuliah <span className="text-pink-400">*</span>
                </label>
                <input
                  type="text"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder="Contoh: Pemrograman Web Lanjut / Fisika Dasar"
                  required
                  className="w-full bg-[#181333] border border-[#2f2554] focus:border-pink-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">Hari</label>
                  <select
                    value={formDay}
                    onChange={(e) => setFormDay(e.target.value as DayOfWeek)}
                    className="w-full bg-[#181333] border border-[#2f2554] rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                  >
                    {DAYS_OF_WEEK.map((d, dIdx) => (
                      <option key={`opt-day-${d}-${dIdx}`} value={d} className="bg-[#141126]">
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">Jam Mulai</label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    required
                    className="w-full bg-[#181333] border border-[#2f2554] rounded-xl px-3 py-2.5 text-xs text-white outline-none [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">Jam Selesai</label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    required
                    className="w-full bg-[#181333] border border-[#2f2554] rounded-xl px-3 py-2.5 text-xs text-white outline-none [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Guru / Dosen Pengampu
                  </label>
                  <input
                    type="text"
                    value={formTeacher}
                    onChange={(e) => setFormTeacher(e.target.value)}
                    placeholder="Contoh: Dra. Siti Rahmawati"
                    className="w-full bg-[#181333] border border-[#2f2554] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Ruangan / Lab
                  </label>
                  <input
                    type="text"
                    value={formRoom}
                    onChange={(e) => setFormRoom(e.target.value)}
                    placeholder="Contoh: Lab Komputer 2 / R.304"
                    className="w-full bg-[#181333] border border-[#2f2554] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Contoh: Bawa modul praktikum & laptop"
                  className="w-full bg-[#181333] border border-[#2f2554] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#241e42]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#1d1736] text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs shadow-md shadow-pink-500/25"
                >
                  {editingItem ? 'Simpan Perubahan' : 'Tambah Jadwal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
