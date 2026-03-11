/**
 * Converts technical error messages into user-friendly Indonesian messages.
 */
export function friendlyError(error: any): string {
  const msg = typeof error === 'string' ? error : error?.message || '';
  const lower = msg.toLowerCase();

  // Auth errors
  if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials'))
    return 'Email atau password salah. Silakan coba lagi.';
  if (lower.includes('email not confirmed'))
    return 'Email belum diverifikasi. Silakan cek inbox email Anda.';
  if (lower.includes('user already registered') || lower.includes('already been registered'))
    return 'Email sudah terdaftar. Gunakan email lain.';
  if (lower.includes('password') && lower.includes('at least'))
    return 'Password minimal 6 karakter.';
  if (lower.includes('rate limit') || lower.includes('too many requests'))
    return 'Terlalu banyak percobaan. Silakan tunggu beberapa saat.';

  // RLS / permission errors
  if (lower.includes('row-level security') || lower.includes('row level security') || lower.includes('rls'))
    return 'Gagal menyimpan data. Anda tidak memiliki izin untuk aksi ini.';
  if (lower.includes('permission denied') || lower.includes('not authorized'))
    return 'Anda tidak memiliki izin untuk melakukan aksi ini.';

  // Network / connection errors
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('network'))
    return 'Koneksi internet bermasalah. Silakan cek jaringan Anda.';
  if (lower.includes('timeout') || lower.includes('timed out'))
    return 'Koneksi terlalu lama. Silakan coba lagi.';

  // Database constraint errors
  if (lower.includes('duplicate key') || lower.includes('unique constraint') || lower.includes('already exists'))
    return 'Data sudah ada. Tidak bisa menambahkan data yang sama.';
  if (lower.includes('foreign key') || lower.includes('violates foreign key'))
    return 'Data terkait tidak ditemukan. Pastikan data referensi sudah benar.';
  if (lower.includes('not null') || lower.includes('null value'))
    return 'Harap isi semua data yang diperlukan.';
  if (lower.includes('check constraint'))
    return 'Data yang dimasukkan tidak valid. Silakan periksa kembali.';

  // Server errors
  if (lower.includes('500') || lower.includes('internal server'))
    return 'Terjadi kesalahan pada sistem. Silakan coba lagi nanti.';
  if (lower.includes('502') || lower.includes('503') || lower.includes('bad gateway') || lower.includes('service unavailable'))
    return 'Server sedang tidak tersedia. Silakan coba lagi nanti.';

  // JWT / session errors
  if (lower.includes('jwt') || lower.includes('token') || lower.includes('expired'))
    return 'Sesi Anda telah berakhir. Silakan login kembali.';

  // Generic fallback - if it looks technical, replace it
  if (msg.length > 100 || /[{}\[\]<>]/.test(msg) || lower.includes('error') || lower.includes('exception'))
    return 'Terjadi kesalahan. Silakan coba lagi.';

  // If it's already a short readable message, return as-is
  return msg || 'Terjadi kesalahan. Silakan coba lagi.';
}
