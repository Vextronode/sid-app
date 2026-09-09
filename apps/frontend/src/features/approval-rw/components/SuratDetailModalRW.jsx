// ==========================================
// SuratDetailModalRW.jsx
// Popup detail surat RW
//
// STATUS:
// - RW TIDAK memiliki kewenangan approve/reject.
// - Modal RW hanya digunakan untuk melihat detail.
// - Tidak ada pemanggilan endpoint keputusan RW.
// - Workflow:
//   Submit -> RT -> Selesai
// ==========================================

import { Eye } from 'lucide-react';

import { useSuratDetail } from '../hooks/useSuratDetailRW';
import ApprovalStepperRW from './ApprovalStepperRW';

import { previewSuratPDF } from '@/features/cetak-surat/utils/generateSuratPDF';

// ==========================================
// FIELD MAP
// ==========================================

const FIELD_MAP = {
  noSurat: (s) =>
    s.letter_number ?? '-',

  namaPemohon: (s) =>
    s.applicant_name ?? '-',

  nik: (s) =>
    s.applicant_nik ?? '-',

  alamat: (s) =>
    s.applicant_address ?? '-',

  jenisSurat: (s) =>
    s.letter_type?.name ?? '-',

  keperluan: (s) =>
    s.purpose ?? '-',

  diajukan: (s) =>
    s.submitted_at
      ? new Date(s.submitted_at).toLocaleString('id-ID')
      : '-',

  terakhirDiproses: (s) =>
    s.updated_at
      ? new Date(s.updated_at).toLocaleString('id-ID')
      : '-',

  ipAktor: (s) =>
    s.ip_address ?? '-',

  riwayat: (s) =>
    s.decisions ?? [],
};

// ==========================================
// COMPONENT
// ==========================================

export default function SuratDetailModalRW({
  suratId,
  onClose,
}) {
  const {
    surat,
    notFound,
  } = useSuratDetail(suratId);

  // ==========================================
  // CEK ID
  // ==========================================

  if (suratId === null) {
    return null;
  }

  // ==========================================
  // KEPUTUSAN RT
  // ==========================================

  const keputusanRT = surat
    ? FIELD_MAP
        .riwayat(surat)
        .find(
          (r) =>
            r.stage === 'rt' ||
            r.tahap === 'RT' ||
            r.approval_level === 'rt'
        )
    : null;

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
    : [];

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="sid-modal-overlay">

      <div className="sid-modal">

        {/* CLOSE */}
        <button
          onClick={onClose}
          className="sid-modal-close"
        >
          ✕
        </button>

        {/* NOT FOUND */}
        {notFound ? (

          <p className="sid-modal-message">
            Surat tidak ditemukan.
          </p>

        ) : !surat ? (

          <p className="sid-modal-message">
            Memuat...
          </p>

        ) : (

          <>

            {/* HEADER */}
            <h2 className="sid-modal-title">
              Detail Permohonan Surat
            </h2>

            <p className="sid-modal-subtitle">
              #{FIELD_MAP.noSurat(surat)} · Surat saya
            </p>

            {/* STEPPER */}
            <ApprovalStepperRW surat={surat} />

            {/* DETAIL SURAT */}
            <div className="sid-modal-info">

              {infoFields.map((field) => (

                <div key={field.label}>

                  <p className="sid-modal-info-label">
                    {field.label}
                  </p>

                  <p className="sid-modal-info-value">
                    {field.value}
                  </p>

                </div>

              ))}

            </div>

            {/* ======================================
                KEPUTUSAN RT
                ====================================== */}

            {keputusanRT && (

              <div
                className={`sid-decision-box ${
                  keputusanRT.status === 'rejected'
                    ? 'rejected'
                    : 'approved'
                }`}
              >

                <div className="sid-decision-header">

                  <p className="sid-decision-title">
                    Keputusan RT
                  </p>

                  <span
                    className={`sid-decision-badge ${
                      keputusanRT.status === 'rejected'
                        ? 'rejected'
                        : 'approved'
                    }`}
                  >
                    {keputusanRT.status === 'rejected'
                      ? 'RT_REJECTED'
                      : 'RT_APPROVED'}
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
                  IP{' '}
                  <strong>
                    {keputusanRT.ip_address ?? '-'}
                  </strong>
                </div>

                {/* CATATAN PENOLAKAN */}
                {keputusanRT.status === 'rejected' && (

                  <>
                    <p className="sid-decision-comment-label">
                      Komentar Penolakan
                    </p>

                    <div className="sid-decision-comment rejected">
                      {keputusanRT.notes ??
                        keputusanRT.reason ??
                        surat.notes ??
                        'Tidak ada catatan.'}
                    </div>
                  </>

                )}

                {/* CATATAN PERSETUJUAN */}
                {keputusanRT.status === 'approved' && (

                  <div className="sid-decision-comment approved">
                    {keputusanRT.notes ??
                      keputusanRT.reason ??
                      surat.notes ??
                      'Tidak ada catatan.'}
                  </div>

                )}

              </div>

            )}

            {/* ======================================
                PREVIEW
                ====================================== */}

            <button
              onClick={() =>
                previewSuratPDF(surat)
              }
              className="sid-modal-preview"
            >
              <Eye size={16} />
              Lihat Dokumen (Preview)
            </button>

            {/* ======================================
                CLOSE
                ====================================== */}

            <button
              onClick={onClose}
              className="sid-modal-action back"
            >
              ✓ Kembali
            </button>

          </>

        )}

      </div>

    </div>
  );
}