import { useState } from 'react'
import { ArrowLeft, Eye, FilePlus, Trash2 } from 'lucide-react'

import api from '@/lib/api'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SimplePagination } from '@/components/ui/SimplePagination'
import { DetailSuratModal } from '@/features/surat/components/DetailSuratModal'
import { DynamicSuratForm } from '@/features/surat/components/DynamicSuratForm'
import { useLetters } from '@/features/surat/hooks/useLetters'
import { useLetterTypes } from '@/features/surat/hooks/useLetterTypes'
import { getLetterTypeFormConfig } from '@/features/surat/utils/letterTypeConfig'
import { useLetterDeepLink } from '@/features/notifikasi/hooks/useLetterDeepLink'

function toDetail(item) {
  return {
    ...item,
    noSurat: item.letter_number,
    pemohon: item.applicant_name,
    jenis: item.letter_type?.name,
    tanggal: item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-',
  }
}

/**
 * Pengajuan surat untuk diri sendiri oleh pejabat (sebagai warga), terpisah
 * dari daftar surat yang ia proses sebagai pejabat. Backend melewati tahap
 * approval milik pemohon sendiri dan melarang memutuskan surat sendiri.
 */
export default function SuratSayaPejabatPage() {
  const { letterTypes, loading: typesLoading, error: typesError } = useLetterTypes()
  const [page, setPage] = useState(1)
  const { letters, meta, loading, refresh: loadLetters } = useLetters({ page })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [applying, setApplying] = useState(false)
  const [selectedCode, setSelectedCode] = useState('')
  const [selectedSurat, setSelectedSurat] = useState(null)

  // Dibuka dari notifikasi: ?surat=<id>.
  useLetterDeepLink((letterId) => {
    const listed = letters.find((item) => String(item.id) === letterId)

    // Surat di halaman lain tetap bisa dibuka: modal memuat detailnya sendiri.
    setSelectedSurat(listed ? toDetail(listed) : { id: letterId })
  }, !loading)

  const selectedLetterType = letterTypes.find((type) => type.code === selectedCode)
  const currentConfig = getLetterTypeFormConfig(selectedLetterType)

  const closeForm = () => {
    setApplying(false)
    setSelectedCode('')
  }

  const [deletingId, setDeletingId] = useState(null)

  // Surat yang sudah disetujui adalah dokumen terbit, jadi tidak ditawarkan untuk dihapus.
  const handleDelete = async (item) => {
    const confirmed = window.confirm(
      `Hapus permohonan ${item.letter_type?.name ?? 'surat'} ini? Tindakan ini tidak dapat dibatalkan.`,
    )

    if (!confirmed) return

    setDeletingId(item.id)
    setMessage('')

    try {
      await api.delete(`/api/letters/${item.id}`)
      setMessage('Permohonan surat berhasil dihapus.')

      // Baris terakhir di halaman ini terhapus: mundur satu halaman.
      if (letters.length === 1 && page > 1) setPage(page - 1)

      await loadLetters()
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Gagal menghapus surat.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSubmitted = async () => {
    closeForm()
    setMessage('Permohonan surat berhasil dikirim.')
    setPage(1)
    await loadLetters()
  }

  return (
    <>
      <div className="sid-page sid-surat-saya-page">
        {applying ? (
          <>
            <button type="button" onClick={closeForm} className="sid-surat-saya-back">
              <ArrowLeft size={16} />
              Kembali ke Surat Saya
            </button>

            <h1 className="sid-page-title">Ajukan Surat untuk Diri Sendiri</h1>
            <p className="sid-page-description">
              Surat ini diajukan atas nama Anda sebagai warga. Tahap persetujuan yang menjadi
              wewenang Anda sendiri dilewati dan diputuskan pejabat lain.
            </p>

            <div className="sid-card">
              <div className="sid-form-group">
                <label className="sid-label" htmlFor="self-letter-type">
                  Jenis surat <span className="sid-required">*</span>
                </label>
                <select
                  id="self-letter-type"
                  value={selectedCode}
                  disabled={typesLoading || Boolean(typesError)}
                  onChange={(event) => setSelectedCode(event.target.value)}
                  className="sid-input"
                >
                  <option value="">Pilih jenis surat...</option>
                  {letterTypes.map((type) => (
                    <option key={type.id} value={type.code}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              {typesLoading && <p role="status">Memuat jenis surat...</p>}
              {typesError && <p role="alert">{typesError}</p>}
              {selectedLetterType?.requirements_info && (
                <p className="sid-info">Persyaratan: {selectedLetterType.requirements_info}</p>
              )}
            </div>

            {currentConfig ? (
              <DynamicSuratForm
                key={currentConfig.code}
                config={currentConfig}
                letterTypes={letterTypes}
                onCancel={closeForm}
                onSubmit={handleSubmitted}
              />
            ) : (
              <div className="sid-card sid-empty-state">
                Silakan pilih jenis surat di atas untuk melanjutkan.
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="sid-page-title">Surat Saya</h1>
                <p className="sid-page-description">
                  Surat yang Anda ajukan untuk diri sendiri, terpisah dari surat warga yang Anda
                  proses.
                </p>
              </div>
              <button
                type="button"
                className="sid-btn sid-btn-primary inline-flex items-center gap-2"
                onClick={() => {
                  setMessage('')
                  setApplying(true)
                }}
              >
                <FilePlus size={16} />
                Ajukan Surat
              </button>
            </div>

            {message && (
              <p className="sid-admin-alert sid-admin-alert-success" role="status">
                {message}
              </p>
            )}
            {error && (
              <p className="sid-admin-alert sid-admin-alert-error" role="alert">
                {error}
              </p>
            )}

            <div className="sid-card sid-surat-saya-table-card">
              {loading ? (
                <p className="sid-surat-saya-message">Memuat data surat...</p>
              ) : letters.length === 0 ? (
                <p className="sid-surat-saya-message">Anda belum pernah mengajukan surat.</p>
              ) : (
                <div className="sid-surat-saya-table-wrapper">
                  <table className="sid-surat-saya-table">
                    <thead>
                      <tr>
                        <th className="sid-surat-saya-col-type">Jenis Surat</th>
                        <th>Nomor</th>
                        <th className="sid-surat-saya-col-date">Tanggal</th>
                        <th className="sid-surat-saya-col-status">Status</th>
                        <th className="sid-surat-saya-col-action">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {letters.map((item) => (
                        <tr key={item.id}>
                          <td>{item.letter_type?.name ?? '-'}</td>
                          <td>{item.letter_number ?? '-'}</td>
                          <td>
                            {item.created_at
                              ? new Date(item.created_at).toLocaleDateString('id-ID')
                              : '-'}
                          </td>
                          <td>
                            <StatusBadge status={item.status} />
                          </td>
                          <td className="sid-surat-saya-action-cell">
                            <div className="sid-surat-saya-actions">
                              <button
                                type="button"
                                onClick={() => setSelectedSurat(toDetail(item))}
                                className="sid-surat-saya-detail-button"
                                aria-label={`Detail ${item.letter_type?.name ?? 'surat'}`}
                              >
                                <Eye size={16} />
                                Detail
                              </button>

                              {item.status !== 'approved' && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(item)}
                                  disabled={deletingId === item.id}
                                  className="sid-surat-saya-delete-button"
                                  aria-label={`Hapus ${item.letter_type?.name ?? 'surat'}`}
                                >
                                  <Trash2 size={16} />
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

              <SimplePagination page={page} totalPages={meta.last_page} onChange={setPage} />
            </div>
          </>
        )}
      </div>

      {selectedSurat && (
        <DetailSuratModal data={selectedSurat} onClose={() => setSelectedSurat(null)} />
      )}
    </>
  )
}
