import React, { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Plus, Tag, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Task } from '../../types';
import { formatIndonesianDate, getTaskDeadlineStatus } from '../../utils/notification';

interface CalendarViewProps {
  onOpenAddTaskModal?: (dateStr: string) => void;
  onSelectTask?: (task: Task) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  onOpenAddTaskModal,
  onSelectTask,
}) => {
  const { tasks, currentClass, currentRole, submissions, currentUser, classes } = useApp();

  // Current viewed month & year (current local time year is 2026, month October)
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 9, 1)); // Oct 2026
  const [selectedDateStr, setSelectedDateStr] = useState<string>('2026-10-01');

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date(2026, 9, 1));
    setSelectedDateStr('2026-10-01');
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  // Relevant tasks
  const relevantTasks = useMemo(() => {
    if (currentRole === 'owner') return tasks;
    return tasks.filter((t) => t.classId === currentClass?.id);
  }, [tasks, currentRole, currentClass]);

  // Map tasks by date YYYY-MM-DD
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    relevantTasks.forEach((task) => {
      const dateKey = task.dueDate.substring(0, 10);
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(task);
    });
    return map;
  }, [relevantTasks]);

  // Calendar matrix calculation
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: {
      dayNumber: number;
      isCurrentMonth: boolean;
      dateKey: string;
      tasks: Task[];
    }[] = [];

    // Prev month overflow
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = month === 0 ? 12 : month;
      const prevY = month === 0 ? year - 1 : year;
      const key = `${prevY}-${String(prevM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dayNumber: d,
        isCurrentMonth: false,
        dateKey: key,
        tasks: tasksByDate[key] || [],
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dayNumber: d,
        isCurrentMonth: true,
        dateKey: key,
        tasks: tasksByDate[key] || [],
      });
    }

    // Next month overflow to complete 35 or 42 grid
    const remaining = 35 - cells.length > 0 ? 35 - cells.length : 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextM = month === 11 ? 1 : month + 2;
      const nextY = month === 11 ? year + 1 : year;
      const key = `${nextY}-${String(nextM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dayNumber: d,
        isCurrentMonth: false,
        dateKey: key,
        tasks: tasksByDate[key] || [],
      });
    }

    return cells;
  }, [year, month, tasksByDate]);

  // Tasks for the selected date
  const selectedDateTasks = tasksByDate[selectedDateStr] || [];

  return (
    <div className="space-y-6">
      {/* Calendar Top Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141126] border border-[#272144] p-5 rounded-3xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-pink-400 uppercase tracking-wider block">
              PENJADWALAN PROYEK & TUGAS
            </span>
            <h2 className="text-xl font-bold text-white">
              {monthNames[month]} {year}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 rounded-xl bg-[#1d1836] hover:bg-[#28214a] text-xs font-semibold text-slate-200 border border-[#2e2652] transition-colors cursor-pointer"
          >
            Hari Ini
          </button>
          <div className="flex items-center bg-[#1d1836] border border-[#2e2652] rounded-xl overflow-hidden p-0.5">
            <button
              onClick={prevMonth}
              className="p-2 text-slate-300 hover:text-white hover:bg-[#28214a] rounded-lg transition-colors cursor-pointer"
              title="Bulan sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 text-slate-300 hover:text-white hover:bg-[#28214a] rounded-lg transition-colors cursor-pointer"
              title="Bulan berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {(currentRole === 'admin' || currentRole === 'owner') && onOpenAddTaskModal && (
            <button
              onClick={() => onOpenAddTaskModal(selectedDateStr)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-pink-500/20 transition-all cursor-pointer ml-1"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Jadwalkan Tugas</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Calendar Grid and Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* The 7xN Calendar Grid (2 cols on large screen) */}
        <div className="lg:col-span-2 bg-[#141126] border border-[#272144] rounded-3xl p-5 overflow-hidden">
          {/* Day Names Row */}
          <div className="grid grid-cols-7 gap-1 mb-2 text-center">
            {dayNames.map((name, i) => (
              <div
                key={`day-${name}-${i}`}
                className={`py-2 text-xs font-bold uppercase tracking-wider ${
                  i === 0 ? 'text-pink-400' : 'text-slate-400'
                }`}
              >
                {name}
              </div>
            ))}
          </div>

          {/* Date Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarCells.map((cell, idx) => {
              const isSelected = cell.dateKey === selectedDateStr;
              const isToday = cell.dateKey === new Date().toISOString().split('T')[0];
              const hasTasks = cell.tasks.length > 0;

              return (
                <div
                  key={`cell-${cell.dateKey}-${idx}`}
                  onClick={() => setSelectedDateStr(cell.dateKey)}
                  className={`min-h-[75px] sm:min-h-[92px] p-1.5 sm:p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-pink-50/70 dark:bg-[#251b44] border-pink-500 shadow-md shadow-pink-500/15 ring-1 ring-pink-500'
                      : cell.isCurrentMonth
                      ? 'bg-white dark:bg-[#18142f] border-slate-200 dark:border-[#29224d] hover:border-pink-300 dark:hover:border-[#3d3270]'
                      : 'bg-slate-50/60 dark:bg-[#120f24]/50 border-slate-100 dark:border-[#1f1938] opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-bold w-6 h-6 rounded-lg flex items-center justify-center ${
                        isToday
                          ? 'bg-pink-500 text-white shadow-sm'
                          : isSelected
                          ? 'text-pink-600 dark:text-pink-300 font-extrabold'
                          : 'text-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {hasTasks && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-pink-100 dark:bg-[#2d2150] text-pink-700 dark:text-pink-300 font-mono">
                        {cell.tasks.length}
                      </span>
                    )}
                  </div>

                  {/* Task Pills / Indicators */}
                  <div className="mt-1 space-y-1 overflow-hidden">
                    {cell.tasks.slice(0, 2).map((t) => (
                      <div
                        key={t.id}
                        className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium ${
                          t.priority === 'tinggi'
                            ? 'bg-red-500/20 text-red-300 border-l-2 border-red-500'
                            : t.priority === 'sedang'
                            ? 'bg-purple-500/20 text-purple-300 border-l-2 border-purple-400'
                            : 'bg-emerald-500/20 text-emerald-300 border-l-2 border-emerald-400'
                        }`}
                      >
                        {t.title}
                      </div>
                    ))}
                    {cell.tasks.length > 2 && (
                      <div className="text-[9px] text-slate-400 pl-1 font-mono">
                        +{cell.tasks.length - 2} lainnya
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Detail Drawer (1 col) */}
        <div className="bg-[#141126] border border-[#272144] rounded-3xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#251f42]">
              <div>
                <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider block">
                  AGENDA TANGGAL
                </span>
                <h3 className="font-bold text-white text-base font-mono">
                  {selectedDateStr}
                </h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#20183b] text-slate-300 font-mono">
                {selectedDateTasks.length} Tugas
              </span>
            </div>

            {/* List of tasks for this date */}
            <div className="mt-4 space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {selectedDateTasks.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Tidak ada tenggat tugas pada tanggal ini.</p>
                  {(currentRole === 'admin' || currentRole === 'owner') && onOpenAddTaskModal && (
                    <button
                      onClick={() => onOpenAddTaskModal(selectedDateStr)}
                      className="mt-3 px-3 py-1.5 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-semibold hover:bg-pink-500/25 transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Buat Tugas Hari Ini</span>
                    </button>
                  )}
                </div>
              ) : (
                selectedDateTasks.map((task) => {
                  const deadlineStatus = getTaskDeadlineStatus(task.dueDate);
                  const isCompleted = submissions.some(
                    (s) => s.taskId === task.id && s.status === 'completed' && (currentRole !== 'member' || s.memberId === currentUser?.id)
                  );

                  return (
                    <div
                      key={task.id}
                      onClick={() => onSelectTask && onSelectTask(task)}
                      className="p-3.5 rounded-2xl bg-[#191433] border border-[#2c2350] hover:border-pink-500/60 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${deadlineStatus.badgeClass}`}>
                          {deadlineStatus.label}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {task.dueDate.substring(11, 16)} WIB
                        </span>
                      </div>

                      {currentRole === 'owner' && (
                        <div className="mt-2 mb-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/30 text-purple-300">
                            Kelas: {classes.find((c) => c.id === task.classId)?.name || 'Kelas Umum'}
                          </span>
                        </div>
                      )}

                      <h4 className="text-xs font-bold text-white mt-1.5 group-hover:text-pink-300 transition-colors">
                        {task.title}
                      </h4>

                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {task.description}
                      </p>

                      <div className="mt-2.5 pt-2 border-t border-[#261e47] flex items-center justify-between text-[11px]">
                        <span className="text-purple-300 font-medium">{task.category}</span>
                        {isCompleted ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            ✓ Selesai
                          </span>
                        ) : (
                          <span className="text-amber-400 font-medium">Belum selesai</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Add footer button for Admins */}
          {(currentRole === 'admin' || currentRole === 'owner') && onOpenAddTaskModal && (
            <div className="pt-4 border-t border-[#251f42] mt-4">
              <button
                onClick={() => onOpenAddTaskModal(selectedDateStr)}
                className="w-full py-2.5 rounded-xl bg-[#221a42] hover:bg-[#2d2256] text-pink-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Tambah Tugas di {selectedDateStr}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
