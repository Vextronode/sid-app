// Halaman daftar surat tiap peran. Halaman-halaman ini membuka detail
// surat bila diberi parameter ?surat=<id> (lihat useLetterDeepLink).
const LETTER_LIST_ROUTES = {
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

// Pengajuan surat pribadi oleh pejabat: semua peran ber-akun kecuali
// Staf SIDUTama (admin).
export const SELF_LETTER_ROUTE = '/admin/surat-saya'

export const SELF_LETTER_ROLES = [
  'rt',
  'rw',
  'kadus',
  'kepala_desa',
  'sekretaris_desa',
  'kasi_pemerintahan',
  'kaur_tu_umum',
]

// Permintaan tanda tangan diputuskan di halaman profil, bukan di surat:
// pemilik NIK belum tentu berhak membuka surat orang lain.
const SIGNATURE_REQUEST_STATUSES = ['signature_requested']

export const SIGNATURE_REQUESTS_ANCHOR = 'permintaan-tanda-tangan'

// Pengajuan reset TTD: masuk ke Staf SIDUTama, keputusannya ke pemilik
// akun di kartu tanda tangan profilnya.
export const SIGNATURE_RESET_REQUESTS_ROUTE = '/admin/pengajuan-reset'

const SIGNATURE_RESET_DECISION_STATUSES = ['signature_reset_approved', 'signature_reset_rejected']

export const SIGNATURE_CARD_ANCHOR = 'tanda-tangan'

function profileRoute(role) {
  return role === 'warga' ? '/profil' : '/admin/profil'
}

/**
 * Tujuan navigasi saat sebuah notifikasi diklik, atau null bila
 * notifikasinya tidak merujuk ke halaman mana pun.
 */
export function getNotificationTarget(role, context) {
  if (!role || !context) return null

  if (SIGNATURE_REQUEST_STATUSES.includes(context.status)) {
    return `${profileRoute(role)}#${SIGNATURE_REQUESTS_ANCHOR}`
  }

  if (context.status === 'signature_reset_requested') {
    return role === 'staf_sid' ? SIGNATURE_RESET_REQUESTS_ROUTE : null
  }

  if (SIGNATURE_RESET_DECISION_STATUSES.includes(context.status)) {
    return `${profileRoute(role)}#${SIGNATURE_CARD_ANCHOR}`
  }

  // Pejabat yang menjadi pemohon surat itu: buka di "Surat Saya", bukan
  // di daftar surat warga yang ia proses.
  const listRoute =
    context.is_applicant && SELF_LETTER_ROLES.includes(role)
      ? SELF_LETTER_ROUTE
      : LETTER_LIST_ROUTES[role]

  if (!listRoute || !context.letter_id) return null

  return `${listRoute}?surat=${encodeURIComponent(context.letter_id)}`
}
