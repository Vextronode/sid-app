// ==========================================
// RTDashboardPage.jsx
// Dashboard RT
//
// Desktop : 4 Stat Card sejajar
// Mobile  : 4 Stat Card dalam layout 2x2
//
// Urutan:
// Header
//   ↓
// Stat Cards
//   ↓
// Grafik
//   ↓
// Footer
//
// Tidak ada QuickNavButtons setelah grafik.
// ==========================================

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Mail,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

import { useAuth } from '@/features/auth/contexts/AuthContext';
import { getSuratList } from '@/features/approval/api';

import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FooterDesa } from '@/components/layout/FooterDesa';

import { ADMIN_MOBILE_LINKS } from '@/lib/constants/navigation';
import { getGreeting } from '@/lib/utils/greeting';

import SuratStatChart from '@/features/dashboard-mobile/components/SuratStatChart';


// ==========================================
// COMPONENT
// ==========================================

export default function RTDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);


  // ==========================================
  // LOAD DATA DASHBOARD RT
  // ==========================================

  const loadDashboardData = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const res = await getSuratList('rt');

      setLetters(res.data?.data ?? []);
    } catch (err) {
      console.error(
        'GET RT DASHBOARD ERROR:',
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
  }, []);


  // ==========================================
  // AUTO REFRESH SETIAP 5 DETIK
  // ==========================================

  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboardData(false);
    }, 5000);

    return () => clearInterval(interval);
  }, []);


  // ==========================================
  // STATISTIK
  // ==========================================

  const stats = useMemo(() => {
    const permohonanBaru = letters.filter(
      (s) => s.status === 'pending'
    ).length;

    const sedangDiproses = letters.filter(
      (s) =>
        !s.status?.endsWith('_rejected') &&
        s.status !== 'rw_approved' &&
        s.status !== 'pending'
    ).length;

    const disetujuiFinal = letters.filter(
      (s) => s.status === 'rw_approved'
    ).length;

    const ditolak = letters.filter(
      (s) => s.status?.endsWith('_rejected')
    ).length;

    return {
      permohonanBaru,
      sedangDiproses,
      disetujuiFinal,
      ditolak,
    };
  }, [letters]);


  // ==========================================
  // STAT CARDS
  // Satu sumber data untuk desktop & mobile
  // ==========================================

  const STAT_CARDS = [
    {
      key: 'permohonan',
      label: 'Menunggu',
      value: stats.permohonanBaru,
      icon: Mail,

      iconBg: 'var(--sid-status-pending-bg)',
      iconColor: 'var(--sid-status-pending-text)',

      onClick: () =>
        navigate('/admin/list-rt?status=pending'),
    },

    {
      key: 'diproses',
      label: 'Sedang Diproses',
      value: stats.sedangDiproses,
      icon: ShieldCheck,

      iconBg: 'var(--sid-status-progress-bg)',
      iconColor: 'var(--sid-status-progress-text)',

      onClick: () =>
        navigate('/admin/list-rt'),
    },

    {
      key: 'selesai',
      label: 'Selesai',
      value: stats.disetujuiFinal,
      icon: CheckCircle2,

      iconBg: 'var(--sid-status-done-bg)',
      iconColor: 'var(--sid-status-done-text)',

      onClick: () =>
        navigate('/admin/list-rt?status=rw_approved'),
    },

    {
      key: 'ditolak',
      label: 'Ditolak',
      value: stats.ditolak,
      icon: XCircle,

      iconBg: 'var(--sid-status-rejected-bg)',
      iconColor: 'var(--sid-status-rejected-text)',

      onClick: () =>
        navigate('/admin/list-rt?status=rt_rejected'),
    },
  ];


  // ==========================================
  // TANGGAL
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


  // ==========================================
  // RENDER
  // ==========================================

  return (
    <>
      {/* ========================================
          DESKTOP
          ======================================== */}

      <div className="hidden md:block">

        <div className="sid-page max-w-3xl">

          {/* ======================================
              HEADER
              ====================================== */}

          <div className="flex items-start justify-between mb-6">

            <div>

              <h1 className="sid-page-title">
                {getGreeting()}, {user?.name ?? 'Bapak/Ibu'}
              </h1>

              <p className="sid-page-description">
                Kelola administrasi warga{' '}
                {user?.wilayah_label ?? 'RT'} dengan lebih cepat.
              </p>

            </div>

            <span className="
              text-xs
              text-[var(--sid-text-muted)]
              capitalize
              pt-1
            ">
              {hariIni}
            </span>

          </div>


          {/* ======================================
              STAT CARDS
              ====================================== */}

          <div className="
            grid
            grid-cols-4
            gap-4
            mb-6
          ">

            {STAT_CARDS.map((card) => {

              const Icon = card.icon;

              return (
                <button
                  key={card.key}
                  onClick={card.onClick}
                  className="
                    sid-stat-card
                    p-5
                    flex
                    items-center
                    justify-between
                  "
                >

                  <div>

                    <p className="
                      text-[10px]
                      text-[var(--sid-text-muted)]
                      uppercase
                      mb-1
                    ">
                      {card.label}
                    </p>

                    <p className="
                      text-3xl
                      font-bold
                      text-[var(--sid-text-primary)]
                    ">
                      {loading ? '-' : card.value}
                    </p>

                  </div>


                  <div
                    className="
                      w-11
                      h-11
                      rounded-[var(--radius-md)]
                      flex
                      items-center
                      justify-center
                      shrink-0
                    "
                    style={{
                      background: card.iconBg,
                      color: card.iconColor,
                    }}
                  >
                    <Icon size={20} />
                  </div>

                </button>
              );

            })}

          </div>


          {/* ======================================
              GRAFIK
              ====================================== */}

          <div className="mb-6">
            <SuratStatChart letters={letters} />
          </div>

        </div>


        {/* ======================================
            FOOTER DESKTOP
            ====================================== */}

        <FooterDesa />

      </div>


      {/* ========================================
          MOBILE
          ======================================== */}

      <div className="
        md:hidden
        min-h-screen
        bg-[var(--sid-surface-page)]
      ">

        <div className="
          sid-page
          max-w-none
          sid-mobile-content
        ">

          {/* ======================================
              HEADER
              ====================================== */}

          <h1 className="sid-page-title">
            {getGreeting()}, {user?.name ?? 'Bapak/Ibu'}
          </h1>

          <p className="sid-page-description">
            Kelola administrasi warga{' '}
            {user?.wilayah_label ?? 'RT'} dengan lebih cepat.
          </p>


          {/* ======================================
              STAT CARDS
              2 x 2
              ====================================== */}

          <div className="
            grid
            grid-cols-2
            gap-3
            mb-4
          ">

            {STAT_CARDS.map((card) => {

              const Icon = card.icon;

              return (
                <button
                  key={card.key}
                  onClick={card.onClick}
                  className="
                    sid-stat-card
                    p-4
                    text-left
                  "
                >

                  <div
                    className="
                      w-9
                      h-9
                      rounded-[var(--radius-sm)]
                      flex
                      items-center
                      justify-center
                      mb-2
                    "
                    style={{
                      background: card.iconBg,
                      color: card.iconColor,
                    }}
                  >
                    <Icon size={16} />
                  </div>


                  <p className="
                    text-[10px]
                    text-[var(--sid-text-muted)]
                    uppercase
                  ">
                    {card.label}
                  </p>


                  <p className="
                    text-2xl
                    font-bold
                    text-[var(--sid-text-primary)]
                  ">
                    {loading ? '-' : card.value}
                  </p>

                </button>
              );

            })}

          </div>


          {/* ======================================
              GRAFIK
              ====================================== */}

          <div className="mb-4">
            <SuratStatChart letters={letters} />
          </div>

        </div>


        {/* ======================================
            FOOTER MOBILE
            ====================================== */}

        <div className="sid-mobile-footer">
          <FooterDesa />
        </div>


        {/* ======================================
            MOBILE BOTTOM NAVIGATION
            ====================================== */}

        <MobileBottomNav
          links={ADMIN_MOBILE_LINKS(
            '/admin/dashboard-surat-rt',
            '/admin/list-rt'
          )}
        />

      </div>
    </>
  );
}