// ==========================================
// OperatorSuratPreviewModal.jsx
// Modal khusus untuk melihat preview surat.
//
// - Read Only
// - Preview PDF langsung di modal
// - Tidak ada download dari iframe
// - Tidak ada print dari iframe
// - Tombol "Cetak Surat" hanya aktif jika status
// ==========================================

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

import { getSuratDetail } from '@/lib/api'
import { previewSuratPDF, generateSuratPDF } from '@/features/cetak-surat/utils/generateSuratPDF'
import { SURAT_STATUS } from '@/constants/suratStatus'
import { OverdueBadge } from '@/components/ui/OverdueBadge'

function formatApprovalLevel(level) {
  const labels = {
    rt: 'RT',
    kepala_desa: 'Kepala Desa',
    sekdes: 'Sekretaris Desa',
    sekretaris_desa: 'Sekretaris Desa',
  }

  return labels[level] ?? String(level ?? '').replace(/_/g, ' ')
}

function getApprovalActor(approval) {
  return approval?.approver_name ?? approval?.approved_by_user?.name ?? approval?.actor_name ?? '-'
}

export default function OperatorSuratPreviewModal({ surat: listedSurat, onClose }) {
  const [surat, setSurat] = useState(null)
  const [detailLoading, setDetailLoading] = useState(true)
  const [detailError, setDetailError] = useState('')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewError, setPreviewError] = useState('')
  const [loadingDownload, setLoadingDownload] = useState(false)

  useEffect(() => {
    if (!listedSurat?.id) return

    let isMounted = true

    const loadDetail = async () => {
      try {
        setDetailLoading(true)
        setDetailError('')
        setSurat(null)
        setPreviewUrl(null)
        const response = await getSuratDetail(listedSurat.id)
        const detail = response.data?.data
        if (!detail) {
          throw new Error('Respons detail surat tidak berisi data.')
        }
        if (isMounted) setSurat(detail)
      } catch (error) {
        if (isMounted) {
          console.error('Gagal mengambil detail surat operator:', error.response?.data ?? error)
          setDetailError(error.response?.data?.message ?? 'Gagal mengambil detail surat.')
        }
      } finally {
        if (isMounted) setDetailLoading(false)
      }
    }

    loadDetail()

    return () => {
      isMounted = false
    }
  }, [listedSurat?.id])

  useEffect(() => {
    if (!surat || surat.status !== SURAT_STATUS.APPROVED) {
      return
    }

    let url = null
    let isMounted = true

    const loadPreview = async () => {
      try {
        setPreviewError('')
        const blobUrl = await previewSuratPDF(surat)
        url = blobUrl
        if (isMounted) setPreviewUrl(blobUrl)
      } catch (error) {
        if (isMounted) {
          console.error('Gagal preview PDF:', error.response?.data ?? error)
          setPreviewError(error.response?.data?.message ?? error.message ?? 'Gagal memuat preview.')
          setPreviewUrl(null)
        }
      }
    }

    loadPreview()

    return () => {
      isMounted = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [surat])

  const canDownload = surat?.status === SURAT_STATUS.APPROVED

  const handleDownload = async () => {
    if (!canDownload || loadingDownload) return

    setLoadingDownload(true)

    try {
      await generateSuratPDF(surat)
    } catch (error) {
      console.error('Gagal mengunduh surat:', error.response?.data ?? error)
      alert(error.response?.data?.message ?? error.message ?? 'Gagal mengunduh surat.')
    } finally {
      setLoadingDownload(false)
    }
  }

  const approvals = [...(surat?.approvals ?? [])].sort(
    (first, second) =>
      new Date(first?.created_at ?? 0).getTime() - new Date(second?.created_at ?? 0).getTime(),
  )

  return (
    <>
      {/* MODAL */}

      <div className="sid-modal-overlay">
        <div className="sid-preview-modal">
          {/* CLOSE */}

          <button onClick={onClose} className="sid-modal-close" aria-label="Tutup">
            ✕
          </button>

          {/* HEADER */}

          <div className="sid-modal-header">
            <h2>Detail Permohonan Surat</h2>

            <p>
              #{surat?.letter_number ?? listedSurat?.letter_number ?? '-'} ·{' '}
              {surat?.letter_type?.name ?? listedSurat?.letter_type?.name ?? '-'}
            </p>
          </div>

          {detailLoading && <p className="sid-pdf-loading">Memuat detail surat...</p>}

          {detailError && (
            <p role="alert" className="sid-warning-box">
              {detailError}
            </p>
          )}

          {surat && (
            <>
              {surat.is_overdue === true && (
                <div className="mb-3">
                  <OverdueBadge isOverdue={surat.is_overdue} />
                </div>
              )}

              <div className="sid-modal-note">
                <p className="sid-modal-note-label">Status</p>
                <p className="sid-modal-note-text">{surat.status}</p>
              </div>

              {surat.notes && (
                <div className="sid-modal-note">
                  <p className="sid-modal-note-label">Catatan Warga / Revisi</p>
                  <p className="sid-modal-note-text">{surat.notes}</p>
                </div>
              )}

              <section className="sid-modal-note">
                <p className="sid-modal-note-label">Riwayat Persetujuan</p>
                {approvals.length ? (
                  <ol className="sid-modal-note-text">
                    {approvals.map((approval) => (
                      <li key={approval.id}>
                        {formatApprovalLevel(approval.approval_level)} —{' '}
                        {approval.action === 'approved' ? 'Disetujui' : 'Ditolak'} oleh{' '}
                        {getApprovalActor(approval)}
                        {approval.created_at &&
                          ` · ${new Date(approval.created_at).toLocaleString('id-ID')}`}
                        {approval.notes && ` — ${approval.notes}`}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="sid-modal-note-text">Belum ada keputusan.</p>
                )}
              </section>

              {canDownload && (
                <>
                  <div className="sid-pdf-preview">
                    {previewUrl ? (
                      <>
                        <iframe
                          src={previewUrl + '#toolbar=0&navpanes=0&scrollbar=0'}
                          title="Preview Surat"
                          className="sid-pdf-frame"
                        />

                        <div className="sid-pdf-overlay" />
                      </>
                    ) : previewError ? (
                      <p role="alert" className="sid-warning-box">
                        {previewError}
                      </p>
                    ) : (
                      <div className="sid-pdf-loading">Memuat preview...</div>
                    )}
                  </div>

                  <button
                    onClick={handleDownload}
                    disabled={loadingDownload}
                    className="sid-primary-button sid-print-button"
                  >
                    <Download size={16} />
                    {loadingDownload ? 'Mengunduh PDF...' : 'Unduh Surat'}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
