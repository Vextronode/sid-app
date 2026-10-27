// Halaman daftar surat tiap peran. Halaman-halaman ini membuka detail
// surat bila diberi parameter ?surat=<id> (lihat useLetterDeepLink).
const LETTER_LIST_ROUTES = {
  warga: '/daftar-surat-saya',
  rt: '/admin/list-rt',
  rw: '/admin/list-rw',
  kadus: '/admin/list-kadus',
  kepala_desa: '/admin/list-kades',
  sekretaris_desa: '/admin/list-kades',
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

/**
 * Tujuan navigasi saat sebuah notifikasi diklik, atau null bila
 * notifikasinya tidak merujuk ke halaman mana pun.
 */
export function getNotificationTarget(role, context) {
  if (!role || !context) return null

  if (SIGNATURE_REQUEST_STATUSES.includes(context.status)) {
    const profile = role === 'warga' ? '/profile' : '/admin/profile'

    return `${profile}#${SIGNATURE_REQUESTS_ANCHOR}`
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
