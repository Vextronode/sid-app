import { useEffect, useState } from 'react'
import { Check, Clock, Copy, ExternalLink, MapPin, Phone } from 'lucide-react'

import { SECTION_KONTAK } from '@/lib/constants/routes'
import { copyText } from '@/shared/lib/copyText'
import { formatVillageName } from '@/shared/lib/villageName'
import { sectionGap, sectionTitle } from '../publicClasses'

const COPY_FEEDBACK_MS = 2000

const cardClass =
  'bd-contact-card flex flex-1 gap-4 px-6.5 py-7 text-pb-ink no-underline max-[900px]:px-5 max-[900px]:py-5.5'
const detailClass = 'text-base leading-normal text-pb-muted'

// Ikon tanpa kotak latar, sama seperti panel layanan.
function CardContent({ icon: Icon, title, children }) {
  return (
    <>
      <span className="mt-0.5 flex-none text-pb-laut" aria-hidden="true">
        <Icon size={26} strokeWidth={1.8} />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="font-display text-xl leading-tight font-bold">{title}</span>
        {children}
      </span>
    </>
  )
}

// Nomor telepon: klik nomor atau ikon salin untuk menyalinnya, bukan memanggil
// lewat tel: (permintaan pemilik, 12 Okt 2026). Hasilnya diumumkan lewat
// aria-live agar terdengar juga oleh pembaca layar.
function CopyPhone({ phone, labels }) {
  const [status, setStatus] = useState(null) // null | 'copied' | 'failed'

  useEffect(() => {
    if (!status) return undefined
    const timer = setTimeout(() => setStatus(null), COPY_FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [status])

  const handleCopy = async () => {
    setStatus((await copyText(phone)) ? 'copied' : 'failed')
  }

  const Icon = status === 'copied' ? Check : Copy

  return (
    <>
      <button
        type="button"
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left text-xl font-bold tracking-[0.01em] text-pb-laut tabular-nums hover:text-pb-laut-hover active:translate-y-px"
        onClick={handleCopy}
        aria-label={`${labels.copyPhone} ${phone}`}
      >
        {phone}
        <Icon className="text-pb-muted" size={18} aria-hidden="true" />
      </button>
      <span className="bd-meta min-h-[1.4em] text-sm text-pb-muted" aria-live="polite">
        {status === 'copied' && labels.phoneCopied}
        {status === 'failed' && labels.phoneCopyFailed}
      </span>
    </>
  )
}

// Kontak (A31, A32; tujuan gulir A8). Tiga kolom dalam satu panel "loket"
// (sama dengan panel layanan), isinya dari data desa yang diatur Petugas Desa
// di Kelola Profil Desa:
// - Telepon (village.phone): kartu tidak bisa diklik; nomor bisa disalin.
// - Jam layanan (village.office_hours): teks, tidak bisa diklik.
// - Kantor desa: judul dari nama desa, alamat dari village.address; seluruh
//   kartu menjadi link "Buka di peta" (tab baru) bila village.map_url diisi,
//   tanpa link peta kartu tidak bisa diklik.
// Data yang belum termuat atau kosong tampil "Belum tersedia" (telepon, jam)
// atau tidak dirender (alamat).
export function ContactSection({ content, village }) {
  const { contact: labels } = content
  const phone = village?.phone
  const hours = village?.office_hours
  const mapUrl = village?.map_url
  const address = village?.address
  const officeTitle = `${labels.officePrefix} ${formatVillageName(village?.name) ?? 'Desa'}`
  const item = 'flex min-w-0 border-pb-line [&+&]:max-[900px]:border-t [&+&]:min-[901px]:border-l'

  return (
    <section
      id={SECTION_KONTAK}
      className={`bd-container scroll-mt-22 ${sectionGap}`}
      aria-labelledby="bd-contact-title"
    >
      <h2 id="bd-contact-title" className={`${sectionTitle} mb-8`}>
        {labels.title}
      </h2>

      <ul className="m-0 grid list-none grid-cols-1 overflow-hidden rounded-3xl border border-pb-line bg-white p-0 min-[901px]:grid-cols-3">
        <li className={item}>
          <div className={cardClass}>
            <CardContent icon={Phone} title={labels.phoneLabel}>
              {phone ? (
                <CopyPhone phone={phone} labels={labels} />
              ) : (
                <span className={detailClass}>{labels.notAvailable}</span>
              )}
            </CardContent>
          </div>
        </li>

        <li className={item}>
          <div className={cardClass}>
            <CardContent icon={Clock} title={labels.hoursLabel}>
              <span className={detailClass}>{hours || labels.notAvailable}</span>
            </CardContent>
          </div>
        </li>

        <li className={item}>
          {mapUrl ? (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`bd-lift group transition-colors hover:bg-pb-laut-tint hover:text-pb-ink ${cardClass}`}
            >
              <CardContent icon={MapPin} title={officeTitle}>
                {address && <span className={detailClass}>{address}</span>}
                <span className="mt-2 inline-flex items-center gap-1.5 text-base font-bold text-pb-laut underline decoration-pb-padi decoration-2 underline-offset-[6px] group-hover:decoration-current">
                  {labels.mapLink} <span className="bd-visually-hidden">{labels.mapHint}</span>
                  <ExternalLink size={18} aria-hidden="true" />
                </span>
              </CardContent>
            </a>
          ) : (
            <div className={cardClass}>
              <CardContent icon={MapPin} title={officeTitle}>
                {address && <span className={detailClass}>{address}</span>}
              </CardContent>
            </div>
          )}
        </li>
      </ul>
    </section>
  )
}
