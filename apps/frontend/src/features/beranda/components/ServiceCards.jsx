import { ClipboardCheck, FileText, Mail, MessageCircle, Search } from 'lucide-react'
import { Link } from 'react-router-dom'

import { HAL_AJUKAN_SURAT, HAL_STATUS_SURAT } from '@/lib/constants/routes'
import { useLoginAwareHref } from '../hooks/useLoginAwareHref'

// Ikon WhatsApp dari reference/mockup.html (lucide tidak punya ikon merek).
function WhatsAppIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3.5 20.5l1.2-4.3A8.5 8.5 0 1 1 8 19.4z" />
      <path d="M9 8.5c.3 2.6 2.4 4.9 5 5.5l1-1.2 2 1-.6 1.6c-3.8.2-7.6-3.4-7.6-7.4L10.4 7l1.1 2-1.2 1" />
    </svg>
  )
}

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
// - Pengaduan: kartu tidak bisa diklik; hanya baris WA dan email (K14).
export function ServiceCards({ content }) {
  const { services, complaint } = content
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
              href={`https://wa.me/${complaint.whatsappNumber}`}
              className="bd-service-contact"
              aria-label={`${services.pengaduan.whatsappLabel} ${complaint.whatsappLabel}`}
            >
              <span className="bd-service-contact-icon bd-service-contact-icon--accent">
                <WhatsAppIcon />
              </span>
              <span>{complaint.whatsappLabel}</span>
            </a>
            <a
              href={`mailto:${complaint.email}`}
              className="bd-service-contact"
              aria-label={`${services.pengaduan.emailLabel} ${complaint.email}`}
            >
              <span className="bd-service-contact-icon bd-service-contact-icon--primary">
                <Mail size={20} aria-hidden="true" />
              </span>
              <EmailText email={complaint.email} />
            </a>
          </div>
        </li>
      </ul>
    </section>
  )
}
