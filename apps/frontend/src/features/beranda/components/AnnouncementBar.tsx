import { useEffect, useId, useState } from 'react'
import { ChevronDown, Clock, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

import { formatAnnouncementUntil, isAnnouncementExpired } from '../utils/announcement'
import type { BerandaContent } from '../berandaContent'
import type { PublicAnnouncement } from '@/features/info-desa/usePublicVillageInfo'

// setTimeout tidak bisa menunggu lebih dari ~24,8 hari.
const MAX_TIMEOUT_MS = 2_147_483_647

// Pengumuman tersembunyi tepat saat waktunya habis, walau halaman tetap terbuka.
function useStillShowing(announcement: PublicAnnouncement | null | undefined) {
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

type AnnouncementLinkProps = { href: string; labels: BerandaContent['announcementBar'] }

function AnnouncementLink({ href, labels }: AnnouncementLinkProps) {
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

// Bar pengumuman (A10), desain "pita kentongan": pita biru laut tua selebar
// layar dengan tiga garis kuning padi di kiri, seperti tiga pukulan kentongan
// yang memanggil warga. Satu pengumuman dari Staf SIDUTama (menu Pengumuman),
// tampil sampai waktunya habis. Isi dan link (opsional) terbuka lewat
// "Baca selengkapnya" di panel terang di bawah pita.
// containerClassName: pembungkus lebar konten (bd-container di beranda).
type AnnouncementBarProps = {
  content: BerandaContent
  announcement: PublicAnnouncement | null | undefined
  containerClassName?: string
}

export function AnnouncementBar({
  content,
  announcement,
  containerClassName = 'bd-container',
}: AnnouncementBarProps) {
  const labels = content.announcementBar
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const showing = useStillShowing(announcement)

  if (!showing) return null

  const { title, body, link_url: linkUrl, expires_at: expiresAt } = announcement
  const hasMore = Boolean(body || linkUrl)

  return (
    <section aria-label={labels.label}>
      <div className="bg-pb-laut-deep text-white">
        <div className={containerClassName}>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
            <div className="flex min-w-0 flex-1 basis-[30ch] items-center gap-4 min-[721px]:gap-5">
              <span
                className="bd-kentongan flex flex-none items-center gap-[5px]"
                aria-hidden="true"
              >
                <span />
                <span />
                <span />
              </span>
              <div className="min-w-0">
                <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[15px] leading-snug">
                  <span className="font-bold text-pb-padi">{labels.label}</span>
                  <span className="inline-flex items-center gap-1.5 text-white/80">
                    <Clock size={15} strokeWidth={2} aria-hidden="true" />
                    {labels.until} {formatAnnouncementUntil(expiresAt)}
                  </span>
                </p>
                <p className="mt-0.5 mb-0 font-display text-[clamp(18px,16px+0.4vw,21px)] leading-tight font-bold tracking-[-0.01em] text-pretty text-white">
                  {title}
                </p>
              </div>
            </div>

            {hasMore && (
              <button
                type="button"
                className="group inline-flex min-h-11 flex-none cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-transparent px-2 text-base font-bold text-white underline decoration-pb-padi decoration-2 underline-offset-[6px] hover:decoration-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-pb-padi max-[720px]:ml-[30px]"
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
        </div>
      </div>

      {hasMore && open && (
        <div className="border-b border-pb-line-strong bg-pb-laut-tint bg-(image:--pb-contour-dark) bg-size-[480px_180px] shadow-[inset_0_10px_12px_-10px_rgb(12_35_65/0.45)]">
          <div className={containerClassName}>
            <div id={panelId} className="bd-announcement-panel">
              {/* Baris ini setinggi isinya (bukan setinggi area gulir), jadi
                  garis gema memanjang sampai akhir teks. */}
              <div className="flex gap-4 py-5 min-[721px]:gap-5">
                {/* Gema tiga pukulan kentongan: garis padi lurus di bawahnya. */}
                <span className="flex w-[22px] flex-none justify-center" aria-hidden="true">
                  <span className="bd-kentongan-gema w-[3px] rounded-full bg-pb-padi" />
                </span>
                <div className="min-w-0">
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
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
