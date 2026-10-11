import { Link } from 'react-router-dom'

import { HAL_LOGIN } from '@/lib/constants/routes'
import { Wave } from './Wave'

// Footer khusus beranda. Halaman lain tetap memakai FooterDesa.
// A33–A35 (privasi, aksesibilitas, PPID) tidak dirender sampai halamannya ada (K3).
// Domain/tanggal pembaruan dan logo "Didukung oleh" tampil di semua mode
// karena isinya sudah asli (keputusan pemilik, 11 Okt 2026).
export function BerandaFooter({ content }) {
  const { footer, site, partners } = content

  return (
    <footer className="bd-footer">
      <Wave variant="footer" />
      <div className="bd-container bd-footer-inner">
        <div className="bd-footer-identity">
          <span className="bd-footer-title">{footer.title}</span>
          {site && (
            <>
              <span className="bd-footer-meta">
                {site.domain} · {footer.siteLabel}
              </span>
              <span className="bd-footer-meta bd-footer-meta--small">
                {footer.updatedPrefix} {site.updatedAt}
              </span>
            </>
          )}
        </div>

        <nav className="bd-footer-nav" aria-label="Tautan footer">
          <Link to={HAL_LOGIN} className="bd-footer-link">
            {footer.staffLogin}
          </Link>
        </nav>

        {partners.length > 0 && (
          <div className="bd-footer-partners">
            <span className="bd-footer-meta bd-footer-meta--small">{footer.supportedBy}</span>
            <ul className="bd-partner-list">
              {partners.map((partner) => {
                const logo = (
                  <img src={partner.src} alt={partner.name} loading="lazy" decoding="async" />
                )

                return (
                  <li key={partner.id} className={`bd-partner-logo bd-partner-logo--${partner.id}`}>
                    {partner.url ? (
                      <a
                        href={partner.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bd-partner-link"
                      >
                        {logo} <span className="bd-visually-hidden">{footer.newTabHint}</span>
                      </a>
                    ) : (
                      logo
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </footer>
  )
}
