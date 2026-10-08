// ==========================================
// OperatorSuratListPage.jsx
// Halaman "Daftar Permohonan Surat" untuk Operator Desa.
// Status menggunakan status generic.
// Daftar, detail, riwayat, dan unduhan bersifat read-only.
// Styling menggunakan Global CSS.
// ==========================================

import OperatorSuratPreviewModal from '@/features/operator-desa/components/OperatorSuratPreviewModal'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Search, Eye } from 'lucide-react'

import { getSuratList } from '@/lib/api'

import { StatusBadge } from '@/components/ui/StatusBadge'

import { FooterOperator } from '../../components/layout/FooterOperator'

import { SURAT_STATUS, SURAT_STATUS_ORDER } from '@/constants/suratStatus'

const ITEMS_PER_PAGE = 3

export default function OperatorSuratListPage() {
  const [letters, setLetters] = useState([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [filterJenis, setFilterJenis] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [previewSurat, setPreviewSurat] = useState(null)

  // ==========================================
  // LOAD DATA
  // ==========================================

  const loadLetters = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true)
    }

      try {
        const res = await getSuratList()

      const data = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : []

      setLetters(data)
    } catch (err) {
      console.error('GAGAL MENGAMBIL DATA SURAT:', err.response?.data ?? err)

      setLetters([])
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }, [])

  // ==========================================
  // LOAD DATA PERTAMA KALI
  // ==========================================

  useEffect(() => {
    let isMounted = true

    const loadInitialLetters = async () => {
      if (!isMounted) {
        return
      }

      await loadLetters(true)
    }

    loadInitialLetters()

    return () => {
      isMounted = false
    }
  }, [loadLetters])

  // ==========================================
  // AUTO REFRESH DATA SETIAP 5 DETIK
  // ==========================================

  useEffect(() => {
    const interval = setInterval(() => {
      loadLetters(false)
    }, 5000)

    return () => clearInterval(interval)
  }, [loadLetters])

  // ==========================================
  // FILTER + SORT
  // ==========================================

  const filtered = useMemo(() => {
    let result = [...letters]

    // ========================================
    // FILTER JENIS
    // ========================================

    if (filterJenis) {
      result = result.filter((letter) => letter.letter_type?.name === filterJenis)
    }

    // ========================================
    // FILTER STATUS
    // ========================================

    if (filterStatus) {
      switch (filterStatus) {
        case 'verification':
          result = result.filter((letter) => letter.status === SURAT_STATUS.IN_PROGRESS)
          break

        case 'completed':
          result = result.filter((letter) => letter.status === SURAT_STATUS.APPROVED)
          break

        case 'rejected':
          result = result.filter((letter) => letter.status === SURAT_STATUS.REJECTED)
          break

        default:
          break
      }
    }

    // ========================================
    // SEARCH
    // ========================================

    if (search) {
      const keyword = search.toLowerCase()

      result = result.filter(
        (letter) =>
          letter.applicant_name?.toLowerCase().includes(keyword) ||
          letter.letter_number?.toLowerCase().includes(keyword),
      )
    }

    // ========================================
    // SORT
    //
    // Prioritas:
    // 1. approved
    // 2. in_progress
    // 3. pending
    // 4. rejected
    //
    // Jika tanggal berbeda, surat terbaru
    // tetap ditampilkan lebih dahulu.
    // ========================================

    result.sort((a, b) => {
      const dateA = new Date(a.submitted_at ?? a.created_at)

      const dateB = new Date(b.submitted_at ?? b.created_at)

      const onlyDateA = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate())

      const onlyDateB = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate())

      if (onlyDateA.getTime() !== onlyDateB.getTime()) {
        return onlyDateB - onlyDateA
      }

      const orderA = SURAT_STATUS_ORDER[a.status] ?? 999

      const orderB = SURAT_STATUS_ORDER[b.status] ?? 999

      if (orderA !== orderB) {
        return orderA - orderB
      }

      return dateB - dateA
    })

    return result
  }, [letters, filterJenis, filterStatus, search])

  // ==========================================
  // PAGINATION
  // ==========================================

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE

    return filtered.slice(start, start + ITEMS_PER_PAGE)
  }, [filtered, currentPage])

  // ==========================================
  // JENIS SURAT OPTIONS
  // ==========================================

  const jenisOptions = useMemo(() => {
    const set = new Set(letters.map((letter) => letter.letter_type?.name).filter(Boolean))

    return Array.from(set)
  }, [letters])

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
                  <option key={jenis} value={jenis}>
                    {jenis}
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
                        <StatusBadge status={surat.status} />
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
              {(currentPage - 1) * ITEMS_PER_PAGE + paginated.length} dari {filtered.length} data
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

      <FooterOperator />

      {/* ==========================================
          PREVIEW
      ========================================== */}

      {previewSurat && (
        <OperatorSuratPreviewModal surat={previewSurat} onClose={() => setPreviewSurat(null)} />
      )}
    </div>
  )
}
