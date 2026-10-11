// ==========================================
// DaftarSuratSayaPage.jsx
// Tabel daftar surat warga.
// Status menggunakan status generic.
// ==========================================

import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, Trash2 } from 'lucide-react'
import { useLetterDeepLink } from '@/features/notifikasi/hooks/useLetterDeepLink'

import { WargaLayout } from '@/components/layout/WargaLayout'
import { useLetters } from '@/features/surat/hooks/useLetters'
import { deleteLetter } from '@/features/surat/api/letterApi'
import { DetailSuratModal } from '@/features/surat/components/DetailSuratModal'
import { StatusBadge } from '@/components/ui/StatusBadge'

import { SURAT_STATUS } from '@/constants/suratStatus'

const PAGE_TITLE = {
  '': 'Semua Pengajuan',
  approved: 'Permohonan Disetujui',
  ditolak: 'Permohonan Ditolak',
}

export default function DaftarSuratSayaPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const filterStatus = searchParams.get('status') ?? ''

  const { letters, loading, refresh } = useLetters()

  const [selectedSurat, setSelectedSurat] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [deleteError, setDeleteError] = useState('')

  // Surat yang sudah disetujui adalah dokumen terbit, jadi tidak ditawarkan untuk dihapus.
  const handleDelete = async (item) => {
    const confirmed = window.confirm(
      `Hapus permohonan ${item.letter_type?.name ?? 'surat'} ini? Tindakan ini tidak dapat dibatalkan.`,
    )

    if (!confirmed) return

    setDeletingId(item.id)
    setDeleteError('')

    try {
      await deleteLetter(item.id)
      await refresh()
    } catch (requestError) {
      setDeleteError(requestError?.response?.data?.message || 'Gagal menghapus surat.')
    } finally {
      setDeletingId(null)
    }
  }

  const toDetail = (item) => ({
    ...item,
    noSurat: item.letter_number,
    pemohon: item.applicant_name,
    jenis: item.letter_type?.name,
    tanggal: item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-',
  })

  // Dibuka dari notifikasi: ?surat=<id>.
  useLetterDeepLink((letterId) => {
    const listed = letters.find((item) => String(item.id) === letterId)

    if (listed) setSelectedSurat(toDetail(listed))
  }, !loading)

  // ==========================================
  // FILTER
  // ==========================================

  const filtered = letters.filter((item) => {
    if (!filterStatus) {
      return true
    }

    if (filterStatus === 'ditolak') {
      return item.status === SURAT_STATUS.REJECTED
    }

    // Status approved.
    if (filterStatus === 'approved') {
      return item.status === SURAT_STATUS.APPROVED
    }

    return item.status === filterStatus
  })

  return (
    <WargaLayout>
      <div className="sid-page sid-surat-saya-page">
        {/* ==========================================
            KEMBALI
        ========================================== */}

        <button
          type="button"
          onClick={() => navigate('/jenis-surat')}
          className="sid-surat-saya-back"
        >
          <ArrowLeft size={16} />
          Kembali
        </button>

        {/* ==========================================
            HEADER
        ========================================== */}

        <h1 className="sid-page-title">{PAGE_TITLE[filterStatus] ?? 'Daftar Permohonan'}</h1>

        <p className="sid-page-description">Daftar surat yang pernah Anda ajukan</p>

        {/* ==========================================
            CARD TABEL
        ========================================== */}

        {deleteError && (
          <p className="sid-form-field-error" role="alert">
            {deleteError}
          </p>
        )}

        <div className="sid-card sid-surat-saya-table-card">
          {loading ? (
            <p className="sid-surat-saya-message">Memuat data surat...</p>
          ) : filtered.length === 0 ? (
            <p className="sid-surat-saya-message">Belum ada surat pada kategori ini.</p>
          ) : (
            <div className="sid-surat-saya-table-wrapper">
              <table className="sid-surat-saya-table">
                {/* HEADER */}

                <thead>
                  <tr>
                    <th className="sid-surat-saya-col-type">Jenis Surat</th>

                    <th className="sid-surat-saya-col-date">Tanggal</th>

                    <th className="sid-surat-saya-col-status">Status</th>

                    <th className="sid-surat-saya-col-action">Aksi</th>
                  </tr>
                </thead>

                {/* BODY */}

                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id}>
                      {/* JENIS SURAT */}

                      <td className="sid-surat-saya-type-cell">
                        <div className="sid-surat-saya-type-info">
                          <p className="sid-surat-saya-type-name">
                            {item.letter_type?.name ?? '-'}
                          </p>

                          <p className="sid-surat-saya-letter-number">
                            #{item.letter_number ?? `SKD-${item.id}`}
                          </p>
                        </div>
                      </td>

                      {/* TANGGAL */}

                      <td className="sid-surat-saya-date-cell">
                        <span>
                          {item.created_at
                            ? new Date(item.created_at).toLocaleDateString('id-ID')
                            : '-'}
                        </span>
                      </td>

                      {/* STATUS */}

                      <td className="sid-surat-saya-status-cell">
                        <StatusBadge status={item.status} />
                      </td>

                      {/* AKSI */}

                      <td className="sid-surat-saya-action-cell">
                        <div className="sid-surat-saya-actions">
                          {/* DETAIL */}

                          <button
                            type="button"
                            onClick={() => setSelectedSurat(toDetail(item))}
                            className="sid-surat-saya-detail-button"
                          >
                            <Eye />
                            Detail
                          </button>

                          {item.status !== SURAT_STATUS.APPROVED && (
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              disabled={deletingId === item.id}
                              className="sid-surat-saya-delete-button"
                              aria-label={`Hapus ${item.letter_type?.name ?? 'surat'}`}
                            >
                              <Trash2 />
                              Hapus
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ==========================================
          DETAIL MODAL
      ========================================== */}

      {selectedSurat && (
        <DetailSuratModal data={selectedSurat} onClose={() => setSelectedSurat(null)} />
      )}
    </WargaLayout>
  )
}
