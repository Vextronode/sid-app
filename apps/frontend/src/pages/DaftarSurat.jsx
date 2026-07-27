/* eslint-disable no-unused-vars */
// ==========================================
// DaftarSurat.jsx (Beranda Warga)
// Redesign sesuai Image 1: card statistik hijau + 2 kartu kecil,
// tabel daftar permohonan (read-only, status berubah otomatis sesuai
// data asli dari backend), tombol "Buat Baru".
// ==========================================

import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { WargaLayout } from "@/components/layout/WargaLayout";
import { FolderOpen, Clock, CheckCircle2 } from "lucide-react";
import { useLetters } from "@/features/surat/hooks/useLetters";

const STATUS_LABEL = {
  pending: { label: 'MENUNGGU', className: 'bg-gray-100 text-gray-500' },
  rt_approved: { label: 'DISETUJUI RT', className: 'bg-green-100 text-green-700' },
  rt_rejected: { label: 'DITOLAK RT', className: 'bg-red-100 text-red-600' },
  rw_approved: { label: 'DISETUJUI FINAL', className: 'bg-green-100 text-green-700' },
  rw_rejected: { label: 'DITOLAK RW', className: 'bg-red-100 text-red-600' },
};

export function DaftarSurat() {
  const { user } = useAuth();
  const namaPemohon = user?.name || "Warga Desa";
  const { letters, loading } = useLetters();

  const total = letters.length;
  const sedangDiproses = letters.filter((s) => ['pending', 'rt_approved'].includes(s.status)).length;
  const disetujuiFinal = letters.filter((s) => s.status === 'rw_approved').length;

  return (
    <WargaLayout>
      <div className="px-4 py-5 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Selamat Datang,</h1>
        <p className="text-sm text-gray-500 mb-5">Selesaikan urusan administratif Anda dengan aman dan cepat.</p>

        <div className="bg-green-600 rounded-2xl p-5 text-white mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide opacity-90">Total Permohonan</span>
            <FolderOpen size={18} />
          </div>
          <p className="text-4xl font-bold">{String(total).padStart(2, '0')}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Sedang Diproses</p>
            <p className="text-2xl font-bold text-blue-600 flex items-center gap-1">
              {String(sedangDiproses).padStart(2, '0')} <Clock size={14} className="text-blue-500" />
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Disetujui Final</p>
            <p className="text-2xl font-bold text-green-600 flex items-center gap-1">
              {String(disetujuiFinal).padStart(2, '0')} <CheckCircle2 size={14} className="text-green-500" />
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-800">Daftar Permohonan</h2>
          <Link to="/jenis-surat" className="text-sm text-green-600 font-medium hover:underline">Buat Baru</Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <p className="text-center text-gray-400 text-sm py-8">Memuat data surat...</p>
          ) : letters.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Belum ada permohonan surat.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-400 text-[10px] uppercase">
                  <th className="py-3 px-4 font-semibold">Jenis Surat</th>
                  <th className="py-3 px-4 font-semibold">Tanggal</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {letters.map((item) => {
                  const badge = STATUS_LABEL[item.status] ?? { label: item.status, className: 'bg-gray-100 text-gray-500' };
                  return (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-800">{item.letter_type?.name ?? '-'}</p>
                        <p className="text-[10px] text-gray-400">#{item.letter_number ?? `SKD-${item.id}`}</p>
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${badge.className}`}>{badge.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </WargaLayout>
  );
}