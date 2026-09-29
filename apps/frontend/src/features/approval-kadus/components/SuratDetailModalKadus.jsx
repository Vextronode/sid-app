// ==========================================
// SuratDetailModalKadus.jsx
// Popup detail surat Kadus
//
// STATUS:
// - Kadus tidak memiliki kewenangan approve/reject.
// - Modal Kadus hanya digunakan untuk monitoring.
// - ApprovalStepper digunakan untuk progress workflow.
//
// Workflow monitoring:
// Pengajuan -> RT -> Kades -> Selesai
//
// Histori approval:
// - Dibaca dari surat.approvals
// - RT    = flow_step_id 1
// - Kades = flow_step_id 2
//
// Styling menggunakan SID Global Theme.
// ==========================================

import { Eye } from 'lucide-react'

import ApprovalStepper from '@/features/approval/components/ApprovalStepper'
import { getLatestApprovalForStep } from '@/features/approval/constants/statusFlow'
import { previewSuratPDF } from '@/features/cetak-surat/utils/generateSuratPDF'

import { useSuratDetailKadus } from '../hooks/useSuratDetailKadus'

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

export default function SuratDetailModalKadus({ suratId, onClose }) {
  const { surat, notFound } = useSuratDetailKadus(suratId)

  // ==========================================
  // CEK ID
  // ==========================================

  if (suratId === null) {
    return null
  }

  // ==========================================
  // RIWAYAT APPROVAL
  //
  // letter_approvals:
  // flow_step_id 1 = RT
  // flow_step_id 2 = Kades
  // ==========================================

  const keputusanRT = surat ? getLatestApprovalForStep(surat.approvals, 1) : null

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
              {' · Surat warga'}
            </p>

            {/* ==================================
                TRACKER
            ================================== */}

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
                  diputuskan oleh <strong>{getApproverName(keputusanRT)}</strong>
                </div>

                {keputusanRT.action === 'rejected' && (
                  <>
                    <p className="sid-decision-comment-label">Komentar Penolakan</p>

                    <div className="sid-decision-comment rejected">
                      {getApprovalNotes(keputusanRT)}
                    </div>
                  </>
                )}

                {keputusanRT.action === 'approved' && (
                  <div className="sid-decision-comment approved">
                    {getApprovalNotes(keputusanRT)}
                  </div>
                )}
              </div>
            )}

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
                    {keputusanKades.action === 'rejected' ? 'Ditolak' : 'Disetujui'}
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
