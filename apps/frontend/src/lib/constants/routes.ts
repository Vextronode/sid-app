// Tujuan link yang dipakai beranda. Simpan semua route di sini supaya
// komponen tidak menulis string path sendiri-sendiri.

export const HAL_BERANDA = '/'
export const HAL_BERITA = '/berita'
export const HAL_BERITA_DETAIL = (id) => `/berita/${encodeURIComponent(id)}`
export const HAL_PROFIL = '/profil-desa'
// Struktur organisasi desa. Lembaga Desa memilih LPM/Karang Taruna/PKK lewat ?lembaga=.
export const HAL_BPD = '/bpd'
export const HAL_LEMBAGA = '/lembaga-desa'

// Halaman auth memakai istilah bahasa Inggris yang umum (login, register, ...).
export const HAL_LOGIN = '/login'
export const HAL_DAFTAR = '/register'
export const HAL_LUPA_PASSWORD = '/forgot-password'
// Link di email reset dibuat backend (AppServiceProvider), harus sama.
export const HAL_RESET_PASSWORD = '/reset-password/:token'
export const HAL_GANTI_PASSWORD = '/change-password'

// Profil akun yang sedang login.
export const HAL_PROFIL_WARGA = '/profil'
export const HAL_PROFIL_PEJABAT = '/admin/profil'

// Butuh login warga (ProtectedRoute allowedRoles={['warga']}).
export const HAL_SURAT_SAYA = '/surat-saya'
export const HAL_AJUKAN_SURAT = '/jenis-surat'
export const HAL_PENGAJUAN_SURAT = '/pengajuan-surat'
export const HAL_STATUS_SURAT = `${HAL_SURAT_SAYA}/daftar`

// Id section di beranda yang menjadi tujuan gulir (A8).
export const SECTION_KONTAK = 'kontak'

// Halaman informasi (D6). Isian khas desa diatur Staf SIDUTama (menu Halaman Informasi).
export const HAL_KEBIJAKAN_PRIVASI = '/kebijakan-privasi'
export const HAL_AKSESIBILITAS = '/aksesibilitas'
export const HAL_PPID = '/ppid'
