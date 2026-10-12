import '@/styles/beranda.css'

import { getBerandaContent } from '@/features/beranda/berandaContent'
import { BerandaHeader } from '@/features/beranda/components/BerandaHeader'
import { SiteFooter } from './SiteFooter'

// Layout halaman publik selain beranda (Berita, Profil Desa, Peraturan, info).
// Header dan footer sama dengan beranda; masing-masing dibungkus .bd-root
// sendiri agar gaya beranda tidak mengubah isi halaman. Navigasi ponsel lewat
// tombol "Menu" di header.
export function MainLayout({ children, isDev = import.meta.env.DEV }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bd-root bd-chrome bd-chrome--sticky">
        <BerandaHeader content={getBerandaContent(isDev)} />
      </div>

      <main className="grow w-full">{children}</main>

      <SiteFooter isDev={isDev} />
    </div>
  )
}
