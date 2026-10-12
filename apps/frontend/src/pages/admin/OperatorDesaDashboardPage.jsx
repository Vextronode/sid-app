// ==========================================
// OperatorDesaDashboardPage.jsx
// Halaman Ringkasan Operator Desa
// Styling menggunakan Global CSS SID.
// ==========================================

import { useQuery } from '@tanstack/react-query'

import { getGenderStats } from '@/features/approval/api'
import { useSuratSummaryQuery } from '@/features/surat/hooks/useSuratListQuery'

import { useAuth } from '@/features/auth/contexts/AuthContext'

import { ClipboardList, ListChecks, CheckCircle2 } from 'lucide-react'

import SuratStatChart from '@/features/dashboard-mobile/components/SuratStatChart'
import GenderStatCard from '@/features/operator-desa/components/GenderStatCard'
import { SiteFooter } from '@/components/layout/SiteFooter'
import DashboardFlowCard from '@/features/operator-desa/components/DashboardFlowCard'
import { getGreeting } from '@/lib/utils/greeting'

import { SURAT_STATUS } from '@/constants/suratStatus'

const EMPTY_GENDER_STATS = { total: 0, laki: 0, perempuan: 0 }

export default function OperatorDesaDashboardPage() {
  const { user } = useAuth()
  const greeting = getGreeting()

  // Angka dihitung backend atas scope yang sama dengan daftar surat.
  const { summary, loading } = useSuratSummaryQuery()

  const { data: genderStats = EMPTY_GENDER_STATS } = useQuery({
    queryKey: ['dashboard', 'gender-stats'],
    queryFn: async () => (await getGenderStats()).data ?? EMPTY_GENDER_STATS,
    staleTime: 5 * 60 * 1000,
  })

  // ==========================================
  // STATISTIK
  // ==========================================

  const stats = {
    permohonan: summary.total,
    verifikasi: summary.by_status[SURAT_STATUS.IN_PROGRESS],
    selesai: summary.by_status[SURAT_STATUS.APPROVED],
  }

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
    <div className="sid-operator-dashboard">
      <main className="sid-operator-dashboard-content">
        {/* ======================================
            HEADER
        ====================================== */}

        <header className="sid-operator-header">
          <div className="sid-operator-header-info">
            <h1 className="sid-operator-greeting">
              {greeting}, {user?.name ?? 'Bapak/Ibu'}
            </h1>
          </div>

          <span className="sid-operator-date">{hariIni}</span>
        </header>

        {/* ======================================
            STATISTIK
        ====================================== */}

        <section className="sid-operator-stats-grid">
          {/* TOTAL PERMOHONAN */}

          <div className="sid-operator-stat-card">
            <div className="sid-operator-stat-content">
              <p className="sid-operator-stat-label">Total Permohonan</p>

              <p className="sid-operator-stat-value yellow">{loading ? '-' : stats.permohonan}</p>
            </div>

            <div className="sid-operator-stat-icon yellow">
              <ClipboardList size={20} />
            </div>
          </div>

          {/* SEDANG DIPROSES */}

          <div className="sid-operator-stat-card">
            <div className="sid-operator-stat-content">
              <p className="sid-operator-stat-label">Sedang Diproses</p>

              <p className="sid-operator-stat-value blue">{loading ? '-' : stats.verifikasi}</p>
            </div>

            <div className="sid-operator-stat-icon blue">
              <ListChecks size={20} />
            </div>
          </div>

          {/* SELESAI */}

          <div className="sid-operator-stat-card">
            <div className="sid-operator-stat-content">
              <p className="sid-operator-stat-label">Selesai</p>

              <p className="sid-operator-stat-value green">{loading ? '-' : stats.selesai}</p>
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
            <SuratStatChart letterTypes={summary.by_type} />
          </div>

          <div className="sid-operator-flow-wrapper">
            <DashboardFlowCard periods={summary.by_period} loading={loading} />
          </div>
        </section>
      </main>

      {/* ======================================
          FOOTER
      ====================================== */}

      <SiteFooter />
    </div>
  )
}
