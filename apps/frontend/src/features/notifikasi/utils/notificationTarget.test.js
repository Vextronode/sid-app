import { describe, expect, it } from 'vitest'
import { getNotificationTarget } from './notificationTarget'

describe('getNotificationTarget', () => {
  const context = { letter_id: 'abc-123', status: 'rt_approved' }

  it.each([
    ['warga', '/daftar-surat-saya?surat=abc-123'],
    ['rt', '/admin/list-rt?surat=abc-123'],
    ['rw', '/admin/list-rw?surat=abc-123'],
    ['kadus', '/admin/list-kadus?surat=abc-123'],
    ['kepala_desa', '/admin/list-kades?surat=abc-123'],
    ['sekretaris_desa', '/admin/list-kades?surat=abc-123'],
    ['kasi_pelayanan', '/admin/operator-desa/surat?surat=abc-123'],
    ['kaur_tu_umum', '/admin/operator-desa/surat?surat=abc-123'],
    ['staf_sid', '/admin/operator-desa/surat?surat=abc-123'],
  ])('opens the letter on the list page of %s', (role, expected) => {
    expect(getNotificationTarget(role, context)).toBe(expected)
  })

  it('sends signature requests to the profile page instead of the letter', () => {
    const request = { letter_id: 'abc-123', status: 'signature_requested' }

    expect(getNotificationTarget('warga', request)).toBe('/profile#permintaan-tanda-tangan')
    expect(getNotificationTarget('rt', request)).toBe('/admin/profile#permintaan-tanda-tangan')
  })

  it("opens an official's own letter in Surat Saya, but never for warga or petugas desa", () => {
    const own = { ...context, is_applicant: true }

    expect(getNotificationTarget('rt', own)).toBe('/admin/surat-saya?surat=abc-123')
    expect(getNotificationTarget('kasi_pelayanan', own)).toBe('/admin/surat-saya?surat=abc-123')
    expect(getNotificationTarget('warga', own)).toBe('/daftar-surat-saya?surat=abc-123')
    expect(getNotificationTarget('staf_sid', own)).toBe('/admin/operator-desa/surat?surat=abc-123')
  })

  it('returns null when there is nothing to open', () => {
    expect(getNotificationTarget('warga', { status: 'info' })).toBeNull()
    expect(getNotificationTarget('warga', undefined)).toBeNull()
    expect(getNotificationTarget(undefined, context)).toBeNull()
    expect(getNotificationTarget('peran_baru', context)).toBeNull()
  })
})
