import React, { useState } from 'react';
import { Instagram, Coffee, ExternalLink, Sparkles, Copy, Check, Heart, ShieldCheck } from 'lucide-react';

interface CreatorDonationCardProps {
  variant?: 'banner' | 'compact' | 'sidebar' | 'full';
}

export const CreatorDonationCard: React.FC<CreatorDonationCardProps> = ({ variant = 'banner' }) => {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);
  const instagramUrl = 'https://instagram.com/ilhamm.18';
  const saweriaUrl = 'https://saweria.co/ilhaaaaaaaaaam18';
  const luffyImgUrl = 'https://i.pinimg.com/736x/d1/cb/e5/d1cbe599aa53f1e87c8f4c7bc76f71f0.jpg';

  const copySaweriaLink = () => {
    try {
      navigator.clipboard.writeText(saweriaUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (variant === 'full') {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#221845] via-[#1a1233] to-[#120f26] border border-[#3b2d6a] p-6 sm:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-pink-500/15 via-amber-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
            {/* Luffy Avatar High-Res */}
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-tr from-pink-500 via-purple-500 to-amber-500 p-[2.5px] shrink-0 shadow-2xl shadow-pink-500/30 overflow-hidden group">
              {!imgError ? (
                <img
                  src={luffyImgUrl}
                  alt="Ilham (Creator)"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover rounded-[22px] bg-[#151129] group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full rounded-[22px] bg-[#151129] flex items-center justify-center text-4xl">
                  🏴‍☠️
                </div>
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-bold mb-2.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Developer</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white flex items-center justify-center md:justify-start gap-2">
                <span>Dikembangkan oleh Ilham</span>
              </h3>

              {/* Formal Description */}
              <p className="text-sm text-slate-300 mt-2.5 max-w-2xl leading-relaxed">
                Aplikasi <strong>RemindTask</strong> dikembangkan oleh seorang mahasiswa sebagai platform manajemen kelas dan produktivitas terintegrasi, yang disediakan secara <strong>100% gratis</strong> tanpa pungutan biaya berlangganan guna mengoptimalkan koordinasi akademik, pemantauan tenggat tugas, serta efektivitas belajar bagi seluruh siswa, tenaga pendidik, dan institusi pendidikan.
              </p>
              <p className="text-xs text-slate-400 mt-2 max-w-2xl leading-relaxed">
                Dukungan sukarela Anda melalui <strong>Kotak Donasi</strong> sangat berharga guna menopang keberlanjutan pemeliharaan server komputasi, database realtime, serta pengembangan fitur inovatif secara berkelanjutan.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-6">
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 rounded-2xl bg-[#251d4a] hover:bg-[#32275e] border border-[#3f2e6e] text-pink-300 hover:text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer group"
                >
                  <Instagram className="w-4 h-4 text-pink-400 group-hover:scale-110 transition-transform" />
                  <span>Kunjungi Profil Instagram</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                </a>

                <a
                  href={saweriaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-black text-xs flex items-center gap-2 shadow-xl shadow-amber-500/25 transition-all cursor-pointer active:scale-95 group"
                >
                  <Coffee className="w-4 h-4 text-slate-950 group-hover:rotate-12 transition-transform" />
                  <span>Kotak Donasi &amp; Dukungan</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-950/70" />
                </a>

                <button
                  type="button"
                  onClick={copySaweriaLink}
                  title="Salin Tautan Donasi"
                  className="p-3 rounded-2xl bg-[#20183b] hover:bg-[#2b214f] border border-[#342758] text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Tersalin!' : 'Salin Tautan Donasi'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Info Highlights Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[#16122d] border border-[#2c2250] flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">100% Akses Terbuka</h4>
              <p className="text-xs text-slate-400 mt-1">
                Dapat diakses secara penuh tanpa biaya tersembunyi untuk seluruh jenjang pendidikan dan komunitas belajar.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#16122d] border border-[#2c2250] flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Pengembangan Mandiri</h4>
              <p className="text-xs text-slate-400 mt-1">
                Dirancang, diprogram, dan dikelola secara terdedikasi oleh Ilham (Solo Developer).
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#16122d] border border-[#2c2250] flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Infrastruktur &amp; Server</h4>
              <p className="text-xs text-slate-400 mt-1">
                Kontribusi donasi didedikasikan secara penuh untuk pemeliharaan cloud server dan keandalan data realtime.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1f173d] via-[#1a1333] to-[#120f26] border border-[#372b5f] p-5 sm:p-6 shadow-xl">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-pink-500/10 via-amber-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        {/* Creator Info with Luffy Photo */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-500 to-amber-500 p-[1.5px] shrink-0 shadow-lg shadow-pink-500/25 overflow-hidden">
            {!imgError ? (
              <img
                src={luffyImgUrl}
                alt="Ilham (Creator)"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover rounded-[14px] bg-[#151129]"
              />
            ) : (
              <div className="w-full h-full rounded-[14px] bg-[#151129] flex items-center justify-center text-xl">
                🏴‍☠️
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-pink-400">
                INFORMASI PENGEMBANG
              </span>
              <span className="px-2 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 text-[10px] font-bold">
                Developer
              </span>
            </div>
            <h4 className="text-base sm:text-lg font-bold text-white mt-0.5 flex items-center gap-1.5">
              <span>Dikembangkan oleh Ilham</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 max-w-xl leading-relaxed">
              Platform <strong>RemindTask</strong> disediakan 100% gratis tanpa pungutan biaya berlangganan. Dukungan sukarela Anda sangat berharga untuk pemeliharaan server dan pengembangan fitur lanjutan.
            </p>
          </div>
        </div>

        {/* Action Buttons: Instagram & Kotak Donasi */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Instagram Link */}
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-[#231b45] hover:bg-[#2f245c] border border-[#3b2d69] text-pink-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer group shadow-sm"
          >
            <Instagram className="w-4 h-4 text-pink-400 group-hover:scale-110 transition-transform" />
            <span>Kunjungi Instagram</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </a>

          {/* Kotak Donasi */}
          <a
            href={saweriaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all cursor-pointer active:scale-95 group"
          >
            <Coffee className="w-4 h-4 text-slate-950 group-hover:rotate-12 transition-transform" />
            <span>Kotak Donasi</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-950/70" />
          </a>

          {/* Quick Copy Link */}
          <button
            type="button"
            onClick={copySaweriaLink}
            title="Salin Tautan Donasi"
            className="p-2.5 rounded-xl bg-[#20183b] hover:bg-[#2b214f] border border-[#332657] text-slate-300 hover:text-white text-xs transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
