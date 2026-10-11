import { Link } from 'react-router-dom'

import { HAL_PROFIL } from '@/lib/constants/routes'

// Pita angka (A19). Angka diisi manual di berandaContent.js (belum ada
// endpoint statistik publik); tampil di development dan production. Angka bukan link.
export function StatsBand({ content }) {
  const { stats, statsBand: labels } = content
  if (!stats) return null

  return (
    <section className="bd-container bd-stats" aria-label={labels.label}>
      <div className="bd-stats-band">
        {stats.items.map((item) => (
          <div key={item.label} className="bd-stat">
            <span className="bd-stat-value">{item.value}</span>
            <span className="bd-stat-label">{item.label}</span>
          </div>
        ))}
        <div className="bd-stat bd-stat--meta">
          <span className="bd-stat-asof">
            {labels.asOfPrefix} {stats.asOf}
          </span>
          <Link to={HAL_PROFIL} className="bd-stat-link">
            {labels.profileLink}
          </Link>
        </div>
      </div>
    </section>
  )
}
