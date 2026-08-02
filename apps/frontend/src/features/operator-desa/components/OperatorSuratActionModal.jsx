// ==========================================
// OperatorSuratActionModal.jsx
// Popup detail + aksi untuk Operator Desa (Kasi/Kaur/Petugas Desa).
// Beda dari modal RT/RW: tombol aksinya "TTD Basah" (cetak langsung
// tanpa tanda tangan gambar) dan "TTD Digital" (cetak langsung dengan
// tanda tangan kades aktif yang tersimpan di database). KEDUA tombol disabled
// kalau surat belum rw_approved (belum lolos RT & RW).
// ==========================================

import { useEffect, useState } from 'react';
import { PenTool, FileSignature, Eye } from 'lucide-react';
import { previewSuratPDF, generateSuratPDF } from '@/features/cetak-surat/utils/generateSuratPDF';
import { approveSurat } from "@/features/approval/api";

export default function OperatorSuratActionModal({ surat, onClose }) {
  const [previewTemplate, setPreviewTemplate] = useState('wet');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [confirmType, setConfirmType] = useState(null); // 'basah' | 'digital' | null
  const [loading, setLoading] = useState(false);

  if (!surat) return null;

  useEffect(() => {
    let url;
    setPreviewUrl(null);

    previewSuratPDF(surat, previewTemplate)
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
  }, [surat, previewTemplate]);

  // Aksi cetak cuma boleh dilakukan kalau surat sudah lolos RT & RW
  const bisaCetak = surat.status === 'rw_approved';

  const handleConfirmAction = async () => {
    if (!confirmType) return;
    setLoading(true);
    try {
      await approveSurat(
        "kasi",
        surat.id,
        "approved"
      );

      generateSuratPDF(surat, confirmType === 'digital' ? 'digital' : 'wet');
      onClose();
    } catch (err) {
      console.error(err);
      alert("Gagal menyelesaikan surat");
    } finally {
      setLoading(false);
      setConfirmType(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl">✕</button>

          <h2 className="font-bold text-gray-800 text-lg">Detail Permohonan Surat</h2>
          <p className="text-xs text-gray-400 mb-4">#{surat.letter_number ?? '-'} · {surat.letter_type?.name ?? '-'}</p>

          {/* Toggle Tipe Preview */}
          <div className="flex gap-2 mb-3 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setPreviewTemplate('wet')}
              className={`flex-1 text-center py-1 text-xs font-medium rounded-md transition ${
                previewTemplate === 'wet' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Preview TTD Basah
            </button>
            <button
              onClick={() => setPreviewTemplate('digital')}
              className={`flex-1 text-center py-1 text-xs font-medium rounded-md transition ${
                previewTemplate === 'digital' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Preview TTD Digital
            </button>
          </div>

          <div className="relative border rounded-lg overflow-hidden mb-5 h-[400px] bg-gray-100">
            {previewUrl ? (
              <>
                <iframe
                  src={previewUrl + '#toolbar=0&navpanes=0&scrollbar=0'}
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

          {!bisaCetak && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs rounded-lg p-3 mb-4">
              Surat ini belum bisa dicetak — menunggu persetujuan RT dan RW terlebih dahulu.
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setConfirmType('basah')}
              disabled={!bisaCetak}
              className="flex-1 flex items-center justify-center gap-2
                border border-gray-300
                rounded-lg
                py-2.5
                text-sm
                hover:bg-gray-50
                disabled:opacity-40"
            >
              <PenTool size={16}/>
              TTD Basah
            </button>

            <button
              onClick={() => setConfirmType('digital')}
              disabled={!bisaCetak}
              className="flex-1 flex items-center justify-center gap-2
                bg-green-600 text-white
                rounded-lg
                py-2.5
                text-sm font-medium
                hover:bg-green-700
                disabled:opacity-40"
            >
              <FileSignature size={16}/>
              TTD Digital
            </button>
          </div>
        </div>
      </div>

      {confirmType && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-[400px] p-6 shadow-xl">
            <h3 className="font-bold text-lg mb-2">
              Selesaikan Surat ({confirmType === 'digital' ? 'TTD Digital' : 'TTD Basah'})?
            </h3>

            <p className="text-sm text-gray-500 mb-6">
              Surat ini akan disetujui, diarsipkan dengan status <b>Selesai (kasi_approved)</b>, dan file PDF akan diunduh secara otomatis.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmType(null)}
                disabled={loading}
                className="border rounded-lg px-4 py-2 hover:bg-gray-50"
              >
                Batal
              </button>

              <button
                onClick={handleConfirmAction}
                disabled={loading}
                className="bg-green-600 text-white rounded-lg px-4 py-2 hover:bg-green-700 flex items-center gap-1.5"
              >
                {loading ? 'Memproses...' : 'Ya, Selesaikan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}