import { Link } from 'react-router-dom'

import { usePublicVillageInfo } from '@/features/info-desa/usePublicVillageInfo'
import { HAL_BERANDA } from '@/lib/constants/routes'

// Lambang + nama desa + wilayah (A1, A2). Dipakai header publik, header role
// (AppHeader), dan sidebar operator. `subtitle` menggantikan baris wilayah,
// mis. "Admin Petugas Desa" di sidebar.
export function BerandaBrand({ header, to = HAL_BERANDA, subtitle, className = 'bd-brand' }) {
  const { village } = usePublicVillageInfo()

  const villageName = village?.name ? `Desa ${village.name}` : header.fallbackName
  const region =
    subtitle ??
    [village?.district && `Kec. ${village.district}`, village?.regency && `Kab. ${village.regency}`]
      .filter(Boolean)
      .join(' · ')

  return (
    <Link to={to} className={className}>
      <img className="bd-brand-mark" src={header.logoSrc} alt="" decoding="async" />
      <span className="bd-brand-text">
        <span className="bd-brand-name">{villageName}</span>
        {region && <span className="bd-brand-region">{region}</span>}
      </span>
    </Link>
  )
}
