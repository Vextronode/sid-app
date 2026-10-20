import '@/styles/beranda.css'
import '@/styles/public.css'

import { getBerandaContent } from '@/features/beranda/berandaContent'
import { BerandaFooter } from '@/features/beranda/components/BerandaFooter'

// Footer publik (beranda) untuk halaman publik lain dan halaman semua role.
// Dibungkus .bd-root sendiri agar gaya beranda tidak mengubah isi halaman.
// Kelas .pub dipasang di sini juga (bukan hanya dari MainLayout) supaya
// tampilan footer publik (public.css) sama di halaman role, mobile maupun
// desktop. Latarnya tetap transparan karena .bd-root.bd-chrome.
export function SiteFooter() {
  return (
    <div className="pub bd-root bd-chrome">
      <BerandaFooter content={getBerandaContent()} />
    </div>
  )
}
