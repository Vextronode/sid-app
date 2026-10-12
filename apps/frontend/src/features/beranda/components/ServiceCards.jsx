import { ClipboardCheck, FileText, Mail, MessageCircle, Search } from 'lucide-react'
import { Link } from 'react-router-dom'

import { HAL_AJUKAN_SURAT, HAL_STATUS_SURAT } from '@/lib/constants/routes'
import { useLoginAwareHref } from '../hooks/useLoginAwareHref'
import { WhatsAppIcon } from './WhatsAppIcon'

// Alamat email panjang dipatahkan di depan "@" bila tidak muat satu baris.
function EmailText({ email }) {
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

function CardIcon({ icon: Icon, tone }) {
  return (
    <span className={`bd-service-icon bd-service-icon--${tone}`} aria-hidden="true">
      <Icon size={24} />
    </span>
  )
}

// Kartu layanan (A14–A18).
// - Ajukan & Cek status: seluruh kartu adalah link dengan alur login (K4).
// - Syarat dokumen: belum ada halamannya, jadi bukan link dan tanpa lift (K3).
// - Pengaduan: kartu tidak bisa diklik; hanya baris WA dan email (K14). Baris WA
//   (D2) membuka menu bagikan AddToAny di tab baru; nama aksesibel = teksnya.
//   Email dari data desa (village.email); tanpa email barisnya tidak dirender.
export function ServiceCards({ content, village }) {
  const { services, complaint } = content
  const email = village?.email
  const ajukanHref = useLoginAwareHref(HAL_AJUKAN_SURAT)
  const statusHref = useLoginAwareHref(HAL_STATUS_SURAT)

  return (
    <section className="bd-container bd-services" aria-label={services.label}>
      <ul className="bd-service-grid">
        <li>
          <Link to={ajukanHref} className="bd-service-card bd-service-card--link bd-lift">
            <CardIcon icon={FileText} tone="accent" />
            <span className="bd-service-title">{services.ajukan.title}</span>
            <span className="bd-service-desc">{services.ajukan.description}</span>
          </Link>
        </li>

        <li>
          <Link to={statusHref} className="bd-service-card bd-service-card--link bd-lift">
            <CardIcon icon={Search} tone="primary" />
            <span className="bd-service-title">{services.status.title}</span>
            <span className="bd-service-desc">{services.status.description}</span>
          </Link>
        </li>

        <li>
          <div className="bd-service-card">
            <CardIcon icon={ClipboardCheck} tone="accent" />
            <span className="bd-service-title">{services.syarat.title}</span>
            <span className="bd-service-desc">{services.syarat.description}</span>
            <span className="bd-badge-soon bd-service-badge">{services.syarat.badge}</span>
          </div>
        </li>

        <li>
          <div className="bd-service-card bd-lift">
            <CardIcon icon={MessageCircle} tone="primary" />
            <span className="bd-service-title">{services.pengaduan.title}</span>
            <a
              href={complaint.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bd-service-contact"
            >
              <span className="bd-service-contact-icon bd-service-contact-icon--accent">
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
                className="bd-service-contact"
                aria-label={`${services.pengaduan.emailLabel} ${email}`}
              >
                <span className="bd-service-contact-icon bd-service-contact-icon--primary">
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
