// ==========================================
// DashboardFlowCard.jsx
// Card status surat dengan filter periode dan carousel.
// Status menggunakan status generic.
// Styling mengikuti SID Global Theme.
// ==========================================

import { useMemo, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { SURAT_STATUS } from '@/constants/suratStatus'

export default function DashboardFlowCard({ letters = [], loading }) {
  const [period, setPeriod] = useState('day')
  const [index, setIndex] = useState(0)

  // ==========================================
  // FILTER PERIODE
  // ==========================================

  const filteredLetters = useMemo(() => {
    const now = new Date()

    return letters.filter((letter) => {
      const date = new Date(letter.submitted_at ?? letter.created_at)

      if (Number.isNaN(date.getTime())) {
        return false
      }

      if (period === 'day') {
        return date.toDateString() === now.toDateString()
      }

      if (period === 'week') {
        const diff = (now - date) / (1000 * 60 * 60 * 24)

        return diff >= 0 && diff <= 7
      }

      if (period === 'month') {
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      }

      return true
    })
  }, [letters, period])

  // ==========================================
  // CARD STATUS
  // ==========================================

  const cards = useMemo(
    () => [
      {
        title: 'Total Surat',
        value: filteredLetters.length,
        color: 'sid-dashboard-status-primary',
      },

      {
        title: 'Menunggu',
        value: filteredLetters.filter((letter) => letter.status === SURAT_STATUS.PENDING).length,
        color: 'sid-dashboard-status-warning',
      },

      {
        title: 'Sedang Diproses',
        value: filteredLetters.filter((letter) => letter.status === SURAT_STATUS.IN_PROGRESS)
          .length,
        color: 'sid-dashboard-status-cyan',
      },

      {
        title: 'Selesai',
        value: filteredLetters.filter((letter) => letter.status === SURAT_STATUS.APPROVED).length,
        color: 'sid-dashboard-status-success',
      },
    ],
    [filteredLetters],
  )

  // ==========================================
  // AUTO CAROUSEL
  // ==========================================

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((currentIndex) => (currentIndex + 1) % cards.length)
    }, 5000)

    return () => clearInterval(timer)
  }, [cards.length])

  // ==========================================
  // JAGA INDEX
  // ==========================================

  const safeIndex = cards.length > 0 ? Math.min(index, cards.length - 1) : 0

  const current = cards[safeIndex] ?? cards[0]

  // ==========================================
  // NAVIGASI
  // ==========================================

  const next = () => {
    setIndex((currentIndex) => (currentIndex + 1) % cards.length)
  }

  const prev = () => {
    setIndex((currentIndex) => (currentIndex - 1 + cards.length) % cards.length)
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="sid-dashboard-flow-card">
      <div className="sid-dashboard-flow-header">
        <h3 className="sid-dashboard-flow-title">Status Surat</h3>

        <select
          value={period}
          onChange={(e) => {
            setPeriod(e.target.value)
            setIndex(0)
          }}
          className="sid-dashboard-period-select"
        >
          <option value="day">Hari</option>

          <option value="week">Minggu</option>

          <option value="month">Bulan</option>
        </select>
      </div>

      <div className="sid-dashboard-flow-body">
        <button
          type="button"
          onClick={prev}
          className="sid-dashboard-flow-arrow"
          aria-label="Status sebelumnya"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="sid-dashboard-flow-content">
          <div key={index} className="sid-dashboard-flow-slide">
            <p className="sid-dashboard-flow-label">{current.title}</p>

            <p className={`sid-dashboard-flow-value ${current.color}`}>
              {loading ? '-' : current.value}
            </p>

            <div className="sid-dashboard-flow-indicators">
              {cards.map((card, cardIndex) => (
                <button
                  type="button"
                  key={card.title}
                  onClick={() => setIndex(cardIndex)}
                  aria-label={`Tampilkan ${card.title}`}
                  className={`sid-dashboard-flow-indicator ${
                    index === cardIndex
                      ? 'sid-dashboard-flow-indicator-active'
                      : 'sid-dashboard-flow-indicator-inactive'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={next}
          className="sid-dashboard-flow-arrow"
          aria-label="Status berikutnya"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
