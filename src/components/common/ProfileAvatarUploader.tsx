import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Trash2, Check, Sparkles, Upload, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';

// Preset avatar options with super cute 3D cartoon, robot, anime, and emoji characters
const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=PandaBot&backgroundColor=f59e0b,ec4899',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=MochiCat&backgroundColor=8b5cf6,3b82f6',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=LuckyRabbit&backgroundColor=10b981,06b6d4',
  'https://api.dicebear.com/7.x/big-smile/svg?seed=ChocoCookie&backgroundColor=ef4444,f43f5e',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=AnyaStar&backgroundColor=a855f7,ec4899',
  'https://api.dicebear.com/7.x/croodles/svg?seed=DinoCute&backgroundColor=14b8a6,0ea5e9',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CyberKitty&backgroundColor=6366f1,a855f7',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=BobaMaster&backgroundColor=f97316,f59e0b',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=SparklePanda&backgroundColor=ec4899,8b5cf6',
  'https://api.dicebear.com/7.x/micah/svg?seed=PixelFox&backgroundColor=3b82f6,10b981',
  'https://api.dicebear.com/7.x/big-smile/svg?seed=MilkyWay&backgroundColor=8b5cf6,ec4899',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=KuroNeko&backgroundColor=f43f5e,f59e0b',
  'https://api.dicebear.com/7.x/notionists/svg?seed=GamerBear&backgroundColor=06b6d4,3b82f6',
  'https://api.dicebear.com/7.x/bottts/svg?seed=SpaceHamster&backgroundColor=a855f7,6366f1',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=RainbowFox&backgroundColor=f59e0b,10b981',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=ShadowNinja&backgroundColor=ec4899,f43f5e',
];

interface ProfileAvatarUploaderProps {
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

export const ProfileAvatarUploader: React.FC<ProfileAvatarUploaderProps> = ({
  title = 'Foto Profil',
  subtitle = 'Unggah foto profil pribadi atau pilih gambar avatar',
  compact = false,
}) => {
  const { currentUser, updateUserProfile, showToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  const currentAvatar = currentUser?.avatar;

  // Compress image via Canvas to ensure fast loading and prevent huge payload sizes
  const processAndSaveImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Format berkas harus berupa gambar (JPG, PNG, WebP).', 'warn');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 280; // Resize to max 280x280 for sharp yet compact avatar
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          updateUserProfile({ avatar: dataUrl });
          showToast('Foto profil berhasil diperbarui!', 'success');
        }
        setIsProcessing(false);
      };
      img.onerror = () => {
        setIsProcessing(false);
        showToast('Gagal memproses berkas gambar.', 'warn');
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndSaveImage(file);
    }
  };

  const handleSelectPreset = (presetUrl: string) => {
    updateUserProfile({ avatar: presetUrl });
    showToast('Avatar profil berhasil disimpan!', 'success');
    setShowPresets(false);
  };

  const handleRemoveAvatar = () => {
    updateUserProfile({ avatar: '' });
    showToast('Foto profil berhasil dihapus.', 'info');
  };

  return (
    <div className="bg-[#141126] border border-[#272144] rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-[#231b3d] pb-3">
        <div>
          <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
            <Camera className="w-4 h-4 text-pink-400" />
            <span>{title}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-5 pt-1">
        {/* Main Avatar Preview Frame */}
        <div className="relative group shrink-0">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 p-1 shadow-xl shadow-pink-500/20 relative overflow-hidden flex items-center justify-center">
            {currentAvatar ? (
              <img
                src={currentAvatar}
                alt={currentUser?.name || 'Foto Profil'}
                className="w-full h-full object-cover rounded-[22px]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full rounded-[22px] bg-[#1a1435] flex items-center justify-center text-white font-black text-3xl">
                {(currentUser?.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}

            {/* Overlaid Camera Trigger */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold gap-1 cursor-pointer rounded-3xl"
              title="Klik untuk ganti foto profil"
            >
              <Camera className="w-6 h-6 text-pink-400" />
              <span>Ganti Foto</span>
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
          />
        </div>

        {/* Action Controls */}
        <div className="flex-1 space-y-3 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-pink-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Memproses...' : 'Upload Foto Baru'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPresets(!showPresets)}
              className="px-3.5 py-2 rounded-xl bg-[#1d173d] hover:bg-[#281f52] text-slate-200 hover:text-white border border-[#2e235a] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Pilih Avatar Preset</span>
            </button>

            {currentAvatar && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Hapus foto profil saat ini"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Foto</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Format: JPG, PNG, atau WebP. Foto profil Anda akan otomatis terlihat oleh seluruh pengguna di menu Chat, Forum, dan Daftar Anggota Kelas.
          </p>
        </div>
      </div>

      {/* Preset Avatars Selector Drawer */}
      {showPresets && (
        <div className="pt-3 border-t border-[#231b3d] animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="text-[11px] font-bold text-pink-400 uppercase tracking-wider block mb-2">
            Pilih Gambar Avatar Ilustrasi:
          </span>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {PRESET_AVATARS.map((url, idx) => {
              const isSelected = currentAvatar === url;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(url)}
                  className={`relative w-12 h-12 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer group ${
                    isSelected
                      ? 'border-pink-500 ring-2 ring-pink-500/50 scale-105'
                      : 'border-[#2c2250] hover:border-pink-400/60'
                  }`}
                >
                  <img
                    src={url}
                    alt={`Preset ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-pink-500/40 flex items-center justify-center text-white">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
