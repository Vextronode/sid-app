// ==========================================
// OperatorDesaDashboardPage.jsx
// Halaman Ringkasan untuk Operator Desa (Petugas Desa/Kasi/Kaur — 1 role
// gabungan, tampilan sama untuk ketiganya, cuma web/desktop).
// Surat cuma bisa di-print kalau status rw_approved, selain itu aksi
// print di-disable (logic ada di RiwayatVerifikasiTable.jsx).
// ==========================================

import { useEffect, useMemo, useState } from 'react';
import { getSuratList, getGenderStats } from "@/features/approval/api";
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { ClipboardList, ListChecks, CheckCircle2 } from 'lucide-react';
import SuratStatChart from '@/features/dashboard-mobile/components/SuratStatChart';
import GenderStatCard from '@/features/operator-desa/components/GenderStatCard';
import RiwayatVerifikasiTable from '@/features/operator-desa/components/RiwayatVerifikasiTable';
import { FooterOperator } from '@/components/layout/FooterOperator';
import DashboardFlowCard from "@/features/operator-desa/components/DashboardFlowCard";

export default function OperatorDesaDashboardPage() {
  const { user } = useAuth();
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
useEffect(() => {
  
}, [letters]);
  const ROLE_ENDPOINT = {
    rt: "rt",
    rw: "rw",


    kasi_pelayanan: "kasi",
    kaur_tu_umum: "kasi",
    petugas_desa: "kasi",
  };

 const roleKey = ROLE_ENDPOINT[user?.role] ?? user?.role;

useEffect(() => {
  if (!roleKey) return;

  setLoading(true);
getGenderStats().then((res) => {
    setGenderStats(res.data);
});
getSuratList(roleKey)
  .then((res) => {

    setLetters(res.data);
  })
    .catch((err) => {
      console.error(
        "GET OPERATOR DESA LIST ERROR",
        err.response?.data ?? err
      );
    })
    .finally(() => {
      setLoading(false);
    });

}, [roleKey]);

  const [genderStats, setGenderStats] = useState({
    total: 0,
    laki: 0,
    perempuan: 0,
});
const stats = useMemo(() => {
  const permohonan = letters.length;

  const verifikasi = letters.filter((s) =>
    ["rt_approved", "rw_approved"].includes(s.status)
  ).length;

  const selesai = letters.filter(
    (s) => s.status === "kasi_approved"
  ).length;

  return {
    permohonan,
    verifikasi,
    selesai,
  };
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
    <div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Selamat Pagi, {user?.name ?? 'Bapak/Ibu'}</h1>
          </div>
          <span className="text-sm text-gray-500 capitalize">{hariIni}</span>
        </div>

        {/* 4 kartu statistik */}
        <div className="grid grid-cols-4 gap-4  mb-6">
          <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 uppercase mb-1">Total Permohonan</p>
              <p className="text-3xl font-bold text-yellow-600">{loading ? '-' : stats.permohonan}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-yellow-100 flex items-center justify-center text-yellow-600">
              <ClipboardList size={20} />
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 uppercase mb-1">Verifikasi</p>
              <p className="text-3xl font-bold text-blue-600">{loading ? '-' : stats.verifikasi}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <ListChecks size={20} />
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 uppercase mb-1">Selesai</p>
              <p className="text-3xl font-bold text-green-600">{loading ? '-' : stats.selesai}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
              <CheckCircle2 size={20} />
            </div>
          </div>
                    <GenderStatCard 
              total={genderStats.total}
              laki={genderStats.laki}
              perempuan={genderStats.perempuan}
          />
        </div>

        {/* Chart +  */}
<div className="grid grid-cols-4 gap-4 mb-6">
  <div className="col-span-3">
    <SuratStatChart letters={letters} />
  </div>

  <div className="col-span-1 flex">
    <DashboardFlowCard
      letters={letters}
      loading={loading}
    />
  </div>
</div>



      </div>

<FooterOperator />
    </div>
  );
}