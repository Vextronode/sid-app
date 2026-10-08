export const OPERATOR_ROUTE_CAPABILITIES = {
  '/admin/operator-desa': ['kasi_pelayanan', 'kaur_tu_umum', 'petugas_desa'],
  '/admin/operator-desa/surat': ['kasi_pelayanan', 'kaur_tu_umum', 'petugas_desa'],
  '/admin/data-warga': ['petugas_desa'],
  '/admin/kelola-wilayah': ['petugas_desa'],
  '/admin/manajemen-user': ['petugas_desa'],
  '/admin/kelola-profil-desa': ['petugas_desa'],
  '/admin/kelola-berita': ['petugas_desa'],
  '/admin/approval-settings': ['petugas_desa'],
  '/admin/approval-flows': ['petugas_desa'],
  '/admin/organisasi/bpd': ['petugas_desa'],
  '/admin/organisasi/lembaga': ['petugas_desa'],
}

export const OPERATOR_ROLES = ['kasi_pelayanan', 'kaur_tu_umum', 'petugas_desa']

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
