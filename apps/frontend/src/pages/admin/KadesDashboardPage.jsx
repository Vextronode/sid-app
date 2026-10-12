// ==========================================
// KadesDashboardPage.jsx
// Dashboard Kepala Desa
//
// Kades sekarang menjadi approver aktif.
// Status menggunakan status generik.
//
// 4 kotak:
// Menunggu / Sedang Diproses / Disetujui / Ditolak
//
// Desktop : 4 kolom
// Mobile  : 2 x 2
//
// UI mengikuti pola RWDashboardPage.
// ==========================================

import { useNavigate } from 'react-router-dom'

import { ClipboardList, Eye, CheckCircle2, XCircle } from 'lucide-react'

import { useAuth } from '@/features/auth/contexts/AuthContext'
import { useSuratSummaryQuery } from '@/features/surat/hooks/useSuratListQuery'

import { SiteFooter } from '@/components/layout/SiteFooter'

import { getGreeting } from '@/lib/utils/greeting'

import { SURAT_STATUS } from '@/constants/suratStatus'
import { OverdueBadge } from '@/components/ui/OverdueBadge'

import SuratStatChart from '@/features/dashboard-mobile/components/SuratStatChart'

// ==========================================
// COMPONENT
// ==========================================

export default function KadesDashboardPage() {
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
    disetujui: summary.by_status[SURAT_STATUS.APPROVED],
    ditolak: summary.by_status[SURAT_STATUS.REJECTED],
    overdue: summary.overdue,
  }

  // ==========================================
  // STAT CARDS
  // ==========================================

  const STAT_CARDS = [
    {
      key: 'menunggu',
      label: 'Menunggu',
      value: stats.menunggu,
      icon: ClipboardList,
      iconBg: 'var(--sid-status-pending-bg)',
      iconColor: 'var(--sid-status-pending-text)',
      onClick: () => navigate(`/admin/list-kades?status=${SURAT_STATUS.PENDING}`),
    },

    {
      key: 'diproses',
      label: 'Sedang Diproses',
      value: stats.sedangDiproses,
      icon: Eye,
      iconBg: 'var(--sid-status-progress-bg)',
      iconColor: 'var(--sid-status-progress-text)',
      onClick: () => navigate(`/admin/list-kades?status=${SURAT_STATUS.IN_PROGRESS}`),
    },

    {
      key: 'disetujui',
      label: 'Disetujui',
      value: stats.disetujui,
      icon: CheckCircle2,
      iconBg: 'var(--sid-status-done-bg)',
      iconColor: 'var(--sid-status-done-text)',
      onClick: () => navigate(`/admin/list-kades?status=${SURAT_STATUS.APPROVED}`),
    },

    {
      key: 'ditolak',
      label: 'Ditolak',
      value: stats.ditolak,
      icon: XCircle,
      iconBg: 'var(--sid-status-rejected-bg)',
      iconColor: 'var(--sid-status-rejected-text)',
      onClick: () => navigate(`/admin/list-kades?status=${SURAT_STATUS.REJECTED}`),
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

              <p className="sid-page-description">Kelola administrasi desa secara digital.</p>
            </div>

            <div className="flex items-center gap-3">
              {stats.overdue > 0 && <OverdueBadge isOverdue count={stats.overdue} />}
              <span className="sid-dashboard-date">{hariIni}</span>
            </div>
          </div>

          {/* ======================================
              STAT CARD
              ====================================== */}

          <div className="sid-stat-grid">
            {STAT_CARDS.map((card) => {
              const Icon = card.icon

              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={card.onClick}
                  className="sid-stat-card"
                >
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

          <p className="sid-page-description">Kelola administrasi desa secara digital.</p>
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
                  type="button"
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
