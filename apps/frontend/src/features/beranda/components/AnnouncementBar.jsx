import { Link } from 'react-router-dom'

import { HAL_BERITA_DETAIL } from '@/lib/constants/routes'

// Bar pengumuman (A10). Satu pengumuman statis, bukan running text.
// "+N pengumuman lain" (A11) dibatalkan pemilik proyek (11 Okt 2026).
// Data belum ada di backend: hanya dirender di development (K6).
export function AnnouncementBar({ content }) {
  const { announcement, announcementBar: labels } = content
  if (!announcement) return null

  const { date, title, newsId } = announcement

  return (
    <section className="bd-announce" aria-label={labels.label}>
      <div className="bd-container bd-announce-inner">
        <span className="bd-announce-badge">{labels.badge}</span>
        <span className="bd-announce-text">
          {date} — {title}
        </span>
        <Link to={HAL_BERITA_DETAIL(newsId)} className="bd-announce-link">
          {labels.readMore}
        </Link>
      </div>
    </section>
  )
}
