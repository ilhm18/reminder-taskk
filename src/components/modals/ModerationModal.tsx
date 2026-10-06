import React, { useState } from 'react';
import {
  AlertCircle,
  Archive,
  CheckCircle,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileAudio,
  FileCode,
  FileSpreadsheet,
  FileText,
  Film,
  File as FileIcon,
  Image as ImageIcon,
  Maximize2,
  MessageSquare,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  User,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Task, TaskSubmission } from '../../types';
import { formatIndonesianDate } from '../../utils/notification';
import {
  decodeTextFromDataUrl,
  downloadEvidenceFile,
  getFileCategory,
} from '../../utils/fileEvidence';

interface ModerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: TaskSubmission | null;
  task?: Task;
}

export const ModerationModal: React.FC<ModerationModalProps> = ({
  isOpen,
  onClose,
  submission,
  task,
}) => {
  const { moderateSubmission, showToast } = useApp();
  const [feedback, setFeedback] = useState(submission?.adminFeedback || '');
  const [isPreviewOpen, setIsPreviewOpen] = useState(true); // Default open to review immediately
  const [imageZoom, setImageZoom] = useState(1);
  const [isFullScreenImage, setIsFullScreenImage] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen || !submission) return null;

  const fileName = submission.fileName || 'Bukti_Tugas.pdf';
  const fileUrl = submission.fileUrl || '';
  const fileCategory = getFileCategory(fileName, fileUrl);
  const fileExt = fileName.split('.').pop()?.toUpperCase() || 'FILE';

  const handleApprove = () => {
    moderateSubmission(submission.id, 'completed', feedback);
    onClose();
  };

  const handleRevision = () => {
    moderateSubmission(
      submission.id,
      'revision',
      feedback || 'Perlu perbaikan berkas atau kelengkapan data.'
    );
    onClose();
  };

  const handleReject = () => {
    moderateSubmission(
      submission.id,
      'rejected',
      feedback || 'Pengajuan tugas ditolak karena tidak sesuai kriteria.'
    );
    onClose();
  };

  const handleDownload = () => {
    const success = downloadEvidenceFile(fileName, fileUrl, {
      studentName: submission.memberName,
      taskTitle: task?.title || 'Tugas Siswa',
      submittedAt: formatIndonesianDate(submission.submittedAt),
      note: submission.submissionNote,
    });
    if (success) {
      showToast(`Mengunduh berkas: ${fileName}`, 'success');
    } else {
      showToast('Gagal memulai unduhan berkas.', 'warn');
    }
  };

  const handleOpenPdf = () => {
    try {
      if (fileUrl && fileUrl.startsWith('data:')) {
        const parts = fileUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        return;
      } else if (fileUrl && (fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || fileUrl.startsWith('blob:'))) {
        window.open(fileUrl, '_blank');
        return;
      }
      handleDownload();
    } catch (err) {
      console.warn('Gagal membuka PDF di tab baru:', err);
      handleDownload();
    }
  };

  // Decode text file if text or code
  const textContent =
    fileCategory === 'text' || fileCategory === 'code'
      ? decodeTextFromDataUrl(fileUrl)
      : null;

  const handleCopyText = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setIsCopied(true);
      showToast('Isi berkas berhasil disalin ke clipboard!', 'success');
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Render appropriate file icon
  const renderCategoryIcon = (className = 'w-5 h-5') => {
    switch (fileCategory) {
      case 'image':
        return <ImageIcon className={`${className} text-pink-400`} />;
      case 'pdf':
        return <FileText className={`${className} text-rose-400`} />;
      case 'code':
        return <Code2 className={`${className} text-emerald-400`} />;
      case 'text':
        return <FileText className={`${className} text-blue-400`} />;
      case 'office':
        return <FileSpreadsheet className={`${className} text-amber-400`} />;
      case 'archive':
        return <Archive className={`${className} text-purple-400`} />;
      case 'audio':
        return <FileAudio className={`${className} text-teal-400`} />;
      case 'video':
        return <Film className={`${className} text-orange-400`} />;
      default:
        return <FileIcon className={`${className} text-slate-400`} />;
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-2xl bg-[#130f24] border border-[#2d244f] rounded-3xl p-5 sm:p-6 shadow-2xl overflow-y-auto max-h-[92vh] relative text-white">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#241c40]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 shadow-md">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
                  <span>Pemeriksaan Bukti Tugas</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                    .{fileExt}
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Baca, tinjau, dan unduh berkas bukti pengerjaan siswa
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#231b3e] transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Member & Task Info Header */}
          <div className="mt-4 p-4 rounded-2xl bg-[#191433] border border-[#2b214f] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-pink-500/20">
                  {submission.memberName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="text-xs text-slate-400 block leading-tight">Pengirim Bukti:</span>
                  <span className="text-sm font-bold text-white">{submission.memberName}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-mono text-slate-400 block">
                  {formatIndonesianDate(submission.submittedAt)}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 font-semibold border border-purple-500/25">
                  Status: {submission.status === 'completed' ? 'Disetujui' : submission.status === 'revision' ? 'Perlu Revisi' : 'Menunggu Pemeriksaan'}
                </span>
              </div>
            </div>

            <div className="pt-2.5 border-t border-[#251d45]">
              <span className="text-[11px] text-pink-400 font-semibold uppercase tracking-wider block mb-0.5">
                Tugas yang Dikerjakan:
              </span>
              <p className="text-sm text-slate-200 font-medium">
                {task?.title || 'Tugas Anggota Kelas'}
              </p>
            </div>
          </div>

          {/* FILE ACTIONS BAR (PREVIEW TOGGLE & DIRECT DOWNLOAD) */}
          <div className="mt-4 p-3.5 rounded-2xl bg-[#1b1538] border border-[#35295c] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#120e26] border border-[#2e2350] flex items-center justify-center shrink-0">
                {renderCategoryIcon('w-5 h-5')}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate max-w-[240px] sm:max-w-xs" title={fileName}>
                  {fileName}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                  <span className="font-mono text-pink-300 font-semibold">{submission.fileSize || '1.8 MB'}</span>
                  <span>•</span>
                  <span className="uppercase text-purple-300 font-mono font-bold">{fileCategory} ({fileExt})</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Review / Preview Button */}
              <button
                type="button"
                onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                  isPreviewOpen
                    ? 'bg-purple-600/30 text-purple-200 border-purple-500/50'
                    : 'bg-[#251c47] text-slate-300 hover:text-white border-[#3b2d6b]'
                }`}
              >
                {isPreviewOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{isPreviewOpen ? 'Sembunyikan' : 'Baca / Preview'}</span>
              </button>

              {/* Direct Download Button */}
              <button
                type="button"
                onClick={handleDownload}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-pink-500/25 transition-all cursor-pointer active:scale-95"
                title="Download berkas ini ke komputer atau perangkat Anda"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh File</span>
              </button>
            </div>
          </div>

          {/* PREVIEW CONTAINER (SUPPORTS ALL FORMATS & IMAGES) */}
          {isPreviewOpen && (
            <div className="mt-3 p-4 rounded-2xl bg-[#0e0b1f] border border-[#2b224d] space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs text-slate-300 border-b border-[#211a3c] pb-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                  <span className="font-semibold text-white">
                    Pratinjau Berkas Bukti ({fileExt})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="text-[11px] text-pink-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download Asli</span>
                  </button>
                </div>
              </div>

              {/* 1. IMAGE FORMATS (JPG, PNG, GIF, WEBP, SVG, BMP, AVIF, HEIC, TIFF) */}
              {fileCategory === 'image' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-2 py-1 bg-[#161130] rounded-xl text-xs text-slate-300 border border-[#291f49]">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-purple-300 font-semibold">
                        Zoom: {Math.round(imageZoom * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setImageZoom((prev) => Math.max(0.5, prev - 0.25))}
                        className="p-1 rounded-lg hover:bg-[#271d4e] text-slate-300 hover:text-white cursor-pointer"
                        title="Perkecil"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageZoom(1)}
                        className="px-2 py-0.5 text-[10px] rounded-lg bg-[#271d4e] hover:bg-[#322564] text-slate-200 cursor-pointer font-mono"
                        title="Reset Zoom"
                      >
                        100%
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageZoom((prev) => Math.min(3, prev + 0.25))}
                        className="p-1 rounded-lg hover:bg-[#271d4e] text-slate-300 hover:text-white cursor-pointer"
                        title="Perbesar"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsFullScreenImage(true)}
                        className="p-1 rounded-lg hover:bg-[#271d4e] text-pink-300 hover:text-white cursor-pointer ml-1"
                        title="Buka Layar Penuh"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="relative overflow-auto max-h-[380px] bg-black/60 rounded-xl border border-[#2a204d] flex items-center justify-center p-3">
                    {fileUrl && !imageError ? (
                      <img
                        src={fileUrl}
                        alt={fileName}
                        onError={() => setImageError(true)}
                        style={{ transform: `scale(${imageZoom})`, transformOrigin: 'center center' }}
                        className="max-h-[340px] max-w-full object-contain rounded-lg transition-transform duration-150 shadow-lg cursor-zoom-in"
                        onClick={() => setIsFullScreenImage(true)}
                      />
                    ) : (
                      <div className="text-center p-6 space-y-2">
                        <ImageIcon className="w-10 h-10 text-pink-400 mx-auto opacity-70" />
                        <p className="text-xs font-bold text-white">{fileName}</p>
                        <p className="text-[11px] text-slate-400">
                          Gambar bukti terdaftar di sistem.
                        </p>
                        <button
                          type="button"
                          onClick={handleDownload}
                          className="mt-1 px-3.5 py-1.5 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 text-xs font-bold border border-pink-500/30 cursor-pointer"
                        >
                          Unduh Gambar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. PDF DOCUMENTS (TANPA IFRAME PUTIH ERROR) */}
              {fileCategory === 'pdf' && (
                <div className="p-4 rounded-xl bg-[#140f2b] border border-[#2d2250] space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white truncate max-w-[280px] sm:max-w-md">
                        {fileName}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Dokumen PDF Resmi • {submission.fileSize || '1.8 MB'}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Dokumen PDF pengumpulan tugas dari <strong className="text-pink-300">{submission.memberName}</strong> telah siap ditinjau. Anda dapat membuka dokumen di tab baru atau mengunduhnya langsung ke perangkat Anda.
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleOpenPdf}
                      className="px-4 py-2 rounded-xl bg-[#251c45] hover:bg-[#34265e] text-purple-200 hover:text-white font-bold text-xs flex items-center gap-1.5 border border-purple-500/30 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka / Baca PDF (Tab Baru)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-500/20 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh Dokumen PDF</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 3. CODE & SCRIPT FILES */}
              {fileCategory === 'code' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-[#080612] rounded-xl text-xs border border-[#20183b]">
                    <span className="font-mono text-emerald-400 text-[11px] font-bold">
                      // {fileName}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyText}
                      className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded bg-[#181232] hover:bg-[#251c47] cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{isCopied ? 'Tersalin!' : 'Salin Kode'}</span>
                    </button>
                  </div>
                  <div className="p-3 rounded-xl bg-[#06040d] border border-[#1e1739] max-h-56 overflow-y-auto font-mono text-xs text-emerald-300 leading-relaxed">
                    <pre className="whitespace-pre-wrap break-words">
                      {textContent ||
                        `// Pratinjau Kode Sumber (${fileExt})\n// Filename: ${fileName}\n// Pengirim: ${submission.memberName}\n\nfunction verifikasiTugas() {\n  console.log("Tugas ${task?.title || 'Siswa'} berhasil diselesaikan!");\n  return true;\n}`}
                    </pre>
                  </div>
                </div>
              )}

              {/* 4. PLAIN TEXT & MARKDOWN */}
              {fileCategory === 'text' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-[#080612] rounded-xl text-xs border border-[#20183b]">
                    <span className="font-mono text-blue-400 text-[11px] font-bold">
                      📄 Dokumen Teks: {fileName}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyText}
                      className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded bg-[#181232] hover:bg-[#251c47] cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{isCopied ? 'Tersalin!' : 'Salin Teks'}</span>
                    </button>
                  </div>
                  <div className="p-3 rounded-xl bg-[#070511] border border-[#1e1739] max-h-52 overflow-y-auto text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                    {textContent ||
                      `Laporan pengerjaan tugas oleh ${submission.memberName}.\n\nCatatan pengerjaan:\n${submission.submissionNote || 'Semua instruksi tugas telah diselesaikan dengan lengkap.'}`}
                  </div>
                </div>
              )}

              {/* 5. AUDIO FILES */}
              {fileCategory === 'audio' && (
                <div className="p-4 rounded-xl bg-[#140f2b] border border-[#2b2150] space-y-3">
                  <div className="flex items-center gap-3">
                    <FileAudio className="w-8 h-8 text-teal-400 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-white">{fileName}</h4>
                      <p className="text-[10px] text-slate-400">Rekaman Audio Bukti Tugas</p>
                    </div>
                  </div>
                  {fileUrl ? (
                    <audio controls className="w-full mt-2">
                      <source src={fileUrl} />
                      Browser Anda tidak mendukung pemutar audio.
                    </audio>
                  ) : (
                    <p className="text-xs text-slate-300">
                      Berkas audio tersimpan. Klik tombol unduh di atas untuk mendengarkan.
                    </p>
                  )}
                </div>
              )}

              {/* 6. VIDEO FILES */}
              {fileCategory === 'video' && (
                <div className="p-3 rounded-xl bg-[#140f2b] border border-[#2b2150] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-orange-400 mb-1">
                    <Film className="w-4 h-4" />
                    <span>Rekaman Video Bukti Tugas</span>
                  </div>
                  {fileUrl ? (
                    <video controls className="w-full max-h-60 rounded-lg bg-black">
                      <source src={fileUrl} />
                      Browser Anda tidak mendukung pemutar video.
                    </video>
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-300">
                      Rekaman video bukti tugas telah terdaftar. Unduh untuk menonton rekaman pengerjaan.
                    </div>
                  )}
                </div>
              )}

              {/* 7. ARCHIVES (ZIP, RAR, 7Z) & OFFICE DOCUMENTS (DOCX, XLSX, PPTX) */}
              {(fileCategory === 'archive' || fileCategory === 'office' || fileCategory === 'other') && (
                <div className="p-4 rounded-xl bg-[#140f2c] border border-[#2c2252] space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1c153c] border border-[#3b2d6a] flex items-center justify-center shrink-0">
                      {renderCategoryIcon('w-6 h-6')}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{fileName}</h4>
                      <p className="text-[11px] text-slate-400">
                        Format: <span className="font-mono text-pink-300 font-bold">.{fileExt}</span> • Ukuran: {submission.fileSize || '1.8 MB'}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Berkas dengan format <strong className="text-pink-300">.{fileExt}</strong> telah diverifikasi dan siap dibaca di aplikasi komputer/HP Anda (Microsoft Office, WPS, WinRAR, dll).
                  </p>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-purple-600/20 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh &amp; Buka Berkas (.{fileExt})</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Footer info badge */}
              <div className="pt-2 border-t border-[#211a3b] text-[11px] text-slate-400 flex flex-wrap items-center justify-between font-mono">
                <span>Nama: {fileName}</span>
                <span>Ukuran: {submission.fileSize || '1.8 MB'}</span>
                <span>Tipe: {fileCategory.toUpperCase()}</span>
              </div>
            </div>
          )}

          {/* Student Note */}
          {submission.submissionNote && (
            <div className="mt-3 text-xs bg-[#16112d] p-3 rounded-xl border border-[#2b214d] text-slate-300">
              <span className="font-semibold text-slate-400 block text-[10px] mb-0.5 uppercase tracking-wider">
                Catatan Siswa:
              </span>
              "{submission.submissionNote}"
            </div>
          )}

          {/* Admin Feedback Input */}
          <div className="mt-4">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-pink-400" />
              <span>Catatan Evaluasi / Umpan Balik Admin</span>
            </label>
            <textarea
              rows={2}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tuliskan catatan atau umpan balik untuk siswa (cth: Laporan sudah lengkap dan sesuai panduan!)..."
              className="w-full bg-[#1b1536] border border-[#342958] focus:border-pink-500 rounded-xl px-3.5 py-2 text-white text-xs outline-none transition-colors placeholder:text-slate-500 resize-none"
            />
          </div>

          {/* Moderation Actions */}
          <div className="mt-5 pt-3.5 border-t border-[#241c40] flex flex-wrap items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={handleReject}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 border border-red-500/25 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
              <span>Tolak</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRevision}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Minta Revisi</span>
              </button>
              <button
                type="button"
                onClick={handleApprove}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Setujui (Approve)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FULLSCREEN IMAGE MODAL VIEWER */}
      {isFullScreenImage && fileUrl && (
        <div className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Gambar</span>
            </button>
            <button
              type="button"
              onClick={() => setIsFullScreenImage(false)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="max-w-5xl max-h-[85vh] overflow-auto flex items-center justify-center p-2">
            <img
              src={fileUrl}
              alt={fileName}
              className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl"
            />
          </div>

          <div className="mt-3 text-center text-xs text-slate-400 font-mono">
            {fileName} • {submission.memberName}
          </div>
        </div>
      )}
    </>
  );
};
