
// ==========================================
// DetailBeritaPage.jsx
// Halaman detail berita publik.
// Styling menggunakan Global CSS SID.
// ==========================================

import { useParams } from "react-router-dom";

import { MainContent } from "@/features/berita/components/MainContent";
import { SidebarBerita } from "@/features/berita/components/SidebarBerita";

import { FooterDesa } from "@/components/layout/FooterDesa";

// Data dummy berita
import { DUMMY_NEWS } from "@/lib/constants/dummyNews";

export function DetailBeritaPage() {
  const { id } = useParams();

  // ==========================================
  // CARI BERITA
  // ==========================================

  const beritaId = Number(id);

  const beritaDetail = DUMMY_NEWS.find(
    (news) => news.id === beritaId
  );

  // ==========================================
  // BERITA LAIN
  // ==========================================

  const beritaLain = DUMMY_NEWS.filter(
    (news) => news.id !== beritaId
  );

  // ==========================================
  // BERITA TIDAK DITEMUKAN
  // ==========================================

  if (!beritaDetail) {
    return (
      <div className="sid-detail-berita-not-found">
        <p>
          Berita tidak ditemukan.
        </p>
      </div>
    );
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

          <MainContent
            berita={beritaDetail}
          />


          {/* ====================================
              SIDEBAR BERITA
          ==================================== */}

          <SidebarBerita
            beritaLain={beritaLain}
          />

        </div>

      </main>


      {/* ======================================
          FOOTER
      ====================================== */}

      <FooterDesa />

    </div>
  );
}

