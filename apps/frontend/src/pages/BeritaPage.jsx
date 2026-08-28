// ==========================================
// BeritaPage.jsx
// Halaman publik Berita.
//
// Tampilan mengikuti Global CSS SID yang sama dengan
// KelolaBeritaPage Operator Desa.
//
// Perbedaan:
// - Tidak ada tombol tambah
// - Tidak ada tombol edit
// - Hanya berita yang berstatus publikasi
// - Data tetap mengambil dari sumber dummyBerita yang sama
// ==========================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Newspaper,
} from 'lucide-react';

import { dummyBerita } from '@/features/kelola-berita/data/dummyBerita';

const ITEMS_PER_PAGE = 6;

export function BeritaPage() {
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);

  // ==========================================
  // BERITA UTAMA
  // ==========================================

  const beritaUtama =
    dummyBerita.find((b) => b.utama) ??
    dummyBerita[0];

  // ==========================================
  // BERITA TERBARU
  // ==========================================

  const beritaTerbaru = dummyBerita
    .filter((b) => b.id !== beritaUtama?.id)
    .filter((b) => b.status === 'publikasi')
    .slice(0, 3);

  // ==========================================
  // SEMUA BERITA PUBLIK
  // ==========================================

  const kelolaList = dummyBerita.filter(
    (b) =>
      b.id !== beritaUtama?.id &&
      b.status === 'publikasi'
  );

  // ==========================================
  // PAGINATION
  // ==========================================

  const totalPages = Math.max(
    1,
    Math.ceil(kelolaList.length / ITEMS_PER_PAGE)
  );

  const start =
    (currentPage - 1) * ITEMS_PER_PAGE;

  const paginated = kelolaList.slice(
    start,
    start + ITEMS_PER_PAGE
  );

  // ==========================================
  // NAVIGATE DETAIL
  // ==========================================

  const handleDetail = (id) => {
    navigate(`/berita/${id}`);
  };

  return (
    <div className="sid-kelola-berita-page">

      <main className="sid-kelola-berita-content">

        {/* ======================================
            HEADER
        ====================================== */}

        <header className="sid-kelola-berita-header">

          <div className="sid-kelola-berita-header-info">



            <h1>
              Berita Desa Cibenda
            </h1>

            <p>
              Kabar dan informasi terbaru dari Desa Cibenda.
            </p>

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

              {beritaUtama?.gambar ? (

                <img
                  src={beritaUtama.gambar}
                  alt={beritaUtama.judul}
                />

              ) : (

                <div className="sid-kelola-berita-image-placeholder">
                  <Newspaper size={48} />
                </div>

              )}

              <div className="sid-kelola-berita-feature-overlay" />

              <div className="sid-kelola-berita-feature-content">

                <div className="sid-kelola-berita-feature-meta">

                  {beritaUtama?.kategori && (
                    <span className="sid-kelola-berita-category featured">
                      {beritaUtama.kategori}
                    </span>
                  )}

                  {beritaUtama?.tanggal && (
                    <span className="sid-kelola-berita-date featured">
                      {beritaUtama.tanggal}
                    </span>
                  )}

                </div>

                <h2>
                  {beritaUtama?.judul ??
                    'Belum ada berita utama'}
                </h2>

              </div>

            </div>


            {/* FEATURE FOOTER */}

            {beritaUtama && (
              <div className="sid-kelola-berita-feature-footer">

                <button
                  type="button"
                  onClick={() =>
                    handleDetail(beritaUtama.id)
                  }
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

            <h3 className="sid-kelola-berita-section-title">
              Terbaru
            </h3>

            <div className="sid-kelola-berita-latest-list">

              {beritaTerbaru.length === 0 ? (

                <p className="sid-kelola-berita-empty-small">
                  Belum ada berita terbaru.
                </p>

              ) : (

                beritaTerbaru.map((b) => (

                  <button
                    key={b.id}
                    type="button"
                    onClick={() =>
                      handleDetail(b.id)
                    }
                    className="sid-kelola-berita-latest-item"
                  >

                    <div className="sid-kelola-berita-latest-image">

                      {b.gambar ? (

                        <img
                          src={b.gambar}
                          alt={b.judul}
                        />

                      ) : (

                        <div className="sid-kelola-berita-latest-placeholder">
                          <Newspaper size={20} />
                        </div>

                      )}

                    </div>


                    <div className="sid-kelola-berita-latest-content">

                      <p className="sid-kelola-berita-category">
                        {b.kategori}
                      </p>

                      <p className="sid-kelola-berita-latest-title">
                        {b.judul}
                      </p>

                      <span className="sid-kelola-berita-date">
                        {b.tanggal}
                      </span>

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

              <h2>
                Semua Berita
              </h2>

              <p>
                Kabar dan pengumuman terbaru dari Desa Cibenda
              </p>

            </div>


            {/* PAGINATION */}

            <div className="sid-kelola-berita-pagination-buttons">

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.max(1, page - 1)
                  )
                }
                disabled={currentPage === 1}
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.min(totalPages, page + 1)
                  )
                }
                disabled={currentPage === totalPages}
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

                <p>
                  Belum ada berita yang dipublikasikan.
                </p>

              </div>

            ) : (

              paginated.map((b) => (

                <button
                  key={b.id}
                  type="button"
                  onClick={() =>
                    handleDetail(b.id)
                  }
                  className="sid-kelola-berita-card"
                >

                  {/* IMAGE */}

                  <div className="sid-kelola-berita-card-image">

                    {b.gambar ? (

                      <img
                        src={b.gambar}
                        alt={b.judul}
                      />

                    ) : (

                      <div className="sid-kelola-berita-card-placeholder">
                        <Newspaper size={28} />
                      </div>

                    )}

                  </div>


                  {/* CONTENT */}

                  <div className="sid-kelola-berita-card-content">

                    <div className="sid-kelola-berita-card-meta">

                      <span className="sid-kelola-berita-category">
                        {b.kategori}
                      </span>

                      <span className="sid-kelola-berita-date">
                        {b.tanggal}
                      </span>

                    </div>


                    <h3>
                      {b.judul}
                    </h3>

                    <p>
                      {b.ringkasan}
                    </p>


                    <span className="sid-kelola-berita-read-more">
                      Baca Selengkapnya
                    </span>

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

              Menampilkan{' '}
              {start + 1}–
              {Math.min(
                start + ITEMS_PER_PAGE,
                kelolaList.length
              )}{' '}
              dari {kelolaList.length} berita

            </div>

          )}

        </section>

      </main>

    </div>
  );
}