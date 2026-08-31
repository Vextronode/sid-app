// ==========================================
// OperatorSuratActionModal.jsx
// Popup detail + aksi untuk Operator Desa.
// Styling dipindahkan ke sid-global.css.
// Logic dan API tidak diubah.
// ==========================================

import { useEffect, useState } from 'react';
import { PenTool, FileSignature, Eye } from 'lucide-react';
import {
previewSuratPDF,
generateSuratPDF,
} from '@/features/cetak-surat/utils/generateSuratPDF';
import { approveSurat } from "@/features/approval/api";

export default function OperatorSuratActionModal({ surat, onClose }) {
const [previewTemplate, setPreviewTemplate] = useState('wet');
const [previewUrl, setPreviewUrl] = useState(null);
const [confirmType, setConfirmType] = useState(null);
const [loading, setLoading] = useState(false);
const [revisionNotes, setRevisionNotes] = useState("");

useEffect(() => {
if (!surat) return;


let url = null;

setPreviewUrl(null);

previewSuratPDF(surat, previewTemplate)
  .then((blobUrl) => {
    url = blobUrl;
    setPreviewUrl(blobUrl);
  })
  .catch((error) => {
    console.error('Gagal preview PDF:', error);
    setPreviewUrl(null);
  });

return () => {
  if (url) {
    URL.revokeObjectURL(url);
  }
};


}, [surat, previewTemplate]);

if (!surat) return null;

// Aksi cetak cuma boleh dilakukan kalau surat sudah lolos RT & RW
const bisaCetak = surat.status === 'rw_approved';

const handleConfirmAction = async () => {
if (!confirmType) return;


setLoading(true);

try {
  if (confirmType === 'revision') {
    await approveSurat(
      "kasi",
      surat.id,
      "needs_revision",
      revisionNotes
    );

    onClose();
    return;
  }

  // 1. Approve surat
  await approveSurat(
    "kasi",
    surat.id,
    "approved"
  );

  // 2. Buka PDF
  const template =
    confirmType === 'digital'
      ? 'digital'
      : 'wet';

  await generateSuratPDF(surat, template);

  // 3. Tutup modal
  onClose();

} catch (err) {
  console.error("Gagal menyelesaikan surat:", err);

  alert(
    "Gagal memproses aksi.\n\n" +
    (err.response?.data?.message || err.message)
  );
} finally {
  setLoading(false);
  setConfirmType(null);
}


};

return (
<>
{/* ==========================================
DETAIL MODAL
========================================== */}


  <div className="operator-modal-overlay">
    <div className="operator-modal">

      <button
        onClick={onClose}
        className="operator-modal-close"
      >
        ✕
      </button>

      <h2 className="operator-modal-title">
        Detail Permohonan Surat
      </h2>

      <p className="operator-modal-subtitle">
        #{surat.letter_number ?? '-'} ·{" "}
        {surat.letter_type?.name ?? '-'}
      </p>

      {/* Catatan Warga */}
      {surat.notes && (
        <div className="operator-notes">
          <p className="operator-notes-label">
            Catatan Warga / Revisi
          </p>

          <p className="operator-notes-text">
            {surat.notes}
          </p>
        </div>
      )}

      {/* Toggle Preview */}
      <div className="operator-preview-toggle">
        <button
          onClick={() => setPreviewTemplate('wet')}
          className={`operator-preview-tab ${
            previewTemplate === 'wet'
              ? 'operator-preview-tab-active'
              : ''
          }`}
        >
          Preview
        </button>
      </div>

      {/* Preview PDF */}
      <div className="operator-pdf-preview">
        {previewUrl ? (
          <>
            <iframe
              src={
                previewUrl +
                '#toolbar=0&navpanes=0&scrollbar=0'
              }
              title="Preview Surat"
              className="operator-pdf-frame"
            />

            <div className="operator-pdf-overlay" />
          </>
        ) : (
          <div className="operator-pdf-loading">
            Memuat preview...
          </div>
        )}
      </div>

      {/* Status belum bisa cetak */}
      {!bisaCetak && (
        <div className="operator-warning">
          Surat ini belum bisa dicetak — menunggu
          persetujuan RT dan RW terlebih dahulu.
        </div>
      )}

      {/* Action */}
      <div className="operator-action-buttons">

        <button
          onClick={() => setConfirmType('revision')}
          disabled={!bisaCetak}
          className="operator-revision-button"
          title="Minta Revisi"
        >
          <FileSignature size={16} />
          Revisi
        </button>

        <button
          onClick={() => setConfirmType('basah')}
          disabled={!bisaCetak}
          className="operator-verify-button"
        >
          <PenTool size={16} />
          Verifikasi
        </button>

      </div>
    </div>
  </div>

  {/* ==========================================
      CONFIRMATION MODAL
      ========================================== */}

  {confirmType && (
    <div className="operator-confirm-overlay">
      <div className="operator-confirm-modal">

        <h3 className="operator-confirm-title">
          {confirmType === 'revision'
            ? 'Minta Revisi Surat'
            : 'Selesaikan Surat ?'}
        </h3>

        {confirmType === 'revision' ? (
          <div className="operator-revision-content">
            <p className="operator-confirm-description">
              Berikan catatan revisi untuk warga. Warga
              akan diminta untuk memperbaiki dan mengirim
              ulang permohonan.
            </p>

            <textarea
              value={revisionNotes}
              onChange={(e) =>
                setRevisionNotes(e.target.value)
              }
              placeholder="Contoh: Lampiran KTP kurang jelas..."
              className="operator-revision-textarea"
              rows={3}
            />
          </div>
        ) : (
          <p className="operator-confirm-description">
            Surat ini akan disetujui, diarsipkan dengan
            status <b>Selesai </b>dan file PDF akan
            diunduh secara otomatis.
          </p>
        )}

        <div className="operator-confirm-actions">

          <button
            onClick={() => setConfirmType(null)}
            disabled={loading}
            className="operator-cancel-button"
          >
            Batal
          </button>

          <button
            onClick={handleConfirmAction}
            disabled={loading}
            className="operator-confirm-button"
          >
            {loading
              ? 'Memproses...'
              : 'Ya, Selesaikan'}
          </button>

        </div>
      </div>
    </div>
  )}
</>


);
}
