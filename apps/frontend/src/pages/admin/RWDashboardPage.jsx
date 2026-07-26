// ==========================================
// RWDashboardPage.jsx
// Desktop: layout lama (quick-nav + banner + 4 statcard).
// Mobile: layout baru "Digital Amanah", pakai MobileBottomNav dan
// FooterDesa yang sudah ada di project. Data chart & riwayat verifikasi
// diturunkan dari dummySurat yang sudah ada (bukan data baru).
// ==========================================

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ClipboardList, Bell, CheckCircle2, AlertTriangle, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { dummySurat } from '@/features/approval/data/dummySurat';
import StatCardRW from '@/features/approval-rw/components/StatCardRW';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FooterDesa } from '@/components/layout/FooterDesa';
import { ADMIN_MOBILE_LINKS } from '@/lib/constants/navigation';
import SuratStatChart from '@/features/dashboard-mobile/components/SuratStatChart';
import RiwayatVerifikasiList from '@/features/dashboard-mobile/components/RiwayatVerifikasiList';
import { useDashboardMobileData } from '@/features/dashboard-mobile/hooks/useDashboardMobileData';

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
  const { chartData, riwayatVerifikasi } = useDashboardMobileData();

  const stats = useMemo(() => {
    const total = dummySurat.length;
    const ditolak = dummySurat.filter((s) => s.status.endsWith('_rejected')).length;
    const disetujuiFinal = dummySurat.filter((s) => s.status === 'rw_approved').length;
    const sedangDiproses = dummySurat.filter(
      (s) => !s.status.endsWith('_rejected') && s.status !== 'rw_approved' && s.status !== 'pending'
    ).length;
    // "Permohonan baru" buat RW = surat yang baru masuk antrian RW (sudah rt_approved)
    const permohonanBaru = dummySurat.filter((s) => s.status === 'rt_approved').length;
    return { total, ditolak, disetujuiFinal, sedangDiproses, permohonanBaru };
  }, []);

  return (
    <>
      {/* ===== DESKTOP ===== */}
      <div className="hidden md:block max-w-5xl mx-auto py-6">
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
          <span>Hanya surat berstatus rt_approved yang dapat diproses RW. Setuju di sini bersifat final dan menerbitkan nomor surat.</span>
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

      {/* ===== MOBILE ===== */}
      <div className="md:hidden bg-gray-50 min-h-screen pb-20">
        <div className="px-4 pt-4">
          <p className="text-green-700 font-semibold">Digital Amanah</p>
          <p className="text-xs text-gray-400 mb-4">Dashboard Ketua RW</p>

          <h1 className="text-xl font-bold text-gray-800 mb-1">Selamat Pagi, {user?.name ?? 'Bapak/Ibu'}</h1>
          <p className="text-sm text-gray-500 mb-4">Kelola administrasi warga {user?.wilayah_label ?? 'RW'} dengan lebih cepat.</p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <button onClick={() => navigate(`/admin/list-rw?status=rt_approved`)} className="bg-white rounded-2xl shadow-sm p-4 text-left relative">
              <div className="flex justify-between items-start mb-2">
                <Mail size={18} className="text-green-600" />
                <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full">Baru</span>
              </div>
              <p className="text-[10px] text-gray-400 uppercase">Permohonan</p>
              <p className="text-2xl font-bold text-gray-800">{stats.permohonanBaru}</p>
            </button>
            <button onClick={() => navigate(`/admin/list-rw`)} className="bg-white rounded-2xl shadow-sm p-4 text-left relative">
              <div className="flex justify-between items-start mb-2">
                <ShieldCheck size={18} className="text-green-600" />
                <span className="text-red-500 text-[10px] font-medium">Urgent</span>
              </div>
              <p className="text-[10px] text-gray-400 uppercase">Verifikasi</p>
              <p className="text-2xl font-bold text-gray-800">{stats.sedangDiproses.toString().padStart(2, '0')}</p>
            </button>
          </div>

          <button onClick={() => navigate(`/admin/list-rw?status=rw_approved`)} className="w-full bg-white rounded-2xl shadow-sm p-4 text-left mb-4">
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
        <MobileBottomNav links={ADMIN_MOBILE_LINKS('/admin/dashboard-surat-rw', '/admin/list-rw')} />
      </div>
    </>
  );
}