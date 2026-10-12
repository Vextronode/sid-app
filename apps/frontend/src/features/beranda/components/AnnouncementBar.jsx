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
    <section className="border-b border-[#ecd9a2] bg-pb-padi-soft" aria-label={labels.label}>
      <div className="bd-container flex flex-wrap items-center gap-x-3.5 gap-y-1.5 py-2.5 text-[15px] leading-snug">
        <span className="rounded-sm bg-pb-laut-deep px-2 py-0.5 text-xs font-bold tracking-[0.04em] text-white">
          {labels.badge}
        </span>
        <span className="font-medium text-[#3d2c00]">
          {date} — {title}
        </span>
        <Link
          to={HAL_BERITA_DETAIL(newsId)}
          className="inline-flex min-h-11 items-center font-bold text-pb-padi-ink underline underline-offset-4 hover:text-pb-ink"
        >
          {labels.readMore}
        </Link>
      </div>
    </section>
  )
}
