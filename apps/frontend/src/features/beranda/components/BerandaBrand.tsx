import { Link } from 'react-router-dom'

import { usePublicVillageInfo } from '@/features/info-desa/usePublicVillageInfo'
import { HAL_BERANDA } from '@/lib/constants/routes'
import { formatVillageName } from '@/shared/lib/villageName'

// Lambang + nama desa + wilayah (A1, A2). Dipakai header publik, header role
// (AppHeader), dan sidebar operator. `subtitle` menggantikan baris wilayah,
// mis. "Admin Staf SIDUTama" di sidebar. Nama dan lambang dari data desa
// (diatur Staf SIDUTama); selagi belum termuat, tempat lambang tetap dipesan
// agar header tidak bergeser.
type BerandaBrandProps = {
  // Hanya nama cadangan yang dipakai, selagi data desa belum termuat.
  header: { fallbackName: string }
  to?: string
  subtitle?: string
  className?: string
}

export function BerandaBrand({
  header,
  to = HAL_BERANDA,
  subtitle,
  className = 'bd-brand',
}: BerandaBrandProps) {
  const { village } = usePublicVillageInfo()

  const villageName = formatVillageName(village?.name) ?? header.fallbackName
  const region =
    subtitle ??
    [village?.district && `Kec. ${village.district}`, village?.regency && `Kab. ${village.regency}`]
      .filter(Boolean)
      .join(' · ')

  return (
    <Link to={to} className={className}>
      {village?.logo_url ? (
        // Lambang ada di atas lipatan di semua halaman: diprioritaskan, dan
        // ukurannya (44px, sama dengan .bd-brand-mark) dipesan sejak awal.
        <img
          className="bd-brand-mark"
          src={village.logo_url}
          alt=""
          width={44}
          height={44}
          decoding="async"
          fetchPriority="high"
        />
      ) : (
        <span className="bd-brand-mark" aria-hidden="true" />
      )}
      <span className="bd-brand-text">
        <span className="bd-brand-name">{villageName}</span>
        {region && <span className="bd-brand-region">{region}</span>}
      </span>
    </Link>
  )
}
