import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import {
  QrCode,
  Camera,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Calendar,
  Lock,
  RotateCw,
  MapPin,
  Smartphone,
  Sparkles,
  Search,
  Check,
  ChevronRight,
  Send,
  Video,
  VideoOff,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AttendanceSession, AttendanceRecord, AttendanceStatus } from '../../types';

export const AttendanceMemberView: React.FC = () => {
  const {
    currentClass,
    currentUser,
    attendanceSessions,
    attendanceRecords,
    recordAttendance,
    showToast,
  } = useApp();

  // Find active session for this member's class
  const targetClassId = currentClass?.id || currentUser?.classId || '';
  const activeSession = attendanceSessions.find((s) => {
    const isClassMatch = !targetClassId || s.classId === targetClassId || (currentClass?.code && s.classId === currentClass.code);
    return isClassMatch && s.isActive;
  });

  // Current member's record for the active session
  const myRecordForActive = activeSession
    ? attendanceRecords.find((r) => r.sessionId === activeSession.id && r.studentId === currentUser?.id)
    : null;

  // Scanner & Input State
  const [activeMode, setActiveMode] = useState<'camera' | 'permission'>('camera');
  const [permissionStatus, setPermissionStatus] = useState<AttendanceStatus>('izin');
  const [permissionNote, setPermissionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Camera video ref and scanner loop
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const isScanningRef = useRef<boolean>(false);

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Fitur kamera tidak didukung atau tidak tersedia di peramban ini.');
      }

      let stream: MediaStream;
      try {
        // Coba kamera belakang (environment) terlebih dahulu
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback jika facingMode khusus tidak didukung (misal di PC / Laptop)
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        videoRef.current.setAttribute('muted', 'true');
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Izin kamera ditolak. Harap izinkan akses kamera pada setelan peramban Anda untuk memindai Kode QR.'
          : err.message || 'Gagal mengakses kamera perangkat.'
      );
      setIsCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  };

  // Switch camera on/off when mode changes
  useEffect(() => {
    if (activeMode === 'camera' && !myRecordForActive && activeSession) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeMode, myRecordForActive, activeSession]);

  // QR Scanning Loop using jsQR
  useEffect(() => {
    if (!isCameraActive || isSubmitting) return;

    const scanFrame = () => {
      if (isScanningRef.current || isSubmitting) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        return;
      }

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (vw === 0 || vh === 0) return;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      // Downsample to max 640px for ultra fast processing on mobile devices
      const maxDim = 640;
      const scale = Math.min(1, maxDim / Math.max(vw, vh));
      const targetW = Math.floor(vw * scale);
      const targetH = Math.floor(vh * scale);

      canvas.width = targetW;
      canvas.height = targetH;
      ctx.drawImage(video, 0, 0, targetW, targetH);

      const imageData = ctx.getImageData(0, 0, targetW, targetH);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });

      if (code && code.data && activeSession) {
        isScanningRef.current = true;
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(100);
          } catch {}
        }
        handleProcessScan(code.data);
      }
    };

    scanIntervalRef.current = window.setInterval(scanFrame, 120);
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [isCameraActive, activeSession, isSubmitting]);

  // Handle Process QR Scan
  const handleProcessScan = async (scannedData: string) => {
    if (!activeSession || isSubmitting) {
      isScanningRef.current = false;
      return;
    }
    setIsSubmitting(true);

    let coords: { lat: number; lng: number } | undefined;
    if (activeSession.requireLocation) {
      coords = await getCoordsPromise();
    }

    const res = await recordAttendance(
      activeSession.id,
      'hadir',
      'qr_scan',
      undefined,
      scannedData,
      coords
    );

    setIsSubmitting(false);
    if (res.success) {
      showToast('Presensi Anda berhasil dicatat! ✓', 'success');
      stopCamera();
    } else {
      showToast(res.message, 'warn');
      // Berikan jeda 1.5 detik sebelum memindai ulang bila gagal
      setTimeout(() => {
        isScanningRef.current = false;
      }, 1500);
    }
  };

  // Handle Izin / Sakit Submit
  const handlePermissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || isSubmitting) return;

    if (!permissionNote.trim()) {
      showToast('Harap sertakan alasan/keterangan izin atau sakit.', 'warn');
      return;
    }

    setIsSubmitting(true);
    const res = await recordAttendance(
      activeSession.id,
      permissionStatus,
      'permission_request',
      permissionNote.trim()
    );
    setIsSubmitting(false);
  };

  // Helper promise for geolocation
  const getCoordsPromise = (): Promise<{ lat: number; lng: number } | undefined> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(undefined);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(undefined),
        { enableHighAccuracy: true, timeout: 6000 }
      );
    });
  };

  // Member's all attendance history
  const myAllRecords = attendanceRecords.filter((r) => r.studentId === currentUser?.id);
  const totalMySessions = attendanceSessions.filter(
    (s) => !targetClassId || s.classId === targetClassId || (currentClass?.code && s.classId === currentClass.code)
  ).length;

  const myHadir = myAllRecords.filter((r) => r.status === 'hadir').length;
  const myIzin = myAllRecords.filter((r) => r.status === 'izin').length;
  const mySakit = myAllRecords.filter((r) => r.status === 'sakit').length;
  const myAttendanceRate = totalMySessions > 0 ? Math.round(((myHadir + myIzin + mySakit) / totalMySessions) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1b1338] via-[#140e2d] to-[#0c081c] border border-[#2c1e54] p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 font-extrabold text-[11px] flex items-center gap-1.5 shadow-sm">
                <QrCode className="w-3.5 h-3.5 text-pink-400" />
                Presensi Digital Kelas
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 font-bold text-[10px]">
                {currentClass?.name || 'Ruang Kelas'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Absensi &amp; Scan Barcode Kelas
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
              Scan barcode dinamis yang tampil di layar proyektor kelas atau masukkan kode dinamis untuk mencatat kehadiran Anda.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="p-3.5 rounded-2xl bg-[#140f2b] border border-[#271d49] text-center min-w-36 shrink-0">
            <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">
              Tingkat Kehadiran
            </span>
            <span className="text-xl font-black text-pink-400 font-mono">
              {myAttendanceRate}%
            </span>
          </div>
        </div>
      </div>

      {/* ACTIVE ATTENDANCE SECTION */}
      {activeSession ? (
        <div className="space-y-4">
          {myRecordForActive ? (
            /* ALREADY ATTENDED CARD */
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#14102e] to-[#0d091e] border border-emerald-500/40 shadow-2xl flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center animate-in zoom-in-95 duration-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black uppercase tracking-wider inline-block mb-2">
                  PRESENSI BERHASIL DICATAT
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white">
                  {activeSession.title}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Status Anda:{' '}
                  <strong className="text-emerald-400 uppercase font-black">
                    {myRecordForActive.status}
                  </strong>{' '}
                  • Waktu Check-in:{' '}
                  <span className="font-mono text-white font-bold">
                    {new Date(myRecordForActive.checkInTime).toLocaleTimeString('id-ID')} WIB
                  </span>
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[#161131] border border-[#271d49] text-xs text-slate-400 max-w-md flex items-center justify-center gap-2">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Presensi telah terkunci. Setiap siswa hanya dapat melakukan presensi 1 kali per sesi.
                </span>
              </div>
            </div>
          ) : (
            /* SCANNER & CHECK-IN FORM */
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#150f2e] to-[#0e091e] border border-[#2d1e56] shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#251b47]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    SESI PRESENSI AKTIF SEKARANG
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {activeSession.title}
                  </h3>
                  {activeSession.subject && (
                    <span className="text-xs text-purple-300 font-semibold">
                      Mata Pelajaran: {activeSession.subject}
                    </span>
                  )}
                </div>

                {/* Mode Selector */}
                <div className="flex items-center gap-1 bg-[#140e29] p-1 rounded-xl border border-[#281b4e]">
                  <button
                    type="button"
                    onClick={() => setActiveMode('camera')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeMode === 'camera'
                        ? 'bg-pink-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Scan Kamera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMode('permission')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeMode === 'permission'
                        ? 'bg-pink-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Izin / Sakit</span>
                  </button>
                </div>
              </div>

              {/* MODE 1: CAMERA SCANNER */}
              {activeMode === 'camera' && (
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative w-full max-w-sm aspect-square rounded-3xl bg-[#090717] border-2 border-pink-500/40 overflow-hidden shadow-2xl flex items-center justify-center">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Scanner Reticle Overlay */}
                    <div className="absolute inset-8 border-2 border-dashed border-pink-400/70 rounded-2xl pointer-events-none flex items-center justify-center animate-pulse">
                      <div className="w-full h-0.5 bg-pink-500 shadow-md shadow-pink-500/80 animate-bounce" />
                    </div>

                    {cameraError && (
                      <div className="absolute inset-0 p-6 bg-black/90 flex flex-col items-center justify-center text-center space-y-3">
                        <VideoOff className="w-10 h-10 text-red-400" />
                        <p className="text-xs text-red-300 max-w-xs">{cameraError}</p>
                        <button
                          type="button"
                          onClick={startCamera}
                          className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs cursor-pointer shadow-md flex items-center gap-2 transition-all active:scale-95"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>Coba Akses Kamera Lagi</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 text-center max-w-sm leading-relaxed">
                    Arahkan kamera HP Anda ke <strong>Kode QR di layar proyektor kelas</strong>. Presensi Anda akan otomatis tercatat seketika!
                  </p>
                </div>
              )}

              {/* MODE 2: AJUKAN IZIN / SAKIT */}
              {activeMode === 'permission' && (
                <form onSubmit={handlePermissionSubmit} className="max-w-md mx-auto space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      Pilih Jenis Keterangan:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPermissionStatus('izin')}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          permissionStatus === 'izin'
                            ? 'bg-blue-500/20 border-blue-500 text-blue-300 shadow-sm'
                            : 'bg-[#120e26] border-[#291e4f] text-slate-400'
                        }`}
                      >
                        Izin
                      </button>
                      <button
                        type="button"
                        onClick={() => setPermissionStatus('sakit')}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          permissionStatus === 'sakit'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                            : 'bg-[#120e26] border-[#291e4f] text-slate-400'
                        }`}
                      >
                        Sakit
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      Alasan &amp; Keterangan Lengkap *:
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={permissionNote}
                      onChange={(e) => setPermissionNote(e.target.value)}
                      placeholder="Tuliskan keterangan lengkap (misal: Sakit demam berobat ke klinik, ada urusan keluarga mendesak)..."
                      className="w-full p-3 rounded-xl bg-[#120e26] border border-[#291e4f] text-xs text-white focus:outline-none focus:border-pink-500 resize-none leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white font-extrabold text-xs shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'Mengirim Pengajuan...' : 'Kirim Pengajuan Izin / Sakit'}</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      ) : (
        /* NO ACTIVE SESSION BANNER */
        <div className="p-8 text-center rounded-3xl bg-[#140e2b] border border-[#271d49] space-y-3">
          <Clock className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">Tidak Ada Sesi Presensi Yang Aktif</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Guru atau Admin belum membuka sesi presensi digital saat ini. Halaman ini akan otomatis aktif begitu barcode kelas dibuka di depan kelas.
          </p>
        </div>
      )}

      {/* MEMBER'S ATTENDANCE TIMELINE HISTORY */}
      <div className="p-6 rounded-3xl bg-[#140f2b] border border-[#271d49] space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#251b47]">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-pink-400" />
            <span>Riwayat Presensi Saya ({myAllRecords.length})</span>
          </h4>
          <span className="text-xs font-mono font-bold text-emerald-400">
            {myHadir} Hadir • {myIzin} Izin • {mySakit} Sakit
          </span>
        </div>

        {myAllRecords.length === 0 ? (
          <div className="py-6 text-center text-slate-500 text-xs">
            Belum ada riwayat presensi yang tercatat untuk akun Anda.
          </div>
        ) : (
          <div className="space-y-2">
            {myAllRecords.map((rec) => {
              const session = attendanceSessions.find((s) => s.id === rec.sessionId);

              return (
                <div
                  key={rec.id}
                  className="p-3.5 rounded-2xl bg-[#181235] border border-[#291e4d] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-white truncate">
                      {session?.title || 'Sesi Presensi Kelas'}
                    </h5>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span className="font-mono">{new Date(rec.checkInTime).toLocaleDateString('id-ID')}</span>
                      <span>•</span>
                      <span className="font-mono">{new Date(rec.checkInTime).toLocaleTimeString('id-ID')} WIB</span>
                      {rec.note && <span className="truncate italic">({rec.note})</span>}
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase shrink-0 ${
                      rec.status === 'hadir'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : rec.status === 'izin'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {rec.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
