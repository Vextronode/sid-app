import { ACCOUNT_SECTION_PARAM, HAL_MANAJEMEN_AKUN } from '@/lib/constants/routes'
import type { AccountSection } from '@/lib/constants/routes'
import type { NotificationContext, UserRole } from '@/types'

// Halaman daftar surat tiap peran. Halaman-halaman ini membuka detail
// surat bila diberi parameter ?surat=<id> (lihat useLetterDeepLink).
const LETTER_LIST_ROUTES: Record<UserRole, string> = {
  warga: '/surat-saya/daftar',
  rt: '/admin/rt/surat',
  rw: '/admin/rw/surat',
  kadus: '/admin/kadus/surat',
  kepala_desa: '/admin/kades/surat',
  sekretaris_desa: '/admin/kades/surat',
  kasi_pemerintahan: '/admin/operator-desa/surat',
  kaur_tu_umum: '/admin/operator-desa/surat',
  staf_sid: '/admin/operator-desa/surat',
}

// Pengajuan surat pribadi oleh pejabat: semua peran ber-akun, termasuk
// Staf SIDUTama.
export const SELF_LETTER_ROUTE = '/admin/surat-saya'

export const SELF_LETTER_ROLES: UserRole[] = [
  'rt',
  'rw',
  'kadus',
  'kepala_desa',
  'sekretaris_desa',
  'kasi_pemerintahan',
  'kaur_tu_umum',
  'staf_sid',
]

// Permintaan saksi diputuskan di halaman profil, bukan di surat: pemilik
// NIK belum tentu berhak membuka surat orang lain.
const SIGNATURE_REQUEST_STATUSES = ['signature_requested']

export const SIGNATURE_REQUESTS_ANCHOR = 'permintaan-saksi'

// Permintaan akun warga untuk petugas wilayah: section Manajemen Akun yang dibuka.
const ACCOUNT_REQUEST_SECTIONS: Record<string, AccountSection> = {
  account_registration_submitted: 'aktivasi',
  profile_photo_requested: 'foto',
}

// Keputusan permintaan ganti foto, untuk warga yang memintanya.
const PROFILE_PHOTO_DECISIONS = ['profile_photo_approved', 'profile_photo_rejected']

function profileRoute(role: UserRole) {
  return role === 'warga' ? '/profil' : '/admin/profil'
}

/**
 * Tujuan navigasi saat sebuah notifikasi diklik, atau null bila
 * notifikasinya tidak merujuk ke halaman mana pun.
 */
export function getNotificationTarget(
  role: UserRole | null | undefined,
  context: NotificationContext | null | undefined,
) {
  if (!role || !context) return null

  if (context.status && SIGNATURE_REQUEST_STATUSES.includes(context.status)) {
    return `${profileRoute(role)}#${SIGNATURE_REQUESTS_ANCHOR}`
  }

  // Warga mendaftar akun atau meminta ganti foto: buka section Manajemen
  // Akun petugas yang memegangnya.
  const section = context.status ? ACCOUNT_REQUEST_SECTIONS[context.status] : undefined

  if (section) {
    const route = HAL_MANAJEMEN_AKUN[role]

    return route ? `${route}?${ACCOUNT_SECTION_PARAM}=${section}` : null
  }

  if (context.status && PROFILE_PHOTO_DECISIONS.includes(context.status)) {
    return profileRoute(role)
  }

  if (!context.letter_id) return null

  return letterDetailPath(role, context.letter_id, Boolean(context.is_applicant))
}

/**
 * Halaman yang membuka detail surat untuk peran ini, atau null untuk peran
 * yang tidak dikenal. Pejabat yang menjadi pemohon surat itu membukanya di
 * "Surat Saya", bukan di daftar surat warga yang ia proses.
 */
export function letterDetailPath(role: UserRole, letterId: string, isApplicant: boolean) {
  const listRoute =
    isApplicant && SELF_LETTER_ROLES.includes(role) ? SELF_LETTER_ROUTE : LETTER_LIST_ROUTES[role]

  if (!listRoute) return null

  return `${listRoute}?surat=${encodeURIComponent(letterId)}`
}
