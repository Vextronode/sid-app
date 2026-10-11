// ==========================================
// AdminLayout.jsx
// Layout untuk role RT, RW, dan Kadus.
// Menggunakan SID Global Theme.
// ==========================================

import { useState } from 'react'
import { Bell, User, LogOut, UserCircle } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import NotificationPopover from '@/features/notifikasi/components/NotificationPopover-Admin'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import useNotifications from '@/features/notifikasi/hooks/useNotifications'

// Menu bawaan per peran: beranda, surat yang diproses, dan surat pribadi.
const ROLE_MENUS = {
  rt: ['/admin/dashboard-surat-rt', '/admin/list-rt'],
  rw: ['/admin/dashboard-surat-rw', '/admin/list-rw'],
  kadus: ['/admin/dashboard-surat-kadus', '/admin/list-kadus'],
  kepala_desa: ['/admin/dashboard-surat-kades', '/admin/list-kades'],
  sekretaris_desa: ['/admin/dashboard-surat-kades', '/admin/list-kades'],
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
  const location = useLocation()
  const navigate = useNavigate()

  const { user, logout } = useAuth()
  const menuItems = customMenuItems ?? defaultMenuItems(user?.role)
  const notificationState = useNotifications()
  const { unreadCount, reload } = notificationState

  const [notifOpen, setNotifOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const handleLogout = () => {
    setSettingsOpen(false)
    logout?.()
    navigate('/loginpage')
  }

  return (
    <div className="min-h-screen bg-[var(--sid-surface-page)] relative">
      {/* ==========================================
          NAVBAR
          ========================================== */}

      <nav className="sid-navbar">
        {/* BRAND */}

        <Link to="/" className="sid-navbar-brand">
          SIDUTama
        </Link>

        {/* ==========================================
            MENU
            ========================================== */}

        {menuItems ? (
          <div className="sid-navbar-menu">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={
                    isActive ? 'sid-navbar-link sid-navbar-link-active' : 'sid-navbar-link'
                  }
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        ) : (
          <span />
        )}

        {/* ==========================================
            ACTIONS
            ========================================== */}

        <div className="sid-navbar-actions">
          {/* NOTIFIKASI */}

          <button
            type="button"
            onClick={() => {
              const opening = !notifOpen
              setNotifOpen(opening)
              if (opening) void reload()
            }}
            className="sid-navbar-icon-btn"
            title="Notifikasi"
          >
            <Bell size={18} />

            {unreadCount > 0 && (
              <span className="sid-notification-badge">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* ========================================
              SETTINGS
              ======================================== */}

          {/* Tombol profil: Profil Saya atau Keluar, untuk semua peran. */}
          {user ? (
            <div className="relative h-full flex items-center">
              <button
                type="button"
                onClick={() => setSettingsOpen((v) => !v)}
                className="sid-navbar-icon-btn"
                title="Akun"
                aria-haspopup="menu"
                aria-expanded={settingsOpen}
              >
                <UserCircle size={20} />
              </button>

              {settingsOpen && (
                <>
                  {/* Overlay */}

                  <div className="fixed inset-0 z-40" onClick={() => setSettingsOpen(false)} />

                  {/* Dropdown */}

                  <div className="sid-dropdown">
                    <Link
                      to="/admin/profile"
                      onClick={() => setSettingsOpen(false)}
                      className="sid-dropdown-item"
                    >
                      <UserCircle size={18} />
                      <span>Profil Saya</span>
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="
                        sid-dropdown-item
                        sid-dropdown-item-danger
                      "
                    >
                      <LogOut size={18} />
                      <span>Keluar</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* ========================================
               AVATAR UNTUK ROLE LAIN
               ======================================== */

            <div className="sid-navbar-avatar">
              <User size={18} />
            </div>
          )}
        </div>
      </nav>

      {/* ==========================================
          NOTIFICATION POPOVER
          ========================================== */}

      <NotificationPopover
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        {...notificationState}
      />

      {/* ==========================================
          CONTENT
          ========================================== */}

      <main>{children}</main>
    </div>
  )
}
