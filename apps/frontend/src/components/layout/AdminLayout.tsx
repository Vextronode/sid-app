// ==========================================
// AdminLayout.tsx
// Layout untuk role RT, RW, Kadus, Kades, dan Sekdes.
// Header bergaya publik (AppHeader); footer dirender tiap halaman (SiteFooter).
// ==========================================

import { useState } from 'react'

import NotificationPopover from '@/features/notifikasi/components/NotificationPopover-Admin'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import useNotifications from '@/features/notifikasi/hooks/useNotifications'
import { AppHeader } from './AppHeader'

// Menu bawaan per peran: beranda, surat yang diproses, dan surat pribadi.
const ROLE_MENUS = {
  rt: ['/admin/rt', '/admin/rt/surat'],
  rw: ['/admin/rw', '/admin/rw/surat'],
  kadus: ['/admin/kadus', '/admin/kadus/surat'],
  kepala_desa: ['/admin/kades', '/admin/kades/surat'],
  sekretaris_desa: ['/admin/kades', '/admin/kades/surat'],
}

function defaultMenuItems(role) {
  const routes = ROLE_MENUS[role]

  if (!routes) return null

  return [
    { label: 'Beranda', path: routes[0] },
    { label: 'Surat Warga', path: routes[1] },
    { label: 'Surat Saya', path: '/admin/surat-saya' },
  ]
}

export function AdminLayout({ children, menuItems: customMenuItems }) {
  const { user } = useAuth()
  const menuItems = customMenuItems ?? defaultMenuItems(user?.role) ?? []
  const notificationState = useNotifications()
  const { unreadCount, reload } = notificationState

  const [notifOpen, setNotifOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[var(--sid-surface-page)] relative">
      <AppHeader
        menuItems={menuItems}
        profilePath="/admin/profil"
        unreadCount={unreadCount}
        onNotificationClick={() => {
          const opening = !notifOpen
          setNotifOpen(opening)
          if (opening) void reload()
        }}
        onMenuOpen={() => setNotifOpen(false)}
        popover={
          <NotificationPopover
            open={notifOpen}
            onClose={() => setNotifOpen(false)}
            {...notificationState}
          />
        }
      />

      <main>{children}</main>
    </div>
  )
}
