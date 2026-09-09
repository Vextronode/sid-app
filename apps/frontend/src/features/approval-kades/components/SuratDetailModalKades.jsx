// ==========================================
// SuratDetailModalKades.jsx
// Popup monitoring-only: stepper + info + SEMUA riwayat keputusan
// (RT & RW), tanpa tombol approve/reject. Cuma tombol Kembali.
// FIELD_MAP sesuaikan kalau backend LetterResource sudah final.
// ==========================================

import { Eye } from 'lucide-react';
import { useSuratDetail } from '../hooks/useSuratDetailKades';
import ApprovalStepperKades from './ApprovalStepperKades';
import { previewSuratPDF } from '@/features/cetak-surat/utils/generateSuratPDF';

const FIELD_MAP = {
  noSurat: (s) => s.letter_number ?? '-',
  namaPemohon: (s) => s.applicant_name ?? '-',
  nik: (s) => s.applicant_nik ?? '-',
  alamat: (s) => s.applicant_address ?? '-',
  jenisSurat: (s) => s.letter_type?.name ?? '-',
  keperluan: (s) => s.purpose ?? '-',
  diajukan: (s) => (s.submitted_at ? new Date(s.submitted_at).toLocaleString('id-ID') : '-'),
  terakhirDiproses: (s) => (s.updated_at ? new Date(s.updated_at).toLocaleString('id-ID') : '-'),
  riwayat: (s) => s.decisions ?? [],
};

export default function SuratDetailModalKades({ suratId, onClose }) {
  const { surat, notFound } = useSuratDetail(suratId);

  if (suratId === null) return null;

  const infoFields = surat
    ? [
        { label: 'Nama Pemohon', value: FIELD_MAP.namaPemohon(surat) },
        { label: 'NIK', value: FIELD_MAP.nik(surat) },
        { label: 'Alamat', value: FIELD_MAP.alamat(surat) },
        { label: 'Jenis Surat', value: FIELD_MAP.jenisSurat(surat) },
        { label: 'Keperluan', value: FIELD_MAP.keperluan(surat) },
        { label: 'Diajukan', value: FIELD_MAP.diajukan(surat) },
        { label: 'Terakhir diproses', value: FIELD_MAP.terakhirDiproses(surat) },
      ]
    : [];

  const riwayat = surat ? FIELD_MAP.riwayat(surat) : [];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl">✕</button>

        {notFound ? (
          <p className="text-center text-gray-500 py-10">Surat tidak ditemukan.</p>
        ) : !surat ? (
          <p className="text-center text-gray-400 py-10">Memuat...</p>
        ) : (
          <>
            <h2 className="font-bold text-gray-800 text-lg">Detail Permohonan Surat <span className="text-xs font-normal text-gray-400">(monitoring)</span></h2>
            <p className="text-xs text-gray-400 mb-5">#{FIELD_MAP.noSurat(surat)}</p>

            <ApprovalStepperKades surat={surat} />

            <div className="flex flex-col gap-4 mb-5">
              {infoFields.map((f) => (
                <div key={f.label}>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">{f.label}</p>
                  <p className="text-sm font-semibold text-gray-800">{f.value}</p>
                </div>
              ))}
            </div>

            {riwayat.length > 0 && (
              <div className="flex flex-col gap-3 mb-5">
                {riwayat.map((r, i) => (
                  <div key={i} className={`rounded-xl p-4 ${r.status === 'rejected' ? 'bg-red-50' : 'bg-green-50'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-gray-800 text-sm">Keputusan {(r.stage ?? r.tahap ?? '').toUpperCase()}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status === 'rejected' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                        {r.status === 'rejected' ? 'REJECTED' : 'APPROVED'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">diputuskan oleh {r.actor_name ?? r.decided_by ?? '-'}</p>
                    {r.notes && <div className="bg-white/70 text-xs rounded-lg p-2 mt-2">{r.notes}</div>}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => previewSuratPDF(surat)}
              className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-600 rounded-lg py-2.5 text-sm mb-3 hover:bg-gray-50"
            >
              <Eye size={16} /> Lihat Dokumen (Preview)
            </button>

            <button onClick={onClose} className="w-full border border-green-500 text-green-600 rounded-lg py-2.5 text-sm font-medium hover:bg-green-50">
              ✓ Kembali
            </button>
          </>
        )}
      </div>
    </div>
  );
}