// ==========================================
// OperatorSuratListPage.tsx
// Halaman "Daftar Permohonan Surat" untuk Operator Desa.
// Status menggunakan status generic.
// Daftar, detail, riwayat, dan unduhan bersifat read-only.
// Styling menggunakan Global CSS.
// ==========================================

import OperatorSuratPreviewModal from '@/features/operator-desa/components/OperatorSuratPreviewModal'
import { LetterTable } from '@/features/surat/components/LetterTable'
import { LetterRowActions } from '@/features/surat/components/LetterRowActions'
import { useState } from 'react'
import { useLetterDeepLink } from '@/features/notifikasi/hooks/useLetterDeepLink'
import { Download, Search } from 'lucide-react'

import {
  useDebouncedValue,
  useSuratListQuery,
  useSuratSummaryQuery,
} from '@/features/surat/hooks/useSuratListQuery'

import { SiteFooter } from '@/components/layout/SiteFooter'
import { downloadErrorMessage, downloadFile } from '@/lib/downloadFile'
import { alertDialog } from '@/shared/lib/dialog'

import { SURAT_STATUS } from '@/constants/suratStatus'
import { PageNumbers } from '@/components/ui/PageNumbers'
import { PageSizeSelect } from '@/components/ui/PageSizeSelect'
import { formatPageRange } from '@/components/ui/pageRange'
import { usePageSize } from '@/components/ui/usePageSize'
import { RefreshButton } from '@/components/ui/RefreshButton'
import { useQueryRefresh } from '@/shared/hooks/useQueryRefresh'

const EMPTY_EXPORT_MESSAGE = 'Tidak ada data surat untuk diunduh. Unduhan laporan gagal.'

const STATUS_FILTER_PARAM: Record<string, string> = {
  verification: SURAT_STATUS.IN_PROGRESS,
  completed: SURAT_STATUS.APPROVED,
  rejected: SURAT_STATUS.REJECTED,
}

export default function OperatorSuratListPage() {
  const pageRefresh = useQueryRefresh(['surat'])
  const [search, setSearch] = useState('')
  const [filterJenis, setFilterJenis] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSizeState] = usePageSize('surat-operator')

  const setPageSize = (value: number) => {
    setPageSizeState(value)
    setCurrentPage(1)
  }

  const [previewSurat, setPreviewSurat] = useState(null)
  const [exporting, setExporting] = useState(false)

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
    per_page: pageSize,
    status: STATUS_FILTER_PARAM[filterStatus],
    letter_type_id: filterJenis,
    search: debouncedSearch,
  })

  const totalItems = meta.total
  const totalPages = Math.max(1, meta.last_page)

  // Ekspor memakai filter yang sama dengan daftar. Daftar kosong langsung
  // diberi peringatan tanpa memanggil server; backend juga menolak (422)
  // bila hasilnya ternyata kosong.
  const handleExport = async () => {
    if (!loading && totalItems === 0) {
      alertDialog({ title: 'Data kosong', message: EMPTY_EXPORT_MESSAGE, tone: 'warning' })
      return
    }

    setExporting(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      await downloadFile('/api/letters/export', `laporan-surat-${today}.xlsx`, {
        status: STATUS_FILTER_PARAM[filterStatus],
        letter_type_id: filterJenis || undefined,
        search: debouncedSearch || undefined,
      })
    } catch (error) {
      const isEmpty = error?.response?.status === 422
      alertDialog({
        title: isEmpty ? 'Data kosong' : 'Unduhan gagal',
        tone: isEmpty ? 'warning' : 'error',
        message: await downloadErrorMessage(
          error,
          isEmpty ? EMPTY_EXPORT_MESSAGE : 'Laporan gagal diunduh. Coba lagi.',
        ),
      })
    } finally {
      setExporting(false)
    }
  }

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

          <div className="sid-admin-page-actions">
            <RefreshButton onRefresh={pageRefresh.refresh} refreshing={pageRefresh.refreshing} />
            <button
              type="button"
              className="sid-operator-export"
              disabled={exporting}
              onClick={handleExport}
            >
              <Download size={16} />
              {exporting ? 'Mengunduh...' : 'Ekspor Laporan'}
            </button>
          </div>
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
          <LetterTable
            letters={paginated}
            loading={loading}
            renderActions={(surat) => (
              <LetterRowActions
                surat={surat}
                onOpen={setPreviewSurat}
                canDownload={surat.status === SURAT_STATUS.APPROVED}
              />
            )}
          />

          {/* ==========================================
              PAGINATION
          ========================================== */}

          <div className="sid-operator-pagination">
            <div className="sid-pagination-meta">
              <p>{formatPageRange(currentPage, pageSize, totalItems)}</p>

              <PageSizeSelect value={pageSize} onChange={setPageSize} />
            </div>

            <div>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                Sebelumnya
              </button>

              <PageNumbers
                currentPage={currentPage}
                totalPages={totalPages}
                onChange={setCurrentPage}
              />

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
