import { Link } from 'react-router-dom'

import { Wave } from './Wave'

// Footer beranda, juga dipakai halaman publik lain lewat MainLayout.
// A33–A35 (privasi, aksesibilitas, PPID) hanya tampil di dev, karena halamannya
// masih draf dan route-nya hanya terdaftar di dev (D6); di production infoLinks null.
// Logo "Didukung oleh" tampil di semua mode karena isinya sudah asli
// (keputusan pemilik, 11 Okt 2026). Domain dan tanggal pembaruan tidak
// ditampilkan (permintaan pemilik, 12 Okt 2026).
export function BerandaFooter({ content }) {
  const { footer, partners, infoLinks } = content

  return (
    <footer className="bd-footer">
      <Wave variant="footer" />
      <div className="bd-container bd-footer-inner">
        <div className="bd-footer-identity">
          <span className="bd-footer-title">{footer.title}</span>
        </div>

        {/* Tanpa "Masuk petugas": petugas masuk lewat form login biasa dan
            diarahkan sesuai role. */}
        {infoLinks && (
          <nav className="bd-footer-nav" aria-label="Tautan footer">
            {infoLinks.map((link) => (
              <Link key={link.to} to={link.to} className="bd-footer-link">
                {link.label}
              </Link>
            ))}
          </nav>
        )}

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
