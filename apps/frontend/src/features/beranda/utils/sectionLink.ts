import type { MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { HAL_BERANDA } from '@/lib/constants/routes'
import { scrollToSection } from './scrollToSection'

// Props <a> menuju section beranda (A7, A8). Di beranda: gulir halus lewat
// scrollToSection. Di halaman publik lain (MainLayout) section belum ada,
// jadi pindah ke beranda dengan hash; BerandaPage yang menggulirnya.
export function useSectionLink() {
  const navigate = useNavigate()

  return (id: string, onSelect?: () => void) => ({
    href: `${HAL_BERANDA}#${id}`,
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault()
      if (!scrollToSection(id)) navigate(`${HAL_BERANDA}#${id}`)
      onSelect?.()
    },
  })
}
