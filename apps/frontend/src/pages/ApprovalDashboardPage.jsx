// ==========================================
// ApprovalDashboardPage.jsx
// Halaman dashboard ringkasan surat untuk role RT & RW (satu halaman dipakai
// bersama, dibedakan lewat "role" dari AuthContext). Menampilkan 4 kotak
// statistik: Total ditolak, Sedang diproses, Total Permohonan, Disetujui final.
// ==========================================

import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { dummySurat } from '@/features/approval/data/dummySurat';
import StatCard from '@/features/approval/components/StatCard';

export default function ApprovalDashboardPage() {
  // Ambil role & info wilayah user yang login (rt/rw) dari AuthContext
  const { user } = useAuth();
  const role = user?.role; // 'rt' | 'rw'

  // Hitung angka tiap kotak dari dataset surat.
  // "Sedang diproses" = status yang bukan hasil akhir (approved/rejected final).
  const stats = useMemo(() => {
    const total = dummySurat.length;
    const ditolak = dummySurat.filter((s) => s.status.endsWith('_rejected')).length;
    const disetujuiFinal = dummySurat.filter((s) => s.status === 'rw_approved').length;
    const sedangDiproses = total - ditolak - disetujuiFinal;
    return { total, ditolak, disetujuiFinal, sedangDiproses };
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-6">
      <h1 className="text-lg font-medium text-gray-700 mb-4">Surat {role?.toUpperCase()}</h1>

      {/* Banner peringatan gate logic, hanya relevan untuk alur RT -> RW -> Kadus */}
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg px-4 py-3 mb-6">
        ⚠ Hanya surat berstatus rw_approved yang dapat diproses KADUS (gate logic UC-04b)
      </div>

      <h2 className="text-base font-medium text-gray-800">
        Dashboard {role?.toUpperCase()} {user?.wilayah_kode ?? '001'}
      </h2>
      <p className="text-sm text-gray-500 mb-6">Wilayah: {user?.wilayah_label ?? 'RT 001, RW001 - Desa Cibenda'}</p>

      <div className="grid grid-cols-2 gap-6 max-w-2xl">
        <StatCard icon="📋" value={stats.ditolak} label="Total ditolak" />
        <StatCard icon="🔔" value={stats.sedangDiproses} label="Sedang diproses" />
        <StatCard icon="✕" value={stats.total} label="Total Permohonan" />
        <StatCard icon="✓" value={stats.disetujuiFinal} label="Disetujui final" />
      </div>
    </div>
  );
}