import { Clock, ExternalLink, MapPin, Phone } from 'lucide-react'

import { SECTION_KONTAK } from '@/lib/constants/routes'

// Nomor untuk tautan tel:, mis. "0265-639 123" → "0265639123" (tanda + tetap).
function toTelHref(phone) {
  const number = String(phone).replace(/(?!^\+)[^\d]/g, '')
  return number ? `tel:${number}` : null
}

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

// Kontak (A31, A32; tujuan gulir A8). Tiga kartu (K14):
// - Telepon / WhatsApp: seluruh kartu link tel: dari village.phone.
// - Jam layanan: teks dari konfigurasi, tidak bisa diklik.
// - Kantor desa: alamat dari village.address; "Buka di peta" (tab baru) hanya
//   bila link peta ada (dev). Di production kartu ini tidak bisa diklik (K1).
// Kartu yang datanya belum termuat tetap tampil tanpa baris data dan tanpa link.
export function ContactSection({ content, village }) {
  const { contact: labels, mapUrl } = content
  const phone = village?.phone
  const telHref = phone ? toTelHref(phone) : null
  const address = village?.address

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
          {telHref ? (
            <a href={telHref} className="bd-contact-card bd-contact-card--link bd-lift">
              <CardContent icon={Phone} title={labels.phoneLabel}>
                <span className="bd-contact-detail">{phone}</span>
              </CardContent>
            </a>
          ) : (
            <div className="bd-contact-card">
              <CardContent icon={Phone} title={labels.phoneLabel} />
            </div>
          )}
        </li>

        <li>
          <div className="bd-contact-card">
            <CardContent icon={Clock} title={labels.hoursLabel}>
              <span className="bd-contact-detail">{labels.hours}</span>
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
              <CardContent icon={MapPin} title={labels.officeLabel}>
                {address && <span className="bd-contact-detail">{address}</span>}
                <span className="bd-contact-map">
                  {labels.mapLink} <span className="bd-visually-hidden">{labels.mapHint}</span>
                  <ExternalLink size={18} aria-hidden="true" />
                </span>
              </CardContent>
            </a>
          ) : (
            <div className="bd-contact-card">
              <CardContent icon={MapPin} title={labels.officeLabel}>
                {address && <span className="bd-contact-detail">{address}</span>}
              </CardContent>
            </div>
          )}
        </li>
      </ul>
    </section>
  )
}
