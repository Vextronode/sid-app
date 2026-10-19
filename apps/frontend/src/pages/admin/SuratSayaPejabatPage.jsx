import { useState } from 'react'
import { ArrowLeft, FilePlus } from 'lucide-react'

import api from '@/lib/api'
import { usePageSize } from '@/components/ui/usePageSize'
import { DetailSuratModal } from '@/features/surat/components/DetailSuratModal'
import { DynamicSuratForm } from '@/features/surat/components/DynamicSuratForm'
import { LetterTypePicker } from '@/features/surat/components/LetterTypePicker'
import { MyLettersList } from '@/features/surat/components/MyLettersList'
import { useLetters } from '@/features/surat/hooks/useLetters'
import { useLetterTypes } from '@/features/surat/hooks/useLetterTypes'
import { getLetterTypeFormConfig } from '@/features/surat/utils/letterTypeConfig'
import { useLetterDeepLink } from '@/features/notifikasi/hooks/useLetterDeepLink'
import { confirmDialog } from '@/shared/lib/dialog'
import { notifySuccess } from '@/shared/lib/toast'

// Nomor langkah ditambahkan CSS (.sid-apply), jadi judul cukup isinya.
const APPLY_HEADINGS = { fields: 'Isi data surat', signatures: 'Tanda tangan' }

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
  const [statusFilter, setStatusFilter] = useState('')
  const [pageSize, setPageSize] = usePageSize('surat-saya')
  const {
    letters,
    meta,
    loading,
    refresh: loadLetters,
  } = useLetters({ page, perPage: pageSize, status: statusFilter || undefined })
  const [error, setError] = useState('')
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
    const confirmed = await confirmDialog({
      title: `Hapus permohonan ${item.letter_type?.name ?? 'surat'}?`,
      message: 'Tindakan ini tidak dapat dibatalkan.',
      confirmLabel: 'Hapus',
    })

    if (!confirmed) return

    setDeletingId(item.id)

    try {
      await api.delete(`/api/letters/${item.id}`)
      notifySuccess('Permohonan surat berhasil dihapus.')

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
    notifySuccess('Permohonan surat berhasil dikirim.')
    setPage(1)
    setStatusFilter('')
    await loadLetters()
  }

  return (
    <>
      <div className="sid-page sid-surat-saya-page">
        {applying ? (
          <>
            <button type="button" onClick={closeForm} className="sid-surat-saya-back">
              <ArrowLeft size={16} aria-hidden="true" />
              Kembali ke Surat Saya
            </button>

            <div className="sid-apply">
              <header className="sid-apply-header">
                <h1 className="sid-my-letters-heading">Ajukan surat</h1>
                <p className="sid-my-letters-lead">
                  Surat ini diajukan atas nama Anda sebagai warga. Tahap persetujuan yang menjadi
                  wewenang Anda dilewati dan diputuskan pejabat lain.
                </p>
              </header>

              <section className="sid-apply-step" aria-labelledby="apply-step-type">
                <h2 id="apply-step-type" className="sid-apply-step-title">
                  {selectedLetterType ? 'Jenis surat' : 'Pilih jenis surat'}
                </h2>

                <LetterTypePicker
                  letterTypes={letterTypes}
                  loading={typesLoading}
                  error={typesError}
                  selectedCode={selectedCode}
                  onSelect={setSelectedCode}
                />
              </section>

              {currentConfig ? (
                <DynamicSuratForm
                  key={currentConfig.code}
                  config={currentConfig}
                  letterTypes={letterTypes}
                  onCancel={closeForm}
                  onSubmit={handleSubmitted}
                  headings={APPLY_HEADINGS}
                  className="sid-apply-form"
                />
              ) : selectedLetterType ? (
                <p className="sid-admin-alert sid-admin-alert-error" role="alert">
                  Formulir untuk jenis surat ini belum tersedia.
                </p>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <header className="sid-my-letters-header">
              <div>
                <h1 className="sid-my-letters-heading">Surat Saya</h1>
                <p className="sid-my-letters-lead">
                  Surat yang Anda ajukan atas nama sendiri, terpisah dari surat warga yang Anda
                  proses.
                </p>
              </div>
              <button
                type="button"
                className="sid-btn sid-btn-primary inline-flex items-center gap-2"
                onClick={() => setApplying(true)}
              >
                <FilePlus size={16} aria-hidden="true" />
                Ajukan surat
              </button>
            </header>

            {error && (
              <p className="sid-admin-alert sid-admin-alert-error" role="alert">
                {error}
              </p>
            )}

            <MyLettersList
              letters={letters}
              loading={loading}
              filter={statusFilter}
              onFilterChange={(value) => {
                setStatusFilter(value)
                setPage(1)
              }}
              onDetail={(item) => setSelectedSurat(toDetail(item))}
              onDelete={handleDelete}
              deletingId={deletingId}
              onCreate={() => setApplying(true)}
              page={page}
              totalPages={meta.last_page}
              onPageChange={setPage}
              pageSize={pageSize}
              onPageSizeChange={(value) => {
                setPageSize(value)
                setPage(1)
              }}
            />
          </>
        )}
      </div>

      {selectedSurat && (
        <DetailSuratModal data={selectedSurat} onClose={() => setSelectedSurat(null)} />
      )}
    </>
  )
}
