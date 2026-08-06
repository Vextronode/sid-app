// ==========================================
// RWDashboardPage.jsx
// Isi 4 kotak SAMA di desktop & mobile (Permohonan, Sedang Diproses,
// Selesai, Ditolak — 1 sumber data STAT_CARDS), tata letak beda:
// desktop grid-cols-4 (sejajar), mobile grid-cols-2 (2x2).
// ==========================================

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { getSuratList } from '@/features/approval/api';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FooterDesa } from '@/components/layout/FooterDesa';
import { ADMIN_MOBILE_LINKS } from '@/lib/constants/navigation';
import { getGreeting } from '@/lib/utils/greeting';
import SuratStatChart from '@/features/dashboard-mobile/components/SuratStatChart';
import QuickNavButtons from '@/features/dashboard-mobile/components/QuickNavButtons';

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
    const disetujuiFinal = letters.filter((s) => s.status === 'rw_approved').length;
    const ditolak = letters.filter((s) => s.status?.endsWith('_rejected')).length;
    return { permohonanBaru, sedangDiproses, disetujuiFinal, ditolak };
  }, [letters]);

  const chartData = useMemo(() => {
    const grouped = {};
    letters.forEach((s) => {
      const key = s.letter_type?.name ?? 'Lainnya';
      grouped[key] = (grouped[key] ?? 0) + 1;
    });
    return Object.entries(grouped).map(([kategori, jumlah]) => ({ kategori, jumlah }));
  }, [letters]);

  // ⚠️ SATU sumber data, dipakai bareng oleh versi desktop & mobile —
  // supaya ISINYA selalu konsisten, walau tata letaknya nanti beda.
  const STAT_CARDS = [
    {
      key: 'permohonan',
      label: 'Permohonan',
      value: stats.permohonanBaru,
      icon: Mail,
      color: 'text-green-600 bg-green-100',
      onClick: () => navigate('/admin/list-rw?status=rt_approved'),
    },
    {
      key: 'diproses',
      label: 'Sedang Diproses',
      value: stats.sedangDiproses,
      icon: ShieldCheck,
      color: 'text-blue-600 bg-blue-100',
      onClick: () => navigate('/admin/list-rw'),
    },
    {
      key: 'selesai',
      label: 'Selesai',
      value: stats.disetujuiFinal,
      icon: CheckCircle2,
      color: 'text-green-600 bg-green-100',
      onClick: () => navigate('/admin/list-rw?status=rw_approved'),
    },
    {
      key: 'ditolak',
      label: 'Ditolak',
      value: stats.ditolak,
      icon: XCircle,
      color: 'text-red-500 bg-red-100',
      onClick: () => navigate('/admin/list-rw?status=rw_rejected'),
    },
  ];

  const hariIni = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      {/* ===== DESKTOP — tata letak 4 kolom sejajar ===== */}
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
            {STAT_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.key}
                  onClick={card.onClick}
                  className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between text-left hover:shadow-md transition-shadow"
                >
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase mb-1">{card.label}</p>
                    <p className="text-3xl font-bold text-gray-800">{loading ? '-' : card.value}</p>
                  </div>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${card.color}`}>
                    <Icon size={20} />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mb-6">
            <SuratStatChart data={chartData} />
          </div>

          <QuickNavButtons items={QUICK_NAV_RW} basePath="/admin/list-rw" />
        </div>
        <FooterDesa />
      </div>

      {/* ===== MOBILE — tata letak 2x2 ===== */}
      <div className="md:hidden bg-gray-50 min-h-screen pb-20">
        <div className="px-4 pt-4">

          <h1 className="text-xl font-bold text-gray-800 mb-1">{getGreeting()}, {user?.name ?? 'Bapak/Ibu'}</h1>
          <p className="text-sm text-gray-500 mb-4">Kelola administrasi warga {user?.wilayah_label ?? 'RW'} dengan lebih cepat.</p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {STAT_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.key}
                  onClick={card.onClick}
                  className="bg-white rounded-2xl shadow-sm p-4 text-left"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${card.color}`}>
                    <Icon size={16} />
                  </div>
                  <p className="text-[10px] text-gray-400 uppercase">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-800">{loading ? '-' : card.value}</p>
                </button>
              );
            })}
          </div>

          <div className="mb-4"><SuratStatChart data={chartData} /></div>
          <div className="mb-4"><QuickNavButtons items={QUICK_NAV_RW} basePath="/admin/list-rw" /></div>
        </div>

        <FooterDesa />
        <MobileBottomNav links={ADMIN_MOBILE_LINKS('/admin/dashboard-surat-rw', '/admin/list-rw')} />
      </div>
    </>
  );
}