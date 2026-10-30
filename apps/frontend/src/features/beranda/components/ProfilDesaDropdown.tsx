import { ChevronDown } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { useDisclosure } from '../hooks/useDisclosure'
import type { BerandaContent } from '../berandaContent'

type BerandaHeaderContent = BerandaContent['header']

// Isi Profil Desa, dipakai dropdown desktop dan menu ponsel.
// A4–A7: butir yang halamannya sudah ada menjadi link; sisanya teks biasa
// + "Segera hadir" (tidak bisa diklik/difokus), mis. Transparansi APBDes.
type ProfilDesaItemsProps = { header: BerandaHeaderContent; onSelect?: () => void }

export function ProfilDesaItems({ header, onSelect }: ProfilDesaItemsProps) {
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

// Halaman Tentang Desa sedang dibuka bila path-nya sama dengan salah satu
// butir menu (tanpa #, mis. /profil-desa#perangkat-desa -> /profil-desa).
function isProfilPage(pathname: string, items: BerandaHeaderContent['profilItems']) {
  return items.some(({ to }) => to && to.split('#')[0] === pathname)
}

export function ProfilDesaDropdown({ header }: { header: BerandaHeaderContent }) {
  const { isOpen, toggle, close, containerRef, triggerRef, panelId, onBlur } = useDisclosure()
  const { pathname } = useLocation()
  const active = isProfilPage(pathname, header.profilItems)

  return (
    <div className="bd-dropdown" ref={containerRef} onBlur={onBlur}>
      <button
        type="button"
        ref={triggerRef}
        className="bd-nav-link bd-nav-trigger"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-current={active ? 'page' : undefined}
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
