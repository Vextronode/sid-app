// ==========================================
// JenisSuratPage.jsx
// 4 kotak di atas: Total/Disetujui/Ditolak (bisa diklik, pindah halaman),
// Status Permohonan (cuma tampilan, TIDAK bisa diklik). Di bawahnya,
// LANGSUNG ada tracker (pilih tanggal + alur Submit-RT-RW-Kantor Desa)
// di halaman yang SAMA, tidak pindah ke halaman lain.
// ==========================================

import { useNavigate } from 'react-router-dom';
import { FileText, CheckCircle2, XCircle, ListChecks } from 'lucide-react';
import { WargaLayout } from '@/components/layout/WargaLayout';
import { useLetters } from '@/features/surat/hooks/useLetters';
import SuratDateTracker from '@/features/warga-surat/components/SuratDateTracker';

export default function JenisSuratPage() {
  const navigate = useNavigate();
  const { letters, loading } = useLetters();

  const total = letters.length;
  const disetujui = letters.filter((s) => s.status === 'kasi_approved').length;
  const ditolak = letters.filter((s) => s.status?.endsWith('_rejected')).length;
  const menunggu = letters.filter((s) => !s.status?.endsWith('_rejected') && s.status !== 'rw_approved').length;

  return (
    <WargaLayout>
      <div className="px-4 py-5 pb-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Surat Saya</h1>
        <p className="text-sm text-gray-500 mb-6">Pantau semua permohonan surat yang pernah Anda ajukan.</p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Bisa diklik -> pindah halaman */}
          <button
            type="button"
            onClick={() => navigate('/daftar-surat-saya')}
            className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between text-left hover:shadow-md transition-shadow"
          >
            <div>
              <p className="text-[10px] text-gray-400 uppercase mb-1">Total Pengajuan</p>
              <p className="text-3xl font-bold text-gray-800">{loading ? '-' : total}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">
              <FileText size={20} />
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/daftar-surat-saya?status=approved')}
            className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between text-left hover:shadow-md transition-shadow"
          >
            <div>
              <p className="text-[10px] text-gray-400 uppercase mb-1">Permohonan Disetujui</p>
              <p className="text-3xl font-bold text-green-600">{loading ? '-' : disetujui}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
              <CheckCircle2 size={20} />
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/daftar-surat-saya?status=ditolak')}
            className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between text-left hover:shadow-md transition-shadow"
          >
            <div>
              <p className="text-[10px] text-gray-400 uppercase mb-1">Permohonan Ditolak</p>
              <p className="text-3xl font-bold text-red-500">{loading ? '-' : ditolak}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center text-red-500">
              <XCircle size={20} />
            </div>
          </button>

          {/* TIDAK bisa diklik, cuma tampilan biasa (div, bukan button) */}
          <div className="bg-green-600 rounded-2xl shadow-sm p-5 flex items-center justify-between text-white">
            <div>
              <p className="text-[10px] uppercase mb-1 opacity-90">Sedang Diproses</p>
              <p className="text-lg font-bold">Status Permohonan</p>
              <p className="text-2xl font-bold mt-1">{loading ? '-' : menunggu}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
              <ListChecks size={20} />
            </div>
          </div>
        </div>

        {/* Tracker langsung di halaman yang sama, di bawah 4 kotak */}
        <SuratDateTracker letters={letters} loading={loading} />
      </div>
    </WargaLayout>
  );
}