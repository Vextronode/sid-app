// ==========================================
// OperatorDesaLayout.tsx
// Layout khusus Operator Desa
// Styling menggunakan Global CSS SID; sidebar dan topbar memakai token
// publik (.bd-theme dari beranda.css) dengan lambang + nama desa.
// ==========================================

import '@/styles/beranda.css'

import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Bell,
  BriefcaseBusiness,
  ScrollText,
  LayoutGrid,
  FilePlus,
  FileText,
  History,
  Users,
  UserCog,
  UserRoundCog,
  Building2,
  MapPinned,
  Newspaper,
  LogOut,
  BookOpenText,
  Megaphone,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Settings,
  UserCircle,
  Workflow,
} from 'lucide-react'
import { WilayahMasterProvider } from '@/features/kelola-wilayah/hooks/WilayahMasterProvider'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { useLogoutToBeranda } from '@/features/auth/hooks/useLogoutToBeranda'
import { getBerandaContent } from '@/features/beranda/berandaContent'
import { BerandaBrand } from '@/features/beranda/components/BerandaBrand'
import NotificationPopover from '@/features/notifikasi/components/NotificationPopover-Admin'
import useNotifications from '@/features/notifikasi/hooks/useNotifications'
import {
  getOperatorAllowedRoles,
  ROLE_NAVIGATION,
} from '@/features/operator-desa/constants/roleNavigation'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { STAF_APP_LABEL } from '@/lib/constants/app'

// Lebar layar yang memakai sidebar ponsel (sama dengan breakpoint CSS).
const MOBILE_QUERY = '(max-width: 639px)'
const COLLAPSED_STORAGE_KEY = 'sid-operator-sidebar-collapsed'

function readCollapsed() {
  try {
    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function matchesMobile() {
  return typeof window.matchMedia === 'function' && window.matchMedia(MOBILE_QUERY).matches
}

// Desktop: sidebar diciutkan/diperluas manual dan diingat di browser.
// Ponsel: sidebar selalu ciut, dibuka sementara dan otomatis ciut lagi
// setelah pindah halaman.
function useSidebarState(pathname) {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  // Path saat sidebar ponsel dibuka; begitu path berubah sidebar dianggap tertutup.
  const [mobileOpenPath, setMobileOpenPath] = useState(null)
  const mobileOpen = mobileOpenPath === pathname
  const [isMobile, setIsMobile] = useState(matchesMobile)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined

    const query = window.matchMedia(MOBILE_QUERY)
    const handleChange = (event) => {
      setIsMobile(event.matches)
      setMobileOpenPath(null)
    }

    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0')
    } catch {
      // Penyimpanan browser tidak tersedia; status hanya berlaku di sesi ini.
    }
  }, [collapsed])

  useEffect(() => {
    if (!mobileOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMobileOpenPath(null)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mobileOpen])

  const isRail = isMobile ? !mobileOpen : collapsed

  return {
    isRail,
    isMobileOpen: isMobile && mobileOpen,
    toggle: () =>
      isMobile ? setMobileOpenPath(mobileOpen ? null : pathname) : setCollapsed((value) => !value),
    closeMobile: () => setMobileOpenPath(null),
  }
}

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
    label: 'Pengajuan Reset',
    route: '/admin/pengajuan-reset',
    allowedRoles: getOperatorAllowedRoles('/admin/pengajuan-reset'),
    icon: RotateCcw,
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
    label: 'Pengumuman',
    route: '/admin/pengumuman',
    allowedRoles: getOperatorAllowedRoles('/admin/pengumuman'),
    icon: Megaphone,
  },
  {
    label: 'Halaman Informasi',
    route: '/admin/halaman-informasi',
    allowedRoles: getOperatorAllowedRoles('/admin/halaman-informasi'),
    icon: BookOpenText,
  },
  {
    label: 'Pengaturan Batas Waktu',
    route: '/admin/pengaturan-persetujuan',
    allowedRoles: getOperatorAllowedRoles('/admin/pengaturan-persetujuan'),
    icon: Settings,
  },
  {
    label: 'Alur & Jenis Surat',
    route: '/admin/alur-persetujuan',
    allowedRoles: getOperatorAllowedRoles('/admin/alur-persetujuan'),
    icon: Workflow,
  },
  {
    label: 'Log Aktivitas',
    route: '/admin/log-aktivitas',
    allowedRoles: getOperatorAllowedRoles('/admin/log-aktivitas'),
    icon: History,
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
  const { user } = useAuth()
  const visibleRoutes = ROLE_NAVIGATION[user?.role] ?? []

  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const { handleLogout, isLoggingOut } = useLogoutToBeranda()

  const notificationState = useNotifications()
  const { unreadCount, reload } = notificationState

  const sidebar = useSidebarState(location.pathname)
  const ToggleIcon = sidebar.isRail ? PanelLeftOpen : PanelLeftClose

  const layoutClassName = [
    'sid-operator-layout',
    sidebar.isRail && 'is-rail',
    sidebar.isMobileOpen && 'is-mobile-open',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <WilayahMasterProvider>
      <div className={layoutClassName}>
        {/* =================================================
            SIDEBAR
            ================================================= */}

        <aside className="sid-operator-sidebar bd-theme">
          {/* BRAND */}

          <div className="sid-operator-sidebar-brand">
            <BerandaBrand
              header={getBerandaContent().header}
              subtitle={`Admin ${STAF_APP_LABEL}`}
              className="sid-operator-brand"
            />
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
                  title={item.label}
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
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              title="Keluar"
              className="sid-operator-sidebar-action logout"
            >
              <LogOut size={16} />
              <span>{isLoggingOut ? 'Keluar…' : 'Keluar'}</span>
            </button>
          </div>
        </aside>

        {sidebar.isMobileOpen && (
          <div
            className="sid-operator-sidebar-backdrop"
            aria-hidden="true"
            onClick={sidebar.closeMobile}
          />
        )}

        {/* =================================================
            MAIN AREA
            ================================================= */}

        <div className="sid-operator-main">
          {/* =================================================
              TOPBAR
              ================================================= */}

          <header className="sid-operator-topbar bd-theme">
            <button
              type="button"
              onClick={sidebar.toggle}
              className="sid-operator-sidebar-toggle"
              aria-label={sidebar.isRail ? 'Perluas menu' : 'Ciutkan menu'}
              aria-expanded={!sidebar.isRail}
              title={sidebar.isRail ? 'Perluas menu' : 'Ciutkan menu'}
            >
              <ToggleIcon size={20} />
            </button>

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

                  <UserAvatar user={user} className="sid-operator-profile-avatar" />
                </button>

                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />

                    <div className="sid-dropdown" role="menu">
                      <Link
                        to="/admin/profil"
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
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="sid-dropdown-item sid-dropdown-item-danger"
                      >
                        <LogOut size={18} />
                        <span>{isLoggingOut ? 'Keluar…' : 'Keluar'}</span>
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
