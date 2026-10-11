// Tujuan link yang dipakai beranda. Simpan semua route di sini supaya
// komponen tidak menulis string path sendiri-sendiri.
// Catatan: NAV_LINKS (navigation.js) tetap dipakai navbar lama.

export const HAL_BERANDA = '/'
export const HAL_BERITA = '/berita'
export const HAL_BERITA_DETAIL = (id) => `/berita/${encodeURIComponent(id)}`
export const HAL_PROFIL = '/profil-desa'
export const HAL_LOGIN = '/loginpage'
export const HAL_DAFTAR = '/register'

// Keduanya butuh login warga (ProtectedRoute allowedRoles={['warga']}).
export const HAL_AJUKAN_SURAT = '/jenis-surat'
export const HAL_STATUS_SURAT = '/daftar-surat-saya'

// Id section di beranda yang menjadi tujuan gulir (A7, A8).
export const SECTION_TRANSPARANSI = 'transparansi'
export const SECTION_KONTAK = 'kontak'
