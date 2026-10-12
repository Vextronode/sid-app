// ==========================================
// BeritaPage.jsx
// Halaman publik Berita.
// Gaya dari public.css (kelas pb-*, di bawah .pub milik MainLayout).
// ==========================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Newspaper } from 'lucide-react'

import { usePublicNews } from '@/features/berita/usePublicNews'
import { PageLoader } from '@/components/ui/PageLoader'

const ITEMS_PER_PAGE = 6

export function BeritaPage() {
  const navigate = useNavigate()

  // ==========================================
  // DATA DARI API
  // ==========================================

  const { news, loading, error } = usePublicNews()

  const [safeCurrentPage, setCurrentPage] = useState(1)

  // ==========================================
  // BERITA UTAMA
  // ==========================================

  const beritaUtama = news.find((b) => b.isFeatured) ?? news[0] ?? null

  // ==========================================
  // SEMUA BERITA PUBLIK (di luar berita utama)
  // Endpoint /public hanya mengirim berita
  // yang sudah terbit, jadi tidak perlu filter status.
  // ==========================================

  const kelolaList = news.filter((b) => b.id !== beritaUtama?.id)

  // ==========================================
  // BERITA TERBARU
  // ==========================================

  const beritaTerbaru = kelolaList.slice(0, 3)

  // ==========================================
  // PAGINATION
  // ==========================================

  const totalPages = Math.max(1, Math.ceil(kelolaList.length / ITEMS_PER_PAGE))

  const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE

  const paginated = kelolaList.slice(start, start + ITEMS_PER_PAGE)

  // ==========================================
  // NAVIGATE DETAIL
  // ==========================================

  const handleDetail = (id) => {
    navigate(`/berita/${id}`)
  }

  // ==========================================
  // STATE LOADING & ERROR
  // ==========================================

  const pageHead = (
    <header className="pb-pagehead">
      <div className="pb-container pb-pagehead-inner">
        <h1>Berita Desa Cibenda</h1>
        <p>Kabar dan informasi terbaru dari Desa Cibenda.</p>
      </div>
    </header>
  )

  if (loading) {
    return (
      <div className="pb-container pb-page">
        <PageLoader label="Memuat berita..." />
      </div>
    )
  }

  if (error) {
    return (
      <>
        {pageHead}
        <div className="pb-container pb-page">
          <p role="alert" className="pb-state pb-state--error">
            {error}
          </p>
        </div>
      </>
    )
  }

  if (news.length === 0) {
    return (
      <>
        {pageHead}
        <div className="pb-container pb-page">
          <div className="pb-state" role="status">
            <Newspaper size={32} aria-hidden="true" />
            <p>Belum ada berita yang dipublikasikan.</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* ======================================
          HEADER
      ====================================== */}

      {pageHead}

      <div className="pb-container pb-page">
        {/* ======================================
            FEATURE + TERBARU
        ====================================== */}

        <section className="pb-feature">
          {/* ====================================
              BERITA UTAMA
          ==================================== */}

          <article className="pb-feature-card">
            <div className="pb-feature-image">
              {beritaUtama?.imageUrl ? (
                <img src={beritaUtama.imageUrl} alt={beritaUtama.title} />
              ) : (
                <div className="pb-placeholder">
                  <Newspaper size={48} aria-hidden="true" />
                </div>
              )}
            </div>

            <div className="pb-feature-body">
              <div className="pb-meta">
                {beritaUtama?.categories?.map((category) => (
                  <span key={category} className="pb-chip">
                    {category}
                  </span>
                ))}

                {beritaUtama?.date && <span>{beritaUtama.date}</span>}
              </div>

              <h2>{beritaUtama?.title ?? 'Belum ada berita utama'}</h2>

              {beritaUtama && (
                <button
                  type="button"
                  onClick={() => handleDetail(beritaUtama.id)}
                  className="pb-read-more"
                >
                  Baca Selengkapnya
                </button>
              )}
            </div>
          </article>

          {/* ====================================
              BERITA TERBARU
          ==================================== */}

          <aside>
            <h3 className="pb-aside-title">Terbaru</h3>

            <div className="pb-latest-list">
              {beritaTerbaru.length === 0 ? (
                <p className="pb-meta">Belum ada berita terbaru.</p>
              ) : (
                beritaTerbaru.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleDetail(b.id)}
                    className="pb-latest-item"
                  >
                    <div className="pb-latest-image">
                      {b.imageUrl ? (
                        <img src={b.imageUrl} alt={b.title} />
                      ) : (
                        <div className="pb-placeholder">
                          <Newspaper size={22} aria-hidden="true" />
                        </div>
                      )}
                    </div>

                    <div className="pb-latest-content">
                      {b.category && (
                        <span className="pb-meta">
                          <span className="pb-chip">{b.category}</span>
                        </span>
                      )}

                      <p className="pb-latest-title">{b.title}</p>

                      <span className="pb-meta">{b.date}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>
        </section>

        {/* ======================================
            SEMUA BERITA
        ====================================== */}

        <section>
          <div className="pb-list-head">
            <div>
              <h2>Semua Berita</h2>

              <p>Kabar dan pengumuman terbaru dari Desa Cibenda</p>
            </div>

            {/* PAGINATION */}

            <div className="pb-pager">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safeCurrentPage === 1}
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft size={20} aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safeCurrentPage === totalPages}
                aria-label="Halaman berikutnya"
              >
                <ChevronRight size={20} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* ====================================
              BERITA GRID
          ==================================== */}

          {paginated.length === 0 ? (
            <div className="pb-state">
              <Newspaper size={32} aria-hidden="true" />

              <p>Belum ada berita yang dipublikasikan.</p>
            </div>
          ) : (
            <div className="pb-news-grid">
              {paginated.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleDetail(b.id)}
                  className="pb-news-card"
                >
                  {/* IMAGE */}

                  <div className="pb-news-card-image">
                    {b.imageUrl ? (
                      <img src={b.imageUrl} alt={b.title} />
                    ) : (
                      <div className="pb-placeholder">
                        <Newspaper size={32} aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  {/* CONTENT */}

                  <div className="pb-news-card-content">
                    <div className="pb-meta">
                      {b.categories?.map((category) => (
                        <span key={category} className="pb-chip">
                          {category}
                        </span>
                      ))}

                      <span>{b.date}</span>
                    </div>

                    <h3>{b.title}</h3>

                    <p className="pb-news-card-excerpt">{b.excerpt}</p>

                    <span className="pb-read-more">Baca Selengkapnya</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ====================================
              PAGINATION INFO
          ==================================== */}

          {kelolaList.length > 0 && (
            <div className="pb-pagination-info">
              Menampilkan {start + 1}–{Math.min(start + ITEMS_PER_PAGE, kelolaList.length)} dari{' '}
              {kelolaList.length} berita
            </div>
          )}
        </section>
      </div>
    </>
  )
}
