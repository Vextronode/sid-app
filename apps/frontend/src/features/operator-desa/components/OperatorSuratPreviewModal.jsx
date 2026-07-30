// ==========================================
// OperatorSuratPreviewModal.jsx
// Modal khusus untuk melihat preview surat.
// - Read Only
// - Tidak ada download
// - Tidak ada print
// - Tidak ada TTD
// - Preview PDF tidak bisa diinteraksi
// ==========================================

import { useEffect, useState } from "react";
import { previewSuratPDF } from "@/features/cetak-surat/utils/generateSuratPDF";

export default function OperatorSuratPreviewModal({
  surat,
  onClose,
}) {
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!surat) return;

    let url;

    previewSuratPDF(surat)
      .then((blobUrl) => {
        url = blobUrl;
        setPreviewUrl(blobUrl);
      })
      .catch(console.error);

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [surat]);

  if (!surat) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">

        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 w-full max-w-md relative max-h-[90vh] overflow-y-auto">

          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>

          <h2 className="font-bold text-gray-800 text-lg">
            Detail Permohonan Surat
          </h2>

          <p className="text-xs text-gray-400 mb-5">
            #{surat.letter_number ?? "-"} ·{" "}
            {surat.letter_type?.name ?? "-"}
          </p>

          <div className="relative border rounded-lg overflow-hidden mb-5 h-[500px] bg-gray-100">

            {previewUrl ? (
              <>
                <iframe
                  src={
                    previewUrl +
                    "#toolbar=0&navpanes=0&scrollbar=0"
                  }
                  title="Preview Surat"
                  className="w-full h-full pointer-events-none select-none"
                />

                {/* Overlay supaya benar-benar tidak bisa diklik */}
                <div className="absolute inset-0 bg-transparent" />
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Memuat preview...
              </div>
            )}

          </div>

          <button
            onClick={onClose}
            className="w-full border border-gray-300 rounded-lg py-2.5 text-sm hover:bg-gray-50"
          >
            Tutup
          </button>

        </div>

      </div>
    </>
  );
}