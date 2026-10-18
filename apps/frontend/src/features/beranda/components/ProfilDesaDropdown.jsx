import { ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useDisclosure } from '../hooks/useDisclosure'

// Isi Profil Desa, dipakai dropdown desktop dan menu ponsel.
// A4–A7: butir yang halamannya sudah ada menjadi link; sisanya teks biasa
// + "Segera hadir" (tidak bisa diklik/difokus), mis. Transparansi APBDes.
export function ProfilDesaItems({ header, onSelect }) {
  return (
    <ul className="bd-menu-list">
      {header.profilItems.map(({ label, to }) =>
        to ? (
          <li key={label}>
            <Link className="bd-menu-item bd-menu-item--link" to={to} onClick={onSelect}>
              {label}
            </Link>
          </li>
        ) : (
          <li key={label} className="bd-menu-item bd-menu-item--soon">
            <span>{label}</span>
            <span className="bd-badge-soon">{header.comingSoonBadge}</span>
          </li>
        ),
      )}
    </ul>
  )
}

export function ProfilDesaDropdown({ header }) {
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
        <ProfilDesaItems header={header} onSelect={close} />
      </div>
    </div>
  )
}
