// ==========================================
// SuratDetailModalRT.jsx
// Popup detail surat RT
//
// RT:
// - Melihat detail surat
// - Melihat riwayat keputusan
// - Dapat approve/reject sebagai approver RT
//
// Aksi approval menggunakan:
// ApprovalStepRenderer
//
// Tidak bergantung pada flow_steps.
// Styling mengikuti SID Global Theme.
// ==========================================

import { Eye } from 'lucide-react'

import { useAuth } from '@/features/auth/contexts/AuthContext'
import { previewSuratPDF } from '@/features/cetak-surat/utils/generateSuratPDF'
import ApprovalStepper from '@/features/approval/components/ApprovalStepper'
import { getLatestApprovalForStep } from '@/features/approval/constants/statusFlow'
import { useSuratDetail } from '../hooks/useSuratDetail'
import ApprovalStepRenderer from '@/features/approval/components/ApprovalStepRenderer'

// ==========================================
// FIELD MAP
// ==========================================

const FIELD_MAP = {
  noSurat: (s) => s?.letter_number ?? '-',

  namaPemohon: (s) => s?.applicant_name ?? s?.citizen?.name ?? '-',

  nik: (s) => s?.applicant_nik ?? s?.citizen?.nik ?? '-',

  alamat: (s) => s?.applicant_address ?? s?.citizen?.address ?? '-',

  jenisSurat: (s) => s?.letter_type?.name ?? '-',

  keperluan: (s) => s?.purpose ?? '-',

  diajukan: (s) => (s?.submitted_at ? new Date(s.submitted_at).toLocaleString('id-ID') : '-'),

  terakhirDiproses: (s) => (s?.updated_at ? new Date(s.updated_at).toLocaleString('id-ID') : '-'),

  riwayat: (s) => s?.approvals ?? [],
}

// ==========================================
// COMPONENT
// ==========================================

export default function SuratDetailModalRT({
  suratId,
  onClose,
  onApprove,
  onReject,
  readOnly = false,
}) {
  const { user } = useAuth()

  const { surat, notFound } = useSuratDetail(suratId)

  // ==========================================
  // CEK ID
  // ==========================================

  if (suratId === null) {
    return null
  }

  // ==========================================
  // APPROVER POSITION
  // ==========================================

  const approverPosition = !readOnly && user?.role === 'rt' ? 'rt' : null

  // ==========================================
  // KEPUTUSAN RT
  // ==========================================

  const keputusanRT = surat ? getLatestApprovalForStep(surat.approvals, 1) : null

  // ==========================================
  // INFO SURAT
  // ==========================================

  const infoFields = surat
    ? [
        {
          label: 'Nama Pemohon',
          value: FIELD_MAP.namaPemohon(surat),
        },
        {
          label: 'NIK',
          value: FIELD_MAP.nik(surat),
        },
        {
          label: 'Alamat',
          value: FIELD_MAP.alamat(surat),
        },
        {
          label: 'Jenis Surat',
          value: FIELD_MAP.jenisSurat(surat),
        },
        {
          label: 'Keperluan',
          value: FIELD_MAP.keperluan(surat),
        },
        {
          label: 'Diajukan',
          value: FIELD_MAP.diajukan(surat),
        },
        {
          label: 'Terakhir diproses',
          value: FIELD_MAP.terakhirDiproses(surat),
        },
      ]
    : []

  // ==========================================
  // APPROVAL CALLBACK
  // ==========================================

  const handleApprove = async (response) => {
    if (onApprove) {
      await onApprove(response)
    }
  }

  const handleReject = async (notes, response) => {
    if (onReject) {
      await onReject(notes, response)
    }
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="sid-modal-overlay">
      <div className="sid-modal">
        {/* ======================================
            CLOSE
        ====================================== */}

        <button type="button" onClick={onClose} className="sid-modal-close" aria-label="Tutup">
          ✕
        </button>

        {/* ======================================
            NOT FOUND
        ====================================== */}

        {notFound ? (
          <p className="sid-modal-message">Surat tidak ditemukan.</p>
        ) : !surat ? (
          <p className="sid-modal-message">Memuat...</p>
        ) : (
          <>
            {/* ==================================
                HEADER
            ================================== */}

            <h2 className="sid-modal-title">Detail Permohonan Surat</h2>

            <p className="sid-modal-subtitle">
              #{FIELD_MAP.noSurat(surat)}
              {' · Surat masuk RT'}
            </p>
            <ApprovalStepper surat={surat} />

            {/* ==================================
                DETAIL SURAT
            ================================== */}

            <div className="sid-modal-info">
              {infoFields.map((field) => (
                <div key={field.label}>
                  <p className="sid-modal-info-label">{field.label}</p>

                  <p className="sid-modal-info-value">{field.value}</p>
                </div>
              ))}
            </div>

            {/* ==================================
                KEPUTUSAN RT
            ================================== */}

            {keputusanRT && (
              <div
                className={`sid-decision-box ${
                  keputusanRT.action === 'rejected' ? 'rejected' : 'approved'
                }`}
              >
                <div className="sid-decision-header">
                  <p className="sid-decision-title">Keputusan RT</p>

                  <span
                    className={`sid-decision-badge ${
                      keputusanRT.action === 'rejected' ? 'rejected' : 'approved'
                    }`}
                  >
                    {keputusanRT.action === 'rejected' ? 'Ditolak' : 'Disetujui'}
                  </span>
                </div>

                <div className="sid-decision-meta">
                  diputuskan oleh{' '}
                  <strong>
                    {keputusanRT.approved_by_user?.name ??
                      keputusanRT.approvedBy?.name ??
                      keputusanRT.actor_name ??
                      keputusanRT.decided_by ??
                      keputusanRT.approved_by ??
                      '-'}
                  </strong>
                </div>

                {/* ==================================
                    CATATAN PENOLAKAN
                ================================== */}

                {keputusanRT.action === 'rejected' && (
                  <>
                    <p className="sid-decision-comment-label">Komentar Penolakan</p>

                    <div className="sid-decision-comment rejected">
                      {keputusanRT.notes ??
                        keputusanRT.reason ??
                        surat.notes ??
                        'Tidak ada catatan.'}
                    </div>
                  </>
                )}

                {/* ==================================
                    CATATAN PERSETUJUAN
                ================================== */}

                {keputusanRT.action === 'approved' && (
                  <div className="sid-decision-comment approved">
                    {keputusanRT.notes ?? keputusanRT.reason ?? surat.notes ?? 'Tidak ada catatan.'}
                  </div>
                )}
              </div>
            )}

            {/* ==================================
                APPROVAL ACTION
            ================================== */}

            {approverPosition && (surat.status === 'pending' || surat.status === 'in_progress') && (
              <div className="mb-4">
                <ApprovalStepRenderer
                  approverPosition={approverPosition}
                  isFinal={false}
                  letterStatus={surat.status}
                  currentUserRole={user?.role}
                  apiRole="rt"
                  letterId={surat.id}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onClose={onClose}
                />
              </div>
            )}

            {/* ==================================
                PREVIEW
            ================================== */}

            <button
              type="button"
              onClick={() => previewSuratPDF(surat)}
              className="sid-modal-preview"
            >
              <Eye size={16} />
              Lihat Dokumen (Preview)
            </button>

            {/* ==================================
                KEMBALI
            ================================== */}

            <button type="button" onClick={onClose} className="sid-modal-action back">
              ✓ Kembali
            </button>
          </>
        )}
      </div>
    </div>
  )
}
