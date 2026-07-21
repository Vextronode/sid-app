/* eslint-disable no-unused-vars */
// ==========================================
// KadesDashboardPage.jsx
// Dashboard monitoring Kades. Statistik murni informasi, TANPA quick-nav
// approve/reject — cuma link ke list surat level desa.
// ==========================================

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, ClipboardList, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { dummySurat } from '@/features/approval/data/dummySurat';
import StatCardRT from '@/features/approval-rt/components/StatCardRT'; // komponen visual sama semua role
import { RELEVANT_STATUSES, BASE_PATH } from '@/features/approval-kades/constants/roleConfigkades';

export default function KadesDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const total = dummySurat.length;
   const disetujui = dummySurat.filter((s) => s.status === 'petugas_approved').length;
   const ditolak = dummySurat.filter((s) => s.status.endsWith('_rejected')).length;
   const sedangDiproses = dummySurat.filter(
     (s) => !s.status.endsWith('_rejected') && s.status !== 'petugas_approved'
   ).length;
   return { total, disetujui, ditolak, sedangDiproses };
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-6">
      <h1 className="text-lg font-medium text-gray-700 mb-4">Monitoring Surat — Kepala Desa</h1>

      <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg px-4 py-3 mb-6 flex items-center gap-2">
        <Eye size={16} />
        <span>Halaman ini bersifat pemantauan saja. Kepala Desa dapat melihat semua surat di semua tahap, namun tidak melakukan approve/reject.</span>
      </div>

      <h2 className="text-base font-medium text-gray-800">Dashboard Kepala Desa</h2>
      <p className="text-sm text-gray-500 mb-6">Wilayah: {user?.wilayah_label ?? 'Desa Cibenda'}</p>

      <div className="grid grid-cols-2 gap-6 max-w-2xl mb-6">
        <StatCardRT icon={<ClipboardList size={18} />} value={stats.total} label="Total Permohonan" />
       <StatCardRT icon={<Eye size={18} />} value={stats.sedangDiproses} label="Sedang diproses" />
        <StatCardRT icon={<CheckCircle2 size={18} />} value={stats.disetujui} label="Disetujui final" />
        <StatCardRT icon={<XCircle size={18} />} value={stats.ditolak} label="Ditolak final" />
      </div>

      <button
        onClick={() => navigate('/admin/list-kades')}
        className="border border-green-500 text-green-600 rounded-full px-5 py-2 text-sm hover:bg-green-50"
      >
        Lihat semua surat desa
      </button>
    </div>
  );
}