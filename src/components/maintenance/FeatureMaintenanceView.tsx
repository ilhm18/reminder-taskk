import React from 'react';
import { Wrench, Clock, ShieldAlert, ArrowLeft, RefreshCw, Sparkles } from 'lucide-react';

interface FeatureMaintenanceViewProps {
  featureName: string;
  categoryLabel?: string;
  customMessage?: string;
  customEstimate?: string;
  onBackToDashboard: () => void;
  role: 'admin' | 'member';
}

export const FeatureMaintenanceView: React.FC<FeatureMaintenanceViewProps> = ({
  featureName,
  categoryLabel = 'Fitur Sistem',
  customMessage,
  customEstimate,
  onBackToDashboard,
  role,
}) => {
  const defaultDesc =
    role === 'admin'
      ? `Modul "${featureName}" sedang dalam tahap peningkatan performa & pembaruan database oleh sistem. Seluruh data tetap aman. Mohon kembali beberapa saat lagi.`
      : `Fitur "${featureName}" sedang dipelihara oleh pengembang untuk menghadirkan pengalaman belajar yang lebih baik & lancar. Mohon bersabar, kami akan segera membukanya kembali!`;

  const finalMessage = customMessage || defaultDesc;
  const finalEstimate = customEstimate || 'Segera selesai dalam beberapa saat';

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 sm:px-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="rounded-3xl bg-[#140f2b]/90 border border-purple-500/30 p-8 sm:p-10 shadow-2xl relative overflow-hidden text-center flex flex-col items-center">
        {/* Background glow effects */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-pink-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Animated Badge Icon */}
        <div className="relative mb-6">
          <div className="absolute -inset-2 bg-gradient-to-r from-amber-500 to-pink-500 rounded-3xl blur-lg opacity-40 animate-pulse" />
          <div className="relative w-20 h-20 bg-[#1e153b] border border-amber-500/40 rounded-3xl flex items-center justify-center text-amber-400 shadow-xl">
            <Wrench className="w-10 h-10 animate-bounce duration-1000" />
          </div>
        </div>

        {/* Category & Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold mb-4">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>{categoryLabel} • Mode Pemeliharaan Aktif</span>
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
          Fitur &quot;{featureName}&quot; Sedang Dipelihara
        </h2>

        {/* Message */}
        <p className="text-sm text-slate-300 leading-relaxed max-w-lg mb-6">
          {finalMessage}
        </p>

        {/* Estimation Box */}
        <div className="w-full max-w-md bg-[#1d163d] border border-purple-500/20 rounded-2xl p-4 mb-6 flex items-center gap-3.5 text-left">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Estimasi Waktu Pengerjaan
            </div>
            <div className="text-xs sm:text-sm text-pink-300 font-bold">
              {finalEstimate}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </button>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto py-3 px-4 rounded-xl bg-[#231a47] hover:bg-[#2e235c] border border-[#37286d] text-slate-200 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Muat Ulang</span>
          </button>
        </div>

        {/* Watermark note */}
        <div className="mt-8 text-[10px] text-slate-500 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-pink-400" />
          <span>Kontrol Maintenance Fitur Terpusat • RemindTask OS</span>
        </div>
      </div>
    </div>
  );
};
