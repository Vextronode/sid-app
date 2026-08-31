// ==========================================
// OperatorSuratPreviewModal.jsx
// Modal khusus untuk melihat preview surat.
//
// - Read Only
// - Preview PDF langsung di modal
// - Tidak ada download dari iframe
// - Tidak ada print dari iframe
// - Tombol "Cetak Surat" hanya aktif jika status
//   surat sudah kasi_approved
// ==========================================

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";

import {
  previewSuratPDF,
  generateSuratPDF,
} from "@/features/cetak-surat/utils/generateSuratPDF";

export default function OperatorSuratPreviewModal({
  surat,
  onClose,
}) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loadingPrint, setLoadingPrint] = useState(false);

  useEffect(() => {
    if (!surat) return;

    let url = null;

    setPreviewUrl(null);

    previewSuratPDF(surat)
      .then((blobUrl) => {
        url = blobUrl;
        setPreviewUrl(blobUrl);
      })
      .catch((error) => {
        console.error("Gagal preview PDF:", error);
        setPreviewUrl(null);
      });

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [surat]);

  if (!surat) return null;

  // ==========================================
  // HANYA KASI APPROVED YANG BOLEH CETAK
  // ==========================================

  const bisaCetak = surat.status === "kasi_approved";

  // ==========================================
  // CETAK SURAT
  // ==========================================

  const handleCetakSurat = async () => {
    if (!bisaCetak || loadingPrint) return;

    setLoadingPrint(true);

    try {
      await generateSuratPDF(surat);
    } catch (error) {
      console.error("Gagal mencetak surat:", error);

      alert(
        error.response?.data?.message ||
          error.message ||
          "Gagal membuka PDF surat."
      );
    } finally {
      setLoadingPrint(false);
    }
  };

  return (
    <>
      {/* MODAL */}

      <div className="sid-modal-overlay">

        <div className="sid-preview-modal">

          {/* CLOSE */}

          <button
            onClick={onClose}
            className="sid-modal-close"
            aria-label="Tutup"
          >
            ✕
          </button>

          {/* HEADER */}

          <div className="sid-modal-header">
            <h2>Detail Permohonan Surat</h2>

            <p>
              #{surat.letter_number ?? "-"} ·{" "}
              {surat.letter_type?.name ?? "-"}
            </p>
          </div>

          {/* CATATAN */}

          {surat.notes && (
            <div className="sid-modal-note">
              <p className="sid-modal-note-label">
                Catatan Warga / Revisi
              </p>

              <p className="sid-modal-note-text">
                {surat.notes}
              </p>
            </div>
          )}

          {/* PREVIEW PDF */}

          <div className="sid-pdf-preview">

            {previewUrl ? (
              <>
                <iframe
                  src={
                    previewUrl +
                    "#toolbar=0&navpanes=0&scrollbar=0"
                  }
                  title="Preview Surat"
                  className="sid-pdf-frame"
                />

                <div className="sid-pdf-overlay" />
              </>
            ) : (
              <div className="sid-pdf-loading">
                Memuat preview...
              </div>
            )}

          </div>

          {/* INFO JIKA BELUM KASI APPROVED */}

          {!bisaCetak && (
            <div className="sid-warning-box">
              Surat belum dapat dicetak. Menunggu persetujuan
              dari operator terlebih dahulu.
            </div>
          )}

          {/* TOMBOL CETAK */}

          <button
            onClick={handleCetakSurat}
            disabled={!bisaCetak || loadingPrint}
            className="sid-primary-button sid-print-button"
          >
            <Printer size={16} />

            {loadingPrint
              ? "Membuka PDF..."
              : "Cetak Surat"}
          </button>

        </div>

      </div>
    </>
  );
}