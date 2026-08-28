// ==========================================
// OperatorDesaDashboardPage.jsx
// Halaman Ringkasan Operator Desa
// Styling menggunakan Global CSS SID.
// ==========================================

import { useEffect, useMemo, useState } from 'react';
import {
  getSuratList,
  getGenderStats,
} from '@/features/approval/api';

import { useAuth } from '@/features/auth/contexts/AuthContext';

import {
  ClipboardList,
  ListChecks,
  CheckCircle2,
} from 'lucide-react';

import SuratStatChart from '@/features/dashboard-mobile/components/SuratStatChart';
import GenderStatCard from '@/features/operator-desa/components/GenderStatCard';
import { FooterOperator } from '@/components/layout/FooterOperator';
import DashboardFlowCard from '@/features/operator-desa/components/DashboardFlowCard';
import { getGreeting } from '@/lib/utils/greeting';

export default function OperatorDesaDashboardPage() {
  const { user } = useAuth();
  const greeting = getGreeting();

  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);

  const [genderStats, setGenderStats] = useState({
    total: 0,
    laki: 0,
    perempuan: 0,
  });

  const ROLE_ENDPOINT = {
    rt: 'rt',
    rw: 'rw',
    kasi_pelayanan: 'kasi',
    kaur_tu_umum: 'kasi',
    petugas_desa: 'kasi',
  };

  const roleKey =
    ROLE_ENDPOINT[user?.role] ?? user?.role;

  // ==========================================
  // LOAD DATA DASHBOARD
  // ==========================================

  const loadDashboardData = async (showLoading = true) => {
    if (!roleKey) return;

    if (showLoading) {
      setLoading(true);
    }

    try {
      const [suratRes, genderRes] = await Promise.all([
        getSuratList(roleKey),
        getGenderStats(),
      ]);

      setLetters(suratRes.data);
      setGenderStats(genderRes.data);
    } catch (err) {
      console.error(
        'GET OPERATOR DASHBOARD ERROR:',
        err.response?.data ?? err
      );
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // ==========================================
  // LOAD PERTAMA KALI
  // ==========================================

  useEffect(() => {
    loadDashboardData(true);
  }, [roleKey]);

  // ==========================================
  // AUTO REFRESH SETIAP 5 DETIK
  // ==========================================

  useEffect(() => {
    if (!roleKey) return;

    const interval = setInterval(() => {
      loadDashboardData(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [roleKey]);

  // ==========================================
  // STATISTIK
  // ==========================================

  const stats = useMemo(() => {
    const permohonan = letters.length;

    const verifikasi = letters.filter(
      (s) => s.status === 'rw_approved'
    ).length;

    const selesai = letters.filter(
      (s) => s.status === 'kasi_approved'
    ).length;

    return {
      permohonan,
      verifikasi,
      selesai,
    };
  }, [letters]);

  // ==========================================
  // RENDER
  // ==========================================

  const hariIni = new Date().toLocaleDateString(
    'id-ID',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }
  );

  return (
    <div className="sid-operator-dashboard">

      <main className="sid-operator-dashboard-content">

        {/* ======================================
            HEADER
        ====================================== */}

        <header className="sid-operator-header">

          <div className="sid-operator-header-info">
            <h1 className="sid-operator-greeting">
              {greeting},{' '}
              {user?.name ?? 'Bapak/Ibu'}
            </h1>
          </div>

          <span className="sid-operator-date">
            {hariIni}
          </span>

        </header>


        {/* ======================================
            STATISTIK
        ====================================== */}

        <section className="sid-operator-stats-grid">

          {/* TOTAL PERMOHONAN */}

          <div className="sid-operator-stat-card">

            <div className="sid-operator-stat-content">

              <p className="sid-operator-stat-label">
                Total Permohonan
              </p>

              <p className="sid-operator-stat-value yellow">
                {loading ? '-' : stats.permohonan}
              </p>

            </div>

            <div className="sid-operator-stat-icon yellow">
              <ClipboardList size={20} />
            </div>

          </div>


          {/* VERIFIKASI */}

          <div className="sid-operator-stat-card">

            <div className="sid-operator-stat-content">

              <p className="sid-operator-stat-label">
                Verifikasi
              </p>

              <p className="sid-operator-stat-value blue">
                {loading ? '-' : stats.verifikasi}
              </p>

            </div>

            <div className="sid-operator-stat-icon blue">
              <ListChecks size={20} />
            </div>

          </div>


          {/* SELESAI */}

          <div className="sid-operator-stat-card">

            <div className="sid-operator-stat-content">

              <p className="sid-operator-stat-label">
                Selesai
              </p>

              <p className="sid-operator-stat-value green">
                {loading ? '-' : stats.selesai}
              </p>

            </div>

            <div className="sid-operator-stat-icon green">
              <CheckCircle2 size={20} />
            </div>

          </div>


          {/* GENDER */}

          <div className="sid-operator-gender-card">

            <GenderStatCard
              total={genderStats.total}
              laki={genderStats.laki}
              perempuan={genderStats.perempuan}
            />

          </div>

        </section>


        {/* ======================================
            CHART + FLOW
        ====================================== */}

        <section className="sid-operator-dashboard-grid">

          <div className="sid-operator-chart-wrapper">
            <SuratStatChart
              letters={letters}
            />
          </div>

          <div className="sid-operator-flow-wrapper">
            <DashboardFlowCard
              letters={letters}
              loading={loading}
            />
          </div>

        </section>

      </main>


      {/* ======================================
          FOOTER
      ====================================== */}

      <FooterOperator />

    </div>
  );
}