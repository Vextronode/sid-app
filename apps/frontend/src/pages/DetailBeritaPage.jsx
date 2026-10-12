// ==========================================
// DetailBeritaPage.jsx
// Halaman detail berita publik.
// Gaya dari public.css (kelas pb-*, di bawah .pub milik MainLayout).
// ==========================================

import { useParams } from 'react-router-dom'

import { MainContent } from '@/features/berita/components/MainContent'
import { SidebarBerita } from '@/features/berita/components/SidebarBerita'

// Hook data berita dari API
import { usePublicNews } from '@/features/berita/usePublicNews'
import { PageLoader } from '@/components/ui/PageLoader'

export function DetailBeritaPage() {
  const { id } = useParams()

  const { news, loading, error } = usePublicNews()

  // ==========================================
  // STATE LOADING & ERROR
  // ==========================================

  if (loading) {
    return (
      <div className="pb-container pb-page">
        <PageLoader label="Memuat berita..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="pb-container pb-page">
        <p role="alert" className="pb-state pb-state--error">
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
      <div className="pb-container pb-page">
        <p className="pb-state">Berita tidak ditemukan.</p>
      </div>
    )
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="pb-container pb-page">
      <div className="pb-article-grid">
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
