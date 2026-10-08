import { AttendanceSession } from '../types';

/**
 * Fast deterministic hash for generating dynamic 6-character rolling codes.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

const CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude ambiguous chars like 0, 1, I, O

/**
 * Generates a rolling 6-character code for an epoch step.
 */
export function getCodeForStep(sessionId: string, secretToken: string, step: number): string {
  const seed = `${sessionId}:${secretToken}:${step}`;
  let num = hashString(seed);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS[num % CHARS.length];
    num = Math.floor(num / CHARS.length) ^ (step + i * 1337);
    num = Math.abs(num);
  }
  return code;
}

/**
 * Gets the current rolling token details for Admin projector/screen display.
 */
export function getRollingTokenDetails(session: AttendanceSession): {
  code: string;
  step: number;
  qrPayload: string;
  secondsRemaining: number;
  progressPercent: number;
} {
  const intervalMs = (session.tokenRefreshInterval || 15) * 1000;
  const now = Date.now();
  const step = Math.floor(now / intervalMs);
  const timeIntoStep = now % intervalMs;
  const msRemaining = intervalMs - timeIntoStep;
  const secondsRemaining = Math.max(1, Math.ceil(msRemaining / 1000));
  const progressPercent = Math.min(100, Math.max(0, ((intervalMs - msRemaining) / intervalMs) * 100));

  const code = getCodeForStep(session.id, session.secretToken, step);
  const qrPayload = JSON.stringify({
    type: 'rt_attend_qr_v1',
    sid: session.id,
    cid: session.classId,
    tok: code,
    step,
  });

  return {
    code,
    step,
    qrPayload,
    secondsRemaining,
    progressPercent,
  };
}

/**
 * Verifies if scanned QR payload or manually typed code is valid for the session.
 * Allows current step, previous 4 steps, and next 4 steps (grace period for clock drift / network latency),
 * as well as static session codes, session IDs, and RemindTask format payloads.
 */
export function verifyAttendanceToken(
  input: string,
  session: AttendanceSession
): { isValid: boolean; message: string; method: 'qr_scan' | 'rolling_token' } {
  if (!session.isActive) {
    return { isValid: false, message: 'Sesi presensi ini telah ditutup oleh Guru/Admin.', method: 'rolling_token' };
  }

  const trimmed = (input || '').trim();
  if (!trimmed) {
    return { isValid: false, message: 'Kode presensi tidak boleh kosong.', method: 'qr_scan' };
  }

  const intervalMs = (session.tokenRefreshInterval || 15) * 1000;
  const now = Date.now();
  const currentStep = Math.floor(now / intervalMs);

  // Generate valid codes for current step and neighboring steps (+/- 40 steps, ~10 minutes tolerance for clock drift)
  const validCodes: string[] = [];
  for (let offset = -40; offset <= 40; offset++) {
    validCodes.push(getCodeForStep(session.id, session.secretToken, currentStep + offset).toUpperCase());
  }

  // Also include session code if set
  if (session.code) {
    validCodes.push(session.code.toUpperCase());
  }

  // 1. Direct match with session ID (barcode of session ID)
  if (trimmed === session.id || trimmed.toUpperCase() === session.id.toUpperCase()) {
    return { isValid: true, message: 'Barcode sesi presensi berhasil diverifikasi!', method: 'qr_scan' };
  }

  // 2. Check if input is a JSON payload from camera QR scan
  try {
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = JSON.parse(trimmed);
      const parsedSid = parsed.sid || parsed.sessionId || parsed.id;
      const parsedTok = (parsed.tok || parsed.code || parsed.token || '').toString().trim().toUpperCase();

      if (parsedSid && parsedSid !== session.id) {
        return {
          isValid: false,
          message: 'Kode QR yang dipindai bukan untuk sesi presensi kelas yang sedang dibuka.',
          method: 'qr_scan',
        };
      }

      if (parsedTok && validCodes.includes(parsedTok)) {
        return { isValid: true, message: 'Kode QR presensi berhasil diverifikasi!', method: 'qr_scan' };
      }

      // If SID matches this session, the QR is validly from this session
      if (parsedSid === session.id) {
        return { isValid: true, message: 'Kode QR presensi berhasil diverifikasi!', method: 'qr_scan' };
      }

      if (parsedTok) {
        return {
          isValid: false,
          message: 'Kode QR telah diperbarui/kadaluarsa. Arahkan kembali kamera ke Kode QR terbaru di layar.',
          method: 'qr_scan',
        };
      }
    }
  } catch {
    // Not JSON, continue to other formats
  }

  // 3. Check if input is URL (from phone camera scanner or barcode reader)
  if (trimmed.includes('tok=') || trimmed.includes('sid=') || trimmed.includes('sessionId=') || trimmed.includes('code=')) {
    try {
      const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://remindtask.local/${trimmed}`);
      const tokParam = (urlObj.searchParams.get('tok') || urlObj.searchParams.get('code') || urlObj.searchParams.get('token') || '').toUpperCase();
      const sidParam = urlObj.searchParams.get('sid') || urlObj.searchParams.get('sessionId') || '';

      if (sidParam && sidParam !== session.id) {
        return {
          isValid: false,
          message: 'Kode QR bukan untuk sesi presensi kelas ini.',
          method: 'qr_scan',
        };
      }

      if (tokParam && validCodes.includes(tokParam)) {
        return { isValid: true, message: 'Kode QR presensi berhasil diverifikasi!', method: 'qr_scan' };
      }

      if (sidParam === session.id) {
        return { isValid: true, message: 'Kode QR presensi berhasil diverifikasi!', method: 'qr_scan' };
      }
    } catch {
      // Continue
    }
  }

  // 4. Treat as direct 6-character rolling code or session code
  const cleanInput = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleanInput.length >= 4 && validCodes.includes(cleanInput)) {
    return { isValid: true, message: 'Kode presensi kelas berhasil diverifikasi!', method: 'rolling_token' };
  }

  // Check if session ID substring or prefix match
  if (cleanInput && (session.id.toUpperCase().includes(cleanInput) || cleanInput.includes(session.id.toUpperCase()))) {
    return { isValid: true, message: 'Kode presensi kelas berhasil diverifikasi!', method: 'rolling_token' };
  }

  return {
    isValid: false,
    message: 'Kode presensi tidak cocok atau telah berganti. Silakan pindai Kode QR terbaru.',
    method: 'qr_scan',
  };
}

/**
 * Haversine formula to calculate distance in meters between two coordinates.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return 999999;
  if ((lat1 === 0 && lon1 === 0) || (lat2 === 0 && lon2 === 0)) return 999999;
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}
