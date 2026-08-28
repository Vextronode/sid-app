// ==========================================
// KelolaBeritaPage.jsx
// Halaman Kelola Berita untuk Operator Desa.
// Styling menggunakan Global CSS.
// Logic/API tidak diubah.
// ==========================================

import { useState } from 'react';
import {
  Plus,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Newspaper,
} from 'lucide-react';

import { useBeritaList } from '@/features/kelola-berita/hooks/useBeritaList';
import BeritaFormModal from '@/features/kelola-berita/components/BeritaFormModal';
import { FooterOperator } from '@/components/layout/FooterOperator';

export default function KelolaBeritaPage() {
  const {
    beritaUtama,
    beritaTerbaru,
    data,
    currentPage,
    setCurrentPage,
    totalPages,
    addBerita,
    updateBerita,
  } = useBeritaList();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBerita, setEditingBerita] = useState(null);

  const handleOpenAdd = () => {
    setEditingBerita(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (berita) => {
    if (!berita) return;

    setEditingBerita(berita);
    setModalOpen(true);
  };

  const handleSubmitForm = (formData) => {
    if (editingBerita) {
      updateBerita(editingBerita.id, formData);
    } else {
      addBerita(formData);
    }

    setModalOpen(false);
  };

  return (
    <div className="sid-kelola-berita-page">

      <div className="sid-kelola-berita-content">

        {/* ==========================================
            HEADER
            ========================================== */}
        <div className="sid-kelola-berita-header">

          <div className="sid-kelola-berita-header-info">

            <p className="sid-kelola-berita-breadcrumb">
              Admin / Dashboard /{' '}
              <span>Kelola Berita</span>
            </p>

            <h1>Kelola Berita</h1>

            <p>
              Manajemen konten berita dan pengumuman Desa Cibenda.
            </p>

          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="sid-kelola-berita-primary"
          >
            <Plus size={16} />
            Tambah Berita
          </button>

        </div>


        {/* ==========================================
            HERO + TERBARU
            ========================================== */}
        <div className="sid-kelola-berita-feature-grid">

          {/* BERITA UTAMA */}
          <div className="sid-kelola-berita-feature-card">

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

                  <span className="sid-kelola-berita-category featured">
                    {beritaUtama?.kategori}
                  </span>

                  <span className="sid-kelola-berita-date featured">
                    {beritaUtama?.tanggal}
                  </span>

                </div>

                <h2>
                  {beritaUtama?.judul || 'Belum ada berita utama'}
                </h2>

              </div>

            </div>

            {beritaUtama && (
              <div className="sid-kelola-berita-feature-footer">
                
                <button
                  type="button"
                  onClick={() => handleOpenEdit(beritaUtama)}
                  className="sid-kelola-berita-read-more"
                >
                  
                  Baca Selengkapnya
                  
                </button>
                

              </div>
            )}

          </div>


          {/* BERITA TERBARU */}
          <div className="sid-kelola-berita-latest">

            <h2 className="sid-kelola-berita-section-title">
              Terbaru
            </h2>

            <div className="sid-kelola-berita-latest-list">

              {beritaTerbaru.length === 0 ? (
                <p className="sid-kelola-berita-empty-small">
                  Belum ada berita terbaru.
                </p>
              ) : (
                beritaTerbaru.map((berita) => (
                  <button
                    type="button"
                    key={berita.id}
                    onClick={() => handleOpenEdit(berita)}
                    className="sid-kelola-berita-latest-item"
                  >

                    <div className="sid-kelola-berita-latest-image">

                      {berita.gambar ? (
                        <img
                          src={berita.gambar}
                          alt={berita.judul}
                        />
                      ) : (
                        <div className="sid-kelola-berita-latest-placeholder">
                          <Newspaper size={20} />
                        </div>
                      )}

                    </div>

                    <div className="sid-kelola-berita-latest-content">

                      <p className="sid-kelola-berita-category">
                        {berita.kategori}
                      </p>

                      <p className="sid-kelola-berita-latest-title">
                        {berita.judul}
                      </p>

                      <p className="sid-kelola-berita-date">
                        {berita.tanggal}
                      </p>

                    </div>

                  </button>
                ))
              )}

            </div>

            <button
              type="button"
              className="sid-kelola-berita-view-all"
            >
              Lihat Semua Berita
            </button>

          </div>

        </div>


        {/* ==========================================
            SECTION KELOLA BERITA
            ========================================== */}
        <div className="sid-kelola-berita-management-header">

          <div>
            <h2>Kelola Berita</h2>

            <p>
              Manajemen konten berita dan pengumuman Desa Cibenda.
            </p>
          </div>

          <div className="sid-kelola-berita-pagination-buttons">

            <button
              type="button"
              onClick={() =>
                setCurrentPage((p) => Math.max(1, p - 1))
              }
              disabled={currentPage === 1}
              title="Halaman sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              type="button"
              onClick={() =>
                setCurrentPage((p) =>
                  Math.min(totalPages, p + 1)
                )
              }
              disabled={currentPage === totalPages}
              title="Halaman berikutnya"
            >
              <ChevronRight size={16} />
            </button>

          </div>

        </div>


        {/* ==========================================
            BERITA GRID
            ========================================== */}
        <div className="sid-kelola-berita-grid">

          {data.length === 0 ? (
            <div className="sid-kelola-berita-empty">
              <Newspaper size={32} />
              <p>Belum ada berita.</p>
            </div>
          ) : (
            data.map((berita) => (
              <div
                key={berita.id}
                className="sid-kelola-berita-card"
              >

                {/* IMAGE */}
                <div className="sid-kelola-berita-card-image">

                  {berita.gambar ? (
                    <img
                      src={berita.gambar}
                      alt={berita.judul}
                    />
                  ) : (
                    <div className="sid-kelola-berita-card-placeholder">
                      <Newspaper size={28} />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(berita)}
                    className="sid-kelola-berita-edit-button"
                    title="Edit berita"
                  >
                    <Pencil size={14} />
                  </button>

                </div>


                {/* CONTENT */}
                <div className="sid-kelola-berita-card-content">

                  <div className="sid-kelola-berita-card-meta">

                    <span className="sid-kelola-berita-category">
                      {berita.kategori}
                    </span>

                    <span className="sid-kelola-berita-date">
                      {berita.tanggal}
                    </span>

                  </div>

                  <h3>
                    {berita.judul}
                  </h3>

                  <p>
                    {berita.ringkasan}
                  </p>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(berita)}
                    className="sid-kelola-berita-read-more"
                  >
                    Selengkapnya →
                  </button>

                </div>

              </div>
            ))
          )}

        </div>


        {/* ==========================================
            PAGE INFO
            ========================================== */}
        {data.length > 0 && (
          <div className="sid-kelola-berita-pagination-info">

            <span>
              Halaman {currentPage} dari {totalPages}
            </span>

          </div>
        )}

      </div>


      {/* ==========================================
          FOOTER
          ========================================== */}
      <FooterOperator />


      {/* ==========================================
          MODAL
          ========================================== */}
      <BeritaFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmitForm}
        initialData={editingBerita}
      />

    </div>
  );
}