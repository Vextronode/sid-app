import { Link } from 'react-router-dom'

import { usePublicVillageInfo } from '@/features/info-desa/usePublicVillageInfo'
import { HAL_PROFIL } from '@/lib/constants/routes'

// Nol atau kosong dianggap belum ada datanya.
const formatNumber = (value) =>
  value ? Number(value).toLocaleString('id-ID', { maximumFractionDigits: 3 }) : null

// Pita angka (A19). Penduduk dan dusun dihitung backend dari data warga dan
// wilayah; luas wilayah diisi Petugas Desa di Kelola Profil Desa. Angka yang
// belum ada datanya tidak ditampilkan, dan pita disembunyikan bila semuanya
// kosong. Angka bukan link.
export function StatsBand({ content }) {
  const { statsBand: labels } = content
  const { village, stats } = usePublicVillageInfo()
  const area = formatNumber(village?.area_ha)

  const items = [
    { label: labels.population, value: formatNumber(stats?.total_population) },
    { label: labels.area, value: area && `${area} ha` },
    { label: labels.hamlets, value: formatNumber(stats?.total_hamlets) },
  ].filter((item) => item.value)

  if (items.length === 0) return null

  return (
    <section className="bd-container bd-stats" aria-label={labels.label}>
      <div className="bd-stats-band">
        {items.map((item) => (
          <div key={item.label} className="bd-stat">
            <span className="bd-stat-value">{item.value}</span>
            <span className="bd-stat-label">{item.label}</span>
          </div>
        ))}
        <div className="bd-stat bd-stat--meta">
          <Link to={HAL_PROFIL} className="bd-stat-link">
            {labels.profileLink}
          </Link>
        </div>
      </div>
    </section>
  )
}
