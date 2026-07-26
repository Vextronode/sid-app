/* eslint-disable no-unused-vars */
// ==========================================
// RTDashboardPage.jsx
// Desktop: layout lama (quick-nav + banner + 4 statcard).
// Mobile: layout baru "Digital Amanah", pakai MobileBottomNav dan
// FooterDesa yang SUDAH ADA di project (bukan komponen baru).
// Data chart & riwayat verifikasi diturunkan dari dummySurat yang sudah ada.
// ==========================================

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ClipboardList, Bell, CheckCircle2, AlertTriangle, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { dummySurat } from '@/features/approval/data/dummySurat';
import StatCardRT from '@/features/approval-rt/components/StatCardRT';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FooterDesa } from '@/components/layout/FooterDesa';
import { ADMIN_MOBILE_LINKS } from '@/lib/constants/navigation';
import SuratStatChart from '@/features/dashboard-mobile/components/SuratStatChart';
import RiwayatVerifikasiList from '@/features/dashboard-mobile/components/RiwayatVerifikasiList';
import { useDashboardMobileData } from '@/features/dashboard-mobile/hooks/useDashboardMobileData';

const QUICK_NAV = [
  { key: 'pending', label: 'pending', icon: X },
  { key: 'rt_approved', label: 'approved', icon: X },
  { key: 'rt_rejected', label: 'rejected', icon: X },
  { key: '', label: 'Review', icon: X },
];

export default function RTDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { chartData, riwayatVerifikasi } = useDashboardMobileData();

  const stats = useMemo(() => {
    const total = dummySurat.length;
    const ditolak = dummySurat.filter((s) => s.status.endsWith('_rejected')).length;
    const disetujuiFinal = dummySurat.filter((s) => s.status === 'rw_approved').length;
    const sedangDiproses = dummySurat.filter((s) => !s.status.endsWith('_rejected') && s.status !== 'rw_approved' && s.status !== 'pending').length;
    const permohonanBaru = dummySurat.filter((s) => s.status === 'pending').length;
    return { total, ditolak, disetujuiFinal, sedangDiproses, permohonanBaru };
  }, []);

  return (
    <>
      {/* ===== DESKTOP ===== */}
      <div className="hidden md:block max-w-5xl mx-auto py-6">
        <h1 className="text-lg font-medium text-gray-700 mb-4">Surat RT</h1>

        <div className="bg-white rounded-2xl shadow-sm p-4 flex gap-4 mb-6">
          {QUICK_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => navigate(`/admin/list-rt?status=${item.key}`)}
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
          <span>Surat hanya bisa diproses RT kalau statusnya masih "pending"</span>
        </div>

        <h2 className="text-base font-medium text-gray-800">Dashboard RT {user?.wilayah_kode ?? '001'}/RW001</h2>
        <p className="text-sm text-gray-500 mb-6">Wilayah: {user?.wilayah_label ?? 'RT 001, RW001 - Desa Cibenda'}</p>

        <div className="grid grid-cols-2 gap-6 max-w-2xl">
          <StatCardRT icon={<ClipboardList size={18} />} value={stats.ditolak} label="Total ditolak" />
          <StatCardRT icon={<Bell size={18} />} value={stats.sedangDiproses} label="Sedang diproses" />
          <StatCardRT icon={<X size={18} />} value={stats.total} label="Total Permohonan" />
          <StatCardRT icon={<CheckCircle2 size={18} />} value={stats.disetujuiFinal} label="Disetujui final" />
        </div>
      </div>

      {/* ===== MOBILE ===== */}
      <div className="md:hidden bg-gray-50 min-h-screen pb-20">
        <div className="px-4 pt-4">
          <p className="text-green-700 font-semibold">Digital Amanah</p>
          <p className="text-xs text-gray-400 mb-4">Dashboard Ketua RT</p>

          <h1 className="text-xl font-bold text-gray-800 mb-1">Selamat Pagi, {user?.name ?? 'Bapak/Ibu'}</h1>
          <p className="text-sm text-gray-500 mb-4">Kelola administrasi warga {user?.wilayah_label ?? 'RT'} dengan lebih cepat.</p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <button onClick={() => navigate(`/admin/list-rt?status=pending`)} className="bg-white rounded-2xl shadow-sm p-4 text-left relative">
              <div className="flex justify-between items-start mb-2">
                <Mail size={18} className="text-green-600" />
                <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full">+3 Baru</span>
              </div>
              <p className="text-[10px] text-gray-400 uppercase">Permohonan</p>
              <p className="text-2xl font-bold text-gray-800">{stats.permohonanBaru}</p>
            </button>
            <button onClick={() => navigate(`/admin/list-rt`)} className="bg-white rounded-2xl shadow-sm p-4 text-left relative">
              <div className="flex justify-between items-start mb-2">
                <ShieldCheck size={18} className="text-green-600" />
                <span className="text-red-500 text-[10px] font-medium">Urgent</span>
              </div>
              <p className="text-[10px] text-gray-400 uppercase">Verifikasi</p>
              <p className="text-2xl font-bold text-gray-800">{stats.sedangDiproses.toString().padStart(2, '0')}</p>
            </button>
          </div>

          <button onClick={() => navigate(`/admin/list-rt?status=rt_approved`)} className="w-full bg-white rounded-2xl shadow-sm p-4 text-left mb-4">
            <div className="flex justify-between items-center mb-1">
              <CheckCircle2 size={18} className="text-green-600" />
              <span className="text-[10px] text-gray-400">Mei 2024</span>
            </div>
            <p className="text-[10px] text-gray-400 uppercase">Selesai</p>
            <p className="text-2xl font-bold text-gray-800">{stats.disetujuiFinal}</p>
          </button>

          <div className="mb-4">
            <SuratStatChart data={chartData} />
          </div>

          <div className="mb-4">
            <RiwayatVerifikasiList data={riwayatVerifikasi} />
          </div>
        </div>

        <FooterDesa />
        <MobileBottomNav links={ADMIN_MOBILE_LINKS('/admin/dashboard-surat-rt', '/admin/list-rt')} />
      </div>
    </>
  );
}