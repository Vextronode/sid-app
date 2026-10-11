import { describe, expect, it } from 'vitest'
import { DEV_ONLY_KEYS, getBerandaContent } from './berandaContent'

const PRODUCTION_HIDDEN = [
  'announcement',
  'newsCategories',
  'stats',
  'apbdes',
  'welcome',
  'mapUrl',
  'site',
]

describe('getBerandaContent', () => {
  it('marks exactly the K1 items as development-only', () => {
    expect([...DEV_ONLY_KEYS].sort()).toEqual([...PRODUCTION_HIDDEN].sort())
  })

  it('hides every dummy item in production', () => {
    const content = getBerandaContent(false)

    for (const key of PRODUCTION_HIDDEN) {
      expect(content[key], key).toBeNull()
    }
  })

  it('shows the mockup dummies in development', () => {
    const content = getBerandaContent(true)

    for (const key of PRODUCTION_HIDDEN) {
      expect(content[key], key).toBeTruthy()
    }
    expect(content.announcement.otherCount).toBe(2)
    expect(content.stats.items).toHaveLength(3)
    expect(content.welcome.fallbackName).toBe('Dede Rusliana')
  })

  it.each([true, false])('keeps manual content and service hours (isDev=%s)', (isDev) => {
    const content = getBerandaContent(isDev)

    expect(content.complaint.whatsappNumber).toMatch(/^\d+$/)
    expect(content.complaint.email).toBeTruthy()
    expect(content.contact.hours).toBe('Senin – Jumat, 08.00 – 16.00 WIB')
    expect(content.hero.imageUrl).toBe('/assets/image/beranda/hero-pemandangan.jpg')
    expect(content.howTo.steps).toHaveLength(4)
    // Logo mitra sudah asli, jadi tampil juga di production. Urut kiri → kanan.
    expect(content.partners.map((p) => p.src)).toEqual([
      '/assets/image/Primary_Horizontal-Logo.png',
      '/assets/image/lambang-kabupaten-pangandaran.webp',
      '/assets/image/logo-widyatama.webp',
    ])
  })

  it('uses the copy decided in K10 and K11', () => {
    const content = getBerandaContent(false)

    expect(content.howTo.steps[0].title).toBe('Masuk ke akun warga')
    expect(content.services.ajukan.description).toBe(
      'Domisili, SKTM, keterangan usaha, dan lainnya.',
    )
  })

  it('opens the dummy APBDes and map links over https', () => {
    const { apbdes, mapUrl } = getBerandaContent(true)

    for (const url of [apbdes.documentUrl, apbdes.archiveUrl, mapUrl]) {
      expect(url).toMatch(/^https:\/\//)
    }
  })
})
