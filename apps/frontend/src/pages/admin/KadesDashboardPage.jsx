// ==========================================
// KadesDashboardPage.jsx
// RiwayatVerifikasiTable diganti QuickNavButtons. Monitoring-only.
// ==========================================

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, ClipboardList, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { getSuratList } from '@/features/approval/api';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FooterDesa } from '@/components/layout/FooterDesa';
import { ADMIN_MOBILE_LINKS } from '@/lib/constants/navigation';
import SuratStatChart from '@/features/dashboard-mobile/components/SuratStatChart';
import QuickNavButtons from '@/features/dashboard-mobile/components/QuickNavButtons';

const QUICK_NAV_KADES = [
  { key: 'pending', label: 'Menunggu' },
  { key: 'rw_approved', label: 'Disetujui' },
  { key: '', label: 'Ditolak' },
  { key: '', label: 'Semua' },
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
    const sedangDiproses = letters.filter((s) => !s.status?.endsWith('_rejected') && s.status !== 'rw_approved').length;
    const disetujuiFinal = letters.filter((s) => s.status === 'rw_approved').length;
    return { total, sedangDiproses, disetujuiFinal };
  }, [letters]);

  const chartData = useMemo(() => {
    const grouped = {};
    letters.forEach((s) => {
      const key = s.letter_type?.name ?? 'Lainnya';
      grouped[key] = (grouped[key] ?? 0) + 1;
    });
    return Object.entries(grouped).map(([kategori, jumlah]) => ({ kategori, jumlah }));
  }, [letters]);

  const hariIni = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      {/* ===== DESKTOP ===== */}
      <div className="hidden md:block">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Selamat Pagi, {user?.name ?? 'Bapak/Ibu'}</h1>
              <p className="text-sm text-gray-500">Pantau administrasi desa secara digital.</p>
            </div>
            <span className="text-sm text-gray-500 capitalize">{hariIni}</span>
          </div>

          <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg px-4 py-3 mb-6 flex items-center gap-2">
            <Eye size={16} />
            <span>Halaman ini bersifat pemantauan saja. Kepala Desa tidak melakukan approve/reject surat.</span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <button onClick={() => navigate('/admin/list-kades')} className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between text-left hover:shadow-md transition-shadow">
              <div>
                <p className="text-[10px] text-gray-400 uppercase mb-1">Total Permohonan</p>
                <p className="text-3xl font-bold text-gray-800">{loading ? '-' : stats.total}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">
                <ClipboardList size={20} />
              </div>
            </button>

            <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-400 uppercase mb-1">Sedang Diproses</p>
                <p className="text-3xl font-bold text-blue-600">{loading ? '-' : stats.sedangDiproses}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                <Eye size={20} />
              </div>
            </div>

            <button onClick={() => navigate('/admin/list-kades?status=rw_approved')} className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between text-left hover:shadow-md transition-shadow">
              <div>
                <p className="text-[10px] text-gray-400 uppercase mb-1">Disetujui Final</p>
                <p className="text-3xl font-bold text-green-600">{loading ? '-' : stats.disetujuiFinal}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
                <CheckCircle2 size={20} />
              </div>
            </button>
          </div>

          <div className="mb-6"><SuratStatChart data={chartData} /></div>
          <QuickNavButtons items={QUICK_NAV_KADES} basePath="/admin/list-kades" />
        </div>
        <FooterDesa />
      </div>

      {/* ===== MOBILE ===== */}
      <div className="md:hidden bg-gray-50 min-h-screen pb-20">
        <div className="px-4 pt-4">
          <p className="text-green-700 font-semibold">Digital Amanah</p>
          <p className="text-xs text-gray-400 mb-4">Dashboard Kepala Desa</p>

          <h1 className="text-xl font-bold text-gray-800 mb-1">Selamat Pagi, {user?.name ?? 'Bapak/Ibu'}</h1>
          <p className="text-sm text-gray-500 mb-4">Pantau administrasi desa secara digital.</p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <button onClick={() => navigate('/admin/list-kades')} className="bg-white rounded-2xl shadow-sm p-4 text-left relative">
              <div className="flex justify-between items-start mb-2"><ClipboardList size={18} className="text-green-600" /></div>
              <p className="text-[10px] text-gray-400 uppercase">Total Permohonan</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </button>
            <button onClick={() => navigate('/admin/list-kades')} className="bg-white rounded-2xl shadow-sm p-4 text-left relative">
              <div className="flex justify-between items-start mb-2"><Eye size={18} className="text-green-600" /></div>
              <p className="text-[10px] text-gray-400 uppercase">Sedang diproses</p>
              <p className="text-2xl font-bold text-gray-800">{stats.sedangDiproses}</p>
            </button>
          </div>

          <button onClick={() => navigate('/admin/list-kades?status=rw_approved')} className="w-full bg-white rounded-2xl shadow-sm p-4 text-left mb-4">
            <div className="flex justify-between items-center mb-1"><CheckCircle2 size={18} className="text-green-600" /></div>
            <p className="text-[10px] text-gray-400 uppercase">Disetujui final</p>
            <p className="text-2xl font-bold text-gray-800">{stats.disetujuiFinal}</p>
          </button>

          <div className="mb-4"><SuratStatChart data={chartData} /></div>
          <div className="mb-4"><QuickNavButtons items={QUICK_NAV_KADES} basePath="/admin/list-kades" /></div>
        </div>

        <FooterDesa />
        <MobileBottomNav links={ADMIN_MOBILE_LINKS('/admin/dashboard-surat-kades', '/admin/list-kades')} />
      </div>
    </>
  );
}