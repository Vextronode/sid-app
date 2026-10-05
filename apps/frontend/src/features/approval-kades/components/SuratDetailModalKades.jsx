// ==========================================
// SuratDetailModalKades.jsx
// Popup detail surat Kades.
//
// Kades / Sekretaris Desa:
// - Melihat detail surat
// - Melihat riwayat keputusan
// - Dapat approve/reject melalui ApprovalStepRenderer
//
// Approval:
// - kepala_desa -> Kades
// - sekretaris_desa -> dinormalisasi menjadi kepala_desa
//
// Histori approval:
// - Dibaca dari surat.approvals
// - Kades = flow_step_id 2
//
// Styling mengikuti pola SuratDetailModalRT.
// ==========================================

import { Eye } from 'lucide-react'

import ApprovalStepper from '@/features/approval/components/ApprovalStepper'
import { getLatestApprovalForStep } from '@/features/approval/constants/statusFlow'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { previewSuratPDF } from '@/features/cetak-surat/utils/generateSuratPDF'
import { SURAT_STATUS } from '@/constants/suratStatus'

import ApprovalStepRenderer from '@/features/approval/components/ApprovalStepRenderer'
import { useSuratDetail } from '../hooks/useSuratDetailKades'

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
}

// ==========================================
// HELPER
// ==========================================

function getApproverName(approval) {
  return approval?.approved_by_user?.name ?? approval?.approved_by ?? '-'
}

function getApprovalNotes(approval) {
  return approval?.notes ?? 'Tidak ada catatan.'
}

// ==========================================
// COMPONENT
// ==========================================

export default function SuratDetailModalKades({ suratId, onClose }) {
  const { user } = useAuth()

  const { surat, notFound, refresh } = useSuratDetail(suratId)

  // ==========================================
  // CEK ID
  // ==========================================

  if (suratId === null) {
    return null
  }

  // ==========================================
  // APPROVER POSITION
  // ==========================================

  const isApplicantOfficial =
    surat &&
    (String(surat.submitted_by) === String(user?.id) ||
      (surat.citizen_id && String(surat.citizen_id) === String(user?.citizen_id)))
  const approverPosition =
    !isApplicantOfficial &&
    surat?.current_step?.approver_position === 'kepala_desa' &&
    (user?.role === 'kepala_desa' || user?.role === 'sekretaris_desa')
      ? 'kepala_desa'
      : null

  const currentUserRole = approverPosition

  // ==========================================
  // RIWAYAT KEPUTUSAN KADES
  //
  // letter_approvals:
  // flow_step_id 2 = Kades
  // ==========================================

  const keputusanKades = surat ? getLatestApprovalForStep(surat.approvals, 2) : null

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
  // APPROVE CALLBACK
  // ==========================================

  const handleApprove = async (response) => {
    if (response) {
      await refresh()
    }
  }

  // ==========================================
  // REJECT CALLBACK
  // ==========================================

  const handleReject = async (notes, response) => {
    if (notes || response) {
      await refresh()
    }

    onClose()
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
              {' · Kepala Desa'}
            </p>

            <ApprovalStepper surat={surat} />

            {/* ==================================
                STATUS
            ================================== */}

            <div className="mb-4">
              <StatusBadge status={surat.status} />
            </div>

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
                KEPUTUSAN KADES
            ================================== */}

            {keputusanKades && (
              <div
                className={`sid-decision-box ${
                  keputusanKades.action === 'rejected' ? 'rejected' : 'approved'
                }`}
              >
                <div className="sid-decision-header">
                  <p className="sid-decision-title">Keputusan Kepala Desa</p>

                  <span
                    className={`sid-decision-badge ${
                      keputusanKades.action === 'rejected' ? 'rejected' : 'approved'
                    }`}
                  >
                    {keputusanKades.action === 'rejected' ? 'DITOLAK' : 'DISETUJUI'}
                  </span>
                </div>

                <div className="sid-decision-meta">
                  diputuskan oleh <strong>{getApproverName(keputusanKades)}</strong>
                </div>

                {keputusanKades.action === 'rejected' && (
                  <>
                    <p className="sid-decision-comment-label">Komentar Penolakan</p>

                    <div className="sid-decision-comment rejected">
                      {getApprovalNotes(keputusanKades)}
                    </div>
                  </>
                )}

                {keputusanKades.action === 'approved' && (
                  <div className="sid-decision-comment approved">
                    {getApprovalNotes(keputusanKades)}
                  </div>
                )}
              </div>
            )}

            {/* ==================================
                APPROVAL ACTION
            ================================== */}

            {approverPosition &&
              (surat.status === SURAT_STATUS.PENDING ||
                surat.status === SURAT_STATUS.IN_PROGRESS) && (
                <div className="mb-4">
                  <ApprovalStepRenderer
                    approverPosition={approverPosition}
                    isFinal={false}
                    letterStatus={surat.status}
                    currentUserRole={currentUserRole}
                    apiRole="kepala_desa"
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

            {surat.status === SURAT_STATUS.APPROVED && (
              <button
                type="button"
                onClick={() => previewSuratPDF(surat)}
                className="sid-modal-preview"
              >
                <Eye size={16} />
                Lihat Dokumen (Preview)
              </button>
            )}

            {/* ==================================
                BUTTON KEMBALI
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
