// ==========================================
// RTDashboardPage.tsx
// Dashboard RT
//
// UI mengikuti pola RWDashboardPage:
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
// ==========================================

import { useNavigate } from 'react-router-dom'

import { Mail, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react'

import { useAuth } from '@/features/auth/contexts/AuthContext'
import { useSuratSummaryQuery } from '@/features/surat/hooks/useSuratListQuery'

import { SiteFooter } from '@/components/layout/SiteFooter'

import { getGreeting } from '@/lib/utils/greeting'

import { SURAT_STATUS } from '@/constants/suratStatus'
import { OverdueBadge } from '@/components/ui/OverdueBadge'

import SuratStatChart from '@/features/dashboard-mobile/components/SuratStatChart'
import { RefreshButton } from '@/components/ui/RefreshButton'
import { useQueryRefresh } from '@/shared/hooks/useQueryRefresh'

// ==========================================
// COMPONENT
// ==========================================

export default function RTDashboardPage() {
  const pageRefresh = useQueryRefresh(['surat'], ['dashboard'])
  const { user } = useAuth()
  const navigate = useNavigate()

  // Angka dihitung backend atas scope yang sama dengan daftar surat.
  const { summary, loading } = useSuratSummaryQuery()

  // ==========================================
  // STATISTIK
  // ==========================================

  const stats = {
    permohonanBaru: summary.by_status[SURAT_STATUS.PENDING],
    sedangDiproses: summary.by_status[SURAT_STATUS.IN_PROGRESS],
    disetujuiFinal: summary.by_status[SURAT_STATUS.APPROVED],
    ditolak: summary.by_status[SURAT_STATUS.REJECTED],
    overdue: summary.overdue,
  }

  // ==========================================
  // STAT CARDS
  // Mengikuti struktur UI RW
  // ==========================================

  const STAT_CARDS = [
    {
      key: 'permohonan',
      label: 'Menunggu',
      value: stats.permohonanBaru,
      icon: Mail,
      iconBg: 'var(--sid-status-pending-bg)',
      iconColor: 'var(--sid-status-pending-text)',
      onClick: () => navigate(`/admin/rt/surat?status=${SURAT_STATUS.PENDING}`),
    },

    {
      key: 'diproses',
      label: 'Sedang Diproses',
      value: stats.sedangDiproses,
      icon: ShieldCheck,
      iconBg: 'var(--sid-status-progress-bg)',
      iconColor: 'var(--sid-status-progress-text)',
      onClick: () => navigate(`/admin/rt/surat?status=${SURAT_STATUS.IN_PROGRESS}`),
    },

    {
      key: 'selesai',
      label: 'Selesai',
      value: stats.disetujuiFinal,
      icon: CheckCircle2,
      iconBg: 'var(--sid-status-done-bg)',
      iconColor: 'var(--sid-status-done-text)',
      onClick: () => navigate(`/admin/rt/surat?status=${SURAT_STATUS.APPROVED}`),
    },

    {
      key: 'ditolak',
      label: 'Ditolak',
      value: stats.ditolak,
      icon: XCircle,
      iconBg: 'var(--sid-status-rejected-bg)',
      iconColor: 'var(--sid-status-rejected-text)',
      onClick: () => navigate(`/admin/rt/surat?status=${SURAT_STATUS.REJECTED}`),
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
                Kelola administrasi warga RT dengan lebih cepat.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {stats.overdue > 0 && <OverdueBadge isOverdue count={stats.overdue} />}
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

          <p className="sid-page-description">Kelola administrasi warga RT dengan lebih cepat.</p>
          <div className="mt-3">
            <RefreshButton onRefresh={pageRefresh.refresh} refreshing={pageRefresh.refreshing} />
          </div>
          {stats.overdue > 0 && (
            <div className="mt-3">
              <OverdueBadge isOverdue count={stats.overdue} />
            </div>
          )}

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
