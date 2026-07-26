// ==========================================
// KasiDashboardPage.jsx
// Kasi Pelayanan sekarang cuma monitoring + cetak surat yang sudah
// disetujui RT & RW (rw_approved). Bukan approver lagi.
// ==========================================

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, AlertCircle } from 'lucide-react';
import { dummySurat } from '@/features/approval/data/dummySurat';

export default function KasiDashboardPage() {
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const siapCetak = dummySurat.filter((s) => s.status === 'rw_approved').length;
    const total = dummySurat.length;
    return { siapCetak, total };
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-6">
      <h1 className="text-lg font-medium text-gray-700 mb-4">Kasi Pelayanan</h1>

      <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg px-4 py-3 mb-6 flex items-center gap-2">
        <AlertCircle size={16} />
        <span>Surat baru bisa dicetak setelah disetujui RT dan RW.</span>
      </div>

      <div className="grid grid-cols-2 gap-6 max-w-2xl mb-6">
        <div className="bg-white rounded-2xl shadow-sm px-6 py-5 flex flex-col gap-1">
          <span className="text-2xl font-semibold text-gray-800">{stats.siapCetak}</span>
          <span className="text-sm text-gray-500">Surat siap dicetak</span>
        </div>
        <div className="bg-white rounded-2xl shadow-sm px-6 py-5 flex flex-col gap-1">
          <span className="text-2xl font-semibold text-gray-800">{stats.total}</span>
          <span className="text-sm text-gray-500">Total Permohonan</span>
        </div>
      </div>

      <button
        onClick={() => navigate('/admin/list-kasi')}
        className="border border-green-500 text-green-600 rounded-full px-5 py-2 text-sm hover:bg-green-50 flex items-center gap-2"
      >
        <Printer size={16} /> Lihat & Cetak Surat
      </button>
    </div>
  );
}