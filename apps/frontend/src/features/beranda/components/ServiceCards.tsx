import { Download, FileText, Mail, MessageCircle, Search } from 'lucide-react'
import { Link } from 'react-router-dom'

import { HAL_UNDUH_SURAT } from '@/features/auth/utils/letterLinks'
import { HAL_AJUKAN_SURAT, HAL_STATUS_SURAT } from '@/lib/constants/routes'
import { sectionGap } from '../publicClasses'
import { useLoginAwareHref } from '../hooks/useLoginAwareHref'
import { WhatsAppIcon } from './WhatsAppIcon'
import type { LucideIcon } from 'lucide-react'
import type { BerandaContent } from '../berandaContent'
import type { Village } from '@/types'

// Alamat email panjang dipatahkan di depan "@" bila tidak muat satu baris.
function EmailText({ email }: { email: string }) {
  const at = email.indexOf('@')
  if (at <= 0) return <span>{email}</span>

  return (
    <span>
      {email.slice(0, at)}
      <wbr />
      {email.slice(at)}
    </span>
  )
}

// Ikon tanpa kotak latar: warna laut, sejajar kiri dengan judul.
function CardIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon className="mb-3 text-pb-laut" size={28} strokeWidth={1.8} aria-hidden="true" />
}

const cardBase =
  'bd-service-card flex flex-1 flex-col items-start gap-2 px-6 pt-7 pb-8 text-pb-ink no-underline max-sm:px-5 max-sm:pt-6 max-sm:pb-7'
const cardLink = 'group transition-colors hover:bg-pb-laut-tint hover:text-pb-ink'
const title = 'font-display text-[21px] leading-tight font-bold tracking-[-0.01em]'
const desc = 'text-base leading-normal text-pb-muted'
const contactRow =
  'flex min-h-11 items-start gap-2.5 py-1.5 text-[15px] leading-snug font-semibold text-pb-laut underline decoration-pb-line-strong underline-offset-4 wrap-anywhere hover:text-pb-laut-hover hover:decoration-current'
// Satu panel "loket" berkolom: 4 kolom di desktop, 2 di tablet, 1 di ponsel.
// Garis pemisah antarkolom dari border item.
const item =
  'flex min-w-0 border-pb-line max-sm:[&+&]:border-t sm:max-lg:[&:nth-child(even)]:border-l sm:max-lg:[&:nth-child(n+3)]:border-t lg:[&+&]:border-l'

// Kartu layanan (A14–A18).
// - Ajukan, Cek status & Unduh surat selesai: seluruh kartu adalah link dengan
//   alur login (K4); tujuannya menyesuaikan peran yang login.
// - Pengaduan: kartu tidak bisa diklik; hanya baris WA dan email (K14). Baris WA
//   (D2) membuka menu bagikan AddToAny di tab baru; nama aksesibel = teksnya.
//   Email dari data desa (village.email); tanpa email barisnya tidak dirender.
type ServiceCardsProps = { content: BerandaContent; village: Village | null }

export function ServiceCards({ content, village }: ServiceCardsProps) {
  const { services, complaint } = content
  const email = village?.email
  const ajukanHref = useLoginAwareHref(HAL_AJUKAN_SURAT)
  const statusHref = useLoginAwareHref(HAL_STATUS_SURAT)
  const unduhHref = useLoginAwareHref(HAL_UNDUH_SURAT)

  // Tidak lagi menempel ke hero: Sambutan Kepala Desa ada di antaranya.
  return (
    <section className={`bd-container ${sectionGap}`} aria-label={services.label}>
      <ul className="m-0 grid list-none grid-cols-1 overflow-hidden rounded-3xl border border-pb-line bg-white p-0 shadow-[0_30px_60px_-40px_rgba(12,35,65,0.45)] sm:grid-cols-2 lg:grid-cols-4">
        <li className={item}>
          <Link to={ajukanHref} className={`bd-lift ${cardBase} ${cardLink}`}>
            <CardIcon icon={FileText} />
            <span className={`${title} group-hover:text-pb-laut`}>{services.ajukan.title}</span>
            <span className={desc}>{services.ajukan.description}</span>
          </Link>
        </li>

        <li className={item}>
          <Link to={statusHref} className={`bd-lift ${cardBase} ${cardLink}`}>
            <CardIcon icon={Search} />
            <span className={`${title} group-hover:text-pb-laut`}>{services.status.title}</span>
            <span className={desc}>{services.status.description}</span>
          </Link>
        </li>

        <li className={item}>
          <Link to={unduhHref} className={`bd-lift ${cardBase} ${cardLink}`}>
            <CardIcon icon={Download} />
            <span className={`${title} group-hover:text-pb-laut`}>{services.unduh.title}</span>
            <span className={desc}>{services.unduh.description}</span>
          </Link>
        </li>

        <li className={item}>
          <div className={`bd-lift ${cardBase}`}>
            <CardIcon icon={MessageCircle} />
            <span className={title}>{services.pengaduan.title}</span>
            <a
              href={complaint.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={contactRow}
            >
              <span className="mt-px inline-flex flex-none text-[#128c4a]">
                <WhatsAppIcon />
              </span>
              <span>
                {complaint.whatsappText}{' '}
                <span className="bd-visually-hidden">{services.pengaduan.newTabHint}</span>
              </span>
            </a>
            {email && (
              <a
                href={`mailto:${email}`}
                className={contactRow}
                aria-label={`${services.pengaduan.emailLabel} ${email}`}
              >
                <span className="mt-px inline-flex flex-none text-pb-laut">
                  <Mail size={20} aria-hidden="true" />
                </span>
                <EmailText email={email} />
              </a>
            )}
          </div>
        </li>
      </ul>
    </section>
  )
}
