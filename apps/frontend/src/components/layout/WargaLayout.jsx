// ==========================================
// WargaLayout.jsx
// Header dan footer bergaya publik (AppHeader, SiteFooter).
// ==========================================

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'

import NotificationPopover from '@/features/notifikasi/components/NotificationPopover'
import HelpCenterModal from '@/features/warga-help/components/HelpCenterModal'
import useNotifications from '@/features/notifikasi/hooks/useNotifications'
import { AppHeader } from './AppHeader'
import { SiteFooter } from './SiteFooter'

const WARGA_MENU = [
  { label: 'Beranda', path: '/daftar-surat' },
  { label: 'Ajukan Surat', path: '/jenis-surat' },
]

export function WargaLayout({ children }) {
  const [notifOpen, setNotifOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const notificationState = useNotifications()
  const { unreadCount, reload } = notificationState

  return (
    <div
      className="min-h-screen relative flex flex-col"
      style={{
        background: 'var(--sid-surface-page)',
        color: 'var(--sid-text-primary)',
      }}
    >
      <AppHeader
        menuItems={WARGA_MENU}
        profilePath="/profile"
        unreadCount={unreadCount}
        onNotificationClick={() => {
          const opening = !notifOpen
          setNotifOpen(opening)
          if (opening) void reload()
        }}
        extraActions={[
          { label: 'Pusat Bantuan', icon: HelpCircle, onClick: () => setHelpOpen(true) },
        ]}
        popover={
          <NotificationPopover
            open={notifOpen}
            onClose={() => setNotifOpen(false)}
            {...notificationState}
          />
        }
      />

      <main className="relative grow">{children}</main>

      <SiteFooter />

      <HelpCenterModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
