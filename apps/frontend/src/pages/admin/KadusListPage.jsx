// ==========================================
// KadusListPage.jsx
// Daftar permohonan surat Kadus
//
// STATUS:
// - Kadus hanya memiliki akses monitoring.
// - Kadus tidak memiliki kewenangan approve/reject.
// - Kadus dapat melihat daftar dan detail surat.
//
// Workflow monitoring menggunakan status generik.
//
// Styling menggunakan SID Global Theme.
// Struktur dibuat konsisten dengan RWListPage.jsx.
// ==========================================

import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useLetterDeepLink } from '@/features/notifikasi/hooks/useLetterDeepLink'

import { useApprovalLetterList } from '@/features/approval/hooks/useApprovalLetterList'
import SuratDetailModalKadus from '@/features/approval-kadus/components/SuratDetailModalKadus'

import { SiteFooter } from '@/components/layout/SiteFooter'
import { LetterTable } from '@/features/surat/components/LetterTable'
import { LetterRowActions } from '@/features/surat/components/LetterRowActions'

import { SURAT_STATUS_OPTIONS } from '@/constants/suratStatus'
import { PageNumbers } from '@/components/ui/PageNumbers'
import { PageSizeSelect } from '@/components/ui/PageSizeSelect'
import { formatPageRange } from '@/components/ui/pageRange'
import { RefreshButton } from '@/components/ui/RefreshButton'
import { useQueryRefresh } from '@/shared/hooks/useQueryRefresh'

export default function KadusListPage() {
  const pageRefresh = useQueryRefresh(['surat'])
  const [searchParams] = useSearchParams()

  const initialStatus = searchParams.get('status') ?? ''

  const [selectedId, setSelectedId] = useState(null)

  // ==========================================
  // DATA
  // ==========================================

  const {
    data,
    loading,
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    totalItems,
    totalPages,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
  } = useApprovalLetterList({
    role: 'kadus',
    initialStatus,
  })
  // ==========================================
  // PAGINATION
  // ==========================================

  // Baris yang diterima sudah merupakan satu halaman dari server.
  const paginatedData = data

  // ==========================================
  // BUKA DETAIL
  //
  // KADUS SELALU READ-ONLY.
  // ==========================================

  const handleOpenDetail = (surat) => {
    setSelectedId(surat.id)
  }

  // Dibuka dari notifikasi: ?surat=<id>.
  useLetterDeepLink((letterId) => setSelectedId(letterId))

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <>
      {/* ========================================
          DESKTOP
          ======================================== */}

      <div className="rw-page-desktop">
        <div className="sid-page rw-page-content">
          {/* ======================================
              HEADER
              ====================================== */}

          <p className="rw-breadcrumb">
            Admin / <span>Daftar Permohonan Surat</span>
          </p>

          <div className="sid-dashboard-header">
            <div>
              <h1 className="sid-page-title">Daftar Permohonan Surat</h1>

              <p className="sid-page-description">
                Pantau permohonan surat warga di wilayah dusun secara digital.
              </p>
            </div>
            <RefreshButton onRefresh={pageRefresh.refresh} refreshing={pageRefresh.refreshing} />
          </div>

          {/* ======================================
              FILTER
              ====================================== */}

          <div className="sid-card rw-filter-card">
            <div className="rw-filter-grid">
              {/* PENCARIAN */}

              <div>
                <p className="rw-filter-label">Pencarian Cepat</p>

                <div className="rw-search-wrapper">
                  <Search size={16} className="sid-search-icon" />

                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nomor surat atau nama pemohon..."
                    className="sid-search-input"
                  />
                </div>
              </div>

              {/* STATUS */}

              <div>
                <p className="rw-filter-label">Status</p>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="sid-select rw-status-select"
                >
                  <option value="">Semua Status</option>

                  {SURAT_STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ======================================
              TABLE
              ====================================== */}

          <div className="sid-card rw-table-card">
            <LetterTable
              letters={paginatedData}
              loading={loading}
              renderActions={(s) => <LetterRowActions surat={s} onOpen={handleOpenDetail} />}
            />

            {/* ==================================
                PAGINATION DESKTOP
                ================================== */}

            <div className="rw-pagination">
              <div className="sid-pagination-meta">
                <p className="rw-pagination-info">
                  {formatPageRange(currentPage, pageSize, totalItems)}
                </p>

                <PageSizeSelect value={pageSize} onChange={setPageSize} />
              </div>

              <div className="rw-pagination-buttons">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="rw-pagination-nav"
                >
                  Sebelumnya
                </button>

                <PageNumbers
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onChange={setCurrentPage}
                  buttonClassName="rw-pagination-page"
                  activeClassName="rw-pagination-page-active"
                />

                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="rw-pagination-nav"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}

        <SiteFooter />
      </div>

      {/* ========================================
          MOBILE
          ======================================== */}

      <div className="rw-page-mobile">
        <div className="sid-page rw-mobile-content">
          {/* HEADER */}

          <h1 className="sid-page-title">Semua Surat</h1>

          <p className="sid-page-description">Pantau permohonan surat warga secara digital.</p>
          <div className="mt-3">
            <RefreshButton onRefresh={pageRefresh.refresh} refreshing={pageRefresh.refreshing} />
          </div>

          {/* SEARCH */}

          <div className="rw-mobile-search">
            <Search size={16} className="sid-search-icon" />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama pemohon..."
              className="sid-search-input"
            />
          </div>

          {/* FILTER STATUS */}

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="sid-select rw-mobile-status-select"
          >
            <option value="">Semua Status</option>

            {SURAT_STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          {/* MOBILE TABLE */}

          <div className="sid-card rw-mobile-table-card">
            <LetterTable
              letters={paginatedData}
              loading={loading}
              renderActions={(s) => <LetterRowActions surat={s} onOpen={handleOpenDetail} />}
            />
          </div>

          {/* MOBILE PAGINATION */}

          <div className="rw-mobile-pagination">
            <PageSizeSelect value={pageSize} onChange={setPageSize} />

            <PageNumbers
              currentPage={currentPage}
              totalPages={totalPages}
              onChange={setCurrentPage}
              buttonClassName="rw-mobile-page-button"
              activeClassName="rw-mobile-page-button-active"
            />
          </div>
        </div>

        {/* FOOTER */}

        <div className="sid-mobile-footer">
          <SiteFooter />
        </div>
      </div>

      {/* ========================================
          DETAIL MODAL
          ======================================== */}

      <SuratDetailModalKadus
        suratId={selectedId}
        onClose={() => {
          setSelectedId(null)
        }}
      />
    </>
  )
}
