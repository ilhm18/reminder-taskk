import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Clock,
  BookOpen,
  User,
  MapPin,
  Bell,
  Sparkles,
  ChevronRight,
  AlertCircle,
  Flame,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DayOfWeek, ScheduleItem } from '../../types';

const DAYS_OF_WEEK: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export const ScheduleMemberView: React.FC = () => {
  const { currentClass, schedules, syncWithSupabase, showToast } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Determine current day of week in Indonesian
  const getTodayDayOfWeek = (): DayOfWeek => {
    const dayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday ...
    const map: Record<number, DayOfWeek> = {
      0: 'Minggu',
      1: 'Senin',
      2: 'Selasa',
      3: 'Rabu',
      4: 'Kamis',
      5: 'Jumat',
      6: 'Sabtu',
    };
    return map[dayIndex] || 'Senin';
  };

  const today = getTodayDayOfWeek();
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(today);
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await syncWithSupabase();
      showToast('Jadwal berhasil disinkronkan dengan database!', 'success');
    } catch {
      showToast('Gagal menyinkronkan jadwal.', 'warn');
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setCurrentTimeStr(`${hrs}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

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

  const todaySchedules = classSchedules
    .filter((s) => s.day === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Cek apakah ada jadwal hari ini yang mendekati 2 jam sebelum mulai
  const upcomingWithin2Hours = todaySchedules.find((item) => {
    const [hours, mins] = item.startTime.split(':').map(Number);
    if (isNaN(hours) || isNaN(mins)) return false;
    const now = new Date();
    const classTime = new Date(now);
    classTime.setHours(hours, mins, 0, 0);
    const diffMs = classTime.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return diffMinutes > 0 && diffMinutes <= 125;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#20153f] via-[#1a1233] to-[#120f26] border border-[#37275f] p-6 sm:p-7 shadow-xl">
        <div className="absolute right-0 top-0 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5 shadow-lg shadow-pink-500/25 flex items-center justify-center text-white shrink-0">
              <CalendarDays className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold text-[10px] uppercase tracking-wider border border-pink-500/30">
                  Kelas: {currentClass?.name || 'Ruang Kelas'} {currentClass?.code ? `(Kode: ${currentClass.code})` : ''}
                </span>
                <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Hari Ini: {today} ({currentTimeStr || 'Live'})
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Jadwal Mata Pelajaran &amp; Kuliah
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Pantau jam pembelajaran harianmu dan dapatkan notifikasi otomatis 2 jam sebelum kelas dimulai!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4 py-2.5 rounded-2xl bg-[#1d1736] hover:bg-[#281f4a] border border-[#35285c] text-xs font-bold text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer shadow-sm transition-all"
              title="Segarkan data jadwal dari database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-pink-400' : 'text-slate-400'}`} />
              <span>{isRefreshing ? 'Menyinkronkan...' : 'Segarkan Jadwal'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2-HOUR WARNING ALERT BANNER */}
      {upcomingWithin2Hours && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/20 via-pink-500/15 to-purple-600/20 border-2 border-amber-500/50 p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-pink-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-amber-500/25">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/30 text-amber-200 font-bold text-[10px] uppercase tracking-wider border border-amber-500/40">
                  ⏰ Mendekati 2 Jam Sebelum Kelas Dimulai
                </span>
                <span className="text-xs font-mono text-pink-300 font-bold">
                  {upcomingWithin2Hours.startTime} WIB
                </span>
              </div>
              <h4 className="text-base font-extrabold text-white mt-1">
                {upcomingWithin2Hours.subject}
              </h4>
              <p className="text-xs text-slate-200">
                {upcomingWithin2Hours.room ? `Ruang: ${upcomingWithin2Hours.room}` : 'Ruang Kelas'} • Pengampu: {upcomingWithin2Hours.teacherName || 'Guru/Dosen'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedDay(today)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-600 text-white font-bold text-xs shrink-0 cursor-pointer shadow-md self-end sm:self-auto"
          >
            Buka Jadwal Hari Ini
          </button>
        </div>
      )}

      {/* Days of Week Tab Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {DAYS_OF_WEEK.map((day, dIdx) => {
          const count = classSchedules.filter((s) => s.day === day).length;
          const isSelected = selectedDay === day;
          const isToday = day === today;

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
              {isToday && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" title="Hari Ini" />
              )}
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

      {/* Schedule Content */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>Jadwal Pelajaran Hari {selectedDay}</span>
            {selectedDay === today && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                Jadwal Hari Ini
              </span>
            )}
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {daySchedules.length} Mata Pelajaran
          </span>
        </div>

        {daySchedules.length === 0 ? (
          <div className="text-center py-16 bg-[#141126] border border-[#272144] rounded-3xl p-6">
            <CalendarDays className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white">Tidak Ada Jadwal di Hari {selectedDay}</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Hari bebas / libur pelajaran untuk hari {selectedDay}. Manfaatkan waktu untuk belajar mandiri atau mengerjakan tugas!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {daySchedules.map((item, idx) => {
              const isOngoing =
                selectedDay === today &&
                currentTimeStr >= item.startTime &&
                currentTimeStr <= item.endTime;

              const [hours, mins] = item.startTime.split(':').map(Number);
              const now = new Date();
              const classTime = new Date(now);
              classTime.setHours(hours, mins, 0, 0);
              const diffMs = classTime.getTime() - now.getTime();
              const diffMinutes = Math.floor(diffMs / (1000 * 60));
              const isStartingSoon = selectedDay === today && !isOngoing && diffMinutes > 0 && diffMinutes <= 125;

              return (
                <div
                  key={item.id}
                  className={`p-5 rounded-3xl border flex flex-col justify-between transition-all relative overflow-hidden shadow-lg ${
                    isOngoing
                      ? 'bg-gradient-to-br from-pink-500/20 via-[#181333] to-[#120e24] border-pink-500'
                      : isStartingSoon
                      ? 'bg-gradient-to-br from-amber-500/15 via-[#1a1435] to-[#141028] border-amber-500/60 shadow-amber-500/10'
                      : 'bg-[#141126] border-[#292248] hover:border-[#3d2f66]'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-[#231d3f] mb-3">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-pink-300 bg-[#1d163a] px-2.5 py-1 rounded-xl border border-[#332658]">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          {item.startTime} - {item.endTime}
                        </span>
                      </div>

                      {isOngoing ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-pink-500 text-white text-[10px] font-bold animate-pulse">
                          ● Berlangsung
                        </span>
                      ) : isStartingSoon ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold animate-pulse shadow-xs">
                          ⏰ Mulai ~{diffMinutes} mnt lagi
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono font-bold">
                          Sesi #{idx + 1}
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-extrabold text-white mb-2 leading-snug">
                      {item.subject}
                    </h4>

                    {/* Teacher & Room */}
                    <div className="space-y-1.5 text-xs text-slate-300 mb-3">
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

                  <div className="pt-3 border-t border-[#231d3f] flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Bell className="w-3 h-3 text-pink-400" />
                      <span>Pengingat aktif (2 jam sebelum)</span>
                    </span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
