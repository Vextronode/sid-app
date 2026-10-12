import { useEffect, useState } from 'react'
import { Check, Clock, Copy, ExternalLink, MapPin, Phone } from 'lucide-react'

import { SECTION_KONTAK } from '@/lib/constants/routes'
import { copyText } from '@/shared/lib/copyText'
import { formatVillageName } from '@/shared/lib/villageName'

const COPY_FEEDBACK_MS = 2000

function CardContent({ icon: Icon, title, children }) {
  return (
    <>
      <span className="bd-contact-icon" aria-hidden="true">
        <Icon size={28} />
      </span>
      <span className="bd-contact-text">
        <span className="bd-contact-title">{title}</span>
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
        className="bd-contact-line bd-contact-copy"
        onClick={handleCopy}
        aria-label={`${labels.copyPhone} ${phone}`}
      >
        {phone}
        <Icon className="bd-contact-copy-icon" size={18} aria-hidden="true" />
      </button>
      <span className="bd-contact-copy-status bd-meta" aria-live="polite">
        {status === 'copied' && labels.phoneCopied}
        {status === 'failed' && labels.phoneCopyFailed}
      </span>
    </>
  )
}

// Kontak (A31, A32; tujuan gulir A8). Tiga kartu (K14), isinya dari data desa
// yang diatur Petugas Desa di Kelola Profil Desa:
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

  return (
    <section
      id={SECTION_KONTAK}
      className="bd-container bd-contact"
      aria-labelledby="bd-contact-title"
    >
      <h2 id="bd-contact-title" className="bd-section-title bd-contact-heading">
        {labels.title}
      </h2>

      <ul className="bd-contact-grid">
        <li>
          <div className="bd-contact-card">
            <CardContent icon={Phone} title={labels.phoneLabel}>
              {phone ? (
                <CopyPhone phone={phone} labels={labels} />
              ) : (
                <span className="bd-contact-detail">{labels.notAvailable}</span>
              )}
            </CardContent>
          </div>
        </li>

        <li>
          <div className="bd-contact-card">
            <CardContent icon={Clock} title={labels.hoursLabel}>
              <span className="bd-contact-detail">{hours || labels.notAvailable}</span>
            </CardContent>
          </div>
        </li>

        <li>
          {mapUrl ? (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bd-contact-card bd-contact-card--link bd-lift"
            >
              <CardContent icon={MapPin} title={officeTitle}>
                {address && <span className="bd-contact-detail">{address}</span>}
                <span className="bd-contact-map">
                  {labels.mapLink} <span className="bd-visually-hidden">{labels.mapHint}</span>
                  <ExternalLink size={18} aria-hidden="true" />
                </span>
              </CardContent>
            </a>
          ) : (
            <div className="bd-contact-card">
              <CardContent icon={MapPin} title={officeTitle}>
                {address && <span className="bd-contact-detail">{address}</span>}
              </CardContent>
            </div>
          )}
        </li>
      </ul>
    </section>
  )
}
