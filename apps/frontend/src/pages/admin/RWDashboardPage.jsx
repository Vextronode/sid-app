/* eslint-disable no-unused-vars */
// ==========================================
// RWDashboardPage.jsx
// Dashboard RW: kotak navigasi cepat + banner + 4 statistik.
// ==========================================

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ClipboardList, Bell, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { dummySurat } from '@/features/approval/data/dummySurat';
import StatCardRW from '@/features/approval-rw/components/StatCardRW';
import { BASE_PATH } from '@/features/approval-rw/constants/roleConfigRW';

// key harus persis sama status asli data. key kosong ('') = tampilkan semua.
const QUICK_NAV = [
  { key: 'rt_approved', label: 'pending', icon: X },
  { key: 'rw_approved', label: 'approved', icon: X },
  { key: 'rw_rejected', label: 'rejected', icon: X },
  { key: '', label: 'Review', icon: X },
];

export default function RWDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const total = dummySurat.length;
    const ditolak = dummySurat.filter((s) => s.status.endsWith('_rejected')).length;
    const disetujuiFinal = dummySurat.filter((s) => s.status === 'petugas_approved').length;
    const sedangDiproses = dummySurat.filter(
      (s) => !s.status.endsWith('_rejected') && s.status !== 'petugas_approved' && s.status !== 'pending'
    ).length;
    return { total, ditolak, disetujuiFinal, sedangDiproses };
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-6">
      <h1 className="text-lg font-medium text-gray-700 mb-4">Surat RW</h1>

      <div className="bg-white rounded-2xl shadow-sm p-4 flex gap-4 mb-6">
        {QUICK_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => navigate(`/admin/list-rw?status=${item.key}`)}
              className="flex flex-col items-center justify-center gap-2 border rounded-xl px-6 py-3 hover:bg-gray-50 flex-1"
            >
              <Icon size={16} className="text-gray-400" />
              <span className="text-sm text-gray-600">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg px-4 py-3 mb-6 flex items-center gap-2">
        <AlertTriangle size={16} />
        <span>Hanya surat berstatus rt_approved yang dapat diproses RW</span>
      </div>

      <h2 className="text-base font-medium text-gray-800">Dashboard RW {user?.wilayah_kode ?? '001'}</h2>
      <p className="text-sm text-gray-500 mb-6">Wilayah: {user?.wilayah_label ?? 'RT 001, RW001 - Desa Cibenda'}</p>

      <div className="grid grid-cols-2 gap-6 max-w-2xl">
        <StatCardRW icon={<ClipboardList size={18} />} value={stats.ditolak} label="Total ditolak" />
        <StatCardRW icon={<Bell size={18} />} value={stats.sedangDiproses} label="Sedang diproses" />
        <StatCardRW icon={<X size={18} />} value={stats.total} label="Total Permohonan" />
        <StatCardRW icon={<CheckCircle2 size={18} />} value={stats.disetujuiFinal} label="Disetujui final" />
      </div>
    </div>
  );
}