import '@/styles/beranda.css'
import '@/styles/public.css'

import type { ReactNode } from 'react'

import { getBerandaContent } from '@/features/beranda/berandaContent'
import { PublicStickyChrome } from '@/features/beranda/components/PublicStickyChrome'
import { SiteFooter } from './SiteFooter'

// Layout halaman publik selain beranda (Berita, Profil Desa, Peraturan, info).
// Header dan footer sama dengan beranda; masing-masing dibungkus .bd-root
// sendiri agar gaya beranda tidak mengubah isi halaman. Navigasi ponsel lewat
// tombol "Menu" di header. Bar pengumuman menempel di bawah header
// (PublicStickyChrome), sama dengan beranda. Kelas .pub memasang tampilan
// publik (public.css) untuk header, isi, dan footer.
export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="pub flex min-h-dvh flex-col">
      <PublicStickyChrome content={getBerandaContent()} />

      <main className="w-full flex-auto">{children}</main>

      <SiteFooter />
    </div>
  )
}
