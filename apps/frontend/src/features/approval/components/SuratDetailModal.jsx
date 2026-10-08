import { Eye } from 'lucide-react'

import ApprovalStepper from '@/features/approval/components/ApprovalStepper'
import ApprovalStepRenderer from '@/features/approval/components/ApprovalStepRenderer'
import { getLatestApprovalForLevel } from '@/features/approval/constants/statusFlow'
import { previewSuratPDF } from '@/features/cetak-surat/utils/generateSuratPDF'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { OverdueBadge } from '@/components/ui/OverdueBadge'

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

function getApproverName(approval) {
  return (
    approval?.approved_by_user?.name ??
    approval?.approvedBy?.name ??
    approval?.approver_name ??
    approval?.actor_name ??
    approval?.decided_by ??
    '-'
  )
}

function getApproverRole(approval) {
  const roleLabels = {
    kepala_desa: 'Kepala Desa',
    sekdes: 'Sekretaris Desa',
    sekretaris_desa: 'Sekretaris Desa',
    rt: 'RT',
  }

  return roleLabels[approval?.approval_level] ?? null
}

function getApprovalNotes(approval, surat) {
  return approval?.notes ?? approval?.reason ?? surat?.notes ?? 'Tidak ada catatan.'
}

function DecisionBox({ approval, title, surat }) {
  if (!approval) {
    return null
  }

  const isRejected = approval.action === 'rejected'
  const approverRole = getApproverRole(approval)

  return (
    <div className={`sid-decision-box ${isRejected ? 'rejected' : 'approved'}`}>
      <div className="sid-decision-header">
        <p className="sid-decision-title">{title}</p>

        <span className={`sid-decision-badge ${isRejected ? 'rejected' : 'approved'}`}>
          {isRejected ? 'Ditolak' : 'Disetujui'}
        </span>
      </div>

      <div className="sid-decision-meta">
        diputuskan oleh <strong>{getApproverName(approval)}</strong>
        {approverRole && <> ({approverRole})</>}
      </div>

      {isRejected && <p className="sid-decision-comment-label">Komentar Penolakan</p>}

      <div className={`sid-decision-comment ${isRejected ? 'rejected' : 'approved'}`}>
        {getApprovalNotes(approval, surat)}
      </div>
    </div>
  )
}

export default function SuratDetailModal({
  suratId,
  onClose,
  surat,
  notFound,
  subtitle,
  decisionLevels = [],
  showStatus = false,
  currentUserRole = null,
  apiRole = null,
  onApprove,
  onReject,
  onConflict,
  closeOnDecision = true,
  showPreview = true,
  previewWhen = null,
}) {
  if (suratId === null) {
    return null
  }

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

  const decisions = surat
    ? decisionLevels
        .map((decision) => ({
          ...decision,
          approval: getLatestApprovalForLevel(surat.approvals, decision.levels),
        }))
        .filter((decision) => decision.approval)
    : []

  const canPreview = showPreview && surat && (!previewWhen || surat.status === previewWhen)

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

  return (
    <div className="sid-modal-overlay">
      <div className="sid-modal">
        <button type="button" onClick={onClose} className="sid-modal-close" aria-label="Tutup">
          ✕
        </button>

        {notFound ? (
          <p className="sid-modal-message">Surat tidak ditemukan.</p>
        ) : !surat ? (
          <p className="sid-modal-message">Memuat...</p>
        ) : (
          <>
            <h2 className="sid-modal-title">Detail Permohonan Surat</h2>

            <p className="sid-modal-subtitle">
              #{FIELD_MAP.noSurat(surat)}
              {' · '}
              {subtitle}
            </p>

            <ApprovalStepper surat={surat} />

            {(showStatus || surat.is_overdue === true) && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {showStatus && <StatusBadge status={surat.status} />}
                <OverdueBadge isOverdue={surat.is_overdue} />
              </div>
            )}

            <div className="sid-modal-info">
              {infoFields.map((field) => (
                <div key={field.label}>
                  <p className="sid-modal-info-label">{field.label}</p>

                  <p className="sid-modal-info-value">{field.value}</p>
                </div>
              ))}
            </div>

            {decisions.map((decision) => (
              <DecisionBox
                key={decision.title}
                approval={decision.approval}
                title={decision.title}
                surat={surat}
              />
            ))}

            {apiRole && surat && (
              <div className="mb-4">
                <ApprovalStepRenderer
                  currentStep={surat.current_step}
                  approvals={surat.approvals}
                  letterStatus={surat.status}
                  currentUserRole={currentUserRole}
                  apiRole={apiRole}
                  letterId={surat.id}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onConflict={onConflict}
                  onClose={onClose}
                  closeOnDecision={closeOnDecision}
                />
              </div>
            )}

            {canPreview && (
              <button
                type="button"
                onClick={() => previewSuratPDF(surat)}
                className="sid-modal-preview"
              >
                <Eye size={16} />
                Lihat Dokumen (Preview)
              </button>
            )}

            <button type="button" onClick={onClose} className="sid-modal-action back">
              ✓ Kembali
            </button>
          </>
        )}
      </div>
    </div>
  )
}
