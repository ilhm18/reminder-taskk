import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export const RealTimeClock: React.FC = () => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      // Format time: HH:MM:SS WIB
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setTimeStr(`${hours}:${minutes}:${seconds} WIB`);

      // Format date: Senin, 6 Okt 2026
      const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' };
      setDateStr(now.toLocaleDateString('id-ID', options));
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!timeStr) return null;

  return (
    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1b1533] border border-[#2e2352] text-xs text-purple-200 shadow-inner">
      <Clock className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
      <div className="flex flex-col text-[11px] font-mono leading-tight">
        <span className="font-bold text-white">{timeStr}</span>
        <span className="text-[9px] text-slate-400">{dateStr}</span>
      </div>
    </div>
  );
};
