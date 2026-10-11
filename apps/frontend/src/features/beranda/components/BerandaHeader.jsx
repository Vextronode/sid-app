import { Link } from 'react-router-dom'

import { usePublicVillageInfo } from '@/features/info-desa/usePublicVillageInfo'
import { HAL_BERANDA, HAL_BERITA, HAL_LOGIN, SECTION_KONTAK } from '@/lib/constants/routes'
import { sectionLinkProps } from '../utils/sectionLink'
import { MobileMenu } from './MobileMenu'
import { ProfilDesaDropdown } from './ProfilDesaDropdown'

// Header khusus beranda (A1–A9). Halaman lain tetap memakai DesktopNavbar.
export function BerandaHeader({ content }) {
  const { header } = content
  const { village } = usePublicVillageInfo()
  const showTransparansi = Boolean(content.apbdes)

  const villageName = village?.name ? `Desa ${village.name}` : header.fallbackName
  const region = [
    village?.district && `Kec. ${village.district}`,
    village?.regency && `Kab. ${village.regency}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <header className="bd-header">
      <div className="bd-container bd-header-inner">
        <Link to={HAL_BERANDA} className="bd-brand">
          <span className="bd-brand-mark" aria-hidden="true">
            {header.monogram}
          </span>
          <span className="bd-brand-text">
            <span className="bd-brand-name">{villageName}</span>
            {region && <span className="bd-brand-region">{region}</span>}
          </span>
        </Link>

        <nav className="bd-nav" aria-label="Menu utama">
          <Link to={HAL_BERITA} className="bd-nav-link">
            {header.nav.berita}
          </Link>
          <ProfilDesaDropdown header={header} showTransparansi={showTransparansi} />
          <a className="bd-nav-link" {...sectionLinkProps(SECTION_KONTAK)}>
            {header.nav.kontak}
          </a>
          <Link to={HAL_LOGIN} className="bd-button-outline bd-nav-login">
            {header.nav.masuk}
          </Link>
        </nav>

        <MobileMenu header={header} showTransparansi={showTransparansi} />
      </div>
    </header>
  )
}
