// ==========================================
// KadusDashboardPage.jsx
// Dashboard Kepala Dusun
//
// Monitoring-only.
// Kadus tidak melakukan approve/reject surat.
//
// 4 kotak:
// Total Surat / Sedang Diproses / Selesai / Ditolak
//
// Desktop : 4 kolom
// Mobile  : 2 x 2
//
// Styling mengikuti SID Global Theme,
// sama seperti RWDashboardPage.jsx.
// ==========================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Eye,
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

export default function KadusDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);

  // ==========================================
  // LOAD DATA KADUS
  // ==========================================

  const loadDashboardData = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setLoading(true);
      }

      try {
        const res = await getSuratList('kadus');

        setLetters(res.data?.data ?? []);
      } catch (err) {
        console.error(
          'GET KADUS LIST ERROR',
          err.response?.data ?? err
        );
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    []
  );

  // ==========================================
  // LOAD PERTAMA KALI
  // ==========================================

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      if (!isMounted) return;

      await loadDashboardData(true);
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [loadDashboardData]);

  // ==========================================
  // AUTO REFRESH SETIAP 5 DETIK
  // ==========================================

  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboardData(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [loadDashboardData]);

  // ==========================================
  // STATISTIK
  // ==========================================

  const stats = useMemo(() => {
    const totalSurat = letters.length;

    // Surat yang masih berada dalam proses.
    // Tidak termasuk surat yang ditolak maupun
    // surat yang sudah selesai di RW.
    const sedangDiproses = letters.filter(
      (s) =>
        !s.status?.endsWith('_rejected') &&
        s.status !== 'rt_approved'
    ).length;

    // Surat yang sudah disetujui sampai tahap RW.
    const selesai = letters.filter(
      (s) => s.status === 'rw_approved'
    ).length;

    // Semua surat yang memiliki status rejected.
    const ditolak = letters.filter(
      (s) => s.status?.endsWith('_rejected')
    ).length;

    return {
      totalSurat,
      sedangDiproses,
      selesai,
      ditolak,
    };
  }, [letters]);

  // ==========================================
  // STAT CARDS
  // ==========================================

  const STAT_CARDS = [
    {
      key: 'total',
      label: 'Total Surat',
      value: stats.totalSurat,
      icon: Mail,
      iconBg: 'var(--sid-status-pending-bg)',
      iconColor: 'var(--sid-status-pending-text)',
      onClick: () =>
        navigate('/admin/list-kadus'),
    },

    {
      key: 'diproses',
      label: 'Sedang Diproses',
      value: stats.sedangDiproses,
      icon: Eye,
      iconBg: 'var(--sid-status-progress-bg)',
      iconColor: 'var(--sid-status-progress-text)',
      onClick: () =>
        navigate('/admin/list-kadus'),
    },

    {
      key: 'selesai',
      label: 'Selesai',
      value: stats.selesai,
      icon: CheckCircle2,
      iconBg: 'var(--sid-status-done-bg)',
      iconColor: 'var(--sid-status-done-text)',
      onClick: () =>
        navigate('/admin/list-kadus?status=kasi_approved'),
    },

    {
      key: 'ditolak',
      label: 'Ditolak',
      value: stats.ditolak,
      icon: XCircle,
      iconBg: 'var(--sid-status-rejected-bg)',
      iconColor: 'var(--sid-status-rejected-text)',
      onClick: () =>
        navigate('/admin/list-kadus?status=rejected'),
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

      <div className="sid-desktop-page">
        <div className="sid-page sid-page-dashboard">

          {/* ======================================
              HEADER
              ====================================== */}

          <div className="sid-dashboard-header">
            <div>
              <h1 className="sid-page-title">
                {getGreeting()}, {user?.name ?? 'Bapak/Ibu'}
              </h1>

              <p className="sid-page-description">
                Pantau administrasi warga{' '}
                {user?.wilayah_label ?? 'dusun'} secara digital.
              </p>
            </div>

            <span className="sid-dashboard-date">
              {hariIni}
            </span>
          </div>



          {/* ======================================
              STAT CARD
              ====================================== */}

          <div className="sid-stat-grid">
            {STAT_CARDS.map((card) => {
              const Icon = card.icon;

              return (
                <button
                  key={card.key}
                  onClick={card.onClick}
                  className="sid-stat-card"
                >
                  <div className="sid-stat-card-content">
                    <div>
                      <p className="sid-stat-label">
                        {card.label}
                      </p>

                      <p className="sid-stat-value">
                        {loading ? '-' : card.value}
                      </p>
                    </div>

                    <div
                      className="sid-stat-icon"
                      style={{
                        background: card.iconBg,
                        color: card.iconColor,
                      }}
                    >
                      <Icon size={20} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ======================================
              GRAFIK
              ====================================== */}

          <div className="sid-dashboard-chart">
            <SuratStatChart letters={letters} />
          </div>
        </div>

        {/* ======================================
            FOOTER
            ====================================== */}

        <FooterDesa />
      </div>

      {/* ========================================
          MOBILE
          ======================================== */}

      <div className="sid-mobile-page">
        <div className="sid-page sid-mobile-content">

          {/* ======================================
              HEADER
              ====================================== */}

          <h1 className="sid-page-title">
            {getGreeting()}, {user?.name ?? 'Bapak/Ibu'}
          </h1>

          <p className="sid-page-description">
            Pantau administrasi warga{' '}
            {user?.wilayah_label ?? 'dusun'} secara digital.
          </p>



          {/* ======================================
              STAT CARD
              ====================================== */}

          <div className="sid-stat-grid-mobile">
            {STAT_CARDS.map((card) => {
              const Icon = card.icon;

              return (
                <button
                  key={card.key}
                  onClick={card.onClick}
                  className="sid-stat-card sid-stat-card-mobile"
                >
                  <div
                    className="sid-stat-icon-mobile"
                    style={{
                      background: card.iconBg,
                      color: card.iconColor,
                    }}
                  >
                    <Icon size={16} />
                  </div>

                  <p className="sid-stat-label">
                    {card.label}
                  </p>

                  <p className="sid-stat-value-mobile">
                    {loading ? '-' : card.value}
                  </p>
                </button>
              );
            })}
          </div>

          {/* ======================================
              GRAFIK
              ====================================== */}

          <div className="sid-dashboard-chart-mobile">
            <SuratStatChart letters={letters} />
          </div>
        </div>

        {/* ======================================
            FOOTER
            ====================================== */}

        <div className="sid-mobile-footer">
          <FooterDesa />
        </div>

        {/* ======================================
            MOBILE NAV
            ====================================== */}

        <MobileBottomNav
          links={ADMIN_MOBILE_LINKS(
            '/admin/dashboard-surat-kadus',
            '/admin/list-kadus'
          )}
        />
      </div>
    </>
  );
}