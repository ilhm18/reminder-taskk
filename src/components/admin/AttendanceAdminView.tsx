import React, { useState, useEffect, useMemo, useRef } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileSpreadsheet,
  Plus,
  Play,
  Square,
  RefreshCw,
  Search,
  MapPin,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Minimize2,
  Trash2,
  RotateCcw,
  Sparkles,
  Calendar,
  X,
  Download,
  Table,
  LayoutGrid,
  Check,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getTerminology, resolveEducatorType } from '../../utils/terminology';
import { AttendanceSession, AttendanceRecord, AttendanceStatus, AttendanceVerificationMethod } from '../../types';
import { getRollingTokenDetails } from '../../utils/attendanceToken';

export const AttendanceAdminView: React.FC = () => {
  const {
    currentClass,
    classes,
    users,
    currentUser,
    attendanceSessions,
    attendanceRecords,
    createAttendanceSession,
    closeAttendanceSession,
    reopenAttendanceSession,
    deleteAttendanceSession,
    recordAttendance,
    updateAttendanceRecord,
    deleteAttendanceRecord,
    syncWithSupabase,
    showToast,
  } = useApp();

  const [isSyncingAdmin, setIsSyncingAdmin] = useState(false);

  const educatorType = resolveEducatorType(currentUser, currentClass);
  const terms = getTerminology(educatorType);

  // Filter sessions for current class
  const targetClassId = currentClass?.id || currentUser?.classId || '';
  const [selectedProofRecord, setSelectedProofRecord] = useState<AttendanceRecord | null>(null);
  const classSessions = useMemo(() => {
    return attendanceSessions.filter((s) => {
      if (!targetClassId) return true;
      return s.classId === targetClassId || (currentClass?.code && s.classId === currentClass.code);
    });
  }, [attendanceSessions, targetClassId, currentClass]);

  // Active / Selected session with safe fallback on deletion
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const effectiveSessionId = useMemo(() => {
    if (classSessions.length === 0) return null;
    const found = classSessions.find((s) => s.id === selectedSessionId);
    if (found) return found.id;
    const active = classSessions.find((s) => s.isActive);
    return active ? active.id : classSessions[0].id;
  }, [classSessions, selectedSessionId]);

  useEffect(() => {
    if (effectiveSessionId !== selectedSessionId) {
      setSelectedSessionId(effectiveSessionId);
    }
  }, [effectiveSessionId, selectedSessionId]);

  const currentSession = useMemo(() => {
    if (!effectiveSessionId) return null;
    return classSessions.find((s) => s.id === effectiveSessionId) || null;
  }, [classSessions, effectiveSessionId]);

  // Records for current selected session
  const currentRecords = useMemo(() => {
    if (!currentSession) return [];
    return attendanceRecords.filter((r) => r.sessionId === currentSession.id);
  }, [attendanceRecords, currentSession]);

  // Class members list (to calculate Alpa / Belum Hadir)
  const classStudents = useMemo(() => {
    if (!targetClassId) return [];
    return users.filter((u) => u.role === 'member' && (u.classId === targetClassId || (currentClass?.code && u.classId === currentClass.code)));
  }, [users, targetClassId, currentClass]);

  // Dynamic QR details (rotates every interval)
  const [tokenDetails, setTokenDetails] = useState<{
    code: string;
    qrPayload: string;
    secondsRemaining: number;
    progressPercent: number;
  }>({
    code: '------',
    qrPayload: '',
    secondsRemaining: 15,
    progressPercent: 0,
  });

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Ticker for dynamic QR code rotation
  useEffect(() => {
    if (!currentSession || !currentSession.isActive) return;

    const updateToken = async () => {
      const details = getRollingTokenDetails(currentSession);
      setTokenDetails(details);

      try {
        const url = await QRCode.toDataURL(details.qrPayload, {
          width: 420,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'M',
        });
        setQrCodeDataUrl(url);
      } catch (err) {
        console.error('Failed to generate QR code:', err);
      }
    };

    updateToken();
    const interval = setInterval(updateToken, 1000);
    return () => clearInterval(interval);
  }, [currentSession]);

  // UI Tabs & Modals
  const [activeTab, setActiveTab] = useState<'projector' | 'recap' | 'history'>('projector');
  const [recapViewMode, setRecapViewMode] = useState<'single' | 'matrix'>('single');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<AttendanceSession | null>(null);
  const [isProjectorFullscreen, setIsProjectorFullscreen] = useState(false);
  const [searchMember, setSearchMember] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus>('all');

  // Form State for New Session
  const [formTitle, setFormTitle] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formRefreshInterval, setFormRefreshInterval] = useState<number>(15);
  const [formRequireLocation, setFormRequireLocation] = useState<boolean>(false);
  const [formRadiusMeters, setFormRadiusMeters] = useState<number>(100);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [formCoords, setFormCoords] = useState<{ lat?: number; lng?: number }>({});

  const handleFetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation tidak didukung oleh browser Anda.', 'warn');
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setIsGettingLocation(false);
        showToast('Titik koordinat kelas berhasil dikunci!', 'success');
      },
      (err) => {
        setIsGettingLocation(false);
        showToast('Gagal mendapatkan lokasi GPS: ' + err.message, 'warn');
      },
      { enableHighAccuracy: true }
    );
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('Harap isi judul pertemuan/sesi presensi.', 'warn');
      return;
    }

    const effectiveClassId = currentClass?.id || currentUser?.classId || 'class-default';
    const newSess = await createAttendanceSession({
      classId: effectiveClassId,
      title: formTitle.trim(),
      subject: formSubject.trim() || undefined,
      date: new Date().toISOString().split('T')[0],
      startTime: new Date().toISOString(),
      isActive: true,
      tokenRefreshInterval: formRefreshInterval,
      requireLocation: formRequireLocation,
      latitude: formCoords.lat,
      longitude: formCoords.lng,
      radiusMeters: formRadiusMeters,
      createdBy: currentUser?.id || 'admin',
      createdByName: currentUser?.name || 'Admin Kelas',
    });

    setSelectedSessionId(newSess.id);
    setIsCreateModalOpen(false);
    setActiveTab('projector');
    // Reset form
    setFormTitle('');
    setFormSubject('');
    setFormRequireLocation(false);
  };

  // Safe Delete Session Trigger
  const handleDeleteSession = (sessId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const targetSess = classSessions.find((s) => s.id === sessId);
    if (targetSess) {
      setSessionToDelete(targetSess);
    }
  };

  // Safe Delete Session Confirmation Handler
  const handleConfirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    const targetId = sessionToDelete.id;
    setSessionToDelete(null);

    try {
      if (effectiveSessionId === targetId) {
        const remaining = classSessions.filter((s) => s.id !== targetId);
        const nextActive = remaining.find((s) => s.isActive);
        setSelectedSessionId(nextActive ? nextActive.id : remaining[0]?.id || null);
      }
      await deleteAttendanceSession(targetId);
    } catch (err: any) {
      console.error('Delete attendance session error:', err);
      showToast('Gagal menghapus sesi presensi: ' + (err?.message || 'Error'), 'warn');
    }
  };

  // Unified per-session student attendance list
  const sessionAttendanceList = useMemo(() => {
    if (!currentSession) return [];

    const map = new Map<string, {
      studentId: string;
      name: string;
      email?: string;
      record?: AttendanceRecord;
      status: AttendanceStatus;
    }>();

    // 1. Add all registered students in current class
    classStudents.forEach((stu) => {
      map.set(stu.id, {
        studentId: stu.id,
        name: stu.name,
        email: stu.email,
        status: 'alpa',
      });
    });

    // 2. Attach or add check-in records for this specific session
    currentRecords.forEach((rec) => {
      const existing = map.get(rec.studentId);
      if (existing) {
        existing.record = rec;
        existing.status = rec.status;
        if (!existing.email && rec.studentEmail) existing.email = rec.studentEmail;
      } else {
        map.set(rec.studentId || rec.id, {
          studentId: rec.studentId || rec.id,
          name: rec.studentName,
          email: rec.studentEmail,
          record: rec,
          status: rec.status,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'id'));
  }, [classStudents, currentRecords, currentSession]);

  // Accurate per-session stats
  const totalStudents = sessionAttendanceList.length;
  const hadirCount = sessionAttendanceList.filter((s) => s.status === 'hadir').length;
  const izinCount = sessionAttendanceList.filter((s) => s.status === 'izin').length;
  const sakitCount = sessionAttendanceList.filter((s) => s.status === 'sakit').length;
  const alpaCount = sessionAttendanceList.filter((s) => s.status === 'alpa').length;
  const attendanceRate = totalStudents > 0 ? Math.round(((hadirCount + izinCount + sakitCount) / totalStudents) * 100) : 0;

  // Export to CSV for Selected Session (Structured with Session Date & Metadata)
  const handleExportSessionCsv = () => {
    if (!currentSession) {
      showToast('Pilih sesi presensi terlebih dahulu untuk mengunduh rekap.', 'warn');
      return;
    }

    const sessionDate = currentSession.date;
    const sessionTitle = currentSession.title;
    const sessionSubject = currentSession.subject || 'Umum';
    const sessionStatus = currentSession.isActive ? 'Sedang Berlangsung / Aktif' : 'Telah Ditutup / Selesai';
    const className = currentClass?.name || 'Ruang Kelas';

    const lines: string[] = [];

    // Header Metadata Sesi
    lines.push('LAPORAN REKAPITULASI PRESENSI KELAS (PER SESI)');
    lines.push(`"Nama Kelas","${className.replace(/"/g, '""')}"`);
    lines.push(`"Tanggal Sesi","${sessionDate}"`);
    lines.push(`"Judul Sesi / Pertemuan","${sessionTitle.replace(/"/g, '""')}"`);
    lines.push(`"Mata Pelajaran","${sessionSubject.replace(/"/g, '""')}"`);
    lines.push(`"Status Sesi","${sessionStatus}"`);
    lines.push(`"Waktu Mulai","${new Date(currentSession.startTime).toLocaleTimeString('id-ID')}"`);
    if (currentSession.endTime) {
      lines.push(`"Waktu Selesai","${new Date(currentSession.endTime).toLocaleTimeString('id-ID')}"`);
    }
    lines.push(`"Waktu Cetak Laporan","${new Date().toLocaleString('id-ID')}"`);
    lines.push('');

    // Ringkasan Statistik
    lines.push('RINGKASAN KEHADIRAN SESI');
    lines.push(`"Total ${terms.memberTitlePlural}","${totalStudents} ${terms.memberTitlePlural}"`);
    lines.push(`"Jumlah Hadir","${hadirCount} ${terms.memberTitlePlural}"`);
    lines.push(`"Jumlah Izin","${izinCount} ${terms.memberTitlePlural}"`);
    lines.push(`"Jumlah Sakit","${sakitCount} ${terms.memberTitlePlural}"`);
    lines.push(`"Alpa / Belum Hadir","${alpaCount} ${terms.memberTitlePlural}"`);
    lines.push(`"Persentase Kehadiran","${attendanceRate}%"`);
    lines.push('');

    // Tabel Detail Anggota
    lines.push(`"No","Tanggal Sesi","Nama Sesi","${terms.courseLabel}","Nama ${terms.memberTitle}","Status Presensi","Waktu Check-In","Metode Presensi","Catatan / Alasan"`);

    sessionAttendanceList.forEach((item, index) => {
      const rec = item.record;
      const statusText = item.status.toUpperCase();
      const timeText = rec ? new Date(rec.checkInTime).toLocaleTimeString('id-ID') : '-';
      const methodText = rec
        ? rec.verificationMethod === 'qr_scan'
          ? 'Scan Kode QR'
          : rec.verificationMethod === 'permission_request'
          ? 'Pengajuan Izin/Sakit'
          : 'Manual ' + terms.educatorTitle
        : '-';
      const noteText = rec?.note ? rec.note.replace(/"/g, '""') : (item.status === 'alpa' ? 'Belum melakukan presensi' : '-');

      lines.push(
        `${index + 1},"${sessionDate}","${sessionTitle.replace(/"/g, '""')}","${sessionSubject.replace(/"/g, '""')}","${item.name.replace(/"/g, '""')}","${statusText}","${timeText}","${methodText}","${noteText}"`
      );
    });

    const csvString = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanTitle = sessionTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `Rekap_Presensi_${sessionDate}_${cleanTitle}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Rekap presensi sesi "${sessionTitle}" tanggal ${sessionDate} berhasil diunduh!`, 'success');
  };

  // Export to CSV for All Sessions (Grouped by Session Date)
  const handleExportAllSessionsCsv = () => {
    if (classSessions.length === 0) {
      showToast('Belum ada sesi presensi untuk diunduh.', 'warn');
      return;
    }

    const className = currentClass?.name || 'Ruang Kelas';
    const lines: string[] = [];

    lines.push('LAPORAN MASTER REKAPITULASI PRESENSI KELAS (SELURUH SESI BERDASARKAN TANGGAL)');
    lines.push(`"Nama Kelas","${className.replace(/"/g, '""')}"`);
    lines.push(`"Total Sesi Terdata","${classSessions.length} Sesi"`);
    lines.push(`"Waktu Cetak Laporan","${new Date().toLocaleString('id-ID')}"`);
    lines.push('');

    const sortedSessions = [...classSessions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sortedSessions.forEach((sess, sIdx) => {
      const sessRecs = attendanceRecords.filter((r) => r.sessionId === sess.id);
      const studentMap = new Map<string, { name: string; email?: string; status: AttendanceStatus; record?: AttendanceRecord }>();

      classStudents.forEach((stu) => {
        studentMap.set(stu.id, { name: stu.name, email: stu.email, status: 'alpa' });
      });

      sessRecs.forEach((r) => {
        const existing = studentMap.get(r.studentId);
        if (existing) {
          existing.status = r.status;
          existing.record = r;
          if (!existing.email && r.studentEmail) existing.email = r.studentEmail;
        } else {
          studentMap.set(r.studentId || r.id, {
            name: r.studentName,
            email: r.studentEmail,
            status: r.status,
            record: r,
          });
        }
      });

      const list = Array.from(studentMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'id'));
      const hCount = list.filter((s) => s.status === 'hadir').length;
      const iCount = list.filter((s) => s.status === 'izin').length;
      const sCount = list.filter((s) => s.status === 'sakit').length;
      const aCount = list.filter((s) => s.status === 'alpa').length;

      lines.push('====================================================================================================');
      lines.push(`"SESI KE-${sIdx + 1} | TANGGAL SESI: ${sess.date} | ${sess.title.replace(/"/g, '""')} | Mapel: ${(sess.subject || 'Umum').replace(/"/g, '""')}"`);
      lines.push(`"Status: ${sess.isActive ? 'Aktif' : 'Ditutup'} | Hadir: ${hCount} ${terms.memberTitlePlural} | Izin: ${iCount} | Sakit: ${sCount} | Alpa: ${aCount} (Total ${terms.memberTitlePlural}: ${list.length})"`);
      lines.push('====================================================================================================');
      lines.push(`"No","Tanggal Sesi","Nama Sesi","Mata Pelajaran","Nama ${terms.memberTitle}","Status Presensi","Waktu Check-In","Metode Presensi","Catatan / Alasan"`);

      list.forEach((stu, idx) => {
        const rec = stu.record;
        const statusText = stu.status.toUpperCase();
        const timeText = rec ? new Date(rec.checkInTime).toLocaleTimeString('id-ID') : '-';
        const methodText = rec
          ? rec.verificationMethod === 'qr_scan'
            ? 'Scan Kode QR'
            : rec.verificationMethod === 'permission_request'
            ? 'Pengajuan Izin'
            : 'Manual ' + terms.educatorTitle
          : '-';
        const noteText = rec?.note ? rec.note.replace(/"/g, '""') : (stu.status === 'alpa' ? 'Belum absen' : '-');

        lines.push(
          `${idx + 1},"${sess.date}","${sess.title.replace(/"/g, '""')}","${(sess.subject || 'Umum').replace(/"/g, '""')}","${stu.name.replace(/"/g, '""')}","${statusText}","${timeText}","${methodText}","${noteText}"`
        );
      });

      lines.push('');
      lines.push('');
    });

    const csvString = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanClassName = className.replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `Rekap_Presensi_Per_Sesi_${cleanClassName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Rekap presensi seluruh sesi per tanggal berhasil diunduh ke CSV!', 'success');
  };

  // Export Matrix CSV (Students vs Session Dates)
  const handleExportMatrixCsv = () => {
    if (classSessions.length === 0) {
      showToast('Belum ada sesi presensi untuk diunduh.', 'warn');
      return;
    }

    const className = currentClass?.name || 'Ruang Kelas';
    const lines: string[] = [];

    lines.push('MATRIKS REKAPITULASI PRESENSI KELAS (SELURUH TANGGAL SESI)');
    lines.push(`"Nama Kelas","${className.replace(/"/g, '""')}"`);
    lines.push(`"Total Sesi","${classSessions.length} Sesi"`);
    lines.push(`"Waktu Cetak Laporan","${new Date().toLocaleString('id-ID')}"`);
    lines.push('');

    const sortedSessions = [...classSessions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const sessionCols = sortedSessions.map((s) => `"[${s.date}] ${s.title.replace(/"/g, '""')}"`).join(',');
    lines.push(`"No","Nama ${terms.memberTitle}",${sessionCols},"Total Hadir","Total Izin","Total Sakit","Total Alpa","% Kehadiran"`);

    classStudents.forEach((stu, index) => {
      let hTotal = 0;
      let iTotal = 0;
      let sTotal = 0;
      let aTotal = 0;

      const sessionStatuses = sortedSessions.map((sess) => {
        const rec = attendanceRecords.find((r) => r.sessionId === sess.id && r.studentId === stu.id);
        const status = rec ? rec.status : 'alpa';
        if (status === 'hadir') hTotal++;
        else if (status === 'izin') iTotal++;
        else if (status === 'sakit') sTotal++;
        else aTotal++;
        return `"${status.toUpperCase()}"`;
      });

      const totalSess = sortedSessions.length;
      const rate = totalSess > 0 ? Math.round(((hTotal + iTotal + sTotal) / totalSess) * 100) : 0;

      lines.push(
        `${index + 1},"${stu.name.replace(/"/g, '""')}",${sessionStatuses.join(',')},"${hTotal}","${iTotal}","${sTotal}","${aTotal}","${rate}%"`
      );
    });

    const csvString = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanClassName = className.replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `Matriks_Presensi_${terms.memberTitle}_${cleanClassName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Matriks kehadiran ${terms.memberTitle.toLowerCase()} berhasil diunduh ke CSV!`, 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1d143d] via-[#161031] to-[#0d091e] border border-[#2f2156] p-6 sm:p-8 shadow-2xl">
        <div className="absolute -right-8 -top-8 w-72 h-72 bg-gradient-to-br from-pink-500/15 to-purple-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 font-extrabold text-[11px] flex items-center gap-1.5 shadow-sm">
                <QrCode className="w-3.5 h-3.5 text-pink-400" />
                Presensi Digital Terverifikasi
              </span>
              <span className="px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 font-mono text-[11px] font-bold">
                {currentClass?.name || 'Ruang Kelas'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Presensi &amp; Kode QR Kelas Real-Time
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Sistem presensi kelas berbasis <strong>Kode QR Dinamis Terverifikasi</strong>, pencatatan kehadiran otomatis per {terms.memberTitle.toLowerCase()}, dan verifikasi geolokasi kelas secara presisi.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Buka Sesi Presensi Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Session Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#251b47]">
        <div className="flex items-center gap-2 bg-[#120e28] p-1 rounded-2xl border border-[#271d49] overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('projector')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'projector'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Layar Barcode Proyektor</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recap')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'recap'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Rekap Kehadiran {terms.memberTitlePlural}</span>
            {currentRecords.length > 0 && (
              <span className="px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[10px]">
                {currentRecords.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Riwayat Sesi ({classSessions.length})</span>
          </button>
        </div>

        {/* Session Selector Dropdown */}
        {classSessions.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold shrink-0">Pilih Sesi:</span>
            <select
              value={effectiveSessionId || ''}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#140f2b] border border-[#2b1f50] text-xs font-bold text-white focus:outline-none focus:border-pink-500 cursor-pointer"
            >
              {classSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.isActive ? '🟢 Aktif' : '⚪ Ditutup'}) • {s.date}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={async () => {
                setIsSyncingAdmin(true);
                showToast('Menyinkronkan data presensi dari database...', 'info');
                try {
                  await syncWithSupabase();
                  showToast('Data presensi berhasil disinkronkan!', 'success');
                } finally {
                  setIsSyncingAdmin(false);
                }
              }}
              disabled={isSyncingAdmin}
              className="p-2 rounded-xl bg-[#140f2b] border border-[#2b1f50] hover:border-pink-500/50 text-slate-300 hover:text-white cursor-pointer transition-all active:scale-95"
              title="Segarkan data presensi dari database Supabase"
            >
              <RefreshCw className={`w-4 h-4 text-pink-400 ${isSyncingAdmin ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* NO SESSIONS EMPTY STATE */}
      {classSessions.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#130f29] border border-[#261d4a] space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mx-auto">
            <QrCode className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white mb-1">Belum Ada Sesi Presensi Dibuka</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Buka sesi presensi baru sekarang untuk menampilkan kode QR digital di proyektor kelas agar {terms.memberTitlePlural.toLowerCase()} dapat langsung scan absensi.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold transition-all cursor-pointer shadow-md inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Buka Sesi Presensi Sekarang</span>
          </button>
        </div>
      ) : (
        <>
          {/* TAB 1: PROYEKTOR / LIVE DISPLAY */}
          {activeTab === 'projector' && currentSession && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Big Barcode Live Stream */}
              <div className="lg:col-span-7 space-y-4">
                <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#140e2b] to-[#0d091e] border border-[#2c1f54] shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
                  {/* Status Banner */}
                  <div className="flex items-center justify-between w-full mb-6 gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${currentSession.isActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                      <span className="text-xs font-black text-white">
                        {currentSession.isActive ? 'SESI PRESENSI AKTIF' : 'SESI TELAH DITUTUP'}
                      </span>
                    </div>

                      <div className="flex items-center gap-2">
                        {currentSession.isActive && (
                          <button
                            type="button"
                            onClick={() => setIsProjectorFullscreen(true)}
                            className="px-3 py-1.5 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                            title="Buka tampilan proyektor layar penuh"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Layar Penuh</span>
                          </button>
                        )}
                        {currentSession.isActive ? (
                          <button
                            type="button"
                            onClick={() => closeAttendanceSession(currentSession.id)}
                            className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Square className="w-3.5 h-3.5" />
                            <span>Tutup Sesi</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => reopenAttendanceSession(currentSession.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Buka Kembali Sesi</span>
                          </button>
                        )}
                      </div>
                  </div>

                  <h3 className="text-lg sm:text-xl font-black text-white tracking-tight mb-1">
                    {currentSession.title}
                  </h3>
                  {currentSession.subject && (
                    <span className="text-xs text-purple-300 font-bold mb-4">
                      Mata Pelajaran: {currentSession.subject}
                    </span>
                  )}

                  {/* QR Code Container with High-Contrast White Card */}
                  {currentSession.isActive ? (
                    <div className="my-4 p-5 sm:p-6 rounded-3xl bg-white border-4 border-pink-500 shadow-2xl shadow-pink-500/20 flex flex-col items-center relative max-w-sm w-full">
                      {qrCodeDataUrl ? (
                        <img
                          src={qrCodeDataUrl}
                          alt="Kode QR Presensi Kelas"
                          className="w-60 h-60 sm:w-72 sm:h-72 object-contain rounded-xl"
                        />
                      ) : (
                        <div className="w-64 h-64 flex items-center justify-center text-slate-400">
                          <RefreshCw className="w-8 h-8 animate-spin" />
                        </div>
                      )}

                      {/* Progress Bar of Token Expiry */}
                      <div className="w-full mt-3 pt-2 border-t border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-slate-600 font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-pink-600" />
                            Diperbarui Otomatis:
                          </span>
                          <span className="text-pink-600 font-black font-mono">
                            {tokenDetails.secondsRemaining}s Tersisa
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-pink-500 to-purple-600 transition-all duration-1000 ease-linear rounded-full"
                            style={{ width: `${100 - tokenDetails.progressPercent}%` }}
                          />
                        </div>

                        {/* Kode rolling alternatif untuk siswa jika terkendala kamera/silau */}
                        <div className="mt-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            Kode Sesi Alternatif:
                          </span>
                          <span className="font-mono font-black text-sm tracking-widest text-pink-600">
                            {tokenDetails.code}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="my-6 p-10 rounded-3xl bg-[#161031] border border-[#2b1f50] text-center max-w-sm space-y-2">
                      <XCircle className="w-12 h-12 text-slate-500 mx-auto mb-2" />
                      <h4 className="text-sm font-bold text-white">Sesi Presensi Telah Ditutup</h4>
                      <p className="text-xs text-slate-400">
                        Kode QR tidak lagi aktif. Klik tombol "Buka Kembali Sesi" jika ada {terms.memberTitle.toLowerCase()} susulan yang perlu scan.
                      </p>
                    </div>
                  )}

                  {/* Feature Information Badges */}
                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full text-left">
                    <div className="p-3 rounded-xl bg-[#140e2d] border border-[#281c4e] text-xs">
                      <div className="flex items-center gap-1.5 text-pink-400 font-bold mb-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Kode QR Dinamis</span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Kode QR diperbarui otomatis berkala demi keabsahan data presensi.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#140e2d] border border-[#281c4e] text-xs">
                      <div className="flex items-center gap-1.5 text-purple-400 font-bold mb-1">
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>1 {terms.memberTitle} 1 Presensi</span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {terms.memberTitle} terkunci hanya dapat melakukan presensi satu kali per sesi.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#140e2d] border border-[#281c4e] text-xs">
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Verifikasi Lokasi</span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {currentSession.requireLocation ? `Aktif (${currentSession.radiusMeters || 100}m radius kelas)` : 'Opsional / Bebas radius'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Attendees Incoming Feed */}
              <div className="lg:col-span-5 space-y-4">
                {/* Stats Summary Card */}
                <div className="p-5 rounded-3xl bg-[#140f2b] border border-[#271d49] space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Ringkasan Kehadiran Sesi
                    </h4>
                    <span className="text-xs font-mono font-black text-pink-300">
                      {attendanceRate}% Hadir
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                      <span className="text-[10px] font-bold text-emerald-400 block">HADIR</span>
                      <span className="text-base font-black text-white">{hadirCount}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/25">
                      <span className="text-[10px] font-bold text-blue-400 block">IZIN</span>
                      <span className="text-base font-black text-white">{izinCount}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
                      <span className="text-[10px] font-bold text-amber-400 block">SAKIT</span>
                      <span className="text-base font-black text-white">{sakitCount}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/25">
                      <span className="text-[10px] font-bold text-red-400 block">ALPA</span>
                      <span className="text-base font-black text-white">{alpaCount}</span>
                    </div>
                  </div>
                </div>

                {/* Live Realtime Attendance Stream */}
                <div className="p-5 rounded-3xl bg-[#140f2b] border border-[#271d49] space-y-3 shadow-xl">
                  <div className="flex items-center justify-between pb-2 border-b border-[#251b47]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">
                        {terms.memberTitle} Yang Baru Saja Masuk ({currentRecords.length})
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Live Sync</span>
                  </div>

                  {currentRecords.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      Menunggu {terms.memberTitle.toLowerCase()} melakukan scan barcode...
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin pr-1">
                      {currentRecords.map((rec) => {
                        return (
                          <div
                            key={rec.id}
                            className="p-3 rounded-2xl bg-[#191336] border border-[#2a1e4d] flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                                {rec.studentName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <h5 className="text-xs font-bold text-white truncate">
                                  {rec.studentName}
                                </h5>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                  <span className="font-mono">{new Date(rec.checkInTime).toLocaleTimeString('id-ID')}</span>
                                </div>
                              </div>
                            </div>

                            <span
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase shrink-0 ${
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
            </div>
          )}

          {/* TAB 2: REKAP KEHADIRAN SISWA & INTERACTIVE TABLE */}
          {activeTab === 'recap' && (
            <div className="space-y-5">
              {/* Session Selector Carousel / Horizontal Cards */}
              <div className="p-4 sm:p-5 rounded-3xl bg-[#140f2d] border border-[#2c1f4e] space-y-3 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#251944]">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-pink-300 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      Pilih Sesi &amp; Tanggal Presensi Kelas
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Klik salah satu sesi di bawah untuk melihat rekapitulasi {terms.memberTitlePlural.toLowerCase()} per sesi atau lihat matriks gabungan.
                    </p>
                  </div>

                  {/* Mode Selector Toggle */}
                  <div className="flex items-center gap-1 bg-[#1a1239] p-1 rounded-xl border border-[#322359] self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setRecapViewMode('single')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        recapViewMode === 'single'
                          ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Per Sesi Terpilih</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecapViewMode('matrix')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        recapViewMode === 'matrix'
                          ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Table className="w-3.5 h-3.5" />
                      <span>Matriks Seluruh Sesi</span>
                    </button>
                  </div>
                </div>

                {/* Horizontal Session Chips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto scrollbar-thin pr-1">
                  {classSessions.map((sess) => {
                    const isSelected = sess.id === currentSession?.id;
                    const sessRecs = attendanceRecords.filter((r) => r.sessionId === sess.id);
                    const hadirInSess = sessRecs.filter((r) => r.status === 'hadir').length;

                    return (
                      <button
                        key={sess.id}
                        type="button"
                        onClick={() => {
                          setSelectedSessionId(sess.id);
                          setRecapViewMode('single');
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                          isSelected && recapViewMode === 'single'
                            ? 'bg-gradient-to-b from-[#22164a] to-[#170e33] border-pink-500/60 shadow-lg shadow-pink-500/10 ring-1 ring-pink-500/40'
                            : 'bg-[#181136] border-[#291e50] hover:border-purple-400/40'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="px-2 py-0.5 rounded-md bg-pink-500/15 border border-pink-500/30 text-pink-300 font-mono text-[10px] font-black flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-pink-400" />
                              {sess.date}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                                sess.isActive
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-slate-500/20 text-slate-400'
                              }`}
                            >
                              {sess.isActive ? 'Aktif' : 'Ditutup'}
                            </span>
                          </div>
                          <h4 className="text-xs font-black text-white truncate">{sess.title}</h4>
                          {sess.subject && (
                            <span className="text-[10px] text-purple-300 truncate block">{sess.subject}</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-[#251944]">
                          <span className="text-slate-400 font-mono">Tercatat:</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {hadirInSess} Hadir / {sessRecs.length} Total
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* MODE 1: SINGLE SELECTED SESSION */}
              {recapViewMode === 'single' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Header Info Sesi Terpilih */}
                  {currentSession ? (
                    <div className="p-4 sm:p-5 rounded-3xl bg-[#15102d] border border-[#2c204d] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                          <Calendar className="w-5 h-5 text-pink-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm sm:text-base font-black text-white">{currentSession.title}</h3>
                            {currentSession.subject && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold text-[10px]">
                                {currentSession.subject}
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                currentSession.isActive
                                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                                  : 'bg-slate-500/15 border border-slate-500/30 text-slate-400'
                              }`}
                            >
                              {currentSession.isActive ? '🟢 Sesi Aktif' : '⚪ Selesai / Ditutup'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
                            <span className="font-mono font-bold text-pink-300 bg-pink-500/10 px-2 py-0.5 rounded-md border border-pink-500/20 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-pink-400" />
                              Tanggal Sesi: {currentSession.date}
                            </span>
                            <span>•</span>
                            <span>
                              Waktu Mulai: {new Date(currentSession.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Ringkasan Counter Statistik */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="px-3 py-1.5 rounded-xl bg-[#1b143a] border border-[#2f2257] text-white font-mono font-bold">
                          Total: <strong className="text-pink-300">{totalStudents}</strong>
                        </span>
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono font-bold">
                          Hadir: {hadirCount}
                        </span>
                        <span className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 font-mono font-bold">
                          Izin: {izinCount}
                        </span>
                        <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono font-bold">
                          Sakit: {sakitCount}
                        </span>
                        <span className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 font-mono font-bold">
                          Alpa: {alpaCount}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {/* Filter and Download Action Bar */}
                  <div className="p-4 rounded-2xl bg-[#140f2b] border border-[#271d49] flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                      {/* Search box */}
                      <div className="relative flex-1 sm:w-64">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchMember}
                          onChange={(e) => setSearchMember(e.target.value)}
                          placeholder={`Cari nama ${terms.memberTitle.toLowerCase()}...`}
                          className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#191336] border border-[#2d2052] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                        />
                      </div>

                      {/* Status Filter */}
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="px-3 py-1.5 rounded-xl bg-[#191336] border border-[#2d2052] text-xs text-white focus:outline-none cursor-pointer"
                      >
                        <option value="all">Semua Status ({totalStudents})</option>
                        <option value="hadir">Hadir ({hadirCount})</option>
                        <option value="izin">Izin ({izinCount})</option>
                        <option value="sakit">Sakit ({sakitCount})</option>
                        <option value="alpa">Alpa / Belum Absen ({alpaCount})</option>
                      </select>
                    </div>

                    {/* CSV Download Buttons */}
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                      <button
                        type="button"
                        onClick={handleExportSessionCsv}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                        title={`Download rekap presensi untuk sesi tanggal ${currentSession?.date || ''}`}
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        <span>Download CSV (Sesi Ini • {currentSession?.date || 'Sesi'})</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportAllSessionsCsv}
                        className="px-3 py-2 rounded-xl bg-[#1f173d] hover:bg-[#2b1f52] border border-[#3b2a68] text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                        title="Download rekap gabungan semua sesi dengan tanggal masing-masing"
                      >
                        <Download className="w-3.5 h-3.5 text-purple-300" />
                        <span>Semua Sesi</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportMatrixCsv}
                        className="px-3 py-2 rounded-xl bg-[#1f173d] hover:bg-[#2b1f52] border border-[#3b2a68] text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                        title={`Download rekap matriks presensi ${terms.memberTitle.toLowerCase()} x tanggal sesi`}
                      >
                        <Table className="w-3.5 h-3.5 text-pink-300" />
                        <span>Matriks CSV</span>
                      </button>
                    </div>
                  </div>

                  {/* Attendance Table */}
                  <div className="overflow-x-auto rounded-3xl border border-[#261d4a] bg-[#120e28] shadow-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#261d4a] bg-[#181235] text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                          <th className="p-3.5 pl-5 w-12 text-center">No</th>
                          <th className="p-3.5">Tanggal Sesi</th>
                          <th className="p-3.5">Nama {terms.memberTitle}</th>
                          <th className="p-3.5">Status Presensi</th>
                          <th className="p-3.5">Waktu Check-in</th>
                          <th className="p-3.5">Metode</th>
                          <th className="p-3.5">Bukti / Lampiran</th>
                          <th className="p-3.5">Catatan / Alasan</th>
                          <th className="p-3.5 pr-5 text-right">Aksi {terms.educatorTitle}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e173a]">
                        {sessionAttendanceList
                          .filter((stu) => {
                            const matchName = !searchMember || stu.name.toLowerCase().includes(searchMember.toLowerCase());
                            const matchStatus = statusFilter === 'all' || stu.status === statusFilter;
                            return matchName && matchStatus;
                          })
                          .map((stu, idx) => {
                            const rec = stu.record;
                            const stuStatus = stu.status;

                            return (
                              <tr key={stu.studentId} className="hover:bg-[#181335]/50 transition-colors">
                                <td className="p-3.5 pl-5 text-center font-mono text-slate-400">
                                  {idx + 1}
                                </td>

                                <td className="p-3.5 font-mono text-[11px] text-pink-300 font-black">
                                  <span className="px-2 py-0.5 rounded bg-pink-500/10 border border-pink-500/20">
                                    {currentSession?.date || '-'}
                                  </span>
                                </td>

                                <td className="p-3.5">
                                  <div className="font-bold text-white text-xs">{stu.name}</div>
                                </td>

                                <td className="p-3.5">
                                  {/* Quick status selector */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {(['hadir', 'izin', 'sakit', 'alpa'] as AttendanceStatus[]).map((st) => (
                                      <button
                                        key={st}
                                        type="button"
                                        onClick={async () => {
                                          if (rec) {
                                            if (st === 'alpa') {
                                              await deleteAttendanceRecord(rec.id);
                                            } else {
                                              await updateAttendanceRecord(rec.id, st);
                                            }
                                          } else {
                                            if (st !== 'alpa' && currentSession) {
                                              await recordAttendance(
                                                currentSession.id,
                                                st,
                                                'manual_admin',
                                                undefined,
                                                undefined,
                                                undefined,
                                                { id: stu.studentId, name: stu.name, email: stu.email }
                                              );
                                            }
                                          }
                                        }}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                                          stuStatus === st
                                            ? st === 'hadir'
                                              ? 'bg-emerald-500 text-black shadow-sm font-black'
                                              : st === 'izin'
                                              ? 'bg-blue-500 text-white shadow-sm'
                                              : st === 'sakit'
                                              ? 'bg-amber-500 text-black shadow-sm font-black'
                                              : 'bg-red-500 text-white shadow-sm'
                                            : 'bg-[#1a143b] text-slate-400 hover:text-white'
                                        }`}
                                      >
                                        {st}
                                      </button>
                                    ))}
                                  </div>
                                </td>

                                <td className="p-3.5 text-slate-300 font-mono text-xs">
                                  {rec ? new Date(rec.checkInTime).toLocaleTimeString('id-ID') : '-'}
                                </td>

                                 <td className="p-3.5 text-slate-400 text-xs">
                                  {rec ? (
                                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                      {rec.verificationMethod === 'qr_scan'
                                        ? 'Scan Kode QR'
                                        : rec.verificationMethod === 'permission_request'
                                        ? 'Pengajuan Izin'
                                        : `Manual ${terms.educatorTitle}`}
                                    </span>
                                  ) : (
                                    '-'
                                  )}
                                </td>

                                <td className="p-3.5">
                                  {rec?.proofFileUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedProofRecord(rec)}
                                      className="px-2.5 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 text-[10px] font-bold border border-pink-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                                      title="Lihat lampiran bukti foto / surat"
                                    >
                                      <ImageIcon className="w-3.5 h-3.5" />
                                      <span>Lihat Bukti</span>
                                    </button>
                                  ) : (
                                    <span className="text-slate-500 text-[10px]">-</span>
                                  )}
                                </td>

                                <td className="p-3.5 text-slate-400 text-xs max-w-xs truncate">
                                  {rec?.note || '-'}
                                </td>

                                <td className="p-3.5 pr-5 text-right">
                                  {rec && (
                                    <button
                                      type="button"
                                      onClick={() => deleteAttendanceRecord(rec.id)}
                                      className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors"
                                      title={`Reset / hapus rekaman ${terms.memberTitle.toLowerCase()} ini`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MODE 2: MATRIX ALL SESSIONS */}
              {recapViewMode === 'matrix' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-4 rounded-2xl bg-[#140f2b] border border-[#271d49] flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-black text-white">Matriks Kehadiran {terms.memberTitlePlural} Seluruh Tanggal Sesi</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Rekap komparasi kehadiran seluruh {terms.memberTitlePlural.toLowerCase()} untuk setiap tanggal pertemuan kelas.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleExportMatrixCsv}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Table className="w-4 h-4" />
                        <span>Download Matriks CSV</span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-3xl border border-[#261d4a] bg-[#120e28] shadow-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#261d4a] bg-[#181235] text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                          <th className="p-3.5 pl-5 w-12 text-center sticky left-0 bg-[#181235] z-10">No</th>
                          <th className="p-3.5 min-w-44 sticky left-12 bg-[#181235] z-10">Nama {terms.memberTitle}</th>
                          {classSessions.map((s) => (
                            <th key={s.id} className="p-3.5 text-center min-w-28 font-mono">
                              <span className="block text-pink-300 font-bold">{s.date}</span>
                              <span className="text-[9px] text-slate-400 truncate block max-w-28 font-normal">{s.title}</span>
                            </th>
                          ))}
                          <th className="p-3.5 text-center text-emerald-400">H</th>
                          <th className="p-3.5 text-center text-blue-400">I</th>
                          <th className="p-3.5 text-center text-amber-400">S</th>
                          <th className="p-3.5 text-center text-red-400">A</th>
                          <th className="p-3.5 pr-5 text-center font-bold text-white">% Hadir</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e173a]">
                        {classStudents.map((stu, sIdx) => {
                          let hCount = 0;
                          let iCount = 0;
                          let sCount = 0;
                          let aCount = 0;

                          return (
                            <tr key={stu.id} className="hover:bg-[#181335]/50 transition-colors">
                              <td className="p-3.5 pl-5 text-center font-mono text-slate-400 sticky left-0 bg-[#120e28]">
                                {sIdx + 1}
                              </td>
                              <td className="p-3.5 sticky left-12 bg-[#120e28]">
                                <div className="font-bold text-white text-xs">{stu.name}</div>
                              </td>

                              {classSessions.map((sess) => {
                                const rec = attendanceRecords.find(
                                  (r) => r.sessionId === sess.id && r.studentId === stu.id
                                );
                                const st = rec ? rec.status : 'alpa';
                                if (st === 'hadir') hCount++;
                                else if (st === 'izin') iCount++;
                                else if (st === 'sakit') sCount++;
                                else aCount++;

                                return (
                                  <td key={sess.id} className="p-3.5 text-center">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                        st === 'hadir'
                                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                          : st === 'izin'
                                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                          : st === 'sakit'
                                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                      }`}
                                    >
                                      {st.charAt(0).toUpperCase()}
                                    </span>
                                  </td>
                                );
                              })}

                              <td className="p-3.5 text-center font-mono font-bold text-emerald-400">{hCount}</td>
                              <td className="p-3.5 text-center font-mono font-bold text-blue-400">{iCount}</td>
                              <td className="p-3.5 text-center font-mono font-bold text-amber-400">{sCount}</td>
                              <td className="p-3.5 text-center font-mono font-bold text-red-400">{aCount}</td>
                              <td className="p-3.5 pr-5 text-center font-mono font-black text-white">
                                {classSessions.length > 0
                                  ? `${Math.round(((hCount + iCount + sCount) / classSessions.length) * 100)}%`
                                  : '0%'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RIWAYAT SESI */}
          {activeTab === 'history' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classSessions.map((sess) => {
                const sessRecords = attendanceRecords.filter((r) => r.sessionId === sess.id);
                const isSelected = sess.id === currentSession?.id;

                return (
                  <div
                    key={sess.id}
                    className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#181235] border-pink-500/40 shadow-xl'
                        : 'bg-[#130f29] border-[#251d45] hover:border-purple-500/30'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 font-bold">
                          <Calendar className="w-3.5 h-3.5 text-pink-400" />
                          {sess.date}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                            sess.isActive
                              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                              : 'bg-slate-500/15 border border-slate-500/30 text-slate-400'
                          }`}
                        >
                          {sess.isActive ? '🟢 Sesi Aktif' : '⚪ Selesai / Ditutup'}
                        </span>
                      </div>

                      <h4 className="text-base font-black text-white mb-1">{sess.title}</h4>
                      {sess.subject && (
                        <p className="text-xs text-purple-300 font-semibold mb-3">{sess.subject}</p>
                      )}

                      <div className="p-3 rounded-2xl bg-[#0f0c22] border border-[#231a40] text-xs flex items-center justify-between mb-4">
                        <span className="text-slate-400">Total {terms.memberTitlePlural} Tercatat:</span>
                        <span className="font-mono font-bold text-emerald-400">{sessRecords.length} {terms.memberTitlePlural}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[#231a40] gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSessionId(sess.id);
                            setActiveTab('projector');
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          Buka Barcode
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSessionId(sess.id);
                            setActiveTab('recap');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#1d163c] hover:bg-[#281e52] border border-[#352763] text-purple-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          Lihat Rekap
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteSession(sess.id, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors"
                        title="Hapus sesi presensi ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#161031] border border-red-500/40 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Hapus Sesi Presensi?</h3>
                <span className="text-xs text-red-300 font-mono">Tindakan ini permanen</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0f0a21] border border-[#291e4c] space-y-2 text-xs">
              <div className="text-white font-bold text-sm">{sessionToDelete.title}</div>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="font-mono text-pink-300 font-bold">Tanggal: {sessionToDelete.date}</span>
                {sessionToDelete.subject && <span>• Mapel: {sessionToDelete.subject}</span>}
              </div>
              <p className="text-slate-400 pt-1 text-[11px] leading-relaxed">
                Seluruh data rekapitulasi kehadiran {terms.memberTitlePlural.toLowerCase()} pada sesi tanggal ini akan ikut terhapus.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-[#1a1336] text-slate-300 text-xs font-bold hover:bg-[#251d4d] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSession}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-lg shadow-red-600/30 cursor-pointer"
              >
                Ya, Hapus Sesi Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW SESSION MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-[#161031] border border-[#3b2a68] shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#2b1f4e]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Buka Sesi Presensi Baru</h3>
                  <span className="text-xs text-slate-400">Konfigurasi Kode QR Presensi Digital Terverifikasi</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Judul Sesi Presensi / Pertemuan *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: Pertemuan 1 - Pengenalan Algoritma"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#120e26] border border-[#291e4f] text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Mata Pelajaran / Topik (Opsional)
                </label>
                <input
                  type="text"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder="Contoh: Pemrograman Web, Matematika"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#120e26] border border-[#291e4f] text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* Dynamic Refresh Interval */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Interval Perputaran Barcode Dinamis (Anti-Screenshot)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[10, 15, 30].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setFormRefreshInterval(sec)}
                      className={`p-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                        formRefreshInterval === sec
                          ? 'bg-pink-500/20 border-pink-500 text-pink-300'
                          : 'bg-[#120e26] border-[#291e4f] text-slate-400'
                      }`}
                    >
                      {sec} Detik
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Barcode dan kode akan berputar secara otomatis. Kode lama langsung hangus.
                </p>
              </div>

              {/* GPS Geofence Settings */}
              <div className="p-3.5 rounded-2xl bg-[#110d24] border border-[#291e4f] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">Validasi Radius Lokasi Kelas (GPS)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formRequireLocation}
                    onChange={(e) => setFormRequireLocation(e.target.checked)}
                    className="w-4 h-4 accent-pink-500 cursor-pointer"
                  />
                </div>

                {formRequireLocation && (
                  <div className="space-y-2 pt-2 border-t border-[#221842] animate-in fade-in duration-150">
                    <button
                      type="button"
                      onClick={handleFetchCurrentLocation}
                      disabled={isGettingLocation}
                      className="w-full py-2 rounded-xl bg-[#1a1438] hover:bg-[#251e50] border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{isGettingLocation ? 'Mengunci Koordinat...' : formCoords.lat ? 'Koordinat Terkunci ✓' : 'Kunci Titik Lokasi Kelas Sekarang'}</span>
                    </button>
                    {formCoords.lat && (
                      <span className="text-[10px] text-emerald-400 font-mono block text-center">
                        Lat: {formCoords.lat.toFixed(5)}, Lng: {formCoords.lng?.toFixed(5)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#2b1f4e]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#1a1336] text-slate-300 text-xs font-bold hover:bg-[#251d4d] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-black shadow-md shadow-pink-500/25 cursor-pointer"
                >
                  Mulai &amp; Tampilkan Barcode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LIHAT BUKTI FOTO / SURAT */}
      {selectedProofRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#140f2b] border border-[#2d2054] rounded-3xl p-5 sm:p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#261b47]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-500/30 text-pink-400 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Bukti Presensi: {selectedProofRecord.studentName}</h3>
                  <p className="text-[11px] text-slate-400">
                    Status: <strong className="uppercase text-pink-300">{selectedProofRecord.status}</strong> • {selectedProofRecord.proofFileName || 'Lampiran'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProofRecord(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#231742] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {selectedProofRecord.proofFileUrl && selectedProofRecord.proofFileUrl.startsWith('data:image/') ? (
                <div className="max-h-[60vh] overflow-hidden rounded-2xl border border-[#2b1f4e] bg-black flex items-center justify-center p-2">
                  <img
                    src={selectedProofRecord.proofFileUrl}
                    alt={`Bukti Presensi ${terms.memberTitle}`}
                    className="max-h-[55vh] w-auto object-contain rounded-xl"
                  />
                </div>
              ) : selectedProofRecord.proofFileUrl ? (
                <div className="p-6 rounded-2xl bg-[#1b143a] border border-[#312359] text-center space-y-3">
                  <FileText className="w-10 h-10 text-pink-400 mx-auto" />
                  <p className="text-xs text-white font-bold">{selectedProofRecord.proofFileName || 'Dokumen Bukti'}</p>
                  <a
                    href={selectedProofRecord.proofFileUrl}
                    download={selectedProofRecord.proofFileName || 'Bukti_Presensi'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs shadow-md transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh / Buka Dokumen</span>
                  </a>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs">Tidak ada lampiran berkas</div>
              )}

              {selectedProofRecord.note && (
                <div className="p-3 rounded-xl bg-[#191238] border border-[#2c1f4e] text-xs">
                  <span className="font-bold text-slate-300 block mb-0.5">Catatan {terms.memberTitle}:</span>
                  <p className="text-slate-300 italic">{selectedProofRecord.note}</p>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-[#261b47] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedProofRecord(null)}
                className="px-4 py-2 rounded-xl bg-[#1c143d] hover:bg-[#281c54] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FULLSCREEN PROJECTOR DISPLAY */}
      {isProjectorFullscreen && currentSession && (
        <div className="fixed inset-0 z-50 bg-[#090715] flex flex-col justify-between p-6 sm:p-10 select-none animate-in fade-in duration-200">
          {/* Header */}
          <div className="w-full flex items-center justify-between pb-4 border-b border-[#251b47]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/25">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-pink-400 tracking-wider">
                  LAYAR PROYEKTOR PRESENSI REAL-TIME
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">{currentSession.title}</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsProjectorFullscreen(false)}
              className="p-3 rounded-2xl bg-[#1d1538] hover:bg-[#2d2054] text-white border border-[#372663] cursor-pointer transition-all"
              title="Tutup Layar Penuh"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>

          {/* Center High-Contrast QR Code */}
          <div className="my-auto flex flex-col items-center space-y-4">
            <div className="p-6 sm:p-8 rounded-3xl bg-white border-8 border-pink-500 shadow-2xl shadow-pink-500/30 flex flex-col items-center max-w-md w-full">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code Proyektor"
                  className="w-72 h-72 sm:w-88 sm:h-88 object-contain"
                />
              ) : (
                <div className="w-72 h-72 sm:w-88 sm:h-88 flex items-center justify-center text-slate-400">
                  <RefreshCw className="w-10 h-10 animate-spin" />
                </div>
              )}

              <div className="w-full mt-4 pt-3 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-700">
                  <span>Pergantian Kode Otomatis:</span>
                  <span className="text-pink-600 font-black">{tokenDetails.secondsRemaining}s</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-purple-600 transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${100 - tokenDetails.progressPercent}%` }}
                  />
                </div>
                <div className="mt-3 p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Kode Sesi Alternatif:</span>
                  <span className="text-xl font-mono font-black tracking-widest text-pink-600">
                    {tokenDetails.code}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-sm font-semibold text-slate-300">
              Buka menu <strong>Absensi Siswa</strong> &gt; Arahkan kamera ke layar untuk absen otomatis.
            </p>
          </div>

          {/* Footer summary */}
          <div className="w-full flex items-center justify-between pt-4 border-t border-[#251b47] text-xs text-slate-400">
            <span>{currentRecords.length} siswa telah melakukan check-in</span>
            <span className="text-emerald-400 font-bold font-mono">Live Sync Aktif ✓</span>
          </div>
        </div>
      )}
    </div>
  );
};
