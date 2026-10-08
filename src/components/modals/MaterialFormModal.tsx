import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  Upload,
  Link2,
  FileText,
  Video,
  Presentation,
  CheckSquare,
  Sparkles,
  Paperclip,
  Trash2,
  Tag,
  AlertCircle,
  FileCode,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ClassMaterial, MaterialCategory } from '../../types';
import { getTerminology, resolveEducatorType } from '../../utils/terminology';

interface MaterialFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMaterial?: ClassMaterial | null;
}

const CATEGORIES: { value: MaterialCategory; label: string; icon: any; color: string }[] = [
  { value: 'Modul / PDF', label: 'Modul / PDF', icon: FileText, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
  { value: 'Slide Presentasi', label: 'Slide Presentasi', icon: Presentation, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { value: 'Video Pembelajaran', label: 'Video Pembelajaran', icon: Video, color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
  { value: 'Catatan / Ringkasan', label: 'Catatan / Ringkasan', icon: BookOpen, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  { value: 'Tautan / Referensi', label: 'Tautan / Referensi', icon: Link2, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { value: 'Latihan Soal', label: 'Latihan Soal', icon: CheckSquare, color: 'text-pink-400 bg-pink-500/10 border-pink-500/30' },
];

export const MaterialFormModal: React.FC<MaterialFormModalProps> = ({
  isOpen,
  onClose,
  initialMaterial,
}) => {
  const { addMaterial, updateMaterial, currentClass, classes, currentUser } = useApp();

  const educatorType = resolveEducatorType(currentUser, currentClass);
  const terms = getTerminology(educatorType);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MaterialCategory>('Modul / PDF');
  const [attachmentType, setAttachmentType] = useState<'file' | 'link'>('file');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [classId, setClassId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sync state whenever initialMaterial or isOpen changes
  useEffect(() => {
    if (isOpen) {
      if (initialMaterial) {
        setTitle(initialMaterial.title || '');
        setDescription(initialMaterial.description || '');
        setCategory(initialMaterial.category || 'Modul / PDF');
        setFileName(initialMaterial.fileName || '');
        setFileSize(initialMaterial.fileSize || '');
        setFileUrl(initialMaterial.fileUrl || '');
        setExternalLink(initialMaterial.externalLink || '');
        setTagsInput(initialMaterial.tags ? initialMaterial.tags.join(', ') : '');
        setClassId(initialMaterial.classId || currentClass?.id || classes[0]?.id || 'class-1');
        setAttachmentType(initialMaterial.externalLink && !initialMaterial.fileName ? 'link' : 'file');
      } else {
        setTitle('');
        setDescription('');
        setCategory('Modul / PDF');
        setFileName('');
        setFileSize('');
        setFileUrl('');
        setExternalLink('');
        setTagsInput('');
        setClassId(currentClass?.id || classes[0]?.id || 'class-1');
        setAttachmentType('file');
      }
      setErrorMsg('');
    }
  }, [initialMaterial, isOpen, currentClass?.id]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 15MB for local base64 storage)
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('Ukuran berkas melebihi batas 15MB. Silakan gunakan opsi Tautan Eksternal (Google Drive/YouTube) untuk berkas sangat besar.');
      return;
    }

    setErrorMsg('');
    setFileName(file.name);
    
    // Format file size
    const sizeInKb = file.size / 1024;
    const formattedSize = sizeInKb > 1024
      ? `${(sizeInKb / 1024).toFixed(1)} MB`
      : `${Math.round(sizeInKb)} KB`;
    setFileSize(formattedSize);

    // Read as Base64 Data URL
    const reader = new FileReader();
    reader.onload = () => {
      setFileUrl(reader.result as string);
    };
    reader.onerror = () => {
      setErrorMsg('Gagal membaca berkas.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setFileName('');
    setFileSize('');
    setFileUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Judul materi wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const payload = {
      classId: classId || currentClass?.id || 'class-1',
      title: title.trim(),
      description: description.trim(),
      category,
      fileName: fileName.trim() ? fileName : undefined,
      fileSize: fileSize.trim() ? fileSize : undefined,
      fileUrl: fileUrl.trim() ? fileUrl : undefined,
      externalLink: externalLink.trim() ? externalLink.trim() : undefined,
      tags: parsedTags.length > 0 ? parsedTags : undefined,
    };

    try {
      if (initialMaterial) {
        updateMaterial(initialMaterial.id, payload);
      } else {
        await addMaterial(payload);
      }
      onClose();
    } catch (err) {
      setErrorMsg('Terjadi kesalahan saat menyimpan materi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-[#141126] border border-[#2e2652] rounded-3xl p-5 sm:p-7 shadow-2xl my-auto text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#251e44] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/25 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                {initialMaterial ? 'Edit Materi Pembelajaran' : 'Buat / Upload Materi Baru'}
              </h3>
              <p className="text-xs text-slate-400">
                {initialMaterial
                  ? 'Perbarui modul, slide, atau tautan materi kelas'
                  : `Bagikan berkas belajar atau tautan materi ke seluruh ${terms.memberTitlePlural.toLowerCase()}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#20183b] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Judul Materi */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">
              Judul Materi / Topik Pembelajaran <span className="text-pink-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Modul 01 - Pengantar Algoritma & Flowchart"
              required
              className="w-full bg-[#1b1633] border border-[#342a5a] rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-pink-500 transition-colors"
            />
          </div>

          {/* Kategori */}
          <div>
            <label className="block text-slate-300 font-bold mb-2">Kategori Materi</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-pink-500/20 border-pink-500 text-pink-200 ring-1 ring-pink-500/50'
                        : 'bg-[#1b1633] border-[#342a5a] text-slate-300 hover:bg-[#231b42] hover:text-white'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${cat.color} shrink-0`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Deskripsi / Ringkasan */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">
              Deskripsi / Ringkasan / Instruksi Membaca
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan ringkasan materi, poin-poin penting, atau instruksi sebelum membaca..."
              className="w-full bg-[#1b1633] border border-[#342a5a] rounded-xl p-3.5 text-white placeholder-slate-500 outline-none focus:border-pink-500 transition-colors resize-none"
            />
          </div>

          {/* Attachment Source Selection */}
          <div className="p-4 rounded-2xl bg-[#181330] border border-[#2b224d] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-pink-400" />
                Lampiran / Sumber Materi
              </span>
              <div className="flex items-center gap-1 p-1 bg-[#100c22] rounded-xl border border-[#282046]">
                <button
                  type="button"
                  onClick={() => setAttachmentType('file')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    attachmentType === 'file'
                      ? 'bg-pink-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Unggah Berkas
                </button>
                <button
                  type="button"
                  onClick={() => setAttachmentType('link')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    attachmentType === 'link'
                      ? 'bg-pink-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tautan Link
                </button>
              </div>
            </div>

            {attachmentType === 'file' ? (
              <div>
                {fileName ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#221a42] border border-[#3f3166]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
                        <FileCode className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-white text-xs truncate">{fileName}</p>
                        <p className="text-[10px] text-slate-400">{fileSize || 'Berkas Terlampir'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors"
                      title="Hapus berkas"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-[#3d3066] hover:border-pink-500/60 rounded-xl bg-[#140f28]/60 cursor-pointer transition-all group">
                    <div className="w-10 h-10 rounded-full bg-[#20183b] flex items-center justify-center text-pink-400 mb-2 group-hover:scale-110 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-white mb-0.5">Pilih atau Seret Berkas ke Sini</span>
                    <span className="text-[10px] text-slate-400">
                      Mendukung PDF, PPTX, DOCX, XLSX, Gambar, Audio, ZIP (Maks. 15MB)
                    </span>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar,.png,.jpg,.jpeg,.mp4,.mp3"
                    />
                  </label>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Tautan URL Eksternal (Google Drive, YouTube, Canva, Slides, dll)
                </label>
                <div className="relative">
                  <Link2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="url"
                    value={externalLink}
                    onChange={(e) => setExternalLink(e.target.value)}
                    placeholder="https://drive.google.com/file/d/... atau https://youtube.com/..."
                    className="w-full bg-[#1b1633] border border-[#342a5a] rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 outline-none focus:border-pink-500 transition-colors"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tags / Topik */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-purple-400" />
              Tag / Topik Pembelajaran (Pisahkan dengan koma)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Contoh: Bab 1, Teori, Pengantar, UTS"
              className="w-full bg-[#1b1633] border border-[#342a5a] rounded-xl px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:border-pink-500 transition-colors"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#251e44]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-[#20183b] font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold shadow-lg shadow-pink-500/25 flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? 'Menyimpan...' : initialMaterial ? 'Simpan Perubahan' : 'Bagikan Materi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
