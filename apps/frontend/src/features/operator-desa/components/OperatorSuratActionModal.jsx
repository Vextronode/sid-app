// ==========================================
// OperatorSuratActionModal.jsx
// Popup detail + aksi untuk Operator Desa (Kasi/Kaur/Petugas Desa).
// Beda dari modal RT/RW: tombol aksinya "TTD Basah" (cetak langsung
// tanpa tanda tangan gambar) dan "TTD Digital" (buka canvas ttd dulu,
// baru cetak dengan tanda tangan tertempel). KEDUA tombol disabled
// kalau surat belum rw_approved (belum lolos RT & RW).
// ==========================================

import { useState } from 'react';
import { PenTool, FileSignature, Eye } from 'lucide-react';
import { previewSuratPDF, generateSuratPDF, generateSuratPDFWithSignature } from '@/features/cetak-surat/utils/generateSuratPDF';
import TtdDigitalModal from './TtdDigitalModal';

const INFO_FIELDS = [
  { key: 'applicant_name', label: 'Nama Pemohon' },
  { key: 'applicant_nik', label: 'NIK' },
  { key: 'applicant_address', label: 'Alamat' },
  { key: 'purpose', label: 'Keperluan' },
];

export default function OperatorSuratActionModal({ surat, onClose }) {
  const [ttdModalOpen, setTtdModalOpen] = useState(false);

  if (!surat) return null;

  // Aksi cetak cuma boleh dilakukan kalau surat sudah lolos RT & RW
  const bisaCetak = surat.status === 'rw_approved';

  const handleTtdBasah = () => {
    if (!bisaCetak) return;
    generateSuratPDF(surat);
  };

  const handleSaveTtdDigital = (signatureDataUrl) => {
    generateSuratPDFWithSignature(surat, signatureDataUrl);
    setTtdModalOpen(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl">✕</button>

          <h2 className="font-bold text-gray-800 text-lg">Detail Permohonan Surat</h2>
          <p className="text-xs text-gray-400 mb-5">#{surat.letter_number ?? '-'} · {surat.letter_type?.name ?? '-'}</p>

          <div className="flex flex-col gap-4 mb-5">
            {INFO_FIELDS.map((f) => (
              <div key={f.key}>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{f.label}</p>
                <p className="text-sm font-semibold text-gray-800">{surat[f.key] ?? '-'}</p>
              </div>
            ))}
          </div>

          {!bisaCetak && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs rounded-lg p-3 mb-4">
              Surat ini belum bisa dicetak — menunggu persetujuan RT dan RW terlebih dahulu.
            </div>
          )}

          <button
            onClick={() => previewSuratPDF(surat)}
            className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-600 rounded-lg py-2.5 text-sm mb-3 hover:bg-gray-50"
          >
            <Eye size={16} /> Lihat Dokumen (Preview)
          </button>

          <div className="flex gap-3">
            <button
              onClick={handleTtdBasah}
              disabled={!bisaCetak}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-800 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <PenTool size={16} /> TTD Basah
            </button>
            <button
              onClick={() => bisaCetak && setTtdModalOpen(true)}
              disabled={!bisaCetak}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-green-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <FileSignature size={16} /> TTD Digital
            </button>
          </div>
        </div>
      </div>

      <TtdDigitalModal open={ttdModalOpen} onClose={() => setTtdModalOpen(false)} onSave={handleSaveTtdDigital} />
    </>
  );
}