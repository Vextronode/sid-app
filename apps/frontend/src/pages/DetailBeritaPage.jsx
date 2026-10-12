// ==========================================
// DetailBeritaPage.jsx
// Halaman detail berita publik.
// Ditata dengan utility Tailwind, di bawah .pub milik MainLayout.
// ==========================================

import { useParams } from 'react-router-dom'

import { MainContent } from '@/features/berita/components/MainContent'
import { SidebarBerita } from '@/features/berita/components/SidebarBerita'

// Hook data berita dari API
import { usePublicNews } from '@/features/berita/usePublicNews'
import { PageLoader } from '@/components/ui/PageLoader'
import { errorBox, stateBox } from '@/features/beranda/publicClasses'

export function DetailBeritaPage() {
  const { id } = useParams()

  const { news, loading, error } = usePublicNews()

  // ==========================================
  // STATE LOADING & ERROR
  // ==========================================

  if (loading) {
    return (
      <div className="bd-container pt-[clamp(32px,20px+3vw,64px)]">
        <PageLoader label="Memuat berita..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bd-container pt-[clamp(32px,20px+3vw,64px)]">
        <p role="alert" className={errorBox}>
          {error}
        </p>
      </div>
    )
  }

  // ==========================================
  // CARI BERITA
  // String() dipakai supaya aman untuk ID
  // berupa angka maupun UUID.
  // ==========================================

  const beritaDetail = news.find((item) => String(item.id) === String(id))

  // ==========================================
  // BERITA LAIN
  // ==========================================

  const beritaLain = news.filter((item) => String(item.id) !== String(id)).slice(0, 5)

  // ==========================================
  // BERITA TIDAK DITEMUKAN
  // ==========================================

  if (!beritaDetail) {
    return (
      <div className="bd-container pt-[clamp(32px,20px+3vw,64px)]">
        <p className={stateBox}>Berita tidak ditemukan.</p>
      </div>
    )
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="bd-container pt-[clamp(32px,20px+3vw,64px)]">
      <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:gap-16">
        {/* ====================================
              KONTEN BERITA
          ==================================== */}

        <MainContent berita={beritaDetail} />

        {/* ====================================
              SIDEBAR BERITA
          ==================================== */}

        <SidebarBerita beritaLain={beritaLain} />
      </div>
    </div>
  )
}
