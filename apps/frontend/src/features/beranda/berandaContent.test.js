import { describe, expect, it } from 'vitest'
import { HAL_AKSESIBILITAS, HAL_KEBIJAKAN_PRIVASI, HAL_PPID } from '@/lib/constants/routes'
import { getBerandaContent } from './berandaContent'

describe('getBerandaContent', () => {
  // Tidak ada lagi dummy khusus development: dev dan production sama. Isi khas
  // desa (pengumuman, sambutan, APBDes) dari data, bukan konten statis.
  it('has no development-only dummies', () => {
    const content = getBerandaContent()

    for (const key of ['announcement', 'apbdes', 'welcome', 'transparency']) {
      expect(content[key], key).toBeUndefined()
    }
    expect(JSON.stringify(content)).not.toMatch(/\[[A-Z ]+\]|example\.com|Dede Rusliana/)
  })

  it('lists Transparansi APBDes as coming soon in the Tentang Desa menu', () => {
    const { header } = getBerandaContent()

    expect(header.profilItems.at(-1)).toEqual({ label: 'Transparansi APBDes' })
    expect(header.transparansi).toBeUndefined()
  })

  it('keeps manual content', () => {
    const content = getBerandaContent()

    // D2 (12 Okt 2026): menu bagikan AddToAny, sementara sampai ada nomor asli.
    expect(content.complaint.whatsappUrl).toMatch(
      /^https:\/\/www\.addtoany\.com\/add_to\/whatsapp\?/,
    )
    expect(content.complaint.whatsappText).toBe('Bagikan kotak saran via WhatsApp')
    // Identitas desa (nama, logo, foto, telepon, email, jam layanan, link peta)
    // dari data desa yang diatur Staf SIDUTama, bukan konten statis.
    expect(content.header.fallbackName).toBe('Desa')
    expect(content.header.logoSrc).toBeUndefined()
    expect(content.hero.imageUrl).toBeUndefined()
    expect(content.complaint.email).toBeUndefined()
    expect(content.contact.phone).toBeUndefined()
    expect(content.contact.hours).toBeUndefined()
    expect(content.mapUrl).toBeUndefined()
    expect(JSON.stringify(content)).not.toMatch(
      /2640613|kantordesacibenda|maps\.app\.goo\.gl|google\.com\/maps|108\.55/,
    )
    // Domain dan tanggal pembaruan footer dihapus (permintaan pemilik, 12 Okt 2026).
    expect(content.site).toBeUndefined()
    // Pita angka: hanya label; angkanya dari API, bukan konten statis.
    expect(content.stats).toBeUndefined()
    expect(content.statsBand).toEqual({
      label: 'Desa dalam angka',
      population: 'jiwa penduduk',
      area: 'luas wilayah',
      hamlets: 'dusun',
      profileLink: 'Lihat profil desa →',
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
    const content = getBerandaContent()

    expect(content.howTo.steps[0].title).toBe('Masuk ke akun warga')
    expect(content.services.ajukan.description).toBe(
      'Domisili, SKTM, keterangan usaha, dan lainnya.',
    )
  })

  it('links the information pages through the route constants (D6)', () => {
    const { infoLinks } = getBerandaContent()

    expect(infoLinks).toEqual([
      { label: 'Kebijakan privasi', to: HAL_KEBIJAKAN_PRIVASI },
      { label: 'Aksesibilitas', to: HAL_AKSESIBILITAS },
      { label: 'PPID', to: HAL_PPID },
    ])
  })
})
