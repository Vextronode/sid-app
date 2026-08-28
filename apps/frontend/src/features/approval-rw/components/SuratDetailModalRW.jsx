// ==========================================
// SuratDetailModalRW.jsx
// Popup detail surat RW
//
// UI dibuat SAMA dengan SuratDetailModalRT
//
// RULE:
// - RW APPROVE  -> tidak mengubah notes sebelumnya
// - RW REJECT   -> notes diganti dengan alasan RW
// - RW memakai approveSurat(), bukan submitDecision()
// ==========================================

import { useState } from 'react';
import { Eye } from 'lucide-react';

import { useSuratDetail } from '../hooks/useSuratDetailRW';
import ApprovalStepperRW from './ApprovalStepperRW';

import { previewSuratPDF } from '@/features/cetak-surat/utils/generateSuratPDF';
import { approveSurat } from '@/features/approval/api';


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
  onApprove,
  onReject,
  readOnly = false,
}) {

  const {
    surat,
    notFound,
  } = useSuratDetail(suratId);

  const [showRejectBox, setShowRejectBox] = useState(false);
  const [alasan, setAlasan] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);


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
  // KEPUTUSAN RW
  // ==========================================

  const keputusanRW = surat
    ? FIELD_MAP
        .riwayat(surat)
        .find(
          (r) =>
            r.stage === 'rw' ||
            r.tahap === 'RW' ||
            r.approval_level === 'rw'
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
  // APPROVE RW
  // ==========================================

  const handleApprove = async () => {

    if (!suratId || isProcessing) {
      return;
    }

    try {

      setIsProcessing(true);

      console.log('RW APPROVE:', {
        suratId,
        status: 'approved',
        // Tidak mengirim notes baru.
        // Notes sebelumnya tetap dipertahankan.
      });


      // ========================================
      // APPROVE RW
      // ========================================

      const response = await approveSurat(
        'rw',
        suratId,
        'approved'
      );


      console.log(
        'RW APPROVE SUCCESS:',
        response.data
      );


      // Callback parent
      if (onApprove) {
        await onApprove(response);
      }


      // Tutup modal
      onClose();

    } catch (error) {

      console.error(
        'RW APPROVE ERROR:',
        error.response?.data ?? error
      );

      alert(
        error.response?.data?.message ??
        'Gagal menyetujui surat.'
      );

    } finally {

      setIsProcessing(false);

    }
  };


  // ==========================================
  // REJECT RW
  // ==========================================

  const handleSubmitReject = async () => {

    const notes = alasan.trim();

    if (!notes || !suratId || isProcessing) {
      return;
    }

    try {

      setIsProcessing(true);

      console.log('RW REJECT:', {
        suratId,
        status: 'rejected',
        notes,
      });


      // ========================================
      // REJECT RW
      // ========================================
      //
      // Notes dari textarea RW dikirim ke backend.
      // Backend mengganti notes surat dengan alasan RW.
      // ========================================

      const response = await approveSurat(
        'rw',
        suratId,
        'rejected',
        notes
      );


      console.log(
        'RW REJECT SUCCESS:',
        response.data
      );


      // Callback parent
      if (onReject) {
        await onReject(notes, response);
      }


      // Bersihkan
      setAlasan('');
      setShowRejectBox(false);


      // Tutup modal
      onClose();

    } catch (error) {

      console.error(
        'RW REJECT ERROR:',
        error.response?.data ?? error
      );

      alert(
        error.response?.data?.message ??
        'Gagal menolak surat.'
      );

    } finally {

      setIsProcessing(false);

    }
  };


  // ==========================================
  // CANCEL REJECT
  // ==========================================

  const handleCancelReject = () => {

    if (isProcessing) {
      return;
    }

    setShowRejectBox(false);
    setAlasan('');
  };


  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="sid-modal-overlay">

      <div className="sid-modal">

        {/* CLOSE */}
        <button
          onClick={onClose}
          disabled={isProcessing}
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


            {/* KEPUTUSAN RT */}
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


                {/* NOTES */}
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


            {/* KEPUTUSAN RW */}
            {keputusanRW && (

              <div
                className={`sid-decision-box ${
                  keputusanRW.status === 'rejected'
                    ? 'rejected'
                    : 'approved'
                }`}
              >

                <div className="sid-decision-header">

                  <p className="sid-decision-title">
                    Keputusan RW
                  </p>

                  <span
                    className={`sid-decision-badge ${
                      keputusanRW.status === 'rejected'
                        ? 'rejected'
                        : 'approved'
                    }`}
                  >
                    {keputusanRW.status === 'rejected'
                      ? 'RW_REJECTED'
                      : 'RW_APPROVED'}
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
                  IP{' '}
                  <strong>
                    {keputusanRW.ip_address ?? '-'}
                  </strong>
                </div>


                {/* NOTES */}
                {keputusanRW.status === 'rejected' && (

                  <>
                    <p className="sid-decision-comment-label">
                      Komentar Penolakan
                    </p>

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
                    {keputusanRW.notes ??
                      keputusanRW.reason ??
                      surat.notes ??
                      'Tidak ada catatan.'}
                  </div>

                )}

              </div>

            )}


            {/* REJECT FORM */}
            {!readOnly && showRejectBox && (

              <div className="sid-reject-form">

                <p className="sid-reject-label">
                  Tulis alasan penolakan
                </p>

                <textarea
                  value={alasan}
                  onChange={(e) =>
                    setAlasan(e.target.value)
                  }
                  rows={3}
                  placeholder="Contoh: Data NIK tidak sesuai dengan database desa."
                  className="sid-reject-textarea"
                  disabled={isProcessing}
                />


                <div className="sid-modal-actions">

                  <button
                    onClick={handleCancelReject}
                    disabled={isProcessing}
                    className="sid-modal-action cancel"
                  >
                    Batal
                  </button>

                  <button
                    onClick={handleSubmitReject}
                    disabled={
                      !alasan.trim() ||
                      isProcessing
                    }
                    className="sid-modal-action reject"
                  >
                    {isProcessing
                      ? 'Memproses...'
                      : 'Konfirmasi Tolak'}
                  </button>

                </div>

              </div>

            )}


            {/* PREVIEW */}
            {!readOnly && (

              <button
                onClick={() =>
                  previewSuratPDF(surat)
                }
                disabled={isProcessing}
                className="sid-modal-preview"
              >
                <Eye size={16} />
                Lihat Dokumen (Preview)
              </button>

            )}


            {/* BUTTON */}
            {readOnly ? (

              <button
                onClick={onClose}
                className="sid-modal-action back"
              >
                ✓ Kembali
              </button>

            ) : !showRejectBox ? (

              <div className="sid-modal-actions">

                <button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="sid-modal-action approve"
                >
                  {isProcessing
                    ? 'Memproses...'
                    : 'Setuju'}
                </button>


                <button
                  onClick={() =>
                    setShowRejectBox(true)
                  }
                  disabled={isProcessing}
                  className="sid-modal-action reject"
                >
                  Tolak
                </button>

              </div>

            ) : null}

          </>

        )}

      </div>

    </div>
  );
}