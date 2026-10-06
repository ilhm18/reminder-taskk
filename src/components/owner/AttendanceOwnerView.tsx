import React, { useState, useMemo } from 'react';
import {
  QrCode,
  Building2,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Search,
  FileSpreadsheet,
  Trash2,
  ShieldCheck,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AttendanceSession, AttendanceRecord } from '../../types';

export const AttendanceOwnerView: React.FC = () => {
  const {
    classes,
    attendanceSessions,
    attendanceRecords,
    deleteAttendanceSession,
    showToast,
  } = useApp();

  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'sessions' | 'records'>('sessions');

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return attendanceSessions.filter((s) => {
      const matchClass = selectedClassId === 'all' || s.classId === selectedClassId;
      const matchSearch =
        !searchQuery ||
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.subject && s.subject.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchClass && matchSearch;
    });
  }, [attendanceSessions, selectedClassId, searchQuery]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter((r) => {
      const matchClass = selectedClassId === 'all' || r.classId === selectedClassId;
      const matchSearch =
        !searchQuery ||
        r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.studentEmail && r.studentEmail.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchClass && matchSearch;
    });
  }, [attendanceRecords, selectedClassId, searchQuery]);

  // Overall statistics
  const totalSessions = attendanceSessions.length;
  const activeSessionsCount = attendanceSessions.filter((s) => s.isActive).length;
  const totalCheckIns = attendanceRecords.length;
  const totalHadir = attendanceRecords.filter((r) => r.status === 'hadir').length;

  const handleExportOwnerCsv = () => {
    if (attendanceRecords.length === 0) {
      showToast('Belum ada data rekaman presensi untuk diunduh.', 'warn');
      return;
    }

    const lines: string[] = [];
    lines.push('LAPORAN MASTER AUDIT PRESENSI GLOBAL PLATFORM');
    lines.push(`"Total Sesi Terdata","${totalSessions} Sesi"`);
    lines.push(`"Total Check-in Tercatat","${totalCheckIns} Siswa"`);
    lines.push(`"Waktu Cetak Laporan","${new Date().toLocaleString('id-ID')}"`);
    lines.push('');

    lines.push('"No","Tanggal Sesi","Nama Sesi","Ruang Kelas","Nama Siswa","Email Siswa","Status","Waktu Check-In","Metode","Catatan / Alasan"');

    filteredRecords.forEach((rec, idx) => {
      const sess = attendanceSessions.find((s) => s.id === rec.sessionId);
      const targetClass = classes.find((c) => c.id === rec.classId);
      const sessDate = sess?.date || '-';
      const sessTitle = sess?.title || '-';
      const className = targetClass?.name || 'Kelas';

      lines.push(
        `${idx + 1},"${sessDate}","${sessTitle.replace(/"/g, '""')}","${className.replace(/"/g, '""')}","${rec.studentName.replace(/"/g, '""')}","${(rec.studentEmail || '-').replace(/"/g, '""')}","${rec.status.toUpperCase()}","${new Date(rec.checkInTime).toLocaleString('id-ID')}","${rec.verificationMethod}","${(rec.note || '-').replace(/"/g, '""')}"`
      );
    });

    const csvString = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Audit_Presensi_Global_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Laporan audit presensi global berhasil diunduh ke CSV!', 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1e1338] via-[#160f2d] to-[#0d091e] border border-[#2d1e52] p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 font-extrabold text-[11px] flex items-center gap-1.5 shadow-sm">
                <QrCode className="w-3.5 h-3.5 text-pink-400" />
                Audit &amp; Rekap Absensi Global Platform
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Monitoring Presensi Seluruh Kelas
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
              Pantau seluruh aktivitas absensi digital, sesi barcode realtime, dan rekapitulasi kehadiran siswa lintas seluruh ruang kelas sekolah.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 shrink-0">
            <div className="p-3 rounded-2xl bg-[#140e2b] border border-[#271d49] text-center min-w-28">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Sesi</span>
              <span className="text-lg font-black text-white font-mono">{totalSessions}</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#140e2b] border border-[#271d49] text-center min-w-28">
              <span className="text-[10px] text-emerald-400 font-bold uppercase block">Sesi Aktif</span>
              <span className="text-lg font-black text-emerald-400 font-mono">{activeSessionsCount}</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#140e2b] border border-[#271d49] text-center min-w-28 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-pink-400 font-bold uppercase block">Total Check-In</span>
              <span className="text-lg font-black text-pink-400 font-mono">{totalCheckIns}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div className="p-4 rounded-3xl bg-[#130e28] border border-[#261d48] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Sub tabs */}
          <div className="flex items-center gap-1 bg-[#181135] p-1 rounded-xl border border-[#291e4f]">
            <button
              type="button"
              onClick={() => setActiveTab('sessions')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'sessions' ? 'bg-pink-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sesi Kelas ({filteredSessions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('records')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'records' ? 'bg-pink-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Log Check-In ({filteredRecords.length})
            </button>
          </div>

          {/* Class Filter */}
          <div className="flex items-center gap-1.5 bg-[#181135] px-3 py-1.5 rounded-xl border border-[#291e4f]">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-transparent text-xs text-white font-bold focus:outline-none"
            >
              <option value="all">Semua Ruang Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search & Export */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari sesi atau siswa..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#181135] border border-[#291e4f] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
            />
          </div>

          <button
            type="button"
            onClick={handleExportOwnerCsv}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
            title="Download CSV Audit Presensi Global"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: SESSIONS LIST */}
      {activeTab === 'sessions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSessions.length === 0 ? (
            <div className="col-span-2 p-12 text-center rounded-3xl bg-[#130f29] border border-[#261d4a] text-slate-400 text-xs">
              Tidak ada sesi presensi yang ditemukan.
            </div>
          ) : (
            filteredSessions.map((sess) => {
              const targetClass = classes.find((c) => c.id === sess.classId);
              const sessRecords = attendanceRecords.filter((r) => r.sessionId === sess.id);

              return (
                <div
                  key={sess.id}
                  className="p-5 sm:p-6 rounded-3xl bg-[#130f29] border border-[#251d45] flex flex-col justify-between shadow-xl"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold text-[10px]">
                          {targetClass?.name || 'Kelas Terkait'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {sess.date}
                        </span>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          sess.isActive
                            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                            : 'bg-slate-500/15 border border-slate-500/30 text-slate-400'
                        }`}
                      >
                        {sess.isActive ? '🟢 Sesi Aktif' : '⚪ Ditutup'}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-white mb-1">{sess.title}</h3>
                    {sess.subject && (
                      <p className="text-xs text-purple-300 font-semibold mb-2">{sess.subject}</p>
                    )}
                    <p className="text-[11px] text-slate-400 mb-4">
                      Dibuat oleh: <strong className="text-slate-300">{sess.createdByName || 'Admin'}</strong>
                    </p>

                    <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-[#0e0a21] border border-[#21183d] text-xs text-center mb-4">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">TOTAL HADIR</span>
                        <span className="font-mono font-black text-emerald-400 text-sm">
                          {sessRecords.length} Siswa
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">INTERVAL QR</span>
                        <span className="font-mono font-black text-pink-400 text-sm">
                          {sess.tokenRefreshInterval || 15}s
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#21183d]">
                    <span className="text-[10px] text-slate-500 font-mono">
                      ID: {sess.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteAttendanceSession(sess.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                      title="Hapus sesi presensi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: MASTER ATTENDANCE RECORDS */}
      {activeTab === 'records' && (
        <div className="overflow-x-auto rounded-3xl border border-[#261d4a] bg-[#120e28] shadow-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#261d4a] bg-[#181235] text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3.5 pl-5">Nama Siswa</th>
                <th className="p-3.5">Ruang Kelas</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Waktu Check-in</th>
                <th className="p-3.5">Metode</th>
                <th className="p-3.5 pr-5">Catatan / Alasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e173a]">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Tidak ada catatan presensi yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const targetClass = classes.find((c) => c.id === rec.classId);

                  return (
                    <tr key={rec.id} className="hover:bg-[#181335]/50 transition-colors">
                      <td className="p-3.5 pl-5 font-bold text-white">
                        {rec.studentName}
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {rec.studentEmail || '-'}
                        </span>
                      </td>

                      <td className="p-3.5 text-purple-300 font-bold">
                        {targetClass?.name || 'Kelas'}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                            rec.status === 'hadir'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : rec.status === 'izin'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-300 font-mono">
                        {new Date(rec.checkInTime).toLocaleString('id-ID')}
                      </td>

                      <td className="p-3.5 text-slate-400 font-mono text-[10px]">
                        {rec.verificationMethod}
                      </td>

                      <td className="p-3.5 pr-5 text-slate-400 max-w-xs truncate">
                        {rec.note || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
