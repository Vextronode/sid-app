import '@/styles/beranda.css'
import '@/styles/public.css'

import { getBerandaContent } from '../berandaContent'
import { BerandaFooter } from './BerandaFooter'
import { PublicStickyChrome } from './PublicStickyChrome'
import type { ReactNode } from 'react'

// Layout khusus route `/`. Halaman publik lain memakai MainLayout dengan
// header dan footer yang sama.
// beranda.css (token --bd-* + font Plus Jakarta Sans) hanya berlaku di .bd-root;
// public.css (tampilan halaman publik) hanya berlaku di .pub.
// Tanpa bottom bar (K5): navigasi ponsel lewat tombol "Menu" di header.
// Header dan bar pengumuman menempel bersama (PublicStickyChrome).
export function BerandaLayout({ children }: { children: ReactNode }) {
  const content = getBerandaContent()

  return (
    <div className="bd-root pub">
      <PublicStickyChrome content={content} />
      <main className="bd-main">{children}</main>
      <BerandaFooter content={content} />
    </div>
  )
}
