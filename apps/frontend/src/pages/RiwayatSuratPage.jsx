// ==========================================
// RiwayatSuratPage.jsx
// Warga lihat status & riwayat surat yang pernah diajukan sendiri,
// dengan progress stepper (pakai statusFlow GLOBAL yang sama dipakai admin).
// ==========================================

import { useAuth } from '@/features/auth/contexts/AuthContext';
import { dummySurat } from '@/features/approval/data/dummySurat';
import { getStepIndex, STEP_LABELS } from '@/features/approval/constants/statusFlow';

export default function RiwayatSuratPage() {
  const { user } = useAuth();

  // Filter surat milik user yang login sendiri
  const data = dummySurat.filter((s) => s.pemohon_user_id === user?.id);

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-lg font-medium text-gray-800 mb-6">Riwayat Surat Saya</h1>

      {data.length === 0 ? (
        <p className="text-gray-500 text-sm">Belum ada surat yang diajukan.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {data.map((surat) => {
            const step = getStepIndex(surat.status);
            return (
              <div key={surat.id} className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-gray-800">{surat.jenis_label}</p>
                    <p className="text-xs text-gray-400">{surat.keperluan}</p>
                  </div>
                  <span className="text-xs text-gray-500">{surat.tanggal}</span>
                </div>
                <p className="text-sm text-gray-600">
                  Tahap: <strong>{STEP_LABELS[step] ?? '-'}</strong>
                </p>
                {surat.no_surat && (
                  <p className="text-sm text-green-600 mt-1">✓ Nomor surat: {surat.no_surat}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}