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
// Styling menggunakan SID Global Theme.
// ==========================================

import { Eye } from 'lucide-react'

import ApprovalStepper from '@/features/approval/components/ApprovalStepper'
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

  riwayat: (s) => s?.decisions ?? [],
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
  // RIWAYAT KEPUTUSAN
  // ==========================================

  const riwayat = surat ? FIELD_MAP.riwayat(surat) : []

  // ==========================================
  // KEPUTUSAN RT
  // ==========================================

  const keputusanRT = surat
    ? riwayat.find((r) => r.stage === 'rt' || r.tahap === 'RT' || r.approval_level === 'rt')
    : null

  // ==========================================
  // KEPUTUSAN KADES
  // ==========================================

  const keputusanKades = surat
    ? riwayat.find(
        (r) =>
          r.stage === 'kades' ||
          r.stage === 'kepala_desa' ||
          r.tahap === 'KADES' ||
          r.tahap === 'KEPALA DESA' ||
          r.approval_level === 'kades' ||
          r.approval_level === 'kepala_desa',
      )
    : null

  // ==========================================
  // KEPUTUSAN RW
  //
  // Dipertahankan untuk membaca histori lama
  // jika masih ada data approval RW.
  // ==========================================

  const keputusanRW = surat
    ? riwayat.find((r) => r.stage === 'rw' || r.tahap === 'RW' || r.approval_level === 'rw')
    : null

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
                  keputusanRT.status === 'rejected' ? 'rejected' : 'approved'
                }`}
              >
                <div className="sid-decision-header">
                  <p className="sid-decision-title">Keputusan RT</p>

                  <span
                    className={`sid-decision-badge ${
                      keputusanRT.status === 'rejected' ? 'rejected' : 'approved'
                    }`}
                  >
                    {keputusanRT.status === 'rejected' ? 'Ditolak' : 'Disetujui'}
                  </span>
                </div>

                <div className="sid-decision-meta">
                  diputuskan oleh{' '}
                  <strong>
                    {keputusanRT.actor_name ??
                      keputusanRT.decided_by ??
                      keputusanRT.approved_by_name ??
                      '-'}
                  </strong>
                </div>

                <div className="sid-decision-meta">
                  IP <strong>{keputusanRT.ip_address ?? '-'}</strong>
                </div>

                {keputusanRT.status === 'rejected' && (
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

                {keputusanRT.status === 'approved' && (
                  <div className="sid-decision-comment approved">
                    {keputusanRT.notes ?? keputusanRT.reason ?? surat.notes ?? 'Tidak ada catatan.'}
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
                  keputusanKades.status === 'rejected' ? 'rejected' : 'approved'
                }`}
              >
                <div className="sid-decision-header">
                  <p className="sid-decision-title">Keputusan Kepala Desa</p>

                  <span
                    className={`sid-decision-badge ${
                      keputusanKades.status === 'rejected' ? 'rejected' : 'approved'
                    }`}
                  >
                    {keputusanKades.status === 'rejected' ? 'Ditolak' : 'Disetujui'}
                  </span>
                </div>

                <div className="sid-decision-meta">
                  diputuskan oleh{' '}
                  <strong>
                    {keputusanKades.actor_name ??
                      keputusanKades.decided_by ??
                      keputusanKades.approved_by_name ??
                      '-'}
                  </strong>
                </div>

                <div className="sid-decision-meta">
                  IP <strong>{keputusanKades.ip_address ?? '-'}</strong>
                </div>

                {keputusanKades.status === 'rejected' && (
                  <>
                    <p className="sid-decision-comment-label">Komentar Penolakan</p>

                    <div className="sid-decision-comment rejected">
                      {keputusanKades.notes ??
                        keputusanKades.reason ??
                        surat.notes ??
                        'Tidak ada catatan.'}
                    </div>
                  </>
                )}

                {keputusanKades.status === 'approved' && (
                  <div className="sid-decision-comment approved">
                    {keputusanKades.notes ??
                      keputusanKades.reason ??
                      surat.notes ??
                      'Tidak ada catatan.'}
                  </div>
                )}
              </div>
            )}

            {/* ==================================
                KEPUTUSAN RW
                Histori lama jika tersedia
            ================================== */}

            {keputusanRW && (
              <div
                className={`sid-decision-box ${
                  keputusanRW.status === 'rejected' ? 'rejected' : 'approved'
                }`}
              >
                <div className="sid-decision-header">
                  <p className="sid-decision-title">Keputusan RW</p>

                  <span
                    className={`sid-decision-badge ${
                      keputusanRW.status === 'rejected' ? 'rejected' : 'approved'
                    }`}
                  >
                    {keputusanRW.status === 'rejected' ? 'Ditolak' : 'Disetujui'}
                  </span>
                </div>

                <div className="sid-decision-meta">
                  diputuskan oleh{' '}
                  <strong>
                    {keputusanRW.actor_name ??
                      keputusanRW.decided_by ??
                      keputusanRW.approved_by_name ??
                      '-'}
                  </strong>
                </div>

                <div className="sid-decision-meta">
                  IP <strong>{keputusanRW.ip_address ?? '-'}</strong>
                </div>

                {keputusanRW.status === 'rejected' && (
                  <>
                    <p className="sid-decision-comment-label">Komentar Penolakan</p>

                    <div className="sid-decision-comment rejected">
                      {keputusanRW.notes ??
                        keputusanRW.reason ??
                        surat.notes ??
                        'Tidak ada catatan.'}
                    </div>
                  </>
                )}

                {keputusanRW.status === 'approved' && (
                  <div className="sid-decision-comment approved">
                    {keputusanRW.notes ?? keputusanRW.reason ?? surat.notes ?? 'Tidak ada catatan.'}
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
