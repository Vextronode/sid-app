/* eslint-disable no-unused-vars */
// ==========================================
// PetugasDesaDashboardPage.jsx
// ==========================================

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ClipboardList, Bell, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { dummySurat } from '@/features/approval/data/dummySurat';
import StatCardpetugas from '@/features/approval-petugas-desa/components/StatCardpetugas';
import { BASE_PATH } from '@/features/approval-petugas-desa/constants/roleConfigpetugas';

const QUICK_NAV = [
  { key: 'kadus_approved', label: 'pending', icon: X },
  { key: 'petugas_approved', label: 'approved', icon: X },
  { key: 'petugas_rejected', label: 'rejected', icon: X },
  { key: '', label: 'Review', icon: X },
];

export default function PetugasDesaDashboardPage() {
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
      <h1 className="text-lg font-medium text-gray-700 mb-4">Surat Petugas Desa</h1>

      <div className="bg-white rounded-2xl shadow-sm p-4 flex gap-4 mb-6">
        {QUICK_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => navigate(`/admin/list-petugas-desa?status=${item.key}`)}
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
        <span>Hanya surat berstatus kadus_approved yang dapat diproses. Setuju di sini otomatis menerbitkan nomor surat.</span>
      </div>

      <h2 className="text-base font-medium text-gray-800">Dashboard Petugas Desa</h2>
      <p className="text-sm text-gray-500 mb-6">Wilayah: {user?.wilayah_label ?? 'Desa Cibenda'}</p>

      <div className="grid grid-cols-2 gap-6 max-w-2xl">
        <StatCardpetugas icon={<ClipboardList size={18} />} value={stats.ditolak} label="Total ditolak" />
        <StatCardpetugas icon={<Bell size={18} />} value={stats.sedangDiproses} label="Sedang diproses" />
        <StatCardpetugas icon={<X size={18} />} value={stats.total} label="Total Permohonan" />
        <StatCardpetugas icon={<CheckCircle2 size={18} />} value={stats.disetujuiFinal} label="Disetujui final" />
      </div>
    </div>
  );
}