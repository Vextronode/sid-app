// ==========================================
// KelolaBeritaPage.tsx
// Halaman Kelola Berita untuk Operator Desa.
//
// Response backend:
// - id
// - village_id
// - author_id
// - author_name
// - title
// - slug
// - content
// - thumbnail
// - is_published
// - published_at
//
// Logic:
// - Create berita
// - Edit berita
// - Publish berita
// - Thumbnail dari backend
// - Pagination 6 berita per halaman
// ==========================================

import { useState } from 'react'
import { Plus, Pencil, Send, ChevronLeft, ChevronRight, Newspaper, Tags } from 'lucide-react'

import {
  BERITA_PAGE_SIZE_OPTIONS,
  useBeritaList,
} from '@/features/kelola-berita/hooks/useBeritaList'
import BeritaFormModal from '@/features/kelola-berita/components/BeritaFormModal'
import KategoriBeritaModal from '@/features/kelola-berita/components/KategoriBeritaModal'
import { useNewsCategories } from '@/features/kelola-berita/hooks/useNewsCategories'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { PageLoader } from '@/components/ui/PageLoader'
import { PageNumbers } from '@/components/ui/PageNumbers'
import { PageSizeSelect } from '@/components/ui/PageSizeSelect'
import { RefreshButton } from '@/components/ui/RefreshButton'
import { StatusPill } from '@/components/ui/StatusPill'
import { alertDialog, confirmDialog } from '@/shared/lib/dialog'
import { notifySuccess } from '@/shared/lib/toast'

export default function KelolaBeritaPage() {
  const {
    beritaUtama,
    beritaTerbaru,
    data,
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,
    setPageSize,
    addBerita,
    updateBerita,
    publishBerita,
    processing,
    deleteBerita,
    loading,
    refreshBerita,
  } = useBeritaList()

  const {
    categories,
    loading: categoriesLoading,
    processing: categoriesProcessing,
    addCategory,
    renameCategory,
    removeCategory,
    refreshCategories,
  } = useNewsCategories()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingBerita, setEditingBerita] = useState(null)
  const [kategoriModalOpen, setKategoriModalOpen] = useState(false)

  // Nama kategori ikut tampil di kartu berita, jadi berita dimuat ulang.
  const handleRenameCategory = async (id, name) => {
    await renameCategory(id, name)
    await refreshBerita()
  }

  // ==========================================
  // TAMBAH BERITA
  // ==========================================

  const handleOpenAdd = () => {
    setEditingBerita(null)
    setModalOpen(true)
  }

  // ==========================================
  // delete BERITA
  // ==========================================

  const handleDeleteBerita = async (berita) => {
    if (!berita?.id) {
      return
    }

    const confirmed = await confirmDialog({
      title: `Hapus berita "${berita.title}"?`,
      message: 'Data berita akan dihapus secara permanen.',
      confirmLabel: 'Hapus',
    })

    if (!confirmed) {
      return
    }

    try {
      await deleteBerita(berita.id)
      notifySuccess(`Berita "${berita.title}" berhasil dihapus.`)

      setModalOpen(false)
      setEditingBerita(null)
    } catch (error) {
      console.error('DELETE BERITA ERROR:', {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
      })

      alertDialog({
        title: 'Terjadi kesalahan',
        message: error.response?.data?.message ?? 'Berita gagal dihapus.',
      })
    }
  }
  // ==========================================
  // EDIT BERITA
  // ==========================================

  const handleOpenEdit = (berita) => {
    if (!berita) return

    setEditingBerita(berita)
    setModalOpen(true)
  }

  // ==========================================
  // SUBMIT FORM
  // CREATE / UPDATE
  // ==========================================

  const handleSubmitForm = async (formData) => {
    try {
      if (editingBerita) {
        await updateBerita(editingBerita.id, formData)
      } else {
        await addBerita(formData)
      }

      // news_count kategori berubah setelah berita disimpan.
      refreshCategories()
      notifySuccess(editingBerita ? 'Berita berhasil diperbarui.' : 'Berita berhasil ditambahkan.')

      setModalOpen(false)
      setEditingBerita(null)
    } catch (error) {
      console.error('SUBMIT BERITA ERROR:', {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
      })

      throw error
    }
  }

  // ==========================================
  // PUBLISH BERITA
  // ==========================================

  const handlePublish = async (berita) => {
    if (!berita?.id) {
      return
    }

    const confirmed = await confirmDialog({
      title: `Publikasikan "${berita.title}"?`,
      message: 'Berita akan tampil di halaman publik.',
      confirmLabel: 'Publikasikan',
      tone: 'primary',
    })

    if (!confirmed) {
      return
    }

    try {
      await publishBerita(berita.id)
      notifySuccess(`"${berita.title}" berhasil dipublikasikan.`)
    } catch (error) {
      alertDialog({
        title: 'Terjadi kesalahan',
        message: error.response?.data?.message ?? 'Berita gagal dipublikasikan.',
      })
    }
  }

  // ==========================================
  // CEK STATUS
  // ==========================================

  const isPublished = (berita) => Boolean(berita?.is_published)

  // ==========================================
  // FORMAT TANGGAL
  // ==========================================

  const formatDate = (date) => {
    if (!date) {
      return '-'
    }

    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) {
      return '-'
    }

    return parsedDate.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  // ==========================================
  // RINGKAS CONTENT
  // ==========================================

  const truncateContent = (content, maxLength = 120) => {
    if (!content) {
      return '-'
    }

    if (content.length <= maxLength) {
      return content
    }

    return `${content.slice(0, maxLength).trim()}...`
  }
  if (loading) {
    return (
      <div className="sid-profil-desa-page">
        <div className="sid-profil-desa-content">
          <PageLoader label="Memuat berita..." />
        </div>

        <SiteFooter />
      </div>
    )
  }
  return (
    <div className="sid-kelola-berita-page">
      <div className="sid-kelola-berita-content">
        {/* ==========================================
            HEADER
            ========================================== */}

        <div className="sid-kelola-berita-header">
          <div className="sid-kelola-berita-header-info">
            <p className="sid-kelola-berita-breadcrumb">
              Admin / Dashboard / <span>Kelola Berita</span>
            </p>

            <h1>Kelola Berita</h1>

            <p>Manajemen konten berita dan pengumuman Desa Cibenda.</p>
          </div>

          <div className="sid-kelola-berita-header-actions">
            <RefreshButton
              onRefresh={() => Promise.all([refreshBerita(), refreshCategories()])}
              disabled={processing}
            />

            <button
              type="button"
              onClick={() => setKategoriModalOpen(true)}
              disabled={processing}
              className="sid-kelola-berita-secondary"
            >
              <Tags size={16} />
              Kelola Kategori
            </button>

            <button
              type="button"
              onClick={handleOpenAdd}
              disabled={processing}
              className="sid-kelola-berita-primary"
            >
              <Plus size={16} />
              Tambah Berita
            </button>
          </div>
        </div>

        {/* ==========================================
            HERO + TERBARU
            ========================================== */}

        <div className="sid-kelola-berita-feature-grid">
          {/* ==========================================
              BERITA UTAMA
              ========================================== */}

          <div className="sid-kelola-berita-feature-card">
            <div className="sid-kelola-berita-feature-image">
              {beritaUtama?.thumbnail ? (
                <img src={beritaUtama.thumbnail} alt={beritaUtama.title ?? 'Thumbnail berita'} />
              ) : (
                <div className="sid-kelola-berita-image-placeholder">
                  <Newspaper size={48} />
                </div>
              )}

              <div className="sid-kelola-berita-feature-overlay" />

              <div className="sid-kelola-berita-feature-content">
                <div className="sid-kelola-berita-feature-meta">
                  {beritaUtama?.categories?.map((category) => (
                    <span key={category.id} className="sid-kelola-berita-category featured">
                      {category.name}
                    </span>
                  ))}

                  <span className="sid-kelola-berita-date featured">
                    {formatDate(beritaUtama?.published_at)}
                  </span>
                </div>

                <h2>{beritaUtama?.title ?? 'Belum ada berita utama'}</h2>
              </div>
            </div>

            {/* CONTENT BERITA UTAMA */}

            {beritaUtama && (
              <div className="sid-kelola-berita-feature-footer">
                <p className="sid-kelola-berita-feature-description">
                  {truncateContent(beritaUtama.content, 220)}
                </p>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(beritaUtama)}
                  disabled={processing}
                  className="sid-kelola-berita-feature-edit-button"
                >
                  <Pencil size={14} />
                  Edit Berita
                </button>
              </div>
            )}
          </div>

          {/* ==========================================
              BERITA TERBARU
              ========================================== */}

          <div className="sid-kelola-berita-latest">
            <h2 className="sid-kelola-berita-section-title">Terbaru</h2>

            <div className="sid-kelola-berita-latest-list">
              {beritaTerbaru.length === 0 ? (
                <p className="sid-kelola-berita-empty-small">Belum ada berita terbaru.</p>
              ) : (
                beritaTerbaru.map((berita) => (
                  <div key={berita.id} className="sid-kelola-berita-latest-item">
                    {/* THUMBNAIL - KLIK UNTUK EDIT */}

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(berita)}
                      disabled={processing}
                      className="sid-kelola-berita-latest-image-button"
                      title="Edit berita"
                    >
                      <div className="sid-kelola-berita-latest-image">
                        {berita.thumbnail ? (
                          <img src={berita.thumbnail} alt={berita.title ?? 'Thumbnail berita'} />
                        ) : (
                          <div className="sid-kelola-berita-latest-placeholder">
                            <Newspaper size={20} />
                          </div>
                        )}
                      </div>
                    </button>

                    {/* JUDUL + CONTENT */}

                    <div className="sid-kelola-berita-latest-content">
                      <p className="sid-kelola-berita-latest-title">{berita.title}</p>

                      <p className="sid-kelola-berita-latest-description">
                        {truncateContent(berita.content, 90)}
                      </p>

                      <p className="sid-kelola-berita-date">{formatDate(berita.published_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ==========================================
            SECTION KELOLA BERITA
            ========================================== */}

        <div className="sid-kelola-berita-management-header">
          <div>
            <h2>Kelola Berita</h2>

            <p>Manajemen konten berita dan pengumuman Desa Cibenda.</p>
          </div>

          <div className="sid-kelola-berita-pagination-buttons">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={processing || currentPage === 1}
              title="Halaman sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>

            <PageNumbers
              currentPage={currentPage}
              totalPages={totalPages}
              onChange={setCurrentPage}
              disabled={processing}
            />

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={processing || currentPage === totalPages}
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
              <div key={berita.id} className="sid-kelola-berita-card">
                {/* ==================================
                    IMAGE
                    ================================== */}

                <div className="sid-kelola-berita-card-image">
                  {berita.thumbnail ? (
                    <img src={berita.thumbnail} alt={berita.title ?? 'Thumbnail berita'} />
                  ) : (
                    <div className="sid-kelola-berita-card-placeholder">
                      <Newspaper size={28} />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(berita)}
                    disabled={processing}
                    className="sid-kelola-berita-edit-button"
                    title="Edit berita"
                  >
                    <Pencil size={14} />
                  </button>
                </div>

                {/* ==================================
                    CONTENT
                    ================================== */}

                <div className="sid-kelola-berita-card-content">
                  {/* META */}

                  <div className="sid-kelola-berita-card-meta">
                    {berita.categories?.map((category) => (
                      <span key={category.id} className="sid-kelola-berita-category">
                        {category.name}
                      </span>
                    ))}

                    <span className="sid-kelola-berita-date">
                      {formatDate(berita.published_at)}
                    </span>
                  </div>

                  {/* TITLE + STATUS */}

                  <div className="flex items-center justify-between gap-2">
                    <h3>{berita.title}</h3>

                    <StatusPill tone={isPublished(berita) ? 'active' : 'warning'}>
                      {isPublished(berita) ? 'Publikasi' : 'Draft'}
                    </StatusPill>
                  </div>

                  {/* CONTENT */}

                  <p>{truncateContent(berita.content, 150)}</p>

                  {/* ACTION */}

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(berita)}
                      disabled={processing}
                      className="sid-kelola-berita-read-more"
                    >
                      Edit Berita
                    </button>

                    {!isPublished(berita) && (
                      <button
                        type="button"
                        onClick={() => handlePublish(berita)}
                        disabled={processing}
                        className="sid-kelola-berita-publish-button"
                        title="Publikasikan berita"
                      >
                        <span className="sid-kelola-berita-category gap-2 ">
                          <Send size={14} />

                          {processing ? 'Memproses...' : 'Publikasikan'}
                        </span>
                      </button>
                    )}
                  </div>
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
            <PageSizeSelect
              value={pageSize}
              onChange={setPageSize}
              options={BERITA_PAGE_SIZE_OPTIONS}
              disabled={processing}
            />
          </div>
        )}
      </div>

      {/* ==========================================
          FOOTER
          ========================================== */}

      <SiteFooter />

      {/* ==========================================
          MODAL
          ========================================== */}

      <BeritaFormModal
        open={modalOpen}
        onClose={() => {
          if (processing) {
            return
          }

          setModalOpen(false)
          setEditingBerita(null)
        }}
        onSubmit={handleSubmitForm}
        onDelete={handleDeleteBerita}
        initialData={editingBerita}
        categories={categories}
        processing={processing}
      />

      <KategoriBeritaModal
        open={kategoriModalOpen}
        onClose={() => setKategoriModalOpen(false)}
        categories={categories}
        loading={categoriesLoading}
        processing={categoriesProcessing}
        onAdd={addCategory}
        onRename={handleRenameCategory}
        onDelete={removeCategory}
      />
    </div>
  )
}
