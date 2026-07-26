// ==========================================
// SuratDetailModalRW.jsx
// Popup detail surat RW. FIELD_MAP di bawah sesuaikan kalau backend
// (LetterResource) sudah final dan nama fieldnya beda.
// ==========================================

import { useState } from 'react';
import { Eye } from 'lucide-react';
import { useSuratDetail } from '../hooks/useSuratDetailRW';
import ApprovalStepperRW from './ApprovalStepperRW';
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
  ipAktor: (s) => s.ip_address ?? '-',
  riwayat: (s) => s.decisions ?? [],
};

export default function SuratDetailModalRW({ suratId, onClose, onApprove, onReject, readOnly = false }) {
  const { surat, notFound } = useSuratDetail(suratId);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [alasan, setAlasan] = useState('');

  if (suratId === null) return null;

  const keputusanRT = surat ? FIELD_MAP.riwayat(surat).find((r) => r.stage === 'rt' || r.tahap === 'RT') : null;
  const keputusanRW = surat ? FIELD_MAP.riwayat(surat).find((r) => r.stage === 'rw' || r.tahap === 'RW') : null;

  const infoFields = surat
    ? [
        { label: 'Nama Pemohon', value: FIELD_MAP.namaPemohon(surat) },
        { label: 'NIK', value: FIELD_MAP.nik(surat) },
        { label: 'Alamat', value: FIELD_MAP.alamat(surat) },
        { label: 'Jenis Surat', value: FIELD_MAP.jenisSurat(surat) },
        { label: 'Keperluan', value: FIELD_MAP.keperluan(surat) },
        { label: 'Diajukan', value: FIELD_MAP.diajukan(surat) },
        { label: 'Terakhir diproses', value: FIELD_MAP.terakhirDiproses(surat) },
        { label: 'IP aktor', value: FIELD_MAP.ipAktor(surat) },
      ]
    : [];

  const handleSubmitReject = () => {
    if (!alasan.trim()) return;
    onReject(alasan);
    setAlasan('');
    setShowRejectBox(false);
  };

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
            <h2 className="font-bold text-gray-800 text-lg">Detail Permohonan Surat</h2>
            <p className="text-xs text-gray-400 mb-5">#{FIELD_MAP.noSurat(surat)} · Surat saya</p>

            <ApprovalStepperRW surat={surat} />

            <div className="flex flex-col gap-4 mb-5">
              {infoFields.map((f) => (
                <div key={f.label}>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">{f.label}</p>
                  <p className="text-sm font-semibold text-gray-800">{f.value}</p>
                </div>
              ))}
            </div>

            {/* Riwayat keputusan RT — RW perlu lihat ini sebagai konteks sebelum putuskan */}
            {keputusanRT && (
              <div className="rounded-xl p-4 mb-3 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-800 text-sm">Keputusan RT</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500 text-white">RT_APPROVED</span>
                </div>
                <div className="text-xs text-gray-500">
                  diputuskan oleh <span className="font-medium text-gray-700">{keputusanRT.actor_name ?? keputusanRT.decided_by ?? '-'}</span>
                </div>
                {keputusanRT.notes && (
                  <div className="bg-white text-gray-600 text-xs rounded-lg p-3 mt-2 border">{keputusanRT.notes}</div>
                )}
              </div>
            )}

            {/* Keputusan RW sendiri, kalau sudah pernah diputuskan */}
            {keputusanRW && (
              <div className={`rounded-xl p-4 mb-5 ${keputusanRW.status === 'rejected' ? 'bg-red-50' : 'bg-green-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-800 text-sm">Keputusan RW</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    keputusanRW.status === 'rejected' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                  }`}>
                    {keputusanRW.status === 'rejected' ? 'RW_REJECTED' : 'RW_APPROVED'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mb-1">
                  diputuskan oleh <span className="font-medium text-gray-700">{keputusanRW.actor_name ?? keputusanRW.decided_by ?? '-'}</span>
                </div>
                <div className="text-xs text-gray-500 mb-2">IP <span className="font-medium text-gray-700">{keputusanRW.ip_address ?? '-'}</span></div>

                {keputusanRW.status === 'rejected' && keputusanRW.notes && (
                  <>
                    <p className="text-[10px] font-semibold text-red-600 uppercase mt-3 mb-1">Komentar Penolakan</p>
                    <div className="bg-red-100 text-red-700 text-xs rounded-lg p-3">{keputusanRW.notes}</div>
                  </>
                )}
                {keputusanRW.status === 'approved' && keputusanRW.notes && (
                  <div className="bg-green-100 text-green-700 text-xs rounded-lg p-3 mt-2">{keputusanRW.notes}</div>
                )}
              </div>
            )}

            {!readOnly && showRejectBox && (
              <div className="mb-4">
                <p className="text-xs text-gray-600 mb-1">Tulis alasan penolakan</p>
                <textarea
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  rows={3}
                  placeholder="Contoh: Data pemohon perlu diverifikasi ulang."
                  className="w-full border rounded-lg p-3 text-sm outline-none focus:border-red-400"
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { setShowRejectBox(false); setAlasan(''); }} className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm">
                    Batal
                  </button>
                  <button
                    onClick={handleSubmitReject}
                    disabled={!alasan.trim()}
                    className="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm disabled:opacity-40"
                  >
                    Konfirmasi Tolak
                  </button>
                </div>
              </div>
            )}

            {!readOnly && (
              <button
                onClick={() => previewSuratPDF(surat)}
                className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-600 rounded-lg py-2.5 text-sm mb-3 hover:bg-gray-50"
              >
                <Eye size={16} /> Lihat Dokumen (Preview)
              </button>
            )}

            {readOnly ? (
              <button onClick={onClose} className="w-full border border-green-500 text-green-600 rounded-lg py-2.5 text-sm font-medium hover:bg-green-50">
                ✓ Kembali
              </button>
            ) : !showRejectBox ? (
              <div className="flex gap-3">
                <button onClick={onApprove} className="flex-1 bg-green-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-green-700">
                  Setuju
                </button>
                <button onClick={() => setShowRejectBox(true)} className="flex-1 bg-red-500 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-red-600">
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