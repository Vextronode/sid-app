// ==========================================
// BerandaPage.jsx
// Halaman beranda publik Desa Cibenda.
// Semua section dari features/beranda (beranda.css), sesuai
// docs/refactor-beranda/03-spesifikasi-beranda.md.
// ==========================================

import { getBerandaContent } from '@/features/beranda/berandaContent'
import { AnnouncementBar } from '@/features/beranda/components/AnnouncementBar'
import { BerandaHero } from '@/features/beranda/components/BerandaHero'
import { ContactSection } from '@/features/beranda/components/ContactSection'
import { HowToSteps } from '@/features/beranda/components/HowToSteps'
import { KadesWelcome } from '@/features/beranda/components/KadesWelcome'
import { NewsSection } from '@/features/beranda/components/NewsSection'
import { ServiceCards } from '@/features/beranda/components/ServiceCards'
import { StatsBand } from '@/features/beranda/components/StatsBand'
import { TransparencySection } from '@/features/beranda/components/TransparencySection'
import { usePublicVillageInfo } from '@/features/info-desa/usePublicVillageInfo'

// isDev: apakah dummy development dirender (K1). Diisi manual hanya di test.
export function BerandaPage({ isDev = import.meta.env.DEV }) {
  const content = getBerandaContent(isDev)
  // Daftar petugas + WA (contacts) tidak dipakai lagi di beranda (K14);
  // hook dan endpoint-nya tetap.
  const { village } = usePublicVillageInfo()

  return (
    <>
      <AnnouncementBar content={content} />
      <BerandaHero content={content} />
      <ServiceCards content={content} />
      <StatsBand content={content} />
      <NewsSection content={content} />
      <HowToSteps content={content} />
      <TransparencySection content={content} />
      <KadesWelcome content={content} headName={village?.head_name} />
      <ContactSection content={content} village={village} />
    </>
  )
}
