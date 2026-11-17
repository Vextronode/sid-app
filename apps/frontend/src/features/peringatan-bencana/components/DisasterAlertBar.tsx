import { useId, useState } from 'react'
import { AlertTriangle, ChevronDown, ExternalLink } from 'lucide-react'

import type { PublicDisasterAlert } from '../api'
import { usePublicDisasterAlerts } from '../hooks/usePublicDisasterAlerts'
import { alertFacts, formatAlertTime } from '../utils'

function AlertDetail({ alert }: { alert: PublicDisasterAlert }) {
  const facts = alertFacts(alert)

  return (
    <article className="flex gap-3">
      <AlertTriangle
        size={20}
        className="mt-0.5 flex-none text-pb-bahaya"
        strokeWidth={2.2}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-pb-bahaya-deep">
          <span className="rounded bg-pb-bahaya px-1.5 py-0.5 text-xs font-extrabold tracking-wide text-white uppercase">
            {alert.level_label}
          </span>
          {alert.type_label} · terjadi {formatAlertTime(alert.occurred_at)}
        </p>
        <h3 className="mt-1 mb-0 font-display text-[18px] leading-snug font-bold text-pb-ink">
          {alert.title}
        </h3>
        {facts.length > 0 && (
          <p className="mt-1 mb-0 text-[15px] text-pb-muted">{facts.join(' · ')}</p>
        )}
        {alert.message && (
          <p className="mt-2 mb-0 max-w-[68ch] text-[16px] leading-relaxed whitespace-pre-line text-pb-ink">
            {alert.message}
          </p>
        )}
        {alert.link_url && (
          <a
            href={alert.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex min-h-11 items-center gap-1.5 font-bold text-pb-bahaya-deep underline underline-offset-4 hover:text-pb-bahaya focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-pb-bahaya"
          >
            Lihat detail di SIGAP <span className="bd-visually-hidden">(tab baru)</span>
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  )
}

type DisasterAlertBarProps = {
  // Sudah diurutkan backend: level tertinggi, lalu terbaru.
  alerts: PublicDisasterAlert[]
  containerClassName?: string
}

/**
 * Bar merah peringatan bencana dari SIGAP, di paling atas halaman publik
 * (di atas Pengumuman Desa). Satu bar berisi peringatan teratas; peringatan
 * lain dirangkum "+N peringatan lain" dan, bersama detailnya, dibuka lewat
 * "Selengkapnya". Wadah aria-live selalu ada supaya peringatan yang baru
 * muncul dibacakan pembaca layar.
 */
export function DisasterAlertBar({
  alerts,
  containerClassName = 'bd-container',
}: DisasterAlertBarProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const [top] = alerts
  const others = alerts.length - 1

  return (
    <div aria-live="polite">
      {top && (
        <section aria-label="Peringatan bencana">
          <div className="bg-pb-bahaya text-white">
            <div className={containerClassName}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                <div className="flex min-w-0 flex-1 basis-[28ch] items-center gap-3">
                  <AlertTriangle
                    size={22}
                    strokeWidth={2.2}
                    className="flex-none"
                    aria-hidden="true"
                  />
                  <span className="flex-none rounded bg-white px-2 py-0.5 text-sm font-extrabold tracking-wide text-pb-bahaya-deep uppercase">
                    {top.level_label}
                  </span>
                  <p className="m-0 min-w-0 text-[16px] leading-snug font-bold max-[720px]:truncate">
                    <span className="font-semibold text-white/85">{top.type_label}:</span>{' '}
                    {top.title}
                  </p>
                </div>

                <div className="flex flex-none items-center gap-3 max-[720px]:ml-[34px]">
                  {others > 0 && (
                    <span className="text-sm font-semibold text-white/90">
                      +{others} peringatan lain
                    </span>
                  )}
                  <button
                    type="button"
                    className="group inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-transparent px-2 text-base font-bold text-white underline decoration-white/70 decoration-2 underline-offset-[6px] hover:decoration-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpen((value) => !value)}
                  >
                    {open ? 'Tutup' : 'Selengkapnya'}
                    <ChevronDown
                      size={18}
                      strokeWidth={2.2}
                      className="transition-transform duration-200 group-aria-expanded:rotate-180 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {open && (
            // Garis merah tebal + bayangan menutup panel, supaya ujung daftar
            // yang digulir tidak menempel ke header di bawahnya.
            <div className="relative z-[1] border-b-4 border-pb-bahaya bg-pb-bahaya-tint shadow-[0_8px_14px_-8px_rgb(0_0_0/0.35)]">
              <div className={containerClassName}>
                <ul
                  id={panelId}
                  className="bd-announcement-panel bd-alert-panel m-0 flex list-none flex-col divide-y divide-pb-bahaya/15 p-0 pt-4 pb-8"
                >
                  {alerts.map((alert) => (
                    <li key={alert.id} className="py-4 first:pt-0">
                      <AlertDetail alert={alert} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

/** Bar peringatan yang memuat datanya sendiri (PublicStickyChrome). */
export function PublicDisasterAlertBar() {
  const alerts = usePublicDisasterAlerts()

  return <DisasterAlertBar alerts={alerts} />
}
