// ==========================================
// OperatorSuratListPage.jsx
// Halaman "Daftar Permohonan Surat" untuk Operator Desa.
// Status menggunakan status generic.
// Daftar, detail, riwayat, dan unduhan bersifat read-only.
// Styling menggunakan Global CSS.
// ==========================================

import OperatorSuratPreviewModal from '@/features/operator-desa/components/OperatorSuratPreviewModal'
import { useState } from 'react'
import { useLetterDeepLink } from '@/features/notifikasi/hooks/useLetterDeepLink'
import { Download, Search, Eye } from 'lucide-react'

import {
  useDebouncedValue,
  useSuratListQuery,
  useSuratSummaryQuery,
} from '@/features/surat/hooks/useSuratListQuery'

import { StatusBadge } from '@/components/ui/StatusBadge'
import { OverdueBadge } from '@/components/ui/OverdueBadge'

import { SiteFooter } from '@/components/layout/SiteFooter'

import { SURAT_STATUS } from '@/constants/suratStatus'

const ITEMS_PER_PAGE = 3

const STATUS_FILTER_PARAM = {
  verification: SURAT_STATUS.IN_PROGRESS,
  completed: SURAT_STATUS.APPROVED,
  rejected: SURAT_STATUS.REJECTED,
}

export default function OperatorSuratListPage() {
  const [search, setSearch] = useState('')
  const [filterJenis, setFilterJenis] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [previewSurat, setPreviewSurat] = useState(null)

  // Dibuka dari notifikasi: ?surat=<id>. Modal memuat detailnya sendiri.
  useLetterDeepLink((letterId) => setPreviewSurat({ id: letterId }))

  // ==========================================
  // LOAD DATA
  // ==========================================

  // Filter, pencarian, dan pagination diproses di server; surat terbaru
  // tampil lebih dahulu.
  const debouncedSearch = useDebouncedValue(search.trim())

  const {
    letters: paginated,
    meta,
    loading,
  } = useSuratListQuery({
    page: currentPage,
    per_page: ITEMS_PER_PAGE,
    status: STATUS_FILTER_PARAM[filterStatus],
    letter_type_id: filterJenis,
    search: debouncedSearch,
  })

  const totalItems = meta.total
  const totalPages = Math.max(1, meta.last_page)

  // ==========================================
  // JENIS SURAT OPTIONS
  // ==========================================

  const { summary } = useSuratSummaryQuery()
  const jenisOptions = summary.by_type

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="sid-operator-page">
      <main className="sid-operator-content">
        {/* ==========================================
            HEADER
        ========================================== */}

        <div className="sid-operator-breadcrumb">
          Admin /<span> Daftar Permohonan Surat</span>
        </div>

        <div className="sid-operator-header">
          <h1>Daftar Permohonan Surat</h1>

          <button className="sid-operator-export">
            <Download size={16} />
            Ekspor Laporan
          </button>
        </div>

        {/* ==========================================
            SEARCH + FILTER
        ========================================== */}

        <div className="sid-operator-filter-card">
          <div className="sid-operator-filter-grid">
            {/* SEARCH */}

            <div className="sid-operator-filter-field">
              <p>Pencarian Cepat</p>

              <div className="sid-operator-search">
                <Search size={16} />

                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setCurrentPage(1)
                  }}
                  placeholder="Nomor surat atau nama pemohon..."
                />
              </div>
            </div>

            {/* JENIS */}

            <div className="sid-operator-filter-field">
              <p>Jenis Surat</p>

              <select
                value={filterJenis}
                onChange={(e) => {
                  setFilterJenis(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="">Semua Jenis</option>

                {jenisOptions.map((jenis) => (
                  <option key={jenis.id} value={jenis.id}>
                    {jenis.name}
                  </option>
                ))}
              </select>
            </div>

            {/* STATUS */}

            <div className="sid-operator-filter-field">
              <p>Status</p>

              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="">Semua Status</option>

                <option value="verification">Sedang Diproses</option>

                <option value="completed">Selesai</option>

                <option value="rejected">Ditolak</option>
              </select>
            </div>
          </div>
        </div>

        {/* ==========================================
            TABLE
        ========================================== */}

        <div className="sid-operator-table-card">
          <div className="sid-operator-table-wrapper">
            <table className="sid-operator-table">
              <thead>
                <tr>
                  <th>No. Surat</th>
                  <th className="center">Pemohon</th>
                  <th className="center">Jenis</th>
                  <th className="center">Tanggal</th>
                  <th className="center">Status</th>
                  <th className="center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="sid-operator-table-message">
                      Memuat data surat...
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="sid-operator-table-message">
                      Belum ada surat.
                    </td>
                  </tr>
                ) : (
                  paginated.map((surat) => (
                    <tr key={surat.id}>
                      {/* NO SURAT */}

                      <td className="sid-operator-letter-number">
                        <div>
                          <span>#{surat.letter_number ?? '-'}</span>

                          {surat.revision_count > 0 && <small>Hasil Revisi</small>}
                        </div>
                      </td>

                      {/* PEMOHON */}

                      <td>
                        <span className="sid-operator-applicant">
                          {surat.applicant_name ?? '-'}
                        </span>
                      </td>

                      {/* JENIS */}

                      <td className="center">{surat.letter_type?.name ?? '-'}</td>

                      {/* TANGGAL */}

                      <td className="center">
                        {surat.submitted_at
                          ? new Date(surat.submitted_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          : '-'}
                      </td>

                      {/* STATUS */}

                      <td className="center">
                        <div className="flex flex-col items-center gap-1.5">
                          <StatusBadge status={surat.status} />
                          <OverdueBadge isOverdue={surat.is_overdue} />
                        </div>
                      </td>

                      {/* AKSI */}

                      <td>
                        <div className="sid-operator-actions">
                          {/* DETAIL */}

                          <button
                            type="button"
                            onClick={() => setPreviewSurat(surat)}
                            className="sid-operator-action detail"
                            title="Detail Surat"
                          >
                            <Eye size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ==========================================
              PAGINATION
          ========================================== */}

          <div className="sid-operator-pagination">
            <p>
              Menampilkan {paginated.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}-
              {(currentPage - 1) * ITEMS_PER_PAGE + paginated.length} dari {totalItems} data
            </p>

            <div>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                Sebelumnya
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={page === currentPage ? 'active' : ''}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ==========================================
          FOOTER
      ========================================== */}

      <SiteFooter />

      {/* ==========================================
          PREVIEW
      ========================================== */}

      {previewSurat && (
        <OperatorSuratPreviewModal surat={previewSurat} onClose={() => setPreviewSurat(null)} />
      )}
    </div>
  )
}
