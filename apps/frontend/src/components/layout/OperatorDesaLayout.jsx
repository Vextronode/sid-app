// ==========================================
// OperatorDesaLayout.jsx
// Layout khusus Operator Desa
// Styling menggunakan Global CSS SID.
// Logic/auth/routing tidak diubah.
// ==========================================

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Bell,
  BriefcaseBusiness,
  ScrollText,
  LayoutGrid,
  FilePlus,
  FileText,
  Users,
  UserCog,
  UserRoundCog,
  Building2,
  MapPinned,
  Newspaper,
  LogOut,
  Network,
  Settings,
  UserCircle,
} from 'lucide-react'
import { WilayahMasterProvider } from '@/features/kelola-wilayah/hooks/WilayahMasterProvider'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import NotificationPopover from '@/features/notifikasi/components/NotificationPopover-Admin'
import useNotifications from '@/features/notifikasi/hooks/useNotifications'
import {
  getOperatorAllowedRoles,
  ROLE_NAVIGATION,
} from '@/features/operator-desa/constants/roleNavigation'

const MENU_ITEMS = [
  {
    label: 'Ringkasan',
    route: '/admin/operator-desa',
    allowedRoles: getOperatorAllowedRoles('/admin/operator-desa'),
    icon: LayoutGrid,
  },
  {
    label: 'Permohonan Surat',
    route: '/admin/operator-desa/surat',
    allowedRoles: getOperatorAllowedRoles('/admin/operator-desa/surat'),
    icon: FileText,
  },
  {
    label: 'Surat Saya',
    route: '/admin/surat-saya',
    allowedRoles: getOperatorAllowedRoles('/admin/surat-saya'),
    icon: FilePlus,
  },
  {
    label: 'Data Penduduk',
    route: '/admin/data-warga',
    allowedRoles: getOperatorAllowedRoles('/admin/data-warga'),
    icon: Users,
  },
  {
    label: 'Kelola Wilayah',
    route: '/admin/kelola-wilayah',
    allowedRoles: getOperatorAllowedRoles('/admin/kelola-wilayah'),
    icon: MapPinned,
  },
  {
    label: 'Katalog Pekerjaan',
    route: '/admin/kelola-pekerjaan',
    allowedRoles: getOperatorAllowedRoles('/admin/kelola-pekerjaan'),
    icon: BriefcaseBusiness,
  },
  {
    label: 'Manajemen Pengguna',
    route: '/admin/manajemen-user',
    allowedRoles: getOperatorAllowedRoles('/admin/manajemen-user'),
    icon: UserCog,
  },
  {
    label: 'Pejabat Desa',
    route: '/admin/pejabat-desa',
    allowedRoles: getOperatorAllowedRoles('/admin/pejabat-desa'),
    icon: UserRoundCog,
  },
  {
    label: 'Profil Desa',
    route: '/admin/kelola-profil-desa',
    allowedRoles: getOperatorAllowedRoles('/admin/kelola-profil-desa'),
    icon: Building2,
  },
  {
    label: 'Kelola Berita',
    route: '/admin/kelola-berita',
    allowedRoles: getOperatorAllowedRoles('/admin/kelola-berita'),
    icon: Newspaper,
  },
  {
    label: 'Peraturan Desa',
    route: '/admin/kelola-peraturan',
    allowedRoles: getOperatorAllowedRoles('/admin/kelola-peraturan'),
    icon: ScrollText,
  },
  {
    label: 'Pengaturan Deadline',
    route: '/admin/approval-settings',
    allowedRoles: getOperatorAllowedRoles('/admin/approval-settings'),
    icon: Settings,
  },
  {
    label: 'Organisasi BPD',
    route: '/admin/organisasi/bpd',
    allowedRoles: getOperatorAllowedRoles('/admin/organisasi/bpd'),
    icon: Network,
  },
  {
    label: 'LPM / Karang Taruna / PKK',
    route: '/admin/organisasi/lembaga',
    allowedRoles: getOperatorAllowedRoles('/admin/organisasi/lembaga'),
    icon: Network,
  },
]

export function OperatorDesaLayout({ children }) {
  const location = useLocation()
  const { user, logout } = useAuth()
  const visibleRoutes = ROLE_NAVIGATION[user?.role] ?? []

  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const notificationState = useNotifications()
  const { unreadCount, reload } = notificationState

  return (
    <WilayahMasterProvider>
      <div className="sid-operator-layout">
        {/* =================================================
            SIDEBAR
            ================================================= */}

        <aside className="sid-operator-sidebar">
          {/* BRAND */}

          <div className="sid-operator-sidebar-brand">
            <h1>SIDUTama</h1>

            <p>Admin Petugas Desa</p>
          </div>

          {/* MENU */}

          <nav className="sid-operator-sidebar-nav">
            {MENU_ITEMS.filter((item) => visibleRoutes.includes(item.route)).map((item) => {
              const isActive = location.pathname === item.route

              const Icon = item.icon

              return (
                <Link
                  key={item.route}
                  to={item.route}
                  className={`sid-operator-menu-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={18} />

                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* SIDEBAR FOOTER */}

          <div className="sid-operator-sidebar-footer">
            <button type="button" onClick={logout} className="sid-operator-sidebar-action logout">
              <LogOut size={16} />
              <span>Keluar</span>
            </button>
          </div>
        </aside>

        {/* =================================================
            MAIN AREA
            ================================================= */}

        <div className="sid-operator-main">
          {/* =================================================
              TOPBAR
              ================================================= */}

          <header className="sid-operator-topbar">
            <div className="sid-operator-topbar-spacer" />

            {/* TOPBAR RIGHT */}

            <div className="sid-operator-topbar-right">
              {/* NOTIFICATION */}

              <button
                type="button"
                onClick={() => {
                  const opening = !notifOpen
                  setNotifOpen(opening)
                  if (opening) void reload()
                }}
                className="sid-operator-notification-btn"
                title="Notifikasi"
              >
                <Bell size={18} />

                {unreadCount > 0 && (
                  <span className="sid-operator-notification-badge">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* PROFILE */}

              <div className="sid-operator-profile-menu">
                <button
                  type="button"
                  className="sid-operator-profile"
                  title="Akun"
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                  onClick={() => setProfileOpen((current) => !current)}
                >
                  <div className="sid-operator-profile-info">
                    <p className="sid-operator-profile-name">{user?.name ?? 'Bapak/Ibu'}</p>

                    <p className="sid-operator-profile-role">
                      {user?.role_label ?? 'Operator Desa'}
                    </p>
                  </div>

                  <div className="sid-operator-profile-avatar">
                    {(user?.name ?? 'OP').slice(0, 2).toUpperCase()}
                  </div>
                </button>

                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />

                    <div className="sid-dropdown" role="menu">
                      <Link
                        to="/admin/profile"
                        role="menuitem"
                        onClick={() => setProfileOpen(false)}
                        className="sid-dropdown-item"
                      >
                        <UserCircle size={18} />
                        <span>Profil Saya</span>
                      </Link>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={logout}
                        className="sid-dropdown-item sid-dropdown-item-danger"
                      >
                        <LogOut size={18} />
                        <span>Keluar</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* NOTIFICATION POPOVER */}

            <NotificationPopover
              open={notifOpen}
              onClose={() => setNotifOpen(false)}
              {...notificationState}
            />
          </header>

          {/* =================================================
              PAGE CONTENT
              ================================================= */}

          <main className="sid-operator-main-content">{children}</main>
        </div>
      </div>
    </WilayahMasterProvider>
  )
}
