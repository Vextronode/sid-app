import { describe, expect, it } from 'vitest'

import {
  getOperatorAllowedRoles,
  OPERATOR_ROUTE_CAPABILITIES,
  ROLE_NAVIGATION,
} from './roleNavigation'

describe('operator role navigation', () => {
  it('limits Kasi and Kaur to overview, assigned letters, and read-only citizen data', () => {
    const expectedRoutes = [
      '/admin/operator-desa',
      '/admin/operator-desa/surat',
      '/admin/surat-saya',
      '/admin/data-warga',
    ]

    expect(ROLE_NAVIGATION.kasi_pelayanan).toEqual(expectedRoutes)
    expect(ROLE_NAVIGATION.kaur_tu_umum).toEqual(expectedRoutes)
  })

  it('reserves village administration and configuration routes for Petugas Desa', () => {
    const petugasRoutes = ROLE_NAVIGATION.staf_sid

    for (const route of [
      '/admin/kelola-wilayah',
      '/admin/kelola-pekerjaan',
      '/admin/manajemen-user',
      '/admin/pejabat-desa',
      '/admin/kelola-profil-desa',
      '/admin/kelola-berita',
      '/admin/kelola-peraturan',
      '/admin/approval-settings',
      '/admin/organisasi/bpd',
      '/admin/organisasi/lembaga',
    ]) {
      expect(petugasRoutes).toContain(route)
      expect(getOperatorAllowedRoles(route)).toEqual(['staf_sid'])
    }
  })

  it('keeps route capabilities and role navigation in sync', () => {
    for (const [route, allowedRoles] of Object.entries(OPERATOR_ROUTE_CAPABILITIES)) {
      expect(getOperatorAllowedRoles(route)).toEqual(allowedRoles)

      for (const role of allowedRoles) {
        expect(ROLE_NAVIGATION[role]).toContain(route)
      }
    }

    expect(() => getOperatorAllowedRoles('/admin/unknown')).toThrow(
      'Route operator "/admin/unknown" belum memiliki capability role.',
    )
  })
})
