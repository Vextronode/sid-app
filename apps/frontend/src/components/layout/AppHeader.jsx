import '@/styles/beranda.css'

import { Bell, ChevronDown, Menu, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { useAuth } from '@/features/auth/contexts/AuthContext'
import { useLogoutToBeranda } from '@/features/auth/hooks/useLogoutToBeranda'
import { getBerandaContent } from '@/features/beranda/berandaContent'
import { BerandaBrand } from '@/features/beranda/components/BerandaBrand'
import { useDisclosure } from '@/features/beranda/hooks/useDisclosure'

// Header halaman role (warga, RT/RW/Kadus/Kades/Sekdes) dengan gaya header
// publik: lambang + nama desa, menu role, notifikasi, dan menu akun.
// Di ponsel menu role, aksi tambahan, Profil, dan Keluar pindah ke tombol
// "Menu" (sama seperti beranda); tidak ada bottom bar.
//
// menuItems: [{ label, path }]
// extraActions: [{ label, icon, onClick }] — mis. Pusat Bantuan warga.
// popover: panel notifikasi; dirender di luar .bd-root agar gayanya tetap.
export function AppHeader({
  menuItems = [],
  profilePath,
  unreadCount = 0,
  onNotificationClick,
  extraActions = [],
  popover,
  isDev = import.meta.env.DEV,
}) {
  const { header } = getBerandaContent(isDev)
  const { pathname } = useLocation()
  const { user } = useAuth()
  const { handleLogout, isLoggingOut } = useLogoutToBeranda()

  const isActive = (path) => pathname === path
  const logoutLabel = isLoggingOut ? 'Keluar…' : 'Keluar'

  return (
    <div className="sid-app-header">
      <div className="bd-root bd-chrome">
        <header className="bd-header">
          <div className="bd-container bd-header-inner">
            <BerandaBrand header={header} />

            {menuItems.length > 0 && (
              <nav className="bd-nav" aria-label="Menu utama">
                {menuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="bd-nav-link"
                    aria-current={isActive(item.path) ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            )}

            <div className="bd-app-actions">
              <button
                type="button"
                className="bd-icon-button"
                title="Notifikasi"
                aria-label={
                  unreadCount > 0 ? `Notifikasi (${unreadCount} belum dibaca)` : 'Notifikasi'
                }
                onClick={onNotificationClick}
              >
                <Bell size={20} strokeWidth={2} aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="bd-badge-count" aria-hidden="true">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {extraActions.map(({ label, icon: Icon, onClick }) => (
                <button
                  key={label}
                  type="button"
                  className="bd-icon-button bd-desktop-only"
                  title={label}
                  aria-label={label}
                  onClick={onClick}
                >
                  <Icon size={20} strokeWidth={2} aria-hidden="true" />
                </button>
              ))}

              <AccountMenu
                name={user?.name}
                profilePath={profilePath}
                onLogout={handleLogout}
                isLoggingOut={isLoggingOut}
                logoutLabel={logoutLabel}
              />

              <AppMobileMenu
                header={header}
                menuItems={menuItems}
                isActive={isActive}
                extraActions={extraActions}
                profilePath={profilePath}
                onLogout={handleLogout}
                isLoggingOut={isLoggingOut}
                logoutLabel={logoutLabel}
              />
            </div>
          </div>
        </header>
      </div>

      {popover}
    </div>
  )
}

function AccountMenu({ name, profilePath, onLogout, isLoggingOut, logoutLabel }) {
  const { isOpen, toggle, close, containerRef, triggerRef, panelId, onBlur } = useDisclosure()

  return (
    <div className="bd-dropdown bd-app-account" ref={containerRef} onBlur={onBlur}>
      <button
        type="button"
        ref={triggerRef}
        className="bd-nav-link bd-nav-trigger"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={toggle}
      >
        <span className="bd-app-account-name">{name ?? 'Akun'}</span>
        <ChevronDown className="bd-nav-chevron" size={16} strokeWidth={2.2} aria-hidden="true" />
      </button>
      <div id={panelId} className="bd-dropdown-panel bd-dropdown-panel--end" hidden={!isOpen}>
        <ul className="bd-menu-list">
          {profilePath && (
            <li>
              <Link className="bd-menu-item bd-menu-item--link" to={profilePath} onClick={close}>
                Profil Saya
              </Link>
            </li>
          )}
          <li>
            <button
              type="button"
              className="bd-menu-item bd-menu-item--link bd-menu-item--danger"
              onClick={onLogout}
              disabled={isLoggingOut}
            >
              {logoutLabel}
            </button>
          </li>
        </ul>
      </div>
    </div>
  )
}

function AppMobileMenu({
  header,
  menuItems,
  isActive,
  extraActions,
  profilePath,
  onLogout,
  isLoggingOut,
  logoutLabel,
}) {
  const { isOpen, toggle, close, containerRef, triggerRef, panelId, onBlur } = useDisclosure()

  return (
    <div className="bd-mobile-menu" ref={containerRef} onBlur={onBlur}>
      <button
        type="button"
        ref={triggerRef}
        className="bd-menu-button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={toggle}
      >
        {isOpen ? (
          <X size={22} strokeWidth={2.2} aria-hidden="true" />
        ) : (
          <Menu size={22} strokeWidth={2.2} aria-hidden="true" />
        )}
        {header.nav.menu}
      </button>

      <nav id={panelId} className="bd-mobile-panel" aria-label="Menu utama" hidden={!isOpen}>
        <ul className="bd-menu-list">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className="bd-menu-item bd-menu-item--link"
                aria-current={isActive(item.path) ? 'page' : undefined}
                onClick={close}
              >
                {item.label}
              </Link>
            </li>
          ))}
          {extraActions.map(({ label, onClick }) => (
            <li key={label}>
              <button
                type="button"
                className="bd-menu-item bd-menu-item--link"
                onClick={() => {
                  close()
                  onClick()
                }}
              >
                {label}
              </button>
            </li>
          ))}
          <li className="bd-menu-divider" aria-hidden="true" />
          {profilePath && (
            <li>
              <Link to={profilePath} className="bd-menu-item bd-menu-item--link" onClick={close}>
                Profil Saya
              </Link>
            </li>
          )}
          <li>
            <button
              type="button"
              className="bd-menu-item bd-menu-item--link bd-menu-item--danger"
              onClick={onLogout}
              disabled={isLoggingOut}
            >
              {logoutLabel}
            </button>
          </li>
        </ul>
      </nav>
    </div>
  )
}
