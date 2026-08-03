/* eslint-disable no-unused-vars */
// ==========================================
// RWDashboardPage.jsx
// RiwayatVerifikasiTable diganti QuickNavButtons.
// ==========================================

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ShieldCheck, ClipboardList, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { getSuratList } from '@/features/approval/api';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FooterDesa } from '@/components/layout/FooterDesa';
import { ADMIN_MOBILE_LINKS } from '@/lib/constants/navigation';
import SuratStatChart from '@/features/dashboard-mobile/components/SuratStatChart';
import QuickNavButtons from '@/features/dashboard-mobile/components/QuickNavButtons';
import { getGreeting } from '@/lib/utils/greeting';

const QUICK_NAV_RW = [
  { key: 'rt_approved', label: 'Menunggu' },
  { key: 'rw_approved', label: 'Disetujui' },
  { key: 'rw_rejected', label: 'Ditolak' },
  { key: '', label: 'Semua' },
];

export default function RWDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSuratList('rw')
      .then((res) => setLetters(res.data.data ?? []))
      .catch((err) => console.error('GET RW LIST ERROR', err.response?.data ?? err))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const permohonanBaru = letters.filter((s) => s.status === 'rt_approved').length;
    const sedangDiproses = letters.filter((s) => !s.status?.endsWith('_rejected') && s.status !== 'rw_approved' && s.status !== 'rt_approved').length;
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

  const hariIni = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      {/* ===== DESKTOP ===== */}
      <div className="hidden md:block">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{getGreeting()}, {user?.name ?? 'Bapak/Ibu'}</h1>
              <p className="text-sm text-gray-500">Kelola administrasi warga {user?.wilayah_label ?? 'RW'} dengan lebih cepat.</p>
            </div>
            <span className="text-sm text-gray-500 capitalize">{hariIni}</span>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <button onClick={() => navigate('/admin/list-rw?status=rt_approved')} className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between text-left hover:shadow-md transition-shadow">
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

            <button onClick={() => navigate('/admin/list-rw?status=rw_approved')} className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between text-left hover:shadow-md transition-shadow">
              <div>
                <p className="text-[10px] text-gray-400 uppercase mb-1">Disetujui Final</p>
                <p className="text-3xl font-bold text-green-600">{loading ? '-' : stats.disetujuiFinal}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
                <CheckCircle2 size={20} />
              </div>
            </button>
          </div>

          <div className="mb-6">
            <SuratStatChart letters={letters} />
          </div>

          <QuickNavButtons items={QUICK_NAV_RW} basePath="/admin/list-rw" />
        </div>
        <FooterDesa />
      </div>

      {/* ===== MOBILE ===== */}
      <div className="md:hidden flex flex-col min-h-screen bg-gray-50">
        <div className="flex-1 px-4 pt-4">
         

          <h1 className="text-xl font-bold text-gray-800 mb-1">{getGreeting()}, {user?.name ?? 'Bapak/Ibu'}</h1>
          <p className="text-sm text-gray-500 mb-4">Kelola administrasi warga {user?.wilayah_label ?? 'RW'} dengan lebih cepat.</p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <button onClick={() => navigate('/admin/list-rw?status=rt_approved')} className="bg-white rounded-2xl shadow-sm p-4 text-left relative">
              <div className="flex justify-between items-start mb-2"><Mail size={18} className="text-green-600" /></div>
              <p className="text-[10px] text-gray-400 uppercase">Permohonan</p>
              <p className="text-2xl font-bold text-gray-800">{stats.permohonanBaru}</p>
            </button>
            <button onClick={() => navigate('/admin/list-rw')} className="bg-white rounded-2xl shadow-sm p-4 text-left relative">
              <div className="flex justify-between items-start mb-2"><ShieldCheck size={18} className="text-green-600" /></div>
              <p className="text-[10px] text-gray-400 uppercase">Sedang diproses</p>
              <p className="text-2xl font-bold text-gray-800">{stats.sedangDiproses.toString().padStart(2, '0')}</p>
            </button>
          </div>

          <button onClick={() => navigate('/admin/list-rw?status=rw_approved')} className="w-full bg-white rounded-2xl shadow-sm p-4 text-left mb-4">
            <div className="flex justify-between items-center mb-1"><CheckCircle2 size={18} className="text-green-600" /></div>
            <p className="text-[10px] text-gray-400 uppercase">Selesai</p>
            <p className="text-2xl font-bold text-gray-800">{stats.disetujuiFinal}</p>
          </button>

          <div className="mb-4"><SuratStatChart letters={letters} /></div>
          <div className="mb-4"><QuickNavButtons items={QUICK_NAV_RW} basePath="/admin/list-rw" /></div>
        </div>

        <div className="pb-16">
          <FooterDesa />
        </div>
        <MobileBottomNav links={ADMIN_MOBILE_LINKS('/admin/dashboard-surat-rw', '/admin/list-rw')} />
      </div>
    </>
  );
}