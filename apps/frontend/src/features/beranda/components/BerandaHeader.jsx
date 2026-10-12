import { Link, NavLink } from 'react-router-dom'

import { HAL_BERANDA, HAL_BERITA, HAL_LOGIN, SECTION_KONTAK } from '@/lib/constants/routes'
import { useSectionLink } from '../utils/sectionLink'
import { BerandaBrand } from './BerandaBrand'
import { MobileMenu } from './MobileMenu'
import { ProfilDesaDropdown } from './ProfilDesaDropdown'

// Header beranda (A1–A9), juga dipakai halaman publik lain lewat MainLayout.
export function BerandaHeader({ content }) {
  const { header } = content
  const showTransparansi = Boolean(content.apbdes)
  const sectionLinkProps = useSectionLink()

  return (
    <header className="bd-header">
      <div className="bd-container bd-header-inner">
        <BerandaBrand header={header} />

        <nav className="bd-nav" aria-label="Menu utama">
          {/* Selain lewat logo. NavLink memberi aria-current di beranda. */}
          <NavLink to={HAL_BERANDA} end className="bd-nav-link">
            {header.nav.beranda}
          </NavLink>
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
