import '@/styles/beranda.css'

import { getBerandaContent } from '@/features/beranda/berandaContent'
import { BerandaFooter } from '@/features/beranda/components/BerandaFooter'

// Footer publik (beranda) untuk halaman publik lain dan halaman semua role.
// Dibungkus .bd-root sendiri agar gaya beranda tidak mengubah isi halaman.
export function SiteFooter({ isDev = import.meta.env.DEV }) {
  return (
    <div className="bd-root bd-chrome">
      <BerandaFooter content={getBerandaContent(isDev)} />
    </div>
  )
}
