import { UserRound } from 'lucide-react'

// Sambutan Kepala Desa. Teks sambutan dan foto belum ada, jadi seluruh blok
// hanya dirender di development (K1). Nama asli dari village.head_name.
// Link Sejarah/Perangkat/Peta dari mockup sengaja tidak dipasang (01, P9).
export function KadesWelcome({ content, headName }) {
  const { welcome, welcomeBlock: labels } = content
  if (!welcome) return null

  return (
    <section className="bd-container bd-welcome-section" aria-labelledby="bd-welcome-title">
      <div className="bd-welcome">
        {/* Placeholder foto Kepala Desa (K2); dekoratif sampai foto asli tersedia. */}
        <span className="bd-welcome-photo" aria-hidden="true">
          <UserRound size={56} />
        </span>

        <figure className="bd-welcome-body">
          <h2 id="bd-welcome-title" className="bd-eyebrow bd-welcome-label">
            {labels.label}
          </h2>
          <blockquote className="bd-welcome-quote">
            <p>“{welcome.quote}”</p>
          </blockquote>
          <figcaption className="bd-welcome-caption">
            <span className="bd-welcome-name">{headName || welcome.fallbackName}</span>
            <span className="bd-welcome-role">{welcome.role}</span>
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
