// ==========================================
// BeritaPage.jsx
// Halaman publik Berita.
// ==========================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Newspaper } from 'lucide-react'

import { usePublicNews } from '@/features/berita/usePublicNews'

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

  if (loading) {
    return (
      <div className="sid-kelola-berita-page">
        <main className="sid-kelola-berita-content">
          <p>Memuat berita...</p>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="sid-kelola-berita-page">
        <main className="sid-kelola-berita-content">
          <p style={{ color: '#d32f2f' }}>{error}</p>
        </main>
      </div>
    )
  }

  return (
    <div className="sid-kelola-berita-page">
      <main className="sid-kelola-berita-content">
        {/* ======================================
            HEADER
        ====================================== */}

        <header className="sid-kelola-berita-header">
          <div className="sid-kelola-berita-header-info">
            <h1>Berita Desa Cibenda</h1>

            <p>Kabar dan informasi terbaru dari Desa Cibenda.</p>
          </div>
        </header>

        {/* ======================================
            FEATURE + TERBARU
        ====================================== */}

        <section className="sid-kelola-berita-feature-grid">
          {/* ====================================
              BERITA UTAMA
          ==================================== */}

          <article className="sid-kelola-berita-feature-card">
            <div className="sid-kelola-berita-feature-image">
              {beritaUtama?.imageUrl ? (
                <img src={beritaUtama.imageUrl} alt={beritaUtama.title} />
              ) : (
                <div className="sid-kelola-berita-image-placeholder">
                  <Newspaper size={48} />
                </div>
              )}

              <div className="sid-kelola-berita-feature-overlay" />

              <div className="sid-kelola-berita-feature-content">
                <div className="sid-kelola-berita-feature-meta">
                  {beritaUtama?.category && (
                    <span className="sid-kelola-berita-category featured">
                      {beritaUtama.category}
                    </span>
                  )}

                  {beritaUtama?.date && (
                    <span className="sid-kelola-berita-date featured">{beritaUtama.date}</span>
                  )}
                </div>

                <h2>{beritaUtama?.title ?? 'Belum ada berita utama'}</h2>
              </div>
            </div>

            {/* FEATURE FOOTER */}

            {beritaUtama && (
              <div className="sid-kelola-berita-feature-footer">
                <button
                  type="button"
                  onClick={() => handleDetail(beritaUtama.id)}
                  className="sid-kelola-berita-read-more"
                >
                  Baca Selengkapnya
                </button>
              </div>
            )}
          </article>

          {/* ====================================
              BERITA TERBARU
          ==================================== */}

          <aside className="sid-kelola-berita-latest">
            <h3 className="sid-kelola-berita-section-title">Terbaru</h3>

            <div className="sid-kelola-berita-latest-list">
              {beritaTerbaru.length === 0 ? (
                <p className="sid-kelola-berita-empty-small">Belum ada berita terbaru.</p>
              ) : (
                beritaTerbaru.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleDetail(b.id)}
                    className="sid-kelola-berita-latest-item"
                  >
                    <div className="sid-kelola-berita-latest-image">
                      {b.imageUrl ? (
                        <img src={b.imageUrl} alt={b.title} />
                      ) : (
                        <div className="sid-kelola-berita-latest-placeholder">
                          <Newspaper size={20} />
                        </div>
                      )}
                    </div>

                    <div className="sid-kelola-berita-latest-content">
                      <p className="sid-kelola-berita-category">{b.category}</p>

                      <p className="sid-kelola-berita-latest-title">{b.title}</p>

                      <span className="sid-kelola-berita-date">{b.date}</span>
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
          <div className="sid-kelola-berita-management-header">
            <div>
              <h2>Semua Berita</h2>

              <p>Kabar dan pengumuman terbaru dari Desa Cibenda</p>
            </div>

            {/* PAGINATION */}

            <div className="sid-kelola-berita-pagination-buttons">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safeCurrentPage === 1}
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safeCurrentPage === totalPages}
                aria-label="Halaman berikutnya"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* ====================================
              BERITA GRID
          ==================================== */}

          <div className="sid-kelola-berita-grid">
            {paginated.length === 0 ? (
              <div className="sid-kelola-berita-empty">
                <Newspaper size={28} />

                <p>Belum ada berita yang dipublikasikan.</p>
              </div>
            ) : (
              paginated.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleDetail(b.id)}
                  className="sid-kelola-berita-card"
                >
                  {/* IMAGE */}

                  <div className="sid-kelola-berita-card-image">
                    {b.imageUrl ? (
                      <img src={b.imageUrl} alt={b.title} />
                    ) : (
                      <div className="sid-kelola-berita-card-placeholder">
                        <Newspaper size={28} />
                      </div>
                    )}
                  </div>

                  {/* CONTENT */}

                  <div className="sid-kelola-berita-card-content">
                    <div className="sid-kelola-berita-card-meta">
                      <span className="sid-kelola-berita-category">{b.category}</span>

                      <span className="sid-kelola-berita-date">{b.date}</span>
                    </div>

                    <h3>{b.title}</h3>

                    <p>{b.excerpt}</p>

                    <span className="sid-kelola-berita-read-more">Baca Selengkapnya</span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* ====================================
              PAGINATION INFO
          ==================================== */}

          {kelolaList.length > 0 && (
            <div className="sid-kelola-berita-pagination-info">
              Menampilkan {start + 1}–{Math.min(start + ITEMS_PER_PAGE, kelolaList.length)} dari{' '}
              {kelolaList.length} berita
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
