// ==========================================
// BerandaPage.jsx
// Halaman beranda publik Desa Cibenda.
// Semua section dari features/beranda (beranda.css), sesuai
// docs/refactor-beranda/03-spesifikasi-beranda.md.
// ==========================================

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { getBerandaContent } from '@/features/beranda/berandaContent'
import { BerandaHero } from '@/features/beranda/components/BerandaHero'
import { ContactSection } from '@/features/beranda/components/ContactSection'
import { HowToSteps } from '@/features/beranda/components/HowToSteps'
import { KadesWelcome } from '@/features/beranda/components/KadesWelcome'
import { NewsSection } from '@/features/beranda/components/NewsSection'
import { ServiceCards } from '@/features/beranda/components/ServiceCards'
import { StatsBand } from '@/features/beranda/components/StatsBand'
import { scrollToSection } from '@/features/beranda/utils/scrollToSection'
import { usePublicVillageInfo } from '@/features/info-desa/usePublicVillageInfo'

export function BerandaPage() {
  const content = getBerandaContent()
  // Daftar petugas + WA (contacts) tidak dipakai lagi di beranda (K14);
  // hook dan endpoint-nya tetap.
  const { village, villageHead } = usePublicVillageInfo()
  const { hash } = useLocation()

  // Tautan Kontak dari halaman lain datang sebagai /#kontak.
  useEffect(() => {
    if (hash) scrollToSection(hash.slice(1))
  }, [hash])

  return (
    <>
      <BerandaHero content={content} village={village} />
      {/* Sambutan tepat setelah hero, sebelum kartu layanan (permintaan
          pemilik, 19 Okt 2026). */}
      <KadesWelcome content={content} village={village} head={villageHead} />
      <ServiceCards content={content} village={village} />
      <StatsBand content={content} />
      <NewsSection content={content} />
      <HowToSteps content={content} />
      <ContactSection content={content} village={village} />
    </>
  )
}
