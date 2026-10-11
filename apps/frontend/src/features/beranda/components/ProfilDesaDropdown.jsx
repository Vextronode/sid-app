import { ChevronDown } from 'lucide-react'

import { SECTION_TRANSPARANSI } from '@/lib/constants/routes'
import { useDisclosure } from '../hooks/useDisclosure'
import { sectionLinkProps } from '../utils/sectionLink'

// Isi Profil Desa, dipakai dropdown desktop dan menu ponsel.
// A4–A6 teks biasa + "Segera hadir" (tidak bisa diklik/difokus).
// A7 hanya dirender bila section Transparansi tampil.
export function ProfilDesaItems({ header, showTransparansi, onSelect }) {
  return (
    <ul className="bd-menu-list">
      {header.profilComingSoon.map((label) => (
        <li key={label} className="bd-menu-item bd-menu-item--soon">
          <span>{label}</span>
          <span className="bd-badge-soon">{header.comingSoonBadge}</span>
        </li>
      ))}
      {showTransparansi && (
        <>
          <li className="bd-menu-divider" aria-hidden="true" />
          <li>
            <a
              className="bd-menu-item bd-menu-item--link"
              {...sectionLinkProps(SECTION_TRANSPARANSI, onSelect)}
            >
              {header.transparansi}
            </a>
          </li>
        </>
      )}
    </ul>
  )
}

export function ProfilDesaDropdown({ header, showTransparansi }) {
  const { isOpen, toggle, close, containerRef, triggerRef, panelId, onBlur } = useDisclosure()

  return (
    <div className="bd-dropdown" ref={containerRef} onBlur={onBlur}>
      <button
        type="button"
        ref={triggerRef}
        className="bd-nav-link bd-nav-trigger"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={toggle}
      >
        {header.nav.profil}
        <ChevronDown className="bd-nav-chevron" size={16} strokeWidth={2.2} aria-hidden="true" />
      </button>
      <div id={panelId} className="bd-dropdown-panel" hidden={!isOpen}>
        <ProfilDesaItems header={header} showTransparansi={showTransparansi} onSelect={close} />
      </div>
    </div>
  )
}
