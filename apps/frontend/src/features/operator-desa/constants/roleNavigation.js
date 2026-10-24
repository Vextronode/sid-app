export const OPERATOR_ROUTE_CAPABILITIES = {
  '/admin/operator-desa': ['kasi_pemerintahan', 'kaur_tu_umum', 'staf_sid'],
  '/admin/operator-desa/surat': ['kasi_pemerintahan', 'kaur_tu_umum', 'staf_sid'],
  // Pengajuan surat pribadi; Petugas Desa (admin) tidak memerlukannya.
  '/admin/surat-saya': ['kasi_pemerintahan', 'kaur_tu_umum'],
  // Kasi/Kaur hanya melihat daftar warga; halaman kelola tetap milik Petugas Desa.
  '/admin/data-warga': ['kasi_pemerintahan', 'kaur_tu_umum', 'staf_sid'],
  '/admin/kelola-wilayah': ['staf_sid'],
  '/admin/kelola-pekerjaan': ['staf_sid'],
  '/admin/manajemen-user': ['staf_sid'],
  '/admin/pejabat-desa': ['staf_sid'],
  '/admin/kelola-profil-desa': ['staf_sid'],
  '/admin/kelola-berita': ['staf_sid'],
  '/admin/kelola-peraturan': ['staf_sid'],
  '/admin/pengumuman': ['staf_sid'],
  '/admin/halaman-informasi': ['staf_sid'],
  '/admin/approval-settings': ['staf_sid'],
  '/admin/approval-flows': ['staf_sid'],
  '/admin/log-aktivitas': ['staf_sid'],
  '/admin/organisasi/bpd': ['staf_sid'],
  '/admin/organisasi/lembaga': ['staf_sid'],
}

export const OPERATOR_ROLES = ['kasi_pemerintahan', 'kaur_tu_umum', 'staf_sid']

export const ROLE_NAVIGATION = Object.fromEntries(
  OPERATOR_ROLES.map((role) => [
    role,
    Object.entries(OPERATOR_ROUTE_CAPABILITIES)
      .filter(([, allowedRoles]) => allowedRoles.includes(role))
      .map(([route]) => route),
  ]),
)

export function getOperatorAllowedRoles(route) {
  const allowedRoles = OPERATOR_ROUTE_CAPABILITIES[route]

  if (!allowedRoles) {
    throw new Error(`Route operator "${route}" belum memiliki capability role.`)
  }

  return allowedRoles
}
