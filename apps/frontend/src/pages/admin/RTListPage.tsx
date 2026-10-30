// ==========================================
// RTListPage.tsx
// Daftar Permohonan Surat RT
//
// STATUS:
// - RT dapat melihat daftar surat.
// - RT dapat memproses surat pada tahap RT.
// - Status menggunakan status generik.
// - UI mengikuti pola RWListPage.
//
// Desktop:
// - Breadcrumb
// - Header + description
// - Search + filter
// - Table
// - Pagination
// - Footer
//
// Mobile:
// - Header
// - Search
// - Filter
// - List surat
// - Pagination
// - Footer
// - Bottom navigation
//
// Modal detail:
// SuratDetailModalRT
// ==========================================

import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useLetterDeepLink } from '@/features/notifikasi/hooks/useLetterDeepLink'
import { useApprovalLetterList } from '@/features/approval/hooks/useApprovalLetterList'
import SuratDetailModalRT from '@/features/approval-rt/components/SuratDetailModalRT'

import { SiteFooter } from '@/components/layout/SiteFooter'
import { LetterTable } from '@/features/surat/components/LetterTable'
import { LetterRowActions } from '@/features/surat/components/LetterRowActions'

import { SURAT_STATUS, SURAT_STATUS_OPTIONS } from '@/constants/suratStatus'
import { PageNumbers } from '@/components/ui/PageNumbers'
import { PageSizeSelect } from '@/components/ui/PageSizeSelect'
import { formatPageRange } from '@/components/ui/pageRange'
import { RefreshButton } from '@/components/ui/RefreshButton'
import { useQueryRefresh } from '@/shared/hooks/useQueryRefresh'
import type { LetterStatus } from '@/types'
import type { LetterListItem } from '@/types'

// Surat yang masih dapat diproses RT.
const OPEN_STATUSES: LetterStatus[] = [SURAT_STATUS.PENDING, SURAT_STATUS.IN_PROGRESS]

export default function RTListPage() {
  const pageRefresh = useQueryRefresh(['surat'])
  const [searchParams] = useSearchParams()

  const initialStatus = searchParams.get('status') ?? ''

  const [selectedId, setSelectedId] = useState(null)
  const [isReadOnly, setIsReadOnly] = useState(false)

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
    refresh,
  } = useApprovalLetterList({
    initialStatus,
  })

  // ==========================================
  // PAGINATION
  // ==========================================

  // Baris yang diterima sudah merupakan satu halaman dari server.
  const paginatedData = data

  // ==========================================
  // APPROVE
  // ==========================================

  const handleApprove = async () => {
    try {
      await refresh()

      setSelectedId(null)
      setIsReadOnly(false)
    } catch (error) {
      console.error('Gagal refresh daftar surat:', error)
    }
  }

  // ==========================================
  // REJECT
  // ==========================================

  const handleReject = async () => {
    try {
      await refresh()

      setSelectedId(null)
      setIsReadOnly(false)
    } catch (error) {
      console.error('Gagal refresh daftar surat:', error)
    }
  }

  // ==========================================
  // BUKA DETAIL
  // ==========================================

  const handleOpenDetail = (surat: LetterListItem) => {
    setSelectedId(surat.id)

    const canProcessAtRt =
      OPEN_STATUSES.includes(surat.status) && surat.current_step?.approver_position === 'rt'

    setIsReadOnly(!canProcessAtRt)
  }

  // Dibuka dari notifikasi: ?surat=<id>.
  useLetterDeepLink((letterId) => {
    const listed = data.find((surat) => String(surat.id) === letterId)

    if (listed) {
      handleOpenDetail(listed)
    } else {
      setSelectedId(letterId)
      setIsReadOnly(true)
    }
  }, !loading)

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
                Kelola permohonan surat warga yang masuk ke wilayah RT.
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
                    defaultValue={search}
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
              renderActions={(s) => (
                <LetterRowActions
                  surat={s}
                  onOpen={handleOpenDetail}
                  openLabel={
                    OPEN_STATUSES.includes(s.status) && s.current_step?.approver_position === 'rt'
                      ? 'Proses'
                      : 'Detail'
                  }
                />
              )}
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
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rw-pagination-nav"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================
            FOOTER
            ====================================== */}

        <SiteFooter />
      </div>

      {/* ========================================
          MOBILE
          ======================================== */}

      <div className="rw-page-mobile">
        <div className="sid-page rw-mobile-content">
          {/* HEADER */}

          <h1 className="sid-page-title">Semua Surat</h1>

          <p className="sid-page-description">Kelola permohonan surat warga secara digital.</p>
          <div className="mt-3">
            <RefreshButton onRefresh={pageRefresh.refresh} refreshing={pageRefresh.refreshing} />
          </div>

          {/* SEARCH */}

          <div className="rw-mobile-search">
            <Search size={16} className="sid-search-icon" />

            <input
              type="text"
              defaultValue={search}
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
              renderActions={(s) => (
                <LetterRowActions
                  surat={s}
                  onOpen={handleOpenDetail}
                  openLabel={
                    OPEN_STATUSES.includes(s.status) && s.current_step?.approver_position === 'rt'
                      ? 'Proses'
                      : 'Detail'
                  }
                />
              )}
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

      <SuratDetailModalRT
        suratId={selectedId}
        onClose={() => {
          setSelectedId(null)
          setIsReadOnly(false)
        }}
        onApprove={handleApprove}
        onReject={handleReject}
        readOnly={isReadOnly}
      />
    </>
  )
}
