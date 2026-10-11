import { scrollToSection } from './scrollToSection'

// Props <a> menuju section beranda (A7, A8): gulir halus lewat scrollToSection.
// Bila section belum ada di halaman, href "#id" bawaan browser tetap berlaku.
export function sectionLinkProps(id, onSelect) {
  return {
    href: `#${id}`,
    onClick: (event) => {
      if (scrollToSection(id)) event.preventDefault()
      onSelect?.()
    },
  }
}
