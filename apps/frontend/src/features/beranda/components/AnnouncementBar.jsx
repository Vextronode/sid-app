import { useEffect, useId, useState } from 'react'
import { ChevronDown, Clock, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

import { formatAnnouncementUntil, isAnnouncementExpired } from '../utils/announcement'

// setTimeout tidak bisa menunggu lebih dari ~24,8 hari.
const MAX_TIMEOUT_MS = 2_147_483_647

// Pengumuman tersembunyi tepat saat waktunya habis, walau halaman tetap terbuka.
function useStillShowing(announcement) {
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!announcement) return undefined

    const remaining = new Date(announcement.expires_at).getTime() - Date.now()
    if (remaining <= 0) return undefined

    const timer = setTimeout(() => setTick((tick) => tick + 1), Math.min(remaining, MAX_TIMEOUT_MS))

    return () => clearTimeout(timer)
  }, [announcement])

  return Boolean(announcement) && !isAnnouncementExpired(announcement)
}

function AnnouncementLink({ href, labels }) {
  const className =
    'inline-flex min-h-11 items-center gap-2 rounded-lg bg-pb-laut px-4.5 text-base font-bold text-white no-underline hover:bg-pb-laut-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-pb-laut'

  if (href.startsWith('/')) {
    return (
      <Link to={href} className={className}>
        {labels.openLink}
      </Link>
    )
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {labels.openLink} <span className="bd-visually-hidden">{labels.newTabHint}</span>
      <ExternalLink size={17} aria-hidden="true" />
    </a>
  )
}

// Bar pengumuman (A10), desain "papan pengumuman": selembar kertas yang
// ditempel di papan balai desa, dengan tepi kiri kuning padi sebagai "pin".
// Satu pengumuman dari Petugas Desa (menu Pengumuman), tampil sampai waktunya
// habis. Isi dan link (opsional) terbuka lewat "Baca selengkapnya".
// containerClassName: pembungkus lebar konten (bd-container di beranda).
export function AnnouncementBar({ content, announcement, containerClassName = 'bd-container' }) {
  const labels = content.announcementBar
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const showing = useStillShowing(announcement)

  if (!showing) return null

  const { title, body, link_url: linkUrl, expires_at: expiresAt } = announcement
  const hasMore = Boolean(body || linkUrl)

  return (
    <section className="border-b border-[#ecd9a2] bg-pb-padi-soft" aria-label={labels.label}>
      <div className={containerClassName}>
        <div className="border-l-[6px] border-pb-padi py-3.5 pl-4.5 min-[721px]:pl-5.5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="min-w-0 flex-1 basis-[30ch]">
              <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[15px] leading-snug text-pb-padi-ink">
                <span className="font-bold">{labels.label}</span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={15} strokeWidth={2} aria-hidden="true" />
                  {labels.until} {formatAnnouncementUntil(expiresAt)}
                </span>
              </p>
              <p className="mt-1 mb-0 font-display text-[clamp(18px,16px+0.4vw,21px)] leading-tight font-bold tracking-[-0.01em] text-pretty text-pb-ink">
                {title}
              </p>
            </div>

            {hasMore && (
              <button
                type="button"
                className="group inline-flex min-h-11 flex-none cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-transparent px-2 text-base font-bold text-pb-laut underline decoration-pb-padi decoration-2 underline-offset-[6px] hover:decoration-current focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-pb-laut max-[720px]:-ml-2"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpen((value) => !value)}
              >
                {open ? labels.close : labels.readMore}
                <ChevronDown
                  size={18}
                  strokeWidth={2.2}
                  className="transition-transform duration-200 group-aria-expanded:rotate-180 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </button>
            )}
          </div>

          {hasMore && open && (
            <div
              id={panelId}
              className="bd-announcement-panel mt-3 border-t border-[#ecd9a2] pt-3.5"
            >
              {body && (
                <p className="m-0 max-w-[68ch] text-[17px] leading-relaxed whitespace-pre-line text-pb-ink">
                  {body}
                </p>
              )}
              {linkUrl && (
                <div className={body ? 'mt-4' : undefined}>
                  <AnnouncementLink href={linkUrl} labels={labels} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
