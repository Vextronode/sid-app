import { describe, expect, it } from 'vitest'
import { DEV_ONLY_KEYS, getBerandaContent } from './berandaContent'

const PRODUCTION_HIDDEN = ['announcement', 'newsCategories', 'apbdes', 'welcome']

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
    expect(content.announcement.newsId).toBe(1)
    expect(content.welcome.fallbackName).toBe('Dede Rusliana')
  })

  it.each([true, false])('keeps manual content and service hours (isDev=%s)', (isDev) => {
    const content = getBerandaContent(isDev)

    // D2 (12 Okt 2026): menu bagikan AddToAny, sementara sampai ada nomor asli.
    expect(content.complaint.whatsappUrl).toMatch(
      /^https:\/\/www\.addtoany\.com\/add_to\/whatsapp\?/,
    )
    expect(content.complaint.whatsappText).toBe('Bagikan kotak saran via WhatsApp')
    expect(content.complaint.email).toBeTruthy()
    // D1 (12 Okt 2026): link peta asli, juga di production.
    expect(content.mapUrl).toBe('https://maps.app.goo.gl/sVU5Xqmasq4UTJ4N6')
    expect(content.contact.hours).toBe('Senin – Jumat, 08.00 – 16.00 WIB')
    expect(content.hero.imageUrl).toBe('/assets/image/beranda/hero-pemandangan.jpg')
    // Domain dan tanggal pembaruan footer sudah asli (keputusan pemilik, 11 Okt 2026);
    // tanggal hanya bulan dan tahun (D3, 12 Okt 2026).
    expect(content.site).toEqual({
      domain: 'https://desacibenda.id/',
      updatedAt: 'Oktober 2026',
    })
    // Pita angka: data final dari pemilik proyek (11 Okt 2026).
    expect(content.stats).toEqual({
      items: [
        { value: '6.080', label: 'jiwa penduduk' },
        { value: '759,319 ha', label: 'luas wilayah' },
        { value: '5', label: 'dusun' },
      ],
      asOf: 'Oktober 2026',
    })
    expect(content.howTo.steps).toHaveLength(4)
    // Logo mitra sudah asli, jadi tampil juga di production. Urut kiri → kanan
    // seperti yang dilihat pengunjung di layar.
    expect(content.partners.map((p) => p.src)).toEqual([
      '/assets/image/logo-widyatama.webp',
      '/assets/image/lambang-kabupaten-pangandaran.webp',
      '/assets/image/Primary_Horizontal-Logo.png',
    ])
  })

  it('uses the copy decided in K10 and K11', () => {
    const content = getBerandaContent(false)

    expect(content.howTo.steps[0].title).toBe('Masuk ke akun warga')
    expect(content.services.ajukan.description).toBe(
      'Domisili, SKTM, keterangan usaha, dan lainnya.',
    )
  })

  it('opens the dummy APBDes links over https', () => {
    const { apbdes } = getBerandaContent(true)

    for (const url of [apbdes.documentUrl, apbdes.archiveUrl]) {
      expect(url).toMatch(/^https:\/\//)
    }
  })
})
