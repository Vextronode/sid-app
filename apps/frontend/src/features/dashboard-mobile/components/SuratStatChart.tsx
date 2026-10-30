import { useState, useMemo, useRef } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

import { Calendar } from 'lucide-react'

// GET /api/dashboard/letter-stats: label kategori dan jumlah per label.
type LetterStatsChart = { labels?: string[]; values?: (number | string)[]; maxY?: number }

export default function SuratStatChart({
  letterTypes = [],
}: {
  letterTypes?: { id: number; name: string }[]
}) {
  const dateInputRef = useRef<HTMLInputElement>(null)

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))

  const [letterType, setLetterType] = useState('all')

  // ==========================================
  // LOAD CHART
  // ==========================================

  const { data: chart, isFetching: loading } = useQuery({
    queryKey: ['dashboard', 'letter-stats', selectedDate, letterType],
    queryFn: async () => {
      const response = await api.get<{ data?: { chart?: LetterStatsChart } }>(
        '/api/dashboard/letter-stats',
        {
          params: {
            date: selectedDate,
            letter_type: letterType,
          },
        },
      )

      return response?.data?.data?.chart ?? null
    },
    placeholderData: keepPreviousData,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  })

  const chartData = useMemo(
    () =>
      (chart?.labels ?? []).map((label, index) => ({
        kategori: label,
        jumlah: Number(chart?.values?.[index] ?? 0),
      })),
    [chart],
  )

  const maxY = Number(chart?.maxY ?? 50)

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="sid-surat-stat-chart">
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="sid-surat-stat-chart-header">
        <div className="sid-surat-stat-chart-title">
          <h3>Statistik Pengajuan Surat</h3>

          <p>Distribusi jumlah surat</p>
        </div>

        <div className="sid-surat-stat-chart-filters">
          {/* KALENDER */}

          <button
            type="button"
            onClick={() => {
              dateInputRef.current?.showPicker?.()
            }}
            className="sid-surat-stat-chart-date"
          >
            <span>
              {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>

            <Calendar size={14} />
          </button>

          <input
            ref={dateInputRef}
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value)
            }}
            className="sid-surat-stat-chart-date-input"
          />

          {/* JENIS SURAT */}

          <select
            value={letterType}
            onChange={(e) => {
              setLetterType(e.target.value)
            }}
            className="sid-surat-stat-chart-select"
          >
            <option value="all">Semua Jenis Surat</option>

            {letterTypes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ======================================
          CHART
      ====================================== */}

      <div className="sid-surat-stat-chart-area">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart
            data={chartData}
            margin={{
              top: 5,
              right: 10,
              left: 0,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id="sidSuratStatGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--sid-primary)" stopOpacity={0.35} />

                <stop offset="95%" stopColor="var(--sid-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="kategori"
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 10,
                fill: 'var(--sid-text-muted)',
              }}
            />

            <YAxis
              domain={[0, maxY]}
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 10,
                fill: 'var(--sid-text-muted)',
              }}
            />

            <Tooltip />

            <Area
              type="monotone"
              dataKey="jumlah"
              stroke="var(--sid-primary)"
              strokeWidth={2}
              fill="url(#sidSuratStatGradient)"
              isAnimationActive={!loading}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
