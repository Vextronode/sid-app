import '@/styles/beranda.css'

import { getBerandaContent } from '../berandaContent'
import { BerandaFooter } from './BerandaFooter'
import { BerandaHeader } from './BerandaHeader'

// Layout khusus route `/`. Halaman publik lain memakai MainLayout dengan
// header dan footer yang sama.
// beranda.css (token --bd-* + font Plus Jakarta Sans) hanya berlaku di .bd-root.
// Tanpa bottom bar (K5): navigasi ponsel lewat tombol "Menu" di header.
export function BerandaLayout({ children, isDev = import.meta.env.DEV }) {
  const content = getBerandaContent(isDev)

  return (
    <div className="bd-root">
      <BerandaHeader content={content} />
      <main className="bd-main">{children}</main>
      <BerandaFooter content={content} />
    </div>
  )
}
