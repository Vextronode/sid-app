/* eslint-disable no-unused-vars */
// ==========================================
// RTDashboardPage.jsx
// Navbar tetap AdminLayout (bar atas), TAPI kontennya sekarang pakai
// desain baru "Digital Amanah" (statcard dengan ikon, chart, riwayat
// verifikasi), disusun grid untuk layar desktop. Mobile tetap versi
// ringkas sebelumnya.
// ==========================================

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ClipboardList, Bell, CheckCircle2, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { getSuratList } from '@/features/approval/api';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FooterDesa } from '@/components/layout/FooterDesa';
import { ADMIN_MOBILE_LINKS } from '@/lib/constants/navigation';
import SuratStatChart from '@/features/dashboard-mobile/components/SuratStatChart';
import RiwayatVerifikasiTable from '@/features/operator-desa/components/RiwayatVerifikasiTable';

export default function RTDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSuratList('rt')
      .then((res) => setLetters(res.data.data ?? []))
      .catch((err) => console.error('GET RT LIST ERROR', err.response?.data ?? err))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const permohonanBaru = letters.filter((s) => s.status === 'pending').length;
    const sedangDiproses = letters.filter((s) => !s.status?.endsWith('_rejected') && s.status !== 'rw_approved' && s.status !== 'pending').length;
    const total = letters.length;
    const disetujuiFinal = letters.filter((s) => s.status === 'rw_approved').length;
    return { permohonanBaru, sedangDiproses, total, disetujuiFinal };
  }, [letters]);

  const chartData = useMemo(() => {
    const grouped = {};
    letters.forEach((s) => {
      const key = s.letter_type?.name ?? 'Lainnya';
      grouped[key] = (grouped[key] ?? 0) + 1;
    });
    return Object.entries(grouped).map(([kategori, jumlah]) => ({ kategori, jumlah }));
  }, [letters]);

  const riwayatTerbaru = useMemo(() => letters.slice(0, 5), [letters]);

  const hariIni = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      {/* ===== DESKTOP — navbar bar atas (AdminLayout), konten gaya baru ===== */}
      <div className="hidden md:block p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Selamat Pagi, {user?.name ?? 'Bapak/Ibu'}</h1>
            <p className="text-sm text-gray-500">Kelola administrasi warga {user?.wilayah_label ?? 'RT'} dengan lebih cepat.</p>
          </div>
          <span className="text-sm text-gray-500 capitalize">{hariIni}</span>
        </div>

        {/* 4 kartu statistik dengan ikon, gaya baru */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <button onClick={() => navigate('/admin/list-rt?status=pending')} className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between text-left hover:shadow-md transition-shadow">
            <div>
              <p className="text-[10px] text-gray-400 uppercase mb-1">Permohonan Baru</p>
              <p className="text-3xl font-bold text-green-600">{loading ? '-' : stats.permohonanBaru}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
              <Mail size={20} />
            </div>
          </button>

          <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 uppercase mb-1">Sedang Diproses</p>
              <p className="text-3xl font-bold text-blue-600">{loading ? '-' : stats.sedangDiproses}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <ShieldCheck size={20} />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 uppercase mb-1">Total Permohonan</p>
              <p className="text-3xl font-bold text-gray-800">{loading ? '-' : stats.total}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">
              <ClipboardList size={20} />
            </div>
          </div>

          <button onClick={() => navigate('/admin/list-rt?status=rw_approved')} className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between text-left hover:shadow-md transition-shadow">
            <div>
              <p className="text-[10px] text-gray-400 uppercase mb-1">Disetujui Final</p>
              <p className="text-3xl font-bold text-green-600">{loading ? '-' : stats.disetujuiFinal}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
              <CheckCircle2 size={20} />
            </div>
          </button>
        </div>

        {/* Chart statistik */}
        <div className="mb-6">
          <SuratStatChart data={chartData} />
        </div>

        {/* Riwayat verifikasi */}
        <RiwayatVerifikasiTable data={riwayatTerbaru} />
      </div>

      {/* ===== MOBILE — tetap versi ringkas sebelumnya ===== */}
      <div className="md:hidden bg-gray-50 min-h-screen pb-20">
        <div className="px-4 pt-4">
          <p className="text-green-700 font-semibold">Digital Amanah</p>
          <p className="text-xs text-gray-400 mb-4">Dashboard Ketua RT</p>

          <h1 className="text-xl font-bold text-gray-800 mb-1">Selamat Pagi, {user?.name ?? 'Bapak/Ibu'}</h1>
          <p className="text-sm text-gray-500 mb-4">Kelola administrasi warga {user?.wilayah_label ?? 'RT'} dengan lebih cepat.</p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <button onClick={() => navigate('/admin/list-rt?status=pending')} className="bg-white rounded-2xl shadow-sm p-4 text-left relative">
              <div className="flex justify-between items-start mb-2">
                <Mail size={18} className="text-green-600" />
              </div>
              <p className="text-[10px] text-gray-400 uppercase">Permohonan</p>
              <p className="text-2xl font-bold text-gray-800">{stats.permohonanBaru}</p>
            </button>
            <button onClick={() => navigate('/admin/list-rt')} className="bg-white rounded-2xl shadow-sm p-4 text-left relative">
              <div className="flex justify-between items-start mb-2">
                <ShieldCheck size={18} className="text-green-600" />
              </div>
              <p className="text-[10px] text-gray-400 uppercase">Sedang diproses</p>
              <p className="text-2xl font-bold text-gray-800">{stats.sedangDiproses.toString().padStart(2, '0')}</p>
            </button>
          </div>

          <button onClick={() => navigate('/admin/list-rt?status=rw_approved')} className="w-full bg-white rounded-2xl shadow-sm p-4 text-left mb-4">
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
            <RiwayatVerifikasiTable data={riwayatTerbaru} />
          </div>
        </div>

        <FooterDesa />
        <MobileBottomNav links={ADMIN_MOBILE_LINKS('/admin/dashboard-surat-rt', '/admin/list-rt')} />
      </div>
    </>
  );
}