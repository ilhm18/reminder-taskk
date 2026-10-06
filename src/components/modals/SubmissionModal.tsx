import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, FileUp, Lock, Paperclip, Send, UploadCloud, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Task, TaskSubmission } from '../../types';
import { formatIndonesianDate, getTaskDeadlineStatus } from '../../utils/notification';
import { formatFileSize } from '../../utils/fileEvidence';

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  existingSubmission?: TaskSubmission;
}

export const SubmissionModal: React.FC<SubmissionModalProps> = ({
  isOpen,
  onClose,
  task,
  existingSubmission,
}) => {
  const { submitTaskEvidence } = useApp();

  const [fileName, setFileName] = useState(
    existingSubmission?.fileName || 'Laporan_Tugas_Saya.pdf'
  );
  const [note, setNote] = useState(existingSubmission?.submissionNote || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (!isOpen || !task) return null;

  const deadlineStatus = getTaskDeadlineStatus(task.dueDate);
  const isOverdue = deadlineStatus.status === 'overdue';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOverdue) return;

    const finalFileName = selectedFile ? selectedFile.name : fileName || 'Dokumen_Pengerjaan.pdf';
    const computedSize = selectedFile ? formatFileSize(selectedFile.size) : existingSubmission?.fileSize || '1.8 MB';

    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileUrl = event.target?.result as string;
        submitTaskEvidence(task.id, finalFileName, note, fileUrl, computedSize);
        onClose();
      };
      reader.readAsDataURL(selectedFile);
    } else {
      submitTaskEvidence(task.id, finalFileName, note, existingSubmission?.fileUrl || '', computedSize);
      onClose();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#141126] border border-[#2e2652] rounded-3xl p-6 shadow-2xl overflow-hidden relative">
        <div className="flex items-center justify-between pb-4 border-b border-[#261f42]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">Kirim Bukti Tugas</h2>
              <p className="text-xs text-slate-400">Unggah berkas atau laporan pengerjaan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#25203f] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Summary Banner */}
        <div className="mt-4 p-3.5 rounded-2xl bg-[#1a1533] border border-[#2c244f]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-pink-400 uppercase tracking-wider">
              {task.category}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${deadlineStatus.badgeClass}`}>
              {deadlineStatus.label}
            </span>
          </div>
          <h3 className="text-sm font-bold text-white mt-1">{task.title}</h3>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Tenggat: {formatIndonesianDate(task.dueDate)}
          </p>
        </div>

        {/* Overdue Lock Banner */}
        {isOverdue && (
          <div className="mt-3 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>
              <strong>Tenggat Berakhir:</strong> Batas waktu pengerjaan tugas ini telah lewat. Pengumpulan berkas telah ditutup oleh sistem.
            </span>
          </div>
        )}

        {/* Existing Submission Warning / Feedback */}
        {existingSubmission?.adminFeedback && !isOverdue && (
          <div className="mt-3 p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Catatan Revisi dari Admin ({existingSubmission.reviewedBy || 'Admin'}):</span>
            </div>
            <p className="text-slate-200">{existingSubmission.adminFeedback}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* File upload drag drop zone */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Berkas / Dokumen Tugas
            </label>
            <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-[#3c3066] hover:border-pink-500/80 rounded-2xl bg-[#17132e] cursor-pointer transition-colors group">
              <FileUp className="w-8 h-8 text-pink-400/80 group-hover:scale-110 transition-transform mb-2" />
              <span className="text-xs text-slate-200 font-medium text-center">
                {selectedFile ? selectedFile.name : fileName || 'Klik untuk pilih berkas atau gambar (Semua format didukung)'}
              </span>
              <span className="text-[10px] text-slate-500 mt-1">
                {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Maksimal 25MB • Gambar, Dokumen, Arsip'}
              </span>
              <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept="*/*"
              />
            </label>
          </div>

          {/* Quick Simulated Name input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-purple-400" />
              Nama Berkas
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Contoh: Laporan_SitiAyu_Final.pdf"
              className="w-full bg-[#1b1633] border border-[#342a5a] focus:border-pink-500 rounded-xl px-3.5 py-2 text-white text-xs outline-none transition-colors"
            />
          </div>

          {/* Note textarea */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Catatan Pengerjaan (Opsional)
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tambahkan tautan drive, catatan khusus, atau keterangan pengerjaan..."
              className="w-full bg-[#1b1633] border border-[#342a5a] focus:border-pink-500 rounded-xl px-3.5 py-2 text-white text-xs outline-none transition-colors placeholder:text-slate-500 resize-none"
            />
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
              disabled={isOverdue}
              className={`px-5 py-2.5 rounded-xl ${
                isOverdue
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30 cursor-not-allowed opacity-70'
                  : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-md shadow-pink-500/20 cursor-pointer'
              } font-bold text-xs transition-all flex items-center gap-1.5`}
            >
              {isOverdue ? <Lock className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
              <span>{isOverdue ? 'Tenggat Berakhir (Ditutup)' : 'Kirimkan Bukti Tugas'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
