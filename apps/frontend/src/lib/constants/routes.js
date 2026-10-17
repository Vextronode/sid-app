// Tujuan link yang dipakai beranda. Simpan semua route di sini supaya
// komponen tidak menulis string path sendiri-sendiri.

export const HAL_BERANDA = '/'
export const HAL_BERITA = '/berita'
export const HAL_BERITA_DETAIL = (id) => `/berita/${encodeURIComponent(id)}`
export const HAL_PROFIL = '/profil-desa'
// Struktur organisasi desa. Lembaga Desa memilih LPM/Karang Taruna/PKK lewat ?lembaga=.
export const HAL_BPD = '/bpd'
export const HAL_LEMBAGA = '/lembaga-desa'
export const HAL_LOGIN = '/loginpage'
export const HAL_DAFTAR = '/register'

// Keduanya butuh login warga (ProtectedRoute allowedRoles={['warga']}).
export const HAL_AJUKAN_SURAT = '/jenis-surat'
export const HAL_STATUS_SURAT = '/daftar-surat-saya'

// Id section di beranda yang menjadi tujuan gulir (A7, A8).
export const SECTION_TRANSPARANSI = 'transparansi'
export const SECTION_KONTAK = 'kontak'

// Halaman informasi (D6). Route hanya terdaftar di mode dev sampai isinya disetujui desa.
export const HAL_KEBIJAKAN_PRIVASI = '/kebijakan-privasi'
export const HAL_AKSESIBILITAS = '/aksesibilitas'
export const HAL_PPID = '/ppid'
