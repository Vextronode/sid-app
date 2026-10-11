import '@/styles/beranda.css'

import { getBerandaContent } from '../berandaContent'
import { BerandaFooter } from './BerandaFooter'
import { BerandaHeader } from './BerandaHeader'

// Layout khusus route `/` (menggantikan MainLayout hanya di beranda).
// beranda.css (token --bd-* + font Plus Jakarta Sans) hanya berlaku di .bd-root.
// MobileBottomNav sengaja tidak dirender (K5); komponennya tidak diubah.
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
