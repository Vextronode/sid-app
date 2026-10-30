import {
  SELF_LETTER_ROLES,
  SELF_LETTER_ROUTE,
} from '@/features/notifikasi/utils/notificationTarget'
import { HAL_AJUKAN_SURAT, HAL_STATUS_SURAT } from '@/lib/constants/routes'
import type { UserRole } from '@/types'

// Daftar surat warga yang sudah disetujui (siap diunduh).
export const HAL_UNDUH_SURAT = `${HAL_STATUS_SURAT}?status=approved`

// Halaman awal tiap peran setelah login.
export function roleHomePath(role: UserRole | null | undefined) {
  switch (role) {
    case 'rt':
      return '/admin/rt'
    case 'rw':
      return '/admin/rw'
    case 'kadus':
      return '/admin/kadus'
    case 'kepala_desa':
    case 'sekretaris_desa':
      return '/admin/kades'
    case 'kasi_pemerintahan':
    case 'kaur_tu_umum':
    case 'staf_sid':
      return '/admin/operator-desa'
    case 'warga':
      return '/surat-saya'
    default:
      return '/'
  }
}

// Halaman surat warga yang punya padanan untuk pejabat (pengajuan surat
// pribadi di /admin/surat-saya).
const WARGA_LETTER_PATHS = [
  /^\/jenis-surat$/,
  /^\/pengajuan-surat(\/[^/]+)?$/,
  /^\/surat-saya\/daftar$/,
  /^\/surat-saya$/,
]

export function isWargaLetterPath(path: string | null | undefined) {
  const pathname = String(path ?? '').split(/[?#]/)[0]

  return WARGA_LETTER_PATHS.some((pattern) => pattern.test(pathname))
}

// Tujuan link surat di beranda (Ajukan, Cek Status, Unduh) untuk peran yang
// sedang login. Link beranda selalu ditulis sebagai halaman warga; pejabat
// yang boleh mengajukan surat sendiri diarahkan ke halaman Surat Saya
// pejabat, peran lain (Staf SIDUTama) ke halaman awalnya. Tanpa pemetaan ini
// ProtectedRoute menolak pejabat dan mereka terlempar ke beranda publik.
export function letterTargetForRole(target: string, role: UserRole | null | undefined) {
  if (role === 'warga') return target
  if (!isWargaLetterPath(target)) return target
  if (SELF_LETTER_ROLES.includes(role)) return SELF_LETTER_ROUTE

  return roleHomePath(role)
}

export { HAL_AJUKAN_SURAT, HAL_STATUS_SURAT }
