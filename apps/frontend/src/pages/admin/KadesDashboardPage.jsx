/* eslint-disable no-unused-vars */
// ==========================================
// KadesDashboardPage.jsx
// Desain identik RTDashboardPage (quick-nav, banner, statcard, chart,
// riwayat verifikasi, footer, bottom nav). Kades tidak approve apapun.
// ==========================================

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ClipboardList, Bell, CheckCircle2, Eye, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { getSuratList } from '@/features/approval/api';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FooterDesa } from '@/components/layout/FooterDesa';
import { ADMIN_MOBILE_LINKS } from '@/lib/constants/navigation';
import SuratStatChart from '@/features/dashboard-mobile/components/SuratStatChart';
import RiwayatVerifikasiList from '@/features/dashboard-mobile/components/RiwayatVerifikasiList';

const QUICK_NAV = [
  { key: 'pending', label: 'pending', icon: X },
  { key: 'rt_approved', label: 'diproses RW', icon: X },
  { key: 'rw_rejected', label: 'ditolak', icon: X },
  { key: '', label: 'Semua', icon: X },
];

export default function KadesDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSuratList('kepala_desa')
      .then((res) => setLetters(res.data.data ?? []))
      .catch((err) => console.error('GET KADES LIST ERROR', err.response?.data ?? err))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const total = letters.length;
    const ditolak = letters.filter((s) => s.status?.endsWith('_rejected')).length;
    const disetujuiFinal = letters.filter((s) => s.status === 'rw_approved').length;
    const sedangDiproses = letters.filter((s) => !s.status?.endsWith('_rejected') && s.status !== 'rw_approved').length;
    return { total, ditolak, disetujuiFinal, sedangDiproses };
  }, [letters]);

  const chartData = useMemo(() => {
    const grouped = {};
    letters.forEach((s) => {
      const key = s.letter_type?.name ?? 'Lainnya';
      grouped[key] = (grouped[key] ?? 0) + 1;
    });
    return Object.entries(grouped).map(([kategori, jumlah]) => ({ kategori, jumlah }));
  }, [letters]);

  const riwayatVerifikasi = useMemo(() => {
    return letters.slice(0, 5).map((s) => ({
      id: s.id,
      nama: s.applicant_name,
      nik: s.applicant_nik,
      jenisSurat: s.letter_type?.name ?? '-',
      tanggal: s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('id-ID') : '-',
    }));
  }, [letters]);

  return (
    <>
      {/* ===== DESKTOP ===== */}
      <div className="hidden md:block max-w-5xl mx-auto py-6">
        <h1 className="text-lg font-medium text-gray-700 mb-4">Surat Kepala Desa</h1>

        <div className="bg-white rounded-2xl shadow-sm p-4 flex gap-4 mb-6">
          {QUICK_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => navigate(`/admin/list-kades?status=${item.key}`)}
                className="flex flex-col items-center justify-center gap-2 border rounded-xl px-6 py-3 hover:bg-gray-50 flex-1"
              >
                <Icon size={16} className="text-gray-400" />
                <span className="text-sm text-gray-600">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg px-4 py-3 mb-6 flex items-center gap-2">
          <Eye size={16} />
          <span>Halaman ini bersifat pemantauan saja. Kepala Desa tidak melakukan approve/reject surat.</span>
        </div>

        <h2 className="text-base font-medium text-gray-800">Dashboard Kepala Desa</h2>
        <p className="text-sm text-gray-500 mb-6">Wilayah: {user?.wilayah_label ?? 'Desa Cibenda'}</p>

        <div className="grid grid-cols-2 gap-6 max-w-2xl">
          <div className="bg-white rounded-2xl shadow-sm px-6 py-5 flex flex-col gap-1 relative">
            <div className="absolute top-4 right-4 text-gray-400"><ClipboardList size={18} /></div>
            <span className="text-2xl font-semibold text-gray-800">{stats.ditolak}</span>
            <span className="text-sm text-gray-500">Total ditolak</span>
          </div>
          <div className="bg-white rounded-2xl shadow-sm px-6 py-5 flex flex-col gap-1 relative">
            <div className="absolute top-4 right-4 text-gray-400"><Bell size={18} /></div>
            <span className="text-2xl font-semibold text-gray-800">{stats.sedangDiproses}</span>
            <span className="text-sm text-gray-500">Sedang diproses</span>
          </div>
          <div className="bg-white rounded-2xl shadow-sm px-6 py-5 flex flex-col gap-1 relative">
            <div className="absolute top-4 right-4 text-gray-400"><X size={18} /></div>
            <span className="text-2xl font-semibold text-gray-800">{stats.total}</span>
            <span className="text-sm text-gray-500">Total Permohonan</span>
          </div>
          <div className="bg-white rounded-2xl shadow-sm px-6 py-5 flex flex-col gap-1 relative">
            <div className="absolute top-4 right-4 text-gray-400"><CheckCircle2 size={18} /></div>
            <span className="text-2xl font-semibold text-gray-800">{stats.disetujuiFinal}</span>
            <span className="text-sm text-gray-500">Disetujui final</span>
          </div>
        </div>
      </div>

      {/* ===== MOBILE ===== */}
      <div className="md:hidden bg-gray-50 min-h-screen pb-20">
        <div className="px-4 pt-4">
          <p className="text-green-700 font-semibold">Digital Amanah</p>
          <p className="text-xs text-gray-400 mb-4">Dashboard Kepala Desa</p>

          <h1 className="text-xl font-bold text-gray-800 mb-1">Selamat Pagi, {user?.name ?? 'Bapak/Ibu'}</h1>
          <p className="text-sm text-gray-500 mb-4">Pantau administrasi desa secara digital.</p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <button onClick={() => navigate(`/admin/list-kades?status=pending`)} className="bg-white rounded-2xl shadow-sm p-4 text-left relative">
              <div className="flex justify-between items-start mb-2">
                <Mail size={18} className="text-green-600" />
              </div>
              <p className="text-[10px] text-gray-400 uppercase">Permohonan</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </button>
            <button onClick={() => navigate(`/admin/list-kades`)} className="bg-white rounded-2xl shadow-sm p-4 text-left relative">
              <div className="flex justify-between items-start mb-2">
                <ShieldCheck size={18} className="text-green-600" />
              </div>
              <p className="text-[10px] text-gray-400 uppercase">Sedang diproses</p>
              <p className="text-2xl font-bold text-gray-800">{stats.sedangDiproses.toString().padStart(2, '0')}</p>
            </button>
          </div>

          <button onClick={() => navigate(`/admin/list-kades?status=rw_approved`)} className="w-full bg-white rounded-2xl shadow-sm p-4 text-left mb-4">
            <div className="flex justify-between items-center mb-1">
              <CheckCircle2 size={18} className="text-green-600" />
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
        <MobileBottomNav links={ADMIN_MOBILE_LINKS('/admin/dashboard-surat-kades', '/admin/list-kades')} />
      </div>
    </>
  );
}