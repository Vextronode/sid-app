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

import { StatusBadge } from '@/components/ui/StatusBadge'
import { OverdueBadge } from '@/components/ui/OverdueBadge'

import { SiteFooter } from '@/components/layout/SiteFooter'

import { SURAT_STATUS_OPTIONS } from '@/constants/suratStatus'
import { PageNumbers } from '@/components/ui/PageNumbers'

const ITEMS_PER_PAGE = 5

export default function KadusListPage() {
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
  } = useApprovalLetterList({
    role: 'kadus',
    initialStatus,
    perPage: ITEMS_PER_PAGE,
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

          <h1 className="sid-page-title">Daftar Permohonan Surat</h1>

          <p className="sid-page-description">
            Pantau permohonan surat warga di wilayah dusun secara digital.
          </p>

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
            <table className="rw-table">
              <thead>
                <tr className="rw-table-header">
                  <th>No. Surat</th>

                  <th>Pemohon</th>

                  <th>Jenis</th>

                  <th>Tanggal</th>

                  <th>Status</th>

                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="rw-table-message">
                      Memuat data surat...
                    </td>
                  </tr>
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="rw-table-message">
                      Belum ada surat.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((s) => (
                    <tr key={s.id} className="rw-table-row">
                      {/* NO SURAT */}

                      <td className="rw-letter-number">#{s.letter_number ?? '-'}</td>

                      {/* PEMOHON */}

                      <td className="rw-table-center">{s.applicant_name ?? '-'}</td>

                      {/* JENIS */}

                      <td className="rw-table-center">{s.letter_type?.name ?? '-'}</td>

                      {/* TANGGAL */}

                      <td className="rw-table-date">
                        {s.submitted_at
                          ? new Date(s.submitted_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          : '-'}
                      </td>

                      {/* STATUS */}

                      <td className="rw-table-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <StatusBadge status={s.status} />
                          <OverdueBadge isOverdue={s.is_overdue} />
                        </div>
                      </td>

                      {/* AKSI */}

                      <td className="rw-table-center">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(s)}
                          className="rw-action-button"
                        >
                          Lihat
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* ==================================
                PAGINATION DESKTOP
                ================================== */}

            <div className="rw-pagination">
              <p className="rw-pagination-info">
                Menampilkan{' '}
                {paginatedData.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}-
                {(currentPage - 1) * ITEMS_PER_PAGE + paginatedData.length} dari {totalItems} data
              </p>

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
            <div className="rw-mobile-table-header">
              <span>No.Surat</span>

              <span>Pemohon</span>

              <span>Jenis</span>

              <span>Tanggal</span>
            </div>

            {loading ? (
              <p className="rw-mobile-message">Memuat...</p>
            ) : paginatedData.length === 0 ? (
              <p className="rw-mobile-message">Belum ada surat.</p>
            ) : (
              paginatedData.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleOpenDetail(s)}
                  className="rw-mobile-row"
                >
                  <span>{s.letter_number ?? '-'}</span>

                  <span className="rw-mobile-applicant">{s.applicant_name ?? '-'}</span>

                  <span>{s.letter_type?.name ?? '-'}</span>

                  <span className="rw-mobile-date">
                    {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('id-ID') : '-'}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* MOBILE PAGINATION */}

          <div className="rw-mobile-pagination">
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
