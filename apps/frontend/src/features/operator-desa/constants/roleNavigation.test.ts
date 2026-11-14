import { describe, expect, it } from 'vitest'

import type { User, UserRole } from '@/types'
import {
  canOpenOperatorRoute,
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
      '/admin/data-usaha',
    ]

    expect(ROLE_NAVIGATION.kasi_pemerintahan).toEqual(expectedRoutes)
    expect(ROLE_NAVIGATION.kaur_tu_umum).toEqual(expectedRoutes)
  })

  it('gives area officials and village heads their own sidebar pages', () => {
    expect(ROLE_NAVIGATION.rt).toEqual([
      '/admin/rt',
      '/admin/rt/surat',
      '/admin/surat-saya',
      '/admin/rt/data-penduduk',
      '/admin/rt/manajemen-akun',
    ])
    expect(ROLE_NAVIGATION.kepala_desa).toEqual([
      '/admin/kades',
      '/admin/kades/surat',
      '/admin/surat-saya',
      '/admin/kades/data-penduduk',
    ])
    expect(ROLE_NAVIGATION.sekretaris_desa).toEqual(ROLE_NAVIGATION.kepala_desa)
  })

  it('gives Staf SIDUTama a personal Surat Saya page as well', () => {
    expect(ROLE_NAVIGATION.staf_sid).toContain('/admin/surat-saya')
  })

  it('reserves village administration and configuration routes for Staf SIDUTama', () => {
    const petugasRoutes = ROLE_NAVIGATION.staf_sid

    for (const route of [
      '/admin/kelola-wilayah',
      '/admin/kelola-pekerjaan',
      '/admin/manajemen-user',
      '/admin/pengajuan-reset',
      '/admin/pejabat-desa',
      '/admin/kelola-profil-desa',
      '/admin/kelola-berita',
      '/admin/kelola-peraturan',
      '/admin/pengumuman',
      '/admin/halaman-informasi',
      '/admin/pengaturan-persetujuan',
      '/admin/organisasi/bpd',
      '/admin/organisasi/lembaga',
    ]) {
      expect(petugasRoutes).toContain(route)
      expect(getOperatorAllowedRoles(route)).toEqual(['staf_sid'])
    }
  })

  it('shows Data Usaha Warga only when GET /api/user grants it', () => {
    const user = (role: UserRole, can_view_citizen_businesses?: boolean) =>
      ({ role, can_view_citizen_businesses }) as User

    expect(canOpenOperatorRoute(user('kaur_tu_umum', true), '/admin/data-usaha')).toBe(true)
    expect(canOpenOperatorRoute(user('staf_sid', true), '/admin/data-usaha')).toBe(true)
    // Kasi/Kaur yang bukan petugas SKU, atau flag belum dimuat.
    expect(canOpenOperatorRoute(user('kasi_pemerintahan', false), '/admin/data-usaha')).toBe(false)
    expect(canOpenOperatorRoute(user('staf_sid'), '/admin/data-usaha')).toBe(false)
    // Peran di luar operator tidak pernah mendapat menunya.
    expect(canOpenOperatorRoute(user('kepala_desa', true), '/admin/data-usaha')).toBe(false)
    expect(canOpenOperatorRoute(null, '/admin/data-usaha')).toBe(false)
    // Route lain tetap mengikuti peran saja.
    expect(canOpenOperatorRoute(user('kaur_tu_umum'), '/admin/data-warga')).toBe(true)
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
