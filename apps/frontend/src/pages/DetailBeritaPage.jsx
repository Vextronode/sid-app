// ==========================================
// DetailBeritaPage.jsx
// Halaman detail berita publik.
// Styling menggunakan Global CSS SID.
// ==========================================

import { useParams } from 'react-router-dom'

import { MainContent } from '@/features/berita/components/MainContent'
import { SidebarBerita } from '@/features/berita/components/SidebarBerita'

import { FooterDesa } from '@/components/layout/FooterDesa'

// Hook data berita dari API
import { usePublicNews } from '@/features/berita/usePublicNews'

export function DetailBeritaPage() {
  const { id } = useParams()

  const { news, loading, error } = usePublicNews()

  // ==========================================
  // STATE LOADING & ERROR
  // ==========================================

  if (loading) {
    return (
      <div className="sid-detail-berita-not-found">
        <p>Memuat berita...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="sid-detail-berita-not-found">
        <p>{error}</p>
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
      <div className="sid-detail-berita-not-found">
        <p>Berita tidak ditemukan.</p>
      </div>
    )
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="sid-detail-berita-page">
      <main className="sid-detail-berita-content">
        <div className="sid-detail-berita-grid">
          {/* ====================================
              KONTEN BERITA
          ==================================== */}

          <MainContent berita={beritaDetail} />

          {/* ====================================
              SIDEBAR BERITA
          ==================================== */}

          <SidebarBerita beritaLain={beritaLain} />
        </div>
      </main>

      {/* ======================================
          FOOTER
      ====================================== */}

      <FooterDesa />
    </div>
  )
}
