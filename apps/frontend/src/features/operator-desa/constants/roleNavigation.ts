import type { UserRole } from '@/types'

// Menu sidebar semua pejabat (OperatorDesaLayout): route -> peran yang boleh
// membukanya. Juga dipakai ProtectedRoute di App.tsx agar menu dan akses
// route tidak berbeda.
export const OPERATOR_ROUTE_CAPABILITIES: Record<string, UserRole[]> = {
  // Beranda, surat yang diproses, Manajemen Akun, dan Data Penduduk pejabat
  // wilayah; Kades & Sekdes berbagi halaman /admin/kades.
  '/admin/rt': ['rt'],
  '/admin/rt/surat': ['rt'],
  '/admin/rw': ['rw'],
  '/admin/rw/surat': ['rw'],
  '/admin/kadus': ['kadus'],
  '/admin/kadus/surat': ['kadus'],
  '/admin/kades': ['kepala_desa', 'sekretaris_desa'],
  '/admin/kades/surat': ['kepala_desa', 'sekretaris_desa'],
  '/admin/operator-desa': ['kasi_pemerintahan', 'kaur_tu_umum', 'staf_sid'],
  '/admin/operator-desa/surat': ['kasi_pemerintahan', 'kaur_tu_umum', 'staf_sid'],
  // Pengajuan surat pribadi; Staf SIDUTama juga warga desa.
  '/admin/surat-saya': [
    'rt',
    'rw',
    'kadus',
    'kepala_desa',
    'sekretaris_desa',
    'kasi_pemerintahan',
    'kaur_tu_umum',
    'staf_sid',
  ],
  // Data Penduduk khusus-baca, isinya dibatasi wilayah peran (backend).
  '/admin/rt/data-penduduk': ['rt'],
  '/admin/rw/data-penduduk': ['rw'],
  '/admin/kadus/data-penduduk': ['kadus'],
  '/admin/kades/data-penduduk': ['kepala_desa', 'sekretaris_desa'],
  // Staf SIDUTama dan Kasi Pemerintahan mengelola; Kaur TU & Umum hanya melihat.
  '/admin/data-warga': ['kasi_pemerintahan', 'kaur_tu_umum', 'staf_sid'],
  '/admin/kelola-wilayah': ['staf_sid'],
  '/admin/kelola-pekerjaan': ['staf_sid'],
  // Aktivasi akun dan request ganti foto profil warga (petugas wilayah).
  '/admin/rt/manajemen-akun': ['rt'],
  '/admin/rw/manajemen-akun': ['rw'],
  '/admin/kadus/manajemen-akun': ['kadus'],
  '/admin/manajemen-user': ['staf_sid'],
  '/admin/pengajuan-reset': ['staf_sid'],
  '/admin/pejabat-desa': ['staf_sid'],
  '/admin/kelola-profil-desa': ['staf_sid'],
  '/admin/kelola-berita': ['staf_sid'],
  '/admin/kelola-peraturan': ['staf_sid'],
  '/admin/pengumuman': ['staf_sid'],
  '/admin/halaman-informasi': ['staf_sid'],
  '/admin/pengaturan-persetujuan': ['staf_sid'],
  '/admin/alur-persetujuan': ['staf_sid'],
  '/admin/log-aktivitas': ['staf_sid'],
  '/admin/organisasi/bpd': ['staf_sid'],
  '/admin/organisasi/lembaga': ['staf_sid'],
}

export const OPERATOR_ROLES: UserRole[] = [
  ...new Set(Object.values(OPERATOR_ROUTE_CAPABILITIES).flat()),
]

export const ROLE_NAVIGATION = Object.fromEntries(
  OPERATOR_ROLES.map((role) => [
    role,
    Object.entries(OPERATOR_ROUTE_CAPABILITIES)
      .filter(([, allowedRoles]) => allowedRoles.includes(role))
      .map(([route]) => route),
  ]),
)

export function getOperatorAllowedRoles(route: string) {
  const allowedRoles = OPERATOR_ROUTE_CAPABILITIES[route]

  if (!allowedRoles) {
    throw new Error(`Route operator "${route}" belum memiliki capability role.`)
  }

  return allowedRoles
}
