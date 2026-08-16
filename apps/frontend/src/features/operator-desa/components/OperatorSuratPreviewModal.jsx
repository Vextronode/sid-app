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
      // Membuka PDF di halaman/tab baru
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
      {/* ==========================================
          MODAL
      ========================================== */}

      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">

        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 w-full max-w-md relative max-h-[90vh] overflow-y-auto">

          {/* CLOSE */}
          <button
            onClick={onClose}
            className="
              absolute
              top-4
              right-4
              text-gray-400
              hover:text-gray-600
              text-xl
            "
          >
            ✕
          </button>

          {/* ==========================================
              TITLE
          ========================================== */}

          <h2 className="font-bold text-gray-800 text-lg">
            Detail Permohonan Surat
          </h2>

          <p className="text-xs text-gray-400 mb-5">
            #{surat.letter_number ?? "-"} ·{" "}
            {surat.letter_type?.name ?? "-"}
          </p>

          {/* ==========================================
              CATATAN
          ========================================== */}

          {surat.notes && (
            <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-lg">

              <p className="text-[10px] font-semibold text-blue-800 uppercase mb-1">
                Catatan Warga / Revisi
              </p>

              <p className="text-sm text-blue-900">
                {surat.notes}
              </p>

            </div>
          )}

          {/* ==========================================
              PREVIEW PDF
          ========================================== */}

          <div className="relative border rounded-lg overflow-hidden mb-5 h-[500px] bg-gray-100">

            {previewUrl ? (
              <>
                <iframe
                  src={
                    previewUrl +
                    "#toolbar=0&navpanes=0&scrollbar=0"
                  }
                  title="Preview Surat"
                  className="
                    w-full
                    h-full
                    pointer-events-none
                    select-none
                  "
                />

                {/* Overlay supaya iframe benar-benar tidak bisa diklik */}
                <div className="absolute inset-0 bg-transparent" />
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Memuat preview...
              </div>
            )}

          </div>

          {/* ==========================================
              INFO JIKA BELUM KASI APPROVED
          ========================================== */}

          {!bisaCetak && (
            <div className="
              bg-yellow-50
              border
              border-yellow-200
              text-yellow-700
              text-xs
              rounded-lg
              p-3
              mb-4
            ">
              Surat belum dapat dicetak. Menunggu persetujuan
              dari Kasi terlebih dahulu.
            </div>
          )}

          {/* ==========================================
              TOMBOL CETAK
          ========================================== */}

          <button
            onClick={handleCetakSurat}
            disabled={!bisaCetak || loadingPrint}
            className="
              w-full
              flex
              items-center
              justify-center
              gap-2
              bg-[#185FA5]
              text-white
              rounded-lg
              py-2.5
              text-sm
              font-medium
              hover:bg-[#124A82]
              disabled:opacity-40
              disabled:cursor-not-allowed
            "
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