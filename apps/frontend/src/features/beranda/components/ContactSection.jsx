import { useEffect, useState } from 'react'
import { Check, Clock, Copy, ExternalLink, Mail, MapPin, Phone } from 'lucide-react'

import { SECTION_KONTAK } from '@/lib/constants/routes'
import { copyText } from '@/shared/lib/copyText'
import { formatVillageName } from '@/shared/lib/villageName'
import { googleMapsUrl } from '@/shared/lib/villageMap'
import { sectionGap, sectionTitle } from '../publicClasses'

const COPY_FEEDBACK_MS = 2000

// Di layar lebar isi kartu di tengah secara tegak (tinggi ketiga kartu sama).
const cardClass =
  'bd-contact-card flex flex-1 gap-4 px-6.5 py-7 text-pb-ink no-underline max-[900px]:px-5 max-[900px]:py-5.5 min-[901px]:items-center'
// Telepon dan email berbagi satu kolom: dua kartu bertumpuk yang lebih rapat.
const stackedCardClass = cardClass.replace('py-7', 'py-5')
const detailClass = 'text-base leading-normal text-pb-muted'

// Ikon tanpa kotak latar, sama seperti panel layanan.
// centered: teks rata tengah di layar lebar (kartu jam layanan).
function CardContent({ icon: Icon, title, children, centered = false }) {
  return (
    <>
      <span className="mt-0.5 flex-none text-pb-laut" aria-hidden="true">
        <Icon size={26} strokeWidth={1.8} />
      </span>
      <span
        className={`flex min-w-0 flex-col gap-1 ${centered ? 'min-[901px]:items-center min-[901px]:text-center' : ''}`}
      >
        <span className="font-display text-xl leading-tight font-bold">{title}</span>
        {children}
      </span>
    </>
  )
}

// Nomor telepon dan email: klik nilainya atau ikon salin untuk menyalin, bukan
// memanggil lewat tel:/mailto: (permintaan pemilik, 12 Okt 2026). Hasilnya
// diumumkan lewat aria-live agar terdengar juga oleh pembaca layar.
// email: alamat panjang boleh dipatahkan (sebelum "@", lalu di mana saja).
function CopyValue({ value, copyLabel, copiedLabel, failedLabel, email = false }) {
  const [status, setStatus] = useState(null) // null | 'copied' | 'failed'

  useEffect(() => {
    if (!status) return undefined
    const timer = setTimeout(() => setStatus(null), COPY_FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [status])

  const handleCopy = async () => {
    setStatus((await copyText(value)) ? 'copied' : 'failed')
  }

  const Icon = status === 'copied' ? Check : Copy

  return (
    <>
      <button
        type="button"
        className={`inline-flex min-h-11 max-w-full cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left font-bold text-pb-laut hover:text-pb-laut-hover active:translate-y-px ${
          email ? 'text-lg wrap-anywhere' : 'text-xl tracking-[0.01em] tabular-nums'
        }`}
        onClick={handleCopy}
        aria-label={`${copyLabel} ${value}`}
      >
        <span className="min-w-0">
          {email && value.includes('@') ? (
            <>
              {value.slice(0, value.indexOf('@'))}
              <wbr />
              {value.slice(value.indexOf('@'))}
            </>
          ) : (
            value
          )}
        </span>
        <Icon className="flex-none text-pb-muted" size={18} aria-hidden="true" />
      </button>
      <span className="bd-meta min-h-[1.4em] text-sm text-pb-muted" aria-live="polite">
        {status === 'copied' && copiedLabel}
        {status === 'failed' && failedLabel}
      </span>
    </>
  )
}

// Kontak (A31, A32; tujuan gulir A8). Tiga kolom dalam satu panel "loket"
// (sama dengan panel layanan), isinya dari data desa yang diatur Petugas Desa
// di Kelola Profil Desa:
// - Telepon (village.phone) dan email (village.email): dua kartu bertumpuk di
//   kolom pertama, tidak bisa diklik; nomor dan email bisa disalin.
// - Jam layanan (village.office_hours): teks, tidak bisa diklik.
// - Kantor desa: judul dari nama desa, alamat dari village.address. Kartu tidak
//   bisa diklik; hanya link "Buka di peta" (tab baru) yang membuka Google Maps,
//   tampil bila titik kantor (village.latitude/longitude) diatur.
// Data yang belum termuat atau kosong tampil "Belum tersedia" (telepon & email, jam)
// atau tidak dirender (alamat).
export function ContactSection({ content, village }) {
  const { contact: labels } = content
  const phone = village?.phone
  const email = village?.email
  const hours = village?.office_hours
  const mapUrl = googleMapsUrl(village)
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
          <div className="flex min-w-0 flex-1 flex-col">
            <div className={stackedCardClass}>
              <CardContent icon={Phone} title={labels.phoneLabel}>
                {phone ? (
                  <CopyValue
                    value={phone}
                    copyLabel={labels.copyPhone}
                    copiedLabel={labels.phoneCopied}
                    failedLabel={labels.phoneCopyFailed}
                  />
                ) : (
                  <span className={detailClass}>{labels.notAvailable}</span>
                )}
              </CardContent>
            </div>

            <div className={`${stackedCardClass} border-t border-pb-line`}>
              <CardContent icon={Mail} title={labels.emailLabel}>
                {email ? (
                  <CopyValue
                    value={email}
                    copyLabel={labels.copyEmail}
                    copiedLabel={labels.emailCopied}
                    failedLabel={labels.emailCopyFailed}
                    email
                  />
                ) : (
                  <span className={detailClass}>{labels.notAvailable}</span>
                )}
              </CardContent>
            </div>
          </div>
        </li>

        <li className={item}>
          {/* Di layar lebar kartu jam layanan juga di tengah secara mendatar. */}
          <div className={`${cardClass} min-[901px]:justify-center`}>
            <CardContent icon={Clock} title={labels.hoursLabel} centered>
              <span className={detailClass}>{hours || labels.notAvailable}</span>
            </CardContent>
          </div>
        </li>

        <li className={item}>
          <div className={cardClass}>
            <CardContent icon={MapPin} title={officeTitle}>
              {address && <span className={detailClass}>{address}</span>}
              {/* Hanya teks ini yang membuka Google Maps, bukan seluruh kartu. */}
              {mapUrl && (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex min-h-11 w-fit items-center gap-1.5 text-base font-bold text-pb-laut underline decoration-pb-padi decoration-2 underline-offset-[6px] hover:text-pb-laut-hover hover:decoration-current"
                >
                  {labels.mapLink} <span className="bd-visually-hidden">{labels.mapHint}</span>
                  <ExternalLink size={18} aria-hidden="true" />
                </a>
              )}
            </CardContent>
          </div>
        </li>
      </ul>
    </section>
  )
}
