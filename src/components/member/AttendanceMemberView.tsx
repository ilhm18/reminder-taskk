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
  Image as ImageIcon,
  Scan,
  Zap,
  HelpCircle,
  Info,
  X,
  Barcode,
  Keyboard,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getTerminology, resolveEducatorType } from '../../utils/terminology';
import { AttendanceSession, AttendanceRecord, AttendanceStatus } from '../../types';
import { getSupabaseClient } from '../../services/supabase';

export const AttendanceMemberView: React.FC = () => {
  const {
    currentClass,
    currentUser,
    attendanceSessions,
    attendanceRecords,
    recordAttendance,
    refreshAttendance,
    syncWithSupabase,
    showToast,
  } = useApp();

  const educatorType = resolveEducatorType(currentUser, currentClass);
  const terms = getTerminology(educatorType);

  // Find active session for this member's class (or any active session open currently)
  const targetClassId = currentClass?.id || currentUser?.classId || '';
  const activeSession = React.useMemo(() => {
    const classMatch = attendanceSessions.find((s) => {
      const isClassMatch = !targetClassId || s.classId === targetClassId || (currentClass?.code && s.classId === currentClass.code);
      return isClassMatch && s.isActive;
    });
    if (classMatch) return classMatch;
    // Fallback: any currently active session in the database
    return attendanceSessions.find((s) => s.isActive) || null;
  }, [attendanceSessions, targetClassId, currentClass]);

  // Current member's record for the active session
  const myRecordForActive = activeSession
    ? attendanceRecords.find((r) => r.sessionId === activeSession.id && r.studentId === currentUser?.id)
    : null;

  useEffect(() => {
    refreshAttendance();
    const interval = setInterval(() => {
      refreshAttendance();
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshAttendance]);

  // Scanner & Input State
  const [activeMode, setActiveMode] = useState<'camera' | 'permission'>('camera');
  const [isRefreshingSessions, setIsRefreshingSessions] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<AttendanceStatus>('izin');
  const [permissionNote, setPermissionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Camera video ref and scanner loop
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentStreamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorchSupport, setHasTorchSupport] = useState(false);
  const [isQrDetected, setIsQrDetected] = useState(false);
  const [showScanTips, setShowScanTips] = useState(false);
  const scanIntervalRef = useRef<number | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const tickCountRef = useRef<number>(0);
  const isScanningRef = useRef<boolean>(false);

  // Start Camera
  const startCamera = async (targetFacing: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    setIsQrDetected(false);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Fitur kamera tidak didukung atau tidak tersedia di peramban ini.');
      }

      // Stop existing tracks first if any
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach((track) => track.stop());
        currentStreamRef.current = null;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacing },
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

      currentStreamRef.current = stream;

      // Check if flashlight/torch is supported
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
    if (currentStreamRef.current) {
      currentStreamRef.current.getTracks().forEach((track) => track.stop());
      currentStreamRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsTorchOn(false);
    setIsQrDetected(false);
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
  };

  // Toggle Torch (Senter Kamera)
  const toggleTorch = async () => {
    if (!currentStreamRef.current) return;
    try {
      const track = currentStreamRef.current.getVideoTracks()[0];
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

  // Toggle Camera Facing Mode (Depan / Belakang)
  const toggleCameraFacing = async () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    await startCamera(nextFacing);
  };



  // Switch camera on/off when mode changes
  useEffect(() => {
    if (activeMode === 'camera' && !myRecordForActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeMode, myRecordForActive]);

  // QR Scanning Loop using jsQR & advanced multi-strategy processing
  useEffect(() => {
    if (!isCameraActive || isSubmitting) return;

    const scanFrame = () => {
      if (isScanningRef.current || isSubmitting) {
        scanLoopRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        scanLoopRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (vw === 0 || vh === 0) {
        scanLoopRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      // Throttle scanning to once every 180ms to prevent main thread blocking,
      // keeping the camera feed buttery smooth at 60 FPS for instant hardware autofocus.
      const now = Date.now();
      if (now - lastScanTimeRef.current < 180) {
        scanLoopRef.current = requestAnimationFrame(scanFrame);
        return;
      }
      lastScanTimeRef.current = now;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        scanLoopRef.current = requestAnimationFrame(scanFrame);
        return;
      }

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
        isScanningRef.current = true;
        setIsQrDetected(true);
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(100);
          } catch {}
        }
        handleProcessScan(code.data);
      } else {
        scanLoopRef.current = requestAnimationFrame(scanFrame);
      }
    };

    scanLoopRef.current = requestAnimationFrame(scanFrame);
    return () => {
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
      }
    };
  }, [isCameraActive, isSubmitting, activeSession, attendanceSessions]);

  // Handle Process QR / Barcode Scan
  const handleProcessScan = async (scannedData: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    // 1. Resolve session from scanned payload or activeSession
    let targetSession = activeSession;
    let extractedToken = scannedData;
    let extractedSessionId = '';

    try {
      const trimmed = scannedData.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);
        const sid = parsed.sid || parsed.sessionId || parsed.id;
        if (parsed.tok) {
          extractedToken = parsed.tok;
        }
        if (sid) {
          extractedSessionId = sid;
          const found = attendanceSessions.find((s) => s.id === sid);
          if (found) targetSession = found;
        }
      } else if (trimmed.includes('sid=') || trimmed.includes('sessionId=')) {
        const match = trimmed.match(/(?:sid|sessionId)=([^&]+)/);
        if (match && match[1]) {
          extractedSessionId = match[1];
          const found = attendanceSessions.find((s) => s.id === match[1]);
          if (found) targetSession = found;
        }
        const tokMatch = trimmed.match(/(?:tok|code|token)=([^&]+)/);
        if (tokMatch && tokMatch[1]) {
          extractedToken = tokMatch[1];
        }
      } else {
        // Direct string match with session ID or code
        const found = attendanceSessions.find((s) => s.id === trimmed || s.code === trimmed);
        if (found) {
          targetSession = found;
        } else if (trimmed.startsWith('asess-')) {
          extractedSessionId = trimmed;
        }
      }
    } catch {}

    // 1.5 Fetch session on the fly from Supabase if not found locally
    if (!targetSession && extractedSessionId) {
      try {
        const client = getSupabaseClient();
        if (client) {
          const sessRes = await client.from('attendance_sessions').select('*').eq('id', extractedSessionId).maybeSingle();
          if (sessRes.data) {
            const s = sessRes.data;
            targetSession = {
              id: s.id,
              classId: s.class_id,
              title: s.title,
              subject: s.subject || '',
              date: s.date || (s.created_at ? s.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
              startTime: s.start_time || s.created_at,
              endTime: s.end_time || undefined,
              isActive: s.is_active ?? true,
              secretToken: s.secret_token,
              tokenRefreshInterval: s.token_refresh_interval || 15,
              requireLocation: s.require_location ?? false,
              latitude: s.latitude ? Number(s.latitude) : undefined,
              longitude: s.longitude ? Number(s.longitude) : undefined,
              radiusMeters: s.radius_meters ? Number(s.radius_meters) : 100,
              createdBy: s.created_by,
              createdByName: s.created_by_name || 'Admin',
              createdAt: s.created_at || new Date().toISOString(),
            };
          }
        }
      } catch (err) {
        console.warn('On-the-fly session fetch failed:', err);
      }
    }

    if (!targetSession) {
      targetSession = attendanceSessions.find((s) => s.isActive) || null;
    }

    if (!targetSession) {
      setIsSubmitting(false);
      setIsQrDetected(false);
      showToast('Sesi presensi tidak ditemukan atau belum dibuka oleh Guru/Admin.', 'warn');
      setTimeout(() => {
        isScanningRef.current = false;
      }, 1500);
      return;
    }

    let coords: { lat: number; lng: number } | undefined;
    if (targetSession.requireLocation) {
      coords = await getCoordsPromise();
    }

    const res = await recordAttendance(
      targetSession.id,
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
      setIsQrDetected(false);
      showToast(res.message, 'warn');
      // Berikan jeda 1.5 detik sebelum memindai ulang bila gagal
      setTimeout(() => {
        isScanningRef.current = false;
      }, 1500);
    }
  };



  // Manual refresh sessions from Supabase
  const handleRefreshSessions = async () => {
    setIsRefreshingSessions(true);
    showToast('Menyinkronkan sesi presensi...', 'info');
    try {
      await syncWithSupabase();
      showToast('Data sesi presensi berhasil diperbarui!', 'success');
    } catch {
      showToast('Gagal menyinkronkan data presensi.', 'warn');
    } finally {
      setIsRefreshingSessions(false);
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
    if (res.success) {
      setPermissionNote('');
    }
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
              Absensi &amp; Scan QR Code Kelas
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
              Scan QR code dinamis yang tampil di layar proyektor kelas untuk mencatat kehadiran Anda secara akurat.
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
                  • Metode:{' '}
                  <span className="text-pink-300 font-bold">
                    {myRecordForActive.verificationMethod === 'qr_scan'
                      ? 'Scan Barcode / QR Code'
                      : myRecordForActive.verificationMethod === 'photo_proof'
                      ? 'Swafoto Selfie'
                      : myRecordForActive.verificationMethod === 'permission_request'
                      ? 'Pengajuan Izin'
                      : 'Manual Admin'}
                  </span>{' '}
                  • Waktu:{' '}
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
                <div className="flex items-center gap-1 bg-[#140e29] p-1 rounded-xl border border-[#281b4e] flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActiveMode('camera')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
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

              {/* MODE 1: CAMERA SCANNER DENGAN PANDUAN VISUAL & OVERLAY LENGKAP */}
              {activeMode === 'camera' && (
                <div className="flex flex-col items-center space-y-4">
                  {/* Camera Viewport Container */}
                  <div className="relative w-full max-w-sm sm:max-w-md aspect-square rounded-3xl bg-[#090717] border-2 border-pink-500/50 overflow-hidden shadow-2xl flex items-center justify-center select-none">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* OVERLAY & PANDUAN VISUAL KOTAK TARGET PINTAR */}
                    {isCameraActive && !cameraError && (
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-3.5 sm:p-4 z-10">
                        {/* Top Overlay Banner with status & quick controls */}
                        <div className="w-full flex items-center justify-between pointer-events-auto gap-2">
                          <div className="px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-white flex items-center gap-2 shadow-lg">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isQrDetected ? 'bg-emerald-400' : 'bg-pink-400 animate-pulse'
                              }`}
                            />
                            <span className="text-[11px] font-bold tracking-wide">
                              {isQrDetected ? 'Kode Terdeteksi!' : 'Arahkan ke Kotak'}
                            </span>
                          </div>

                          {/* Quick Controls in Top-Right */}
                          <div className="flex items-center gap-1.5">
                            {/* Flashlight/Torch Button */}
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

                            {/* Camera Switch (Flip) Button */}
                            <button
                              type="button"
                              onClick={toggleCameraFacing}
                              className="p-2 rounded-xl bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 transition-all cursor-pointer shadow-lg active:scale-95"
                              title="Ganti Kamera (Depan / Belakang)"
                            >
                              <RotateCw className="w-4 h-4" />
                            </button>

                            {/* Quick Help Tips Toggle */}
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
                          </div>
                        </div>

                        {/* TARGET RETICLE VIEWFINDER FRAME (THE MAIN VISUAL FOCUS BOX) */}
                        <div className="relative w-56 h-56 sm:w-64 sm:h-64 max-w-[76vw] max-h-[76vw] my-auto flex items-center justify-center">
                          {/* Dark vignette backdrop cutout outside the box */}
                          <div
                            className={`absolute inset-0 rounded-3xl transition-all duration-300 pointer-events-none ${
                              isQrDetected
                                ? 'shadow-[0_0_0_9999px_rgba(5,3,15,0.75)]'
                                : 'shadow-[0_0_0_9999px_rgba(7,5,20,0.68)]'
                            }`}
                          />

                          {/* Border container with soft glow */}
                          <div
                            className={`absolute inset-0 rounded-3xl border-2 transition-all duration-300 pointer-events-none ${
                              isQrDetected
                                ? 'border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.8),inset_0_0_20px_rgba(52,211,153,0.3)]'
                                : 'border-pink-500/40 shadow-[0_0_20px_rgba(236,72,153,0.25),inset_0_0_15px_rgba(236,72,153,0.1)]'
                            }`}
                          />

                          {/* 4 Crisp Neon Corner Brackets */}
                          {/* Top-Left */}
                          <div
                            className={`absolute -top-1 -left-1 w-7 h-7 sm:w-8 sm:h-8 border-t-4 border-l-4 rounded-tl-2xl transition-colors duration-300 pointer-events-none ${
                              isQrDetected
                                ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.9)]'
                                : 'border-pink-400 shadow-[0_0_14px_rgba(236,72,153,0.8)]'
                            }`}
                          />
                          {/* Top-Right */}
                          <div
                            className={`absolute -top-1 -right-1 w-7 h-7 sm:w-8 sm:h-8 border-t-4 border-r-4 rounded-tr-2xl transition-colors duration-300 pointer-events-none ${
                              isQrDetected
                                ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.9)]'
                                : 'border-pink-400 shadow-[0_0_14px_rgba(236,72,153,0.8)]'
                            }`}
                          />
                          {/* Bottom-Left */}
                          <div
                            className={`absolute -bottom-1 -left-1 w-7 h-7 sm:w-8 sm:h-8 border-b-4 border-l-4 rounded-bl-2xl transition-colors duration-300 pointer-events-none ${
                              isQrDetected
                                ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.9)]'
                                : 'border-pink-400 shadow-[0_0_14px_rgba(236,72,153,0.8)]'
                            }`}
                          />
                          {/* Bottom-Right */}
                          <div
                            className={`absolute -bottom-1 -right-1 w-7 h-7 sm:w-8 sm:h-8 border-b-4 border-r-4 rounded-br-2xl transition-colors duration-300 pointer-events-none ${
                              isQrDetected
                                ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.9)]'
                                : 'border-pink-400 shadow-[0_0_14px_rgba(236,72,153,0.8)]'
                            }`}
                          />

                          {/* Animated Laser Sweep Line (Active when scanning) */}
                          {!isQrDetected && !isSubmitting && (
                            <div className="qr-scan-laser-line" />
                          )}

                          {/* Center Alignment Target Crosshair */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
                            <div className="relative w-8 h-8 flex items-center justify-center">
                              <div
                                className={`w-2 h-2 rounded-full absolute ${
                                  isQrDetected ? 'bg-emerald-400' : 'bg-pink-400 animate-ping'
                                }`}
                              />
                              <div
                                className={`w-1.5 h-1.5 rounded-full absolute ${
                                  isQrDetected ? 'bg-emerald-400' : 'bg-pink-400'
                                }`}
                              />
                              <div
                                className={`w-5 h-[1.5px] absolute ${
                                  isQrDetected ? 'bg-emerald-400/80' : 'bg-pink-400/60'
                                }`}
                              />
                              <div
                                className={`h-5 w-[1.5px] absolute ${
                                  isQrDetected ? 'bg-emerald-400/80' : 'bg-pink-400/60'
                                }`}
                              />
                            </div>
                          </div>

                          {/* Processing Loader Overlay if Submitting */}
                          {isSubmitting && (
                            <div className="absolute inset-0 rounded-3xl bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-20 animate-in fade-in">
                              <div className="w-10 h-10 border-3 border-pink-500 border-t-transparent rounded-full animate-spin mb-2" />
                              <span className="text-xs font-black text-white">Memvalidasi Presensi...</span>
                              <span className="text-[10px] text-pink-300">Mohon tunggu sejenak</span>
                            </div>
                          )}
                        </div>

                        {/* Bottom Distance & Guidance Tip Badge */}
                        <div className="px-3.5 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-white flex items-center gap-2 shadow-lg max-w-xs text-center pointer-events-auto">
                          <Scan className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                          <span className="text-[11px] font-semibold text-slate-200">
                            Jarak ideal 20 – 40 cm • Sejajarkan ke kotak
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Camera Error State */}
                    {cameraError && (
                      <div className="absolute inset-0 p-6 bg-black/95 flex flex-col items-center justify-center text-center space-y-3 z-30">
                        <VideoOff className="w-12 h-12 text-red-400" />
                        <div>
                          <p className="text-xs font-bold text-white mb-1">Akses Kamera Gagal</p>
                          <p className="text-[11px] text-red-300 max-w-xs leading-relaxed">{cameraError}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => startCamera(facingMode)}
                          className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs cursor-pointer shadow-md flex items-center gap-2 transition-all active:scale-95"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>Coba Akses Kamera Lagi</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Quick Tips Drawer / Helper Card */}
                  {showScanTips && (
                    <div className="w-full max-w-md p-4 rounded-2xl bg-[#171131] border border-pink-500/30 text-xs text-slate-300 space-y-2 shadow-xl animate-in slide-in-from-top-2 duration-200">
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
                          Tahan kamera 1 detik hingga terdengar getaran/bunyi presensi berhasil.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions Bar (Toggle Tips) */}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowScanTips((v) => !v)}
                      className="px-3.5 py-2 rounded-xl bg-[#140e29] hover:bg-[#201642] text-slate-300 hover:text-white text-xs font-medium border border-[#271d49] transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5 text-purple-400" />
                      <span>{showScanTips ? 'Tutup Panduan' : 'Tips Memindai'}</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 text-center max-w-sm leading-relaxed">
                    Arahkan kamera ke <strong>Kode QR di proyektor kelas</strong>. Presensi Anda otomatis tervalidasi seketika.
                  </p>
                </div>
              )}



              {/* MODE 3: AJUKAN IZIN / SAKIT */}
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
        /* NO ACTIVE SESSION BANNER WITH SCANNER OVERRIDE & REFRESH */
        <div className="p-8 text-center rounded-3xl bg-[#140e2b] border border-[#271d49] space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Belum Ada Sesi Presensi Terdeteksi</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed mt-1">
              Jika {terms.educatorTitle} atau Admin sedang membuka barcode absensi di proyektor kelas, Anda dapat langsung menyinkronkan data atau membuka pemindai kamera sekarang.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleRefreshSessions}
              disabled={isRefreshingSessions}
              className="px-4 py-2.5 rounded-xl bg-[#1d1538] hover:bg-[#261b47] border border-[#352562] text-xs font-bold text-white flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 text-pink-400 ${isRefreshingSessions ? 'animate-spin' : ''}`} />
              <span>{isRefreshingSessions ? 'Menyinkronkan...' : 'Segarkan Sesi Database'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMode('camera');
                startCamera();
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-xs font-black text-white flex items-center gap-2 shadow-lg shadow-pink-500/25 cursor-pointer transition-all active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Buka Kamera &amp; Pindai Barcode Sekarang</span>
            </button>
          </div>
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
