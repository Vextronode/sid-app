// ==========================================
// JenisSuratPage.jsx
// Sekarang jadi halaman ringkasan status surat: 4 tombol dalam grid
// 2x2 (Total Pengajuan / Disetujui / Ditolak / Status Permohonan).
// Klik salah satu tombol -> filter daftar surat di bawahnya sesuai kategori.
// ==========================================

import { useState, useMemo } from 'react';
import { FolderOpen, CheckCircle2, XCircle, ListChecks } from 'lucide-react';
import { WargaLayout } from '@/components/layout/WargaLayout';
import { useLetters } from '@/features/surat/hooks/useLetters';

const STATUS_LABEL = {
  pending: { label: 'MENUNGGU', className: 'bg-gray-100 text-gray-500' },
  rt_approved: { label: 'DIPROSES RW', className: 'bg-blue-100 text-blue-700' },
  rt_rejected: { label: 'DITOLAK RT', className: 'bg-red-100 text-red-600' },
  rw_approved: { label: 'DIPROSES Operator', className: 'bg-green-100 text-green-700' },
  rw_rejected: { label: 'DITOLAK RW', className: 'bg-red-100 text-red-600' },
  kasi_approved: { label: 'DISETUJUI', className: 'bg-green-100 text-green-700' },
};

const FILTERS = {
  total: { label: 'Total Pengajuan', match: () => true },
  disetujui: { label: 'Disetujui', match: (s) => s.status === 'rw_approved' },
  ditolak: { label: 'Ditolak', match: (s) => s.status?.endsWith('_rejected') },
  status: { label: 'Status Permohonan', match: () => true }, // semua, sekaligus tampilkan status masing-masing
};

export default function JenisSuratPage() {
  const { letters, loading } = useLetters();
  const [activeFilter, setActiveFilter] = useState('total');

  const stats = useMemo(() => {
    const total = letters.length;
    const disetujui = letters.filter((s) => s.status === 'rw_approved').length;
    const ditolak = letters.filter((s) => s.status?.endsWith('_rejected')).length;
    return { total, disetujui, ditolak };
  }, [letters]);

  const filteredLetters = useMemo(() => {
    const filterFn = FILTERS[activeFilter]?.match ?? (() => true);
    return letters.filter(filterFn);
  }, [letters, activeFilter]);

  const buttons = [
    { key: 'total', label: 'Total Pengajuan', value: stats.total, icon: FolderOpen, color: 'text-gray-600 bg-gray-100' },
    { key: 'disetujui', label: 'Permohonan Disetujui', value: stats.disetujui, icon: CheckCircle2, color: 'text-green-600 bg-green-100' },
    { key: 'ditolak', label: 'Permohonan Ditolak', value: stats.ditolak, icon: XCircle, color: 'text-red-600 bg-red-100' },
    { key: 'status', label: 'Status Permohonan', value: stats.total, icon: ListChecks, color: 'text-blue-600 bg-blue-100' },
  ];

  return (
    <WargaLayout>
      <div className="px-4 py-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Surat Saya</h1>
        <p className="text-sm text-gray-500 mb-6">Pantau semua permohonan surat yang pernah Anda ajukan.</p>

        {/* Grid 2x2 tombol */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {buttons.map((btn) => {
            const Icon = btn.icon;
            const isActive = activeFilter === btn.key;
            return (
              <button
                key={btn.key}
                onClick={() => setActiveFilter(btn.key)}
                className={`bg-white rounded-2xl shadow-sm p-5 text-left transition-all ${
                  isActive ? 'ring-2 ring-green-500' : 'hover:shadow-md'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${btn.color}`}>
                  <Icon size={20} />
                </div>
                <p className="text-xs text-gray-400 mb-1">{btn.label}</p>
                {btn.value !== '' && <p className="text-2xl font-bold text-gray-800">{btn.value}</p>}
              </button>
            );
          })}
        </div>

        {/* Daftar surat sesuai filter aktif */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b">
            <p className="text-sm font-semibold text-gray-700">{FILTERS[activeFilter]?.label}</p>
          </div>

          {loading ? (
            <p className="text-center text-gray-400 text-sm py-8">Memuat data surat...</p>
          ) : filteredLetters.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Belum ada surat pada kategori ini.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-400 text-[10px] uppercase">
                  <th className="py-3 px-4 font-semibold text-">Jenis Surat</th>
                  <th className="py-3 px-4 font-semibold text-center">Tanggal</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLetters.map((item) => {
                  const badge = STATUS_LABEL[item.status] ?? { label: item.status, className: 'bg-gray-100 text-gray-500' };
                  return (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-800 text-">{item.letter_type?.name ?? '-'}</p>
                        <p className="text-[10px] text-gray-400 text-">#{item.letter_number ?? `SKD-${item.id}`}</p>
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-center">
                        {item.processed_at ? new Date(item.processed_at).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
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