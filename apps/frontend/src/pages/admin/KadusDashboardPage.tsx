// ==========================================
// KadusDashboardPage.tsx
// Dashboard Kepala Dusun
//
// Monitoring-only.
// Kadus tidak melakukan approve/reject surat.
//
// 4 kotak:
// Menunggu / Sedang Diproses / Selesai / Ditolak
//
// Desktop : 4 kolom
// Mobile  : 2 x 2
//
// Styling mengikuti SID Global Theme,
// sama seperti RWDashboardPage.tsx.
// ==========================================

import { useNavigate } from 'react-router-dom'
import { Mail, Eye, CheckCircle2, XCircle } from 'lucide-react'

import { useAuth } from '@/features/auth/contexts/AuthContext'
import { officialAreaLabel } from '@/features/auth/utils/officialArea'
import { useSuratSummaryQuery } from '@/features/surat/hooks/useSuratListQuery'

import { SiteFooter } from '@/components/layout/SiteFooter'
import { getGreeting } from '@/lib/utils/greeting'

import { SURAT_STATUS } from '@/constants/suratStatus'

import SuratStatChart from '@/features/dashboard-mobile/components/SuratStatChart'
import { RefreshButton } from '@/components/ui/RefreshButton'
import { useQueryRefresh } from '@/shared/hooks/useQueryRefresh'

// ==========================================
// COMPONENT
// ==========================================

export default function KadusDashboardPage() {
  const pageRefresh = useQueryRefresh(['surat'], ['dashboard'])
  const { user } = useAuth()
  const navigate = useNavigate()

  // Angka dihitung backend atas scope yang sama dengan daftar surat.
  const { summary, loading } = useSuratSummaryQuery()

  // ==========================================
  // STATISTIK
  // ==========================================

  const stats = {
    menunggu: summary.by_status[SURAT_STATUS.PENDING],
    sedangDiproses: summary.by_status[SURAT_STATUS.IN_PROGRESS],
    selesai: summary.by_status[SURAT_STATUS.APPROVED],
    ditolak: summary.by_status[SURAT_STATUS.REJECTED],
  }

  // ==========================================
  // STAT CARDS
  // ==========================================

  const STAT_CARDS = [
    {
      key: 'menunggu',
      label: 'Menunggu',
      value: stats.menunggu,
      icon: Mail,
      iconBg: 'var(--sid-status-pending-bg)',
      iconColor: 'var(--sid-status-pending-text)',
      onClick: () => navigate(`/admin/kadus/surat?status=${SURAT_STATUS.PENDING}`),
    },

    {
      key: 'diproses',
      label: 'Sedang Diproses',
      value: stats.sedangDiproses,
      icon: Eye,
      iconBg: 'var(--sid-status-progress-bg)',
      iconColor: 'var(--sid-status-progress-text)',
      onClick: () => navigate(`/admin/kadus/surat?status=${SURAT_STATUS.IN_PROGRESS}`),
    },

    {
      key: 'selesai',
      label: 'Selesai',
      value: stats.selesai,
      icon: CheckCircle2,
      iconBg: 'var(--sid-status-done-bg)',
      iconColor: 'var(--sid-status-done-text)',
      onClick: () => navigate(`/admin/kadus/surat?status=${SURAT_STATUS.APPROVED}`),
    },

    {
      key: 'ditolak',
      label: 'Ditolak',
      value: stats.ditolak,
      icon: XCircle,
      iconBg: 'var(--sid-status-rejected-bg)',
      iconColor: 'var(--sid-status-rejected-text)',
      onClick: () => navigate(`/admin/kadus/surat?status=${SURAT_STATUS.REJECTED}`),
    },
  ]

  // ==========================================
  // TANGGAL
  // ==========================================

  const hariIni = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

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
                Pantau administrasi warga {officialAreaLabel(user, 'dusun')} secara digital.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="sid-dashboard-date">{hariIni}</span>
              <RefreshButton onRefresh={pageRefresh.refresh} refreshing={pageRefresh.refreshing} />
            </div>
          </div>

          {/* ======================================
              STAT CARD
              ====================================== */}

          <div className="sid-stat-grid">
            {STAT_CARDS.map((card) => {
              const Icon = card.icon

              return (
                <button key={card.key} onClick={card.onClick} className="sid-stat-card">
                  <div className="sid-stat-card-content">
                    <div>
                      <p className="sid-stat-label">{card.label}</p>

                      <p className="sid-stat-value">{loading ? '-' : card.value}</p>
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
              )
            })}
          </div>

          {/* ======================================
              GRAFIK
              ====================================== */}

          <div className="sid-dashboard-chart">
            <SuratStatChart letterTypes={summary.by_type} />
          </div>
        </div>

        {/* ======================================
            FOOTER
            ====================================== */}

        <SiteFooter />
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
            Pantau administrasi warga {officialAreaLabel(user, 'dusun')} secara digital.
          </p>
          <div className="mt-3">
            <RefreshButton onRefresh={pageRefresh.refresh} refreshing={pageRefresh.refreshing} />
          </div>

          {/* ======================================
              STAT CARD
              ====================================== */}

          <div className="sid-stat-grid-mobile">
            {STAT_CARDS.map((card) => {
              const Icon = card.icon

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

                  <p className="sid-stat-label">{card.label}</p>

                  <p className="sid-stat-value-mobile">{loading ? '-' : card.value}</p>
                </button>
              )
            })}
          </div>

          {/* ======================================
              GRAFIK
              ====================================== */}

          <div className="sid-dashboard-chart-mobile">
            <SuratStatChart letterTypes={summary.by_type} />
          </div>
        </div>

        {/* ======================================
            FOOTER
            ====================================== */}

        <div className="sid-mobile-footer">
          <SiteFooter />
        </div>
      </div>
    </>
  )
}
