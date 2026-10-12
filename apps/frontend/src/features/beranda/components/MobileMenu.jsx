import { Menu, X } from 'lucide-react'
import { Link } from 'react-router-dom'

import { HAL_BERITA, HAL_LOGIN, SECTION_KONTAK } from '@/lib/constants/routes'
import { useDisclosure } from '../hooks/useDisclosure'
import { useSectionLink } from '../utils/sectionLink'
import { ProfilDesaItems } from './ProfilDesaDropdown'

// Navigasi ponsel (K5): tombol berlabel teks "Menu" yang membuka daftar nav.
// Aturan tutupnya sama dengan dropdown Profil Desa (useDisclosure).
export function MobileMenu({ header, showTransparansi }) {
  const { isOpen, toggle, close, containerRef, triggerRef, panelId, onBlur } = useDisclosure()
  const { nav } = header
  const sectionLinkProps = useSectionLink()

  return (
    <div className="bd-mobile-menu" ref={containerRef} onBlur={onBlur}>
      <button
        type="button"
        ref={triggerRef}
        className="bd-menu-button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={toggle}
      >
        {isOpen ? (
          <X size={22} strokeWidth={2.2} aria-hidden="true" />
        ) : (
          <Menu size={22} strokeWidth={2.2} aria-hidden="true" />
        )}
        {nav.menu}
      </button>

      <nav id={panelId} className="bd-mobile-panel" aria-label="Menu utama" hidden={!isOpen}>
        <ul className="bd-menu-list">
          <li>
            <Link to={HAL_BERITA} className="bd-menu-item bd-menu-item--link" onClick={close}>
              {nav.berita}
            </Link>
          </li>
          <li className="bd-mobile-group">
            <span className="bd-mobile-group-title">{nav.profil}</span>
            <ProfilDesaItems header={header} showTransparansi={showTransparansi} onSelect={close} />
          </li>
          <li>
            <a
              className="bd-menu-item bd-menu-item--link"
              {...sectionLinkProps(SECTION_KONTAK, close)}
            >
              {nav.kontak}
            </a>
          </li>
          <li>
            <Link to={HAL_LOGIN} className="bd-button-outline bd-mobile-login" onClick={close}>
              {nav.masuk}
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  )
}
