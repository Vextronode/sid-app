import { useState } from 'react';
import { useSuratDetail } from '../hooks/useSuratDetailkasi';
import ApprovalStepperkasi from './ApprovalStepperkasi';
import SuratInfoGridkasi from './SuratInfoGridkasi';
import ApprovalActionBarkasi from './ApprovalActionBarkasi';
import RejectReasonModalkasi from './RejectReasonModalkasi';

export default function SuratDetailModalkasi({ suratId, onClose, onApprove, onReject, readOnly = false }) {
  const { surat, notFound } = useSuratDetail(suratId);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  if (suratId === null) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl">✕</button>
        {notFound ? (
          <p className="text-center text-gray-500 py-10">Surat tidak ditemukan.</p>
        ) : (
          <>
            <h2 className="font-medium text-gray-800">Detail Permohonan Surat {readOnly && <span className="text-xs font-normal text-gray-400">(mode lihat)</span>}</h2>
            <p className="text-xs text-gray-400 mb-6">#{surat.no_surat ?? `024/${surat.jenis}/V/2026`} · Surat saya</p>
            <ApprovalStepperkasi surat={surat} />
            <SuratInfoGridkasi surat={surat} />
            {readOnly ? (
              <button onClick={onClose} className="border border-green-500 text-green-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-green-50">Tutup</button>
            ) : (
              <ApprovalActionBarkasi onApprove={onApprove} onReject={() => setRejectModalOpen(true)} onBack={onClose} />
            )}
          </>
        )}
      </div>
      {!readOnly && (
        <RejectReasonModalkasi open={rejectModalOpen} onClose={() => setRejectModalOpen(false)} onSubmit={(alasan) => { onReject(alasan); setRejectModalOpen(false); }} />
      )}
    </div>
  );
}