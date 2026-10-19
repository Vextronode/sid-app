// ==========================================
// DaftarSuratSayaPage.jsx
// Daftar surat warga beserta tahap prosesnya (MyLettersList).
// ==========================================

import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useLetterDeepLink } from '@/features/notifikasi/hooks/useLetterDeepLink'

import { WargaLayout } from '@/components/layout/WargaLayout'
import { usePageSize } from '@/components/ui/usePageSize'
import { useLetters } from '@/features/surat/hooks/useLetters'
import { deleteLetter } from '@/features/surat/api/letterApi'
import { DetailSuratModal } from '@/features/surat/components/DetailSuratModal'
import { MyLettersList } from '@/features/surat/components/MyLettersList'

import { SURAT_STATUS } from '@/constants/suratStatus'
import { confirmDialog } from '@/shared/lib/dialog'

// Nilai ?status= di URL -> status surat di backend.
const STATUS_PARAM = {
  ditolak: SURAT_STATUS.REJECTED,
  approved: SURAT_STATUS.APPROVED,
}

export default function DaftarSuratSayaPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const filterStatus = searchParams.get('status') ?? ''
  const activeStatus = STATUS_PARAM[filterStatus] ?? filterStatus

  const changeFilter = (status) => setSearchParams(status ? { status } : {}, { replace: true })

  // Halaman disimpan bersama filter yang berlaku saat itu, sehingga
  // berpindah filter otomatis kembali ke halaman pertama.
  const [pageState, setPageState] = useState({ status: filterStatus, page: 1 })
  const page = pageState.status === filterStatus ? pageState.page : 1
  const setPage = (nextPage) => setPageState({ status: filterStatus, page: nextPage })

  // Filter status dan pagination diproses di server.
  const [pageSize, setPageSizeState] = usePageSize('surat-saya')
  const setPageSize = (value) => {
    setPageSizeState(value)
    setPage(1)
  }

  const { letters, meta, loading, refresh } = useLetters({
    page,
    perPage: pageSize,
    status: activeStatus,
  })

  const [selectedSurat, setSelectedSurat] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [deleteError, setDeleteError] = useState('')

  // Surat yang sudah disetujui adalah dokumen terbit, jadi tidak ditawarkan untuk dihapus.
  const handleDelete = async (item) => {
    const confirmed = await confirmDialog({
      title: `Hapus permohonan ${item.letter_type?.name ?? 'surat'}?`,
      message: 'Tindakan ini tidak dapat dibatalkan.',
      confirmLabel: 'Hapus',
    })

    if (!confirmed) return

    setDeletingId(item.id)
    setDeleteError('')

    try {
      await deleteLetter(item.id)

      // Baris terakhir di halaman ini terhapus: mundur satu halaman.
      if (letters.length === 1 && page > 1) setPage(page - 1)

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

    // Surat di halaman lain tetap bisa dibuka: modal memuat detailnya sendiri.
    setSelectedSurat(listed ? toDetail(listed) : { id: letterId })
  }, !loading)

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

        <header className="sid-my-letters-header">
          <div>
            <h1 className="sid-my-letters-heading">Surat Saya</h1>
            <p className="sid-my-letters-lead">
              Pantau surat yang pernah Anda ajukan dan sampai mana prosesnya.
            </p>
          </div>
        </header>

        {deleteError && (
          <p className="sid-admin-alert sid-admin-alert-error" role="alert">
            {deleteError}
          </p>
        )}

        <MyLettersList
          letters={letters}
          loading={loading}
          filter={activeStatus}
          onFilterChange={changeFilter}
          onDetail={(item) => setSelectedSurat(toDetail(item))}
          onDelete={handleDelete}
          deletingId={deletingId}
          onCreate={() => navigate('/jenis-surat')}
          page={page}
          totalPages={meta.last_page}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
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
