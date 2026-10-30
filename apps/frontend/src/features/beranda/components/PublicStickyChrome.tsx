import { useEffect, useRef } from 'react'

import { usePublicVillageInfo } from '@/features/info-desa/usePublicVillageInfo'
import { AnnouncementBar } from './AnnouncementBar'
import { BerandaHeader } from './BerandaHeader'

const OFFSET_VAR = '--bd-sticky-offset'

// Header publik + bar pengumuman yang menempel di atas layar, dipakai
// BerandaLayout dan MainLayout sehingga pengumuman tetap terlihat di semua
// halaman publik (beranda, berita, profil desa, halaman informasi, ...).
// Tingginya disimpan di --bd-sticky-offset (scroll-padding-top di
// beranda.css) agar tujuan tautan #section tidak tertutup header + bar.
export function PublicStickyChrome({ content }) {
  const { announcement } = usePublicVillageInfo()
  const ref = useRef(null)

  useEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return undefined

    const root = document.documentElement
    const observer = new ResizeObserver(([entry]) => {
      root.style.setProperty(
        OFFSET_VAR,
        `${Math.ceil((entry.target as HTMLElement).offsetHeight)}px`,
      )
    })
    observer.observe(element)

    return () => {
      observer.disconnect()
      root.style.removeProperty(OFFSET_VAR)
    }
  }, [])

  return (
    <div ref={ref} className="bd-root bd-chrome bd-chrome--sticky">
      <BerandaHeader content={content} />
      <AnnouncementBar content={content} announcement={announcement} />
    </div>
  )
}
