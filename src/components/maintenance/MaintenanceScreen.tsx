import React from 'react';
import { Wrench, Clock, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

interface MaintenanceScreenProps {
  title?: string;
  message?: string;
  estimate?: string;
  onBypass?: () => void;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({
  title = 'Pemeliharaan Server & Pembaruan Sistem',
  message = 'Kami sedang melakukan peningkatan infrastruktur dan optimalisasi database Supabase untuk menghadirkan performa terbaik. Mohon bersabar, kami akan segera kembali.',
  estimate = 'Segera selesai dalam beberapa saat',
  onBypass,
}) => {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#0c0a15] text-white flex flex-col items-center justify-center p-6 overflow-hidden selection:bg-pink-500 selection:text-white">
      {/* Background Glow Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/15 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-pink-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-md w-full bg-[#151024]/90 backdrop-blur-2xl border border-purple-500/30 rounded-3xl p-8 shadow-2xl relative z-10 text-center flex flex-col items-center">
        {/* Animated Icon Badge */}
        <div className="relative mb-6">
          <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-lg opacity-60 animate-pulse" />
          <div className="relative w-20 h-20 bg-[#1e1638] border border-purple-500/40 rounded-2xl flex items-center justify-center text-pink-400 shadow-inner">
            <Wrench className="w-10 h-10 animate-bounce text-pink-400" />
          </div>
        </div>

        {/* Badge status */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-4">
          <ShieldAlert className="w-3.5 h-3.5 animate-spin" />
          <span>Sistem Sedang Maintenance</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-black text-white tracking-tight mb-3">
          {title}
        </h1>

        {/* Description */}
        <p className="text-sm text-slate-400 leading-relaxed mb-6">
          {message}
        </p>

        {/* Info box */}
        <div className="w-full bg-[#1b1536] border border-purple-500/20 rounded-2xl p-4 mb-6 flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Estimasi Pengerjaan</div>
            <div className="text-[11px] text-purple-300 font-medium">{estimate}</div>
          </div>
        </div>

        {/* Action Button / Refresh */}
        <div className="flex flex-col w-full gap-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Coba Muat Ulang</span>
          </button>

          {onBypass && (
            <button
              onClick={onBypass}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors py-1 cursor-pointer"
            >
              [Akses Khusus / Bypass Maintenance]
            </button>
          )}
        </div>

        {/* Footer note */}
        <div className="mt-6 text-[10px] text-slate-500 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-pink-400" />
          <span>RemindTask System Engine v5.0</span>
        </div>
      </div>
    </div>
  );
};
