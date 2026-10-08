import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import {
  Calendar,
  Clock,
  MapPin,
  QrCode,
  Scan,
  CheckCircle2,
  AlertTriangle,
  FileText,
  UploadCloud,
  Maximize2,
  X,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  Eye,
  Download,
  Camera,
  Trash2,
  Sliders,
  Check,
  Copy,
  Lock,
  Unlock,
  Image as ImageIcon,
  Barcode,
  Zap,
  RotateCw,
  Sparkles,
  HelpCircle,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  AttendanceSession,
  AttendanceRecord,
  AttendanceStatus,
} from '../../types';
import { calculateDistanceMeters, getCurrentCoordinates } from '../../utils/geolocation';
import { formatIndonesianDate, playNotificationSound } from '../../utils/notification';

export const AttendanceView: React.FC = () => {
  const {
    currentUser,
    currentRole,
    currentClass,
    attendanceSessions,
    attendanceRecords,
    createAttendanceSession,
    toggleAttendanceSession,
    deleteAttendanceSession,
    submitAttendance,
    showToast,
  } = useApp();

  const isAdmin = currentRole === 'admin' || currentRole === 'owner';

  // Admin states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [fullscreenQrSession, setFullscreenQrSession] = useState<AttendanceSession | null>(null);
  const [selectedProofRecord, setSelectedProofRecord] = useState<AttendanceRecord | null>(null);

  // Form states for creating session
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formStartTime, setFormStartTime] = useState('07:30');
  const [formEndTime, setFormEndTime] = useState('16:00');
  const [formLat, setFormLat] = useState<number>(-6.2088); // Default fallback: Jakarta
  const [formLon, setFormLon] = useState<number>(106.8456);
  const [isDetectingAdminGps, setIsDetectingAdminGps] = useState(false);

  // Member states
  const [activeTab, setActiveTab] = useState<'scan' | 'history'>('scan');
  const [scannedQrToken, setScannedQrToken] = useState('');
  const [memberStatus, setMemberStatus] = useState<AttendanceStatus>('hadir');
  const [memberNote, setMemberNote] = useState('');
  const [proofFileName, setProofFileName] = useState('');
  const [proofFileUrl, setProofFileUrl] = useState('');
  const [memberLat, setMemberLat] = useState<number | null>(null);
  const [memberLon, setMemberLon] = useState<number | null>(null);
  const [isCheckingMemberGps, setIsCheckingMemberGps] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Camera QR Scanner states
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorchSupport, setHasTorchSupport] = useState(false);
  const [showScanTips, setShowScanTips] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const tickCountRef = useRef<number>(0);

  // QR Code data URLs cache
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});

  // Filter sessions for current class
  const classSessions = attendanceSessions.filter((s) => {
    if (!currentClass) return true;
    return s.classId === currentClass.id;
  });

  const activeSession = classSessions.find((s) => s.isActive) || classSessions[0] || null;

  // Generate QR Code data URL when session is loaded with high contrast and error correction
  useEffect(() => {
    classSessions.forEach(async (sess) => {
      if (!qrDataUrls[sess.id]) {
        try {
          const payload = JSON.stringify({
            app: 'RemindTask',
            type: 'rt_attend_qr_v1',
            sid: sess.id,
            sessionId: sess.id,
            tok: sess.code,
            code: sess.code,
            classId: sess.classId,
          });
          const url = await QRCode.toDataURL(payload, {
            width: 360,
            margin: 2,
            errorCorrectionLevel: 'M',
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
          });
          setQrDataUrls((prev) => ({ ...prev, [sess.id]: url }));
        } catch (err) {
          console.warn('Generate QR Error:', err);
        }
      }
    });
  }, [classSessions]);

  // Realtime continuous GPS watch for member
  useEffect(() => {
    if (!isAdmin && 'geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setMemberLat(pos.coords.latitude);
          setMemberLon(pos.coords.longitude);
        },
        (err) => {
          console.warn('Geolocation watchPosition error:', err);
        },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
      );
    }
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isAdmin]);

  // Process decoded QR data
  const processDecodedCode = (decodedRaw: string) => {
    const token = decodedRaw.trim();
    setScannedQrToken(token);
    playNotificationSound('beep');
    showToast('QR Code presensi berhasil dipindai!', 'success');
    stopCamera();
  };

  // Continuous frame scanner loop using jsQR & advanced multi-strategy processing
  const tickScanner = useCallback(() => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      const vw = video.videoWidth || 640;
      const vh = video.videoHeight || 480;

      // Throttle scanning to once every 180ms to prevent main thread blocking,
      // keeping the camera feed buttery smooth at 60 FPS for instant hardware autofocus.
      const now = Date.now();
      if (now - lastScanTimeRef.current >= 180) {
        lastScanTimeRef.current = now;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          tickCountRef.current += 1;
          const strategy = tickCountRef.current % 3;

          let code: any = null;

          if (strategy === 0) {
            // STRATEGY 1: Center-crop (75% of shortest side), standard contrast.
            // Extremely fast because canvas is small, and zoomed-in for distant scanning.
            const minDim = Math.min(vw, vh);
            const cropSize = Math.floor(minDim * 0.75);
            const sx = Math.floor((vw - cropSize) / 2);
            const sy = Math.floor((vh - cropSize) / 2);

            canvas.width = 420;
            canvas.height = 420;
            ctx.filter = 'none';
            ctx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, 420, 420);

            const imageData = ctx.getImageData(0, 0, 420, 420);
            code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth',
            });
          } else if (strategy === 1) {
            // STRATEGY 2: Center-crop (75% of shortest side), high-contrast grayscale.
            // Ideal for screen reflections, glare, and low-contrast projector displays!
            const minDim = Math.min(vw, vh);
            const cropSize = Math.floor(minDim * 0.75);
            const sx = Math.floor((vw - cropSize) / 2);
            const sy = Math.floor((vh - cropSize) / 2);

            canvas.width = 420;
            canvas.height = 420;
            ctx.filter = 'contrast(1.6) brightness(1.15) grayscale(1)';
            ctx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, 420, 420);

            const imageData = ctx.getImageData(0, 0, 420, 420);
            code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth',
            });
          } else {
            // STRATEGY 3: Full downsampled view.
            // Handles cases where the student is holding the phone crooked or offset.
            canvas.width = 480;
            canvas.height = Math.floor(480 * (vh / vw));
            ctx.filter = 'none';
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth',
            });
          }

          if (code && code.data) {
            processDecodedCode(code.data);
            return;
          }
        }
      }
    }
    scanLoopRef.current = requestAnimationFrame(tickScanner);
  }, [processDecodedCode]);

  // Start Camera Scanner
  const startCamera = async (targetFacing: 'environment' | 'user' = facingMode) => {
    setIsScannerActive(true);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      }
      streamRef.current = stream;

      try {
        const videoTrack = stream.getVideoTracks()[0];
        const capabilities: any = videoTrack?.getCapabilities ? videoTrack.getCapabilities() : {};
        setHasTorchSupport(Boolean(capabilities?.torch));
      } catch {
        setHasTorchSupport(false);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        scanLoopRef.current = requestAnimationFrame(tickScanner);
      }
    } catch (err) {
      showToast('Tidak dapat membuka kamera. Silakan pindaikan dari foto QR atau izinkan akses kamera.', 'warn');
      setIsScannerActive(false);
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        const nextState = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setIsTorchOn(nextState);
      }
    } catch (err) {
      console.warn('Torch toggle error:', err);
    }
  };

  const toggleCameraFacing = async () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    await startCamera(nextFacing);
  };

  const stopCamera = () => {
    if (scanLoopRef.current !== null) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScannerActive(false);
    setIsTorchOn(false);
  };

  // Scan QR from image file
  const handleScanFromImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(imgData.data, imgData.width, imgData.height);
          if (result && result.data) {
            processDecodedCode(result.data);
          } else {
            showToast('Tidak dapat mendeteksi QR code dari gambar tersebut. Coba foto lebih dekat.', 'warn');
          }
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Member GPS Auto Check on Load
  const handleGetMemberLocation = async () => {
    setIsCheckingMemberGps(true);
    try {
      const coords = await getCurrentCoordinates();
      setMemberLat(coords.latitude);
      setMemberLon(coords.longitude);
      showToast('Titik koordinat GPS Anda berhasil dideteksi!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal membaca GPS. Pastikan izin lokasi aktif.', 'warn');
    } finally {
      setIsCheckingMemberGps(false);
    }
  };

  useEffect(() => {
    if (!isAdmin && activeSession) {
      handleGetMemberLocation();
    }
  }, [isAdmin, activeSession?.id]);

  // Admin GPS Location helper
  const handleDetectAdminLocation = async () => {
    setIsDetectingAdminGps(true);
    try {
      const coords = await getCurrentCoordinates();
      setFormLat(coords.latitude);
      setFormLon(coords.longitude);
      showToast(`Lokasi kelas terdeteksi (Lat: ${coords.latitude.toFixed(4)}, Lon: ${coords.longitude.toFixed(4)})`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal membaca GPS lokasi Anda.', 'warn');
    } finally {
      setIsDetectingAdminGps(false);
    }
  };

  // Handle proof upload for Sakit / Izin
  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      showToast('Ukuran berkas melebihi batas 12MB.', 'warn');
      return;
    }

    setProofFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProofFileUrl((ev.target?.result as string) || '');
      showToast(`Lampiran bukti ${file.name} berhasil diunggah!`, 'success');
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Submit attendance from member
  const handleMemberSubmitAttendance = async (sessionToSubmit: AttendanceSession) => {
    if (isSubmitting) return;

    // Radius Validation for 'Hadir'
    if (memberStatus === 'hadir') {
      const sessLat = sessionToSubmit.latitude;
      const sessLon = sessionToSubmit.longitude;
      const hasSessionCoords = sessLat !== undefined && sessLon !== undefined && sessLat !== 0 && sessLon !== 0;

      if (hasSessionCoords || sessionToSubmit.requireLocation) {
        if (memberLat === null || memberLon === null || isNaN(memberLat) || isNaN(memberLon) || (memberLat === 0 && memberLon === 0)) {
          showToast('Wajib mengaktifkan lokasi GPS untuk presensi Hadir!', 'warn');
          await handleGetMemberLocation();
          return;
        }
        const maxRadius = sessionToSubmit.radiusMeters || 100;
        const dist = calculateDistanceMeters(
          sessLat || 0,
          sessLon || 0,
          memberLat,
          memberLon
        );
        if (dist > maxRadius) {
          showToast(`Presensi HADIR Ditolak! Anda terdeteksi berada ${dist} meter di luar area kelas (Maksimal radius ${maxRadius}m). Terdeteksi potensi sabotase lokasi!`, 'warn');
          return;
        }
      }
    }

    // Attachment validation for Sakit & Izin (Optional now)
    // Optional photo proof attachment allowed for any status

    setIsSubmitting(true);
    try {
      const res = await submitAttendance({
        sessionId: sessionToSubmit.id,
        status: memberStatus,
        latitude: memberLat || undefined,
        longitude: memberLon || undefined,
        proofFileName: proofFileName || undefined,
        proofFileUrl: proofFileUrl || undefined,
        note: memberNote.trim() || undefined,
        verificationToken: scannedQrToken.trim() || undefined,
      });

      if (res.success) {
        playNotificationSound('success');
        showToast(res.message, 'success');
        stopCamera();
        setProofFileName('');
        setProofFileUrl('');
        setMemberNote('');
        setScannedQrToken('');
      } else {
        showToast(res.message, 'warn');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate distance for member display
  const currentDistanceMeters =
    activeSession && memberLat !== null && memberLon !== null
      ? calculateDistanceMeters(activeSession.latitude ?? 0, activeSession.longitude ?? 0, memberLat, memberLon)
      : null;

  const isWithin100m = currentDistanceMeters !== null && currentDistanceMeters <= (activeSession?.radiusMeters || 100);

  // Handle create session submission
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('Judul sesi absensi harus diisi.', 'warn');
      return;
    }
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    await createAttendanceSession({
      classId: currentClass?.id || 'class-1',
      className: currentClass?.name || 'Ruang Kelas',
      title: formTitle.trim(),
      code,
      date: formDate,
      startTime: formStartTime,
      endTime: formEndTime,
      latitude: formLat,
      longitude: formLon,
      radiusMeters: 100, // Strictly 100 meters
      isActive: true,
      tokenRefreshInterval: 15,
      createdBy: currentUser?.id || 'admin',
    });
    setIsCreateModalOpen(false);
    setFormTitle('');
    showToast('Sesi absensi baru dengan radius 100m berhasil dibuat!', 'success');
  };

  // Records for active session
  const currentSessionRecords = attendanceRecords.filter(
    (r) => r.sessionId === activeSession?.id
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#20153f] via-[#1a1233] to-[#120f26] border border-[#37275f] p-6 sm:p-7 shadow-xl">
        <div className="absolute right-0 top-0 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5 shadow-lg shadow-pink-500/25 flex items-center justify-center text-white shrink-0">
              <QrCode className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold text-[10px] uppercase tracking-wider border border-pink-500/30">
                  {isAdmin ? 'Panel Absensi Admin' : 'Presensi & Scan QR Siswa'}
                </span>
                <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  Radius Akurat 100 Meter
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Sesi Absensi Kelas &amp; Scan Barcode
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 font-medium">
                Verifikasi kehadiran otomatis dengan pelacakan lokasi GPS 100m dan unggah bukti surat izin/sakit.
              </p>
            </div>
          </div>

          {isAdmin ? (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-pink-500/25 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Buka Sesi Absensi Baru</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('scan')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'scan'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                    : 'bg-[#181333] text-slate-400 hover:text-white'
                }`}
              >
                Scan &amp; Absen Sekarang
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                    : 'bg-[#181333] text-slate-400 hover:text-white'
                }`}
              >
                Riwayat Presensi
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW FOR ADMIN / TEACHER */}
      {/* ========================================================================= */}
      {isAdmin && (
        <div className="space-y-6">
          {classSessions.length === 0 ? (
            <div className="p-12 text-center bg-[#141126] border border-[#272144] rounded-3xl space-y-3">
              <QrCode className="w-12 h-12 text-slate-600 mx-auto" />
              <h4 className="text-base font-bold text-white">Belum Ada Sesi Absensi</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Buat sesi absensi pertama untuk menampilkan Barcode &amp; QR Code ke siswa di proyektor kelas.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Sesi Absensi Sekarang</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Active Session Barcode & QR Display (5 cols) */}
              <div className="lg:col-span-5 bg-[#141126] border border-[#272144] rounded-3xl p-6 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#231d3f] mb-4">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-pink-400" />
                      <h3 className="font-bold text-white text-sm">QR Code &amp; Barcode Kelas</h3>
                    </div>
                    {activeSession && (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          activeSession.isActive
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : 'bg-red-500/15 border-red-500/30 text-red-300'
                        }`}
                      >
                        {activeSession.isActive ? 'SESI AKTIF' : 'DITUTUP'}
                      </span>
                    )}
                  </div>

                  {activeSession && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-base font-black text-white">{activeSession.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-pink-400" />
                          <span>{activeSession.date}</span>
                          <span>•</span>
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>{activeSession.startTime} - {activeSession.endTime} WIB</span>
                        </div>
                      </div>

                      {/* Crisp QR Code Container */}
                      <div className="bg-white p-4 rounded-3xl shadow-2xl flex flex-col items-center justify-center border-4 border-pink-500/40 relative group">
                        {qrDataUrls[activeSession.id] ? (
                          <img
                            src={qrDataUrls[activeSession.id]}
                            alt="QR Code Absensi"
                            className="w-56 h-56 object-contain"
                          />
                        ) : (
                          <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
                            Membuat QR Code...
                          </div>
                        )}
                        <span className="text-[10px] font-black font-mono text-slate-900 mt-1 uppercase tracking-widest">
                          SCAN ME • REMINDTASK
                        </span>
                      </div>

                      {/* GPS Radius Metric */}
                      <div className="p-3 rounded-xl bg-[#16122d] border border-[#271e49] text-xs text-slate-300 flex items-center gap-2.5">
                        <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <span className="font-bold text-white block">Validasi Radius 100 Meter:</span>
                          <span className="text-[11px] text-slate-400">
                            Titik Kelas: {activeSession.latitude?.toFixed(4) || '0.0000'}, {activeSession.longitude?.toFixed(4) || '0.0000'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {activeSession && (
                  <div className="pt-4 border-t border-[#231d3f] flex items-center gap-2 mt-4">
                    <button
                      onClick={() => setFullscreenQrSession(activeSession)}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95"
                    >
                      <Maximize2 className="w-4 h-4" />
                      <span>Proyektor / Layar Penuh</span>
                    </button>
                    <button
                      onClick={() => toggleAttendanceSession(activeSession.id)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold border cursor-pointer ${
                        activeSession.isActive
                          ? 'bg-red-500/15 border-red-500/30 text-red-300 hover:bg-red-500/25'
                          : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                      }`}
                      title={activeSession.isActive ? 'Tutup sesi absensi' : 'Buka kembali sesi'}
                    >
                      {activeSession.isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Attendance Records & Proof Review (7 cols) */}
              <div className="lg:col-span-7 bg-[#141126] border border-[#272144] rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#231d3f] mb-4">
                    <div>
                      <h3 className="font-bold text-white text-base">Rekapitulasi Kehadiran Siswa</h3>
                      <p className="text-xs text-slate-400">
                        {currentSessionRecords.length} siswa telah tercatat di sesi ini
                      </p>
                    </div>
                    {/* Status Counter Chips */}
                    <div className="flex items-center gap-1.5 font-mono text-xs">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                        H: {currentSessionRecords.filter((r) => r.status === 'hadir').length}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30">
                        S: {currentSessionRecords.filter((r) => r.status === 'sakit').length}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 font-bold border border-blue-500/30">
                        I: {currentSessionRecords.filter((r) => r.status === 'izin').length}
                      </span>
                    </div>
                  </div>

                  {/* Records Table */}
                  <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                    {currentSessionRecords.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-xs">
                        Belum ada siswa yang melakukan presensi di sesi ini.
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#261f44] text-slate-400">
                            <th className="pb-3 font-semibold">Nama Siswa</th>
                            <th className="pb-3 font-semibold">Status</th>
                            <th className="pb-3 font-semibold">Jarak / GPS</th>
                            <th className="pb-3 font-semibold">Bukti / Surat</th>
                            <th className="pb-3 font-semibold text-right">Waktu</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#201938]">
                          {currentSessionRecords.map((rec) => {
                            const isHadir = rec.status === 'hadir';
                            const hasProof = !!rec.proofFileUrl;
                            return (
                              <tr key={rec.id} className="hover:bg-[#1a1438] transition-colors">
                                <td className="py-3 font-bold text-white flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 text-white flex items-center justify-center text-[10px]">
                                    {rec.studentName.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="truncate max-w-[140px]">{rec.studentName}</span>
                                </td>
                                <td className="py-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] border ${
                                      rec.status === 'hadir'
                                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                        : rec.status === 'sakit'
                                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                                        : rec.status === 'izin'
                                        ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                                        : 'bg-red-500/15 border-red-500/30 text-red-400'
                                    }`}
                                  >
                                    {rec.status}
                                  </span>
                                </td>
                                <td className="py-3 font-mono text-[11px]">
                                  {rec.distanceMeters !== undefined ? (
                                    <span
                                      className={
                                        rec.isWithinRadius
                                          ? 'text-emerald-400 font-semibold'
                                          : 'text-red-400 font-semibold'
                                      }
                                    >
                                      {rec.distanceMeters}m ({rec.isWithinRadius ? 'Valid' : 'Luar Radius'})
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">-</span>
                                  )}
                                </td>
                                <td className="py-3">
                                  {hasProof ? (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedProofRecord(rec)}
                                      className="px-2.5 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 text-[10px] font-bold border border-pink-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                                      title="Lihat lampiran surat dokter / izin"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>Lihat Bukti</span>
                                    </button>
                                  ) : (
                                    <span className="text-slate-500 text-[10px]">Tidak ada</span>
                                  )}
                                </td>
                                <td className="py-3 text-right font-mono text-[10px] text-slate-400">
                                  {formatIndonesianDate(rec.timestamp || rec.checkInTime || rec.createdAt).slice(-9)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW FOR MEMBER (SISWA) */}
      {/* ========================================================================= */}
      {!isAdmin && (
        <div className="space-y-6">
          {activeTab === 'scan' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Live GPS & Status Options (6 cols) */}
              <div className="md:col-span-6 bg-[#141126] border border-[#272144] rounded-3xl p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#231d3f]">
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-pink-400" />
                    <span>Status &amp; Lokasi Presensi</span>
                  </h3>
                  <button
                    onClick={handleGetMemberLocation}
                    disabled={isCheckingMemberGps}
                    className="p-1.5 rounded-xl bg-[#1e173d] text-pink-300 hover:text-white border border-[#312558] cursor-pointer"
                    title="Cek ulang lokasi GPS"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingMemberGps ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Live Distance Meter (Radius 100m) */}
                <div
                  className={`p-4 rounded-2xl border flex items-center justify-between ${
                    isWithin100m
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : memberLat !== null
                      ? 'bg-red-500/10 border-red-500/30 text-red-300'
                      : 'bg-[#181333] border-[#2f2452] text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                        isWithin100m ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider block">
                        STATUS JANGKAUAN RADIUS 100M:
                      </span>
                      <h4 className="font-bold text-sm text-white">
                        {currentDistanceMeters !== null
                          ? `${currentDistanceMeters} Meter dari Kelas`
                          : 'Mendeteksi GPS...'}
                      </h4>
                    </div>
                  </div>
                  <div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        isWithin100m
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-red-500/20 border-red-500/40 text-red-300'
                      }`}
                    >
                      {isWithin100m ? 'Dalam Jangkauan' : 'Di Luar 100m'}
                    </span>
                  </div>
                </div>

                {!isWithin100m && memberLat !== null && memberStatus === 'hadir' && (
                  <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Perhatian:</strong> Lokasi Anda di luar jangkauan 100 meter dari titik kelas. Anda tidak dapat melakukan presensi <strong>Hadir</strong> kecuali berada di dalam kelas. Jika berhalangan hadir, silakan pilih <strong>Sakit</strong> atau <strong>Izin</strong> dengan melampirkan bukti.
                    </span>
                  </div>
                )}

                {/* Status Selection: Hadir / Sakit / Izin */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300">Pilih Status Kehadiran:</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setMemberStatus('hadir')}
                      className={`py-3 px-2 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        memberStatus === 'hadir'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md'
                          : 'bg-[#181333] border-[#2e2452] text-slate-400 hover:text-white'
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>Hadir</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMemberStatus('sakit')}
                      className={`py-3 px-2 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        memberStatus === 'sakit'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md'
                          : 'bg-[#181333] border-[#2e2452] text-slate-400 hover:text-white'
                      }`}
                    >
                      <FileText className="w-5 h-5 text-amber-400" />
                      <span>Sakit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMemberStatus('izin')}
                      className={`py-3 px-2 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        memberStatus === 'izin'
                          ? 'bg-blue-500/20 border-blue-500 text-blue-300 shadow-md'
                          : 'bg-[#181333] border-[#2e2452] text-slate-400 hover:text-white'
                      }`}
                    >
                      <Clock className="w-5 h-5 text-blue-400" />
                      <span>Izin</span>
                    </button>
                  </div>
                </div>

                {/* Proof attachment (Opsional) */}
                <div className="p-4 rounded-2xl bg-[#181330] border border-[#2b224d] space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                      <UploadCloud className="w-4 h-4 text-pink-400" />
                      <span>Lampiran / Bukti Foto (Opsional):</span>
                    </span>
                    {proofFileName && (
                      <button
                        type="button"
                        onClick={() => {
                          setProofFileName('');
                          setProofFileUrl('');
                        }}
                        className="text-[10px] text-red-400 hover:text-red-300 font-bold underline cursor-pointer"
                      >
                        Hapus Foto
                      </button>
                    )}
                  </div>

                  {proofFileUrl && proofFileUrl.startsWith('data:image/') ? (
                    <div className="relative rounded-xl overflow-hidden border border-[#3d2e66] bg-[#120e24] p-2 flex items-center gap-3">
                      <img
                        src={proofFileUrl}
                        alt="Pratinjau Bukti Foto"
                        className="w-16 h-16 object-cover rounded-lg border border-purple-500/30 shrink-0"
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-bold text-white truncate">{proofFileName || 'Bukti_Foto.jpg'}</p>
                        <p className="text-[10px] text-emerald-400 font-medium">✓ Pratinjau foto siap terlampir</p>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-[#3d2e66] hover:border-pink-500 rounded-xl bg-[#120e24] cursor-pointer transition-colors group">
                      <UploadCloud className="w-6 h-6 text-pink-400 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-white text-center">
                        {proofFileName || 'Klik untuk pilih foto / surat keterangan (Opsional)'}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        Maks. 12MB • Foto (JPG, PNG, WebP), Surat Dokter, PDF
                      </span>
                      <input
                        type="file"
                        onChange={handleProofUpload}
                        accept="image/*,application/pdf"
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Note */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Catatan Keterangan (Opsional):
                  </label>
                  <input
                    type="text"
                    value={memberNote}
                    onChange={(e) => setMemberNote(e.target.value)}
                    placeholder="Contoh: Mengikuti lomba olimpiade / Sakit demam berobat ke RS..."
                    className="w-full bg-[#181333] border border-[#2f2454] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              {/* Right Column: Scan Camera QR Code (6 cols) */}
              <div className="md:col-span-6 bg-[#141126] border border-[#272144] rounded-3xl p-6 shadow-xl space-y-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#231d3f] mb-4">
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      <Scan className="w-4 h-4 text-pink-400" />
                      <span>Scan QR Code Presensi Kelas</span>
                    </h3>
                  </div>

                  {/* Scanned QR Confirmation Badge if scanned */}
                  {scannedQrToken && (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between mb-3 text-emerald-300 animate-in fade-in duration-200">
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>QR Code Presensi Terverifikasi!</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setScannedQrToken('')}
                        className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        Pindai Ulang
                      </button>
                    </div>
                  )}

                  {/* Camera Scanner Box */}
                  <div className="relative rounded-3xl overflow-hidden bg-black aspect-video sm:aspect-[4/3] border-2 border-pink-500/50 flex items-center justify-center mb-4 shadow-2xl select-none">
                    {isScannerActive ? (
                      <>
                        <video ref={videoRef} className="w-full h-full object-cover" />
                        <canvas ref={canvasRef} className="hidden" />

                        {/* Top Overlay Banner & Camera Controls */}
                        <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-auto z-10 gap-2">
                          <div className="px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-white flex items-center gap-2 shadow-lg">
                            <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
                            <span className="text-[11px] font-bold tracking-wide">
                              Arahkan ke Kotak
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Flashlight/Torch Toggle */}
                            {hasTorchSupport && (
                              <button
                                type="button"
                                onClick={toggleTorch}
                                className={`p-2 rounded-xl backdrop-blur-md border transition-all cursor-pointer ${
                                  isTorchOn
                                    ? 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/30'
                                    : 'bg-black/70 text-white border-white/10 hover:bg-black/90'
                                }`}
                                title={isTorchOn ? 'Matikan Senter' : 'Nyalakan Senter'}
                              >
                                <Zap className="w-4 h-4" />
                              </button>
                            )}

                            {/* Camera Switch (Flip) */}
                            <button
                              type="button"
                              onClick={toggleCameraFacing}
                              className="p-2 rounded-xl bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 transition-all cursor-pointer shadow-lg active:scale-95"
                              title="Ganti Kamera (Depan / Belakang)"
                            >
                              <RotateCw className="w-4 h-4" />
                            </button>

                            {/* Help Tips Toggle */}
                            <button
                              type="button"
                              onClick={() => setShowScanTips((v) => !v)}
                              className={`p-2 rounded-xl backdrop-blur-md border transition-all cursor-pointer ${
                                showScanTips
                                  ? 'bg-pink-500 text-white border-pink-400'
                                  : 'bg-black/70 text-white border-white/10 hover:bg-black/90'
                              }`}
                              title="Panduan Pemindaian"
                            >
                              <HelpCircle className="w-4 h-4" />
                            </button>

                            {/* Close Camera */}
                            <button
                              type="button"
                              onClick={stopCamera}
                              className="p-2 rounded-xl bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 transition-all cursor-pointer shadow-lg active:scale-95"
                              title="Tutup Kamera"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Target Reticle Viewfinder Box */}
                        <div className="relative w-48 h-48 sm:w-56 sm:h-56 max-w-[70vw] max-h-[70vw] my-auto flex items-center justify-center pointer-events-none">
                          {/* Dark vignette backdrop cutout outside the box */}
                          <div className="absolute inset-0 rounded-3xl shadow-[0_0_0_9999px_rgba(7,5,20,0.68)] pointer-events-none" />

                          {/* Border container with soft glow */}
                          <div className="absolute inset-0 rounded-3xl border-2 border-pink-500/40 shadow-[0_0_20px_rgba(236,72,153,0.25),inset_0_0_15px_rgba(236,72,153,0.1)] pointer-events-none" />

                          {/* 4 Crisp Neon Corner Brackets */}
                          <div className="absolute -top-1 -left-1 w-7 h-7 border-t-4 border-l-4 border-pink-400 rounded-tl-2xl shadow-[0_0_14px_rgba(236,72,153,0.8)] pointer-events-none" />
                          <div className="absolute -top-1 -right-1 w-7 h-7 border-t-4 border-r-4 border-pink-400 rounded-tr-2xl shadow-[0_0_14px_rgba(236,72,153,0.8)] pointer-events-none" />
                          <div className="absolute -bottom-1 -left-1 w-7 h-7 border-b-4 border-l-4 border-pink-400 rounded-bl-2xl shadow-[0_0_14px_rgba(236,72,153,0.8)] pointer-events-none" />
                          <div className="absolute -bottom-1 -right-1 w-7 h-7 border-b-4 border-r-4 border-pink-400 rounded-br-2xl shadow-[0_0_14px_rgba(236,72,153,0.8)] pointer-events-none" />

                          {/* Animated Laser Sweep Line */}
                          <div className="qr-scan-laser-line" />

                          {/* Center Alignment Target Crosshair */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
                            <div className="relative w-8 h-8 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full absolute bg-pink-400 animate-ping" />
                              <div className="w-1.5 h-1.5 rounded-full absolute bg-pink-400" />
                              <div className="w-5 h-[1.5px] absolute bg-pink-400/60" />
                              <div className="h-5 w-[1.5px] absolute bg-pink-400/60" />
                            </div>
                          </div>
                        </div>

                        {/* Bottom Distance & Guidance Tip Badge */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-white flex items-center gap-2 shadow-lg whitespace-nowrap z-10 pointer-events-auto">
                          <Scan className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                          <span className="text-[11px] font-semibold text-slate-200">
                            Jarak ideal 20 – 40 cm • Sejajarkan ke kotak
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-6 space-y-3">
                        <Camera className="w-10 h-10 text-pink-400 mx-auto opacity-80 animate-pulse" />
                        <div>
                          <p className="text-xs font-bold text-white">Arahkan Kamera ke QR / Barcode Kelas</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Sistem memindai dan mengisi kode presensi secara otomatis</p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => startCamera(facingMode)}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Buka Kamera Scanner</span>
                          </button>
                          <label className="px-3.5 py-2 rounded-xl bg-[#231b3e] hover:bg-[#302554] text-purple-300 hover:text-white text-xs font-bold border border-[#3b2d69] shadow-md cursor-pointer flex items-center gap-1.5 transition-colors">
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Pindai dari Foto</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleScanFromImageFile}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Tips Drawer / Helper Card */}
                  {showScanTips && (
                    <div className="p-3.5 rounded-2xl bg-[#171131] border border-pink-500/30 text-xs text-slate-300 space-y-2 shadow-xl mb-4 animate-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between text-white font-bold pb-1.5 border-b border-[#291e4f]">
                        <span className="flex items-center gap-1.5 text-pink-300">
                          <HelpCircle className="w-4 h-4 text-pink-400" />
                          Panduan Memindai Presensi Cepat
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowScanTips(false)}
                          className="text-slate-400 hover:text-white cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                        <div className="p-2.5 rounded-xl bg-[#0e0920] border border-[#231742]">
                          <span className="font-bold text-pink-400 block mb-0.5">1. Posisi Pas</span>
                          Arahkan kamera hingga seluruh QR code masuk pas di dalam 4 sudut kotak panduan.
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#0e0920] border border-[#231742]">
                          <span className="font-bold text-purple-400 block mb-0.5">2. Hindari Silau</span>
                          Jika layar proyektor silau, miringkan sudut HP sedikit atau atur jarak 30 cm.
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#0e0920] border border-[#231742]">
                          <span className="font-bold text-emerald-400 block mb-0.5">3. Tahan Stabil</span>
                          Tahan kamera 1 detik hingga kode terisi dan terkonfirmasi otomatis.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Final Submit Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (!activeSession) {
                      showToast('Tidak ada sesi absensi aktif di kelas saat ini.', 'warn');
                      return;
                    }
                    handleMemberSubmitAttendance(activeSession);
                  }}
                  disabled={isSubmitting || (memberStatus === 'hadir' && !isWithin100m)}
                  className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer active:scale-95 ${
                    memberStatus === 'hadir' && !isWithin100m
                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white shadow-pink-500/25'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>
                    {isSubmitting
                      ? 'Memproses Presensi...'
                      : `Kirim Presensi (${memberStatus.toUpperCase()})`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-[#141126] border border-[#272144] rounded-3xl p-6 shadow-xl">
              <h3 className="font-bold text-white text-base mb-4">Riwayat Presensi Saya</h3>
              <div className="divide-y divide-[#201938]">
                {attendanceRecords
                  .filter((r) => r.studentId === currentUser?.id)
                  .map((rec) => (
                    <div key={rec.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white block">
                          Status: {rec.status.toUpperCase()}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {formatIndonesianDate(rec.timestamp || rec.checkInTime || rec.createdAt)}
                        </span>
                        {rec.note && (
                          <p className="text-[11px] text-slate-300 mt-0.5 italic">"{rec.note}"</p>
                        )}
                      </div>
                      <div className="text-right">
                        {rec.isWithinRadius ? (
                          <span className="text-emerald-400 font-semibold font-mono text-[10px]">
                            Dalam Radius ({rec.distanceMeters || 0}m)
                          </span>
                        ) : (
                          <span className="text-amber-400 font-semibold font-mono text-[10px]">
                            Luar Radius
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE ATTENDANCE SESSION (ADMIN) */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#141126] border border-[#2d2452] rounded-3xl p-6 shadow-2xl relative text-white">
            <div className="flex items-center justify-between pb-3 border-b border-[#241e42] mb-4">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-pink-400" />
                <h3 className="font-bold text-white text-base">Buat Sesi Absensi Baru</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Judul Sesi Absensi <span className="text-pink-400">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: Pertemuan 7 - Pemrograman Web Lanjut"
                  required
                  className="w-full bg-[#181333] border border-[#2f2554] rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full bg-[#181333] border border-[#2f2554] rounded-xl px-3 py-2 text-xs text-white outline-none [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    required
                    className="w-full bg-[#181333] border border-[#2f2554] rounded-xl px-3 py-2 text-xs text-white outline-none [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    required
                    className="w-full bg-[#181333] border border-[#2f2554] rounded-xl px-3 py-2 text-xs text-white outline-none [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* GPS Target Location Setup */}
              <div className="p-4 rounded-2xl bg-[#181330] border border-[#2c224e] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>Titik Lokasi Kelas (Radius 100 Meter)</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleDetectAdminLocation}
                    disabled={isDetectingAdminGps}
                    className="px-3 py-1 rounded-xl bg-pink-500/20 text-pink-300 border border-pink-500/40 text-[11px] font-bold cursor-pointer hover:bg-pink-500/30 transition-colors"
                  >
                    {isDetectingAdminGps ? 'Mendeteksi...' : '📍 Gunakan Lokasi Saya'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Latitude:</label>
                    <input
                      type="number"
                      step="any"
                      value={formLat}
                      onChange={(e) => setFormLat(parseFloat(e.target.value))}
                      required
                      className="w-full bg-[#100d20] border border-[#2e2350] rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Longitude:</label>
                    <input
                      type="number"
                      step="any"
                      value={formLon}
                      onChange={(e) => setFormLon(parseFloat(e.target.value))}
                      required
                      className="w-full bg-[#100d20] border border-[#2e2350] rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Siswa wajib berada dalam radius maksimal 100 meter dari titik koordinat ini untuk dapat mengirim presensi <strong>Hadir</strong>.
                </p>
              </div>

              <div className="pt-3 border-t border-[#261f42] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  Simpan &amp; Aktifkan QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FULLSCREEN QR CODE / PROJECTOR DISPLAY */}
      {/* ========================================================================= */}
      {fullscreenQrSession && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6 text-white animate-in zoom-in-95 duration-200">
          <button
            onClick={() => setFullscreenQrSession(null)}
            className="absolute top-6 right-6 p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="text-center max-w-xl mx-auto space-y-4">
            <span className="px-4 py-1.5 rounded-full bg-pink-500/20 text-pink-300 font-bold text-xs uppercase tracking-wider border border-pink-500/30">
              PRESENSI KELAS • PROYEKTOR SMART TV
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              {fullscreenQrSession.title}
            </h2>
            <p className="text-sm text-slate-300 font-mono">
              Batas Radius 100 Meter • Jam: {fullscreenQrSession.startTime} - {fullscreenQrSession.endTime} WIB
            </p>

            {/* Giant High-Contrast QR Code */}
            <div className="bg-white p-6 rounded-3xl shadow-2xl inline-block border-8 border-pink-500">
              {qrDataUrls[fullscreenQrSession.id] && (
                <img
                  src={qrDataUrls[fullscreenQrSession.id]}
                  alt="QR Code Fullscreen"
                  className="w-72 h-72 sm:w-96 sm:h-96 object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW PROOF DOCUMENT (SAKIT / IZIN) */}
      {/* ========================================================================= */}
      {selectedProofRecord && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#141126] border border-[#2e2652] rounded-3xl p-6 shadow-2xl relative text-white">
            <div className="flex items-center justify-between pb-3 border-b border-[#231d3f] mb-4">
              <h3 className="font-bold text-white text-base">
                Bukti Lampiran {selectedProofRecord.status.toUpperCase()}
              </h3>
              <button
                onClick={() => setSelectedProofRecord(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-xs text-slate-300">
                <p><strong>Siswa:</strong> {selectedProofRecord.studentName}</p>
                <p><strong>Waktu:</strong> {formatIndonesianDate(selectedProofRecord.timestamp || selectedProofRecord.checkInTime || selectedProofRecord.createdAt)}</p>
                {selectedProofRecord.note && (
                  <p className="mt-1"><strong>Keterangan:</strong> "{selectedProofRecord.note}"</p>
                )}
              </div>

              {selectedProofRecord.proofFileUrl && (
                <div className="max-h-72 overflow-auto rounded-xl bg-black/40 border border-[#2c224f] p-2 flex items-center justify-center">
                  {selectedProofRecord.proofFileUrl.startsWith('data:image/') ? (
                    <img
                      src={selectedProofRecord.proofFileUrl}
                      alt="Surat Bukti"
                      className="max-h-64 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="p-6 text-center text-xs">
                      <FileText className="w-10 h-10 text-pink-400 mx-auto mb-2" />
                      <span>{selectedProofRecord.proofFileName || 'Dokumen Surat'}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <a
                  href={selectedProofRecord.proofFileUrl}
                  download={selectedProofRecord.proofFileName || 'Surat_Keterangan.jpg'}
                  className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Dokumen</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
