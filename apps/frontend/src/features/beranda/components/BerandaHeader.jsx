import { Link, NavLink } from 'react-router-dom'

import { HAL_BERANDA, HAL_BERITA, SECTION_KONTAK } from '@/lib/constants/routes'
import { useSectionLink } from '../utils/sectionLink'
import { AccountNavLink } from './AccountNavLink'
import { BerandaBrand } from './BerandaBrand'
import { MobileMenu } from './MobileMenu'
import { ProfilDesaDropdown } from './ProfilDesaDropdown'

// Header beranda (A1–A9), juga dipakai halaman publik lain lewat MainLayout.
export function BerandaHeader({ content }) {
  const { header } = content
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
          <ProfilDesaDropdown header={header} />
          <a className="bd-nav-link" {...sectionLinkProps(SECTION_KONTAK)}>
            {header.nav.kontak}
          </a>
          <AccountNavLink nav={header.nav} className="bd-button-outline bd-nav-login" />
        </nav>

        <MobileMenu header={header} />
      </div>
    </header>
  )
}
