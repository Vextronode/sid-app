import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { usePublicVillageInfo } from '@/features/info-desa/usePublicVillageInfo'
import { AppHeader } from './AppHeader'

const mockedUsePublicVillageInfo = vi.mocked(usePublicVillageInfo, { partial: true, deep: true })

const logout = vi.hoisted(() => ({ handleLogout: vi.fn(), isLoggingOut: false }))

vi.mock('@/features/info-desa/usePublicVillageInfo', () => ({
  usePublicVillageInfo: vi.fn(),
}))

vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Budi Santoso', role: 'rt' } }),
}))

vi.mock('@/features/auth/hooks/useLogoutToBeranda', () => ({
  useLogoutToBeranda: () => logout,
}))

const MENU = [
  { label: 'Beranda', path: '/admin/rt' },
  { label: 'Surat Warga', path: '/admin/rt/surat' },
]

const renderHeader = (props = {}) => {
  const utils = render(
    <MemoryRouter initialEntries={['/admin/rt/surat']}>
      <AppHeader menuItems={MENU} profilePath="/admin/profil" {...props} />
    </MemoryRouter>,
  )
  return {
    ...utils,
    desktopNav: within(utils.container.querySelector('.bd-nav')),
    mobileMenu: within(utils.container.querySelector('.bd-mobile-menu')),
  }
}

describe('AppHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    logout.isLoggingOut = false
    mockedUsePublicVillageInfo.mockReturnValue({
      village: {
        name: 'Desa Cibenda',
        district: 'Parigi',
        regency: 'Pangandaran',
        logo_url: '/logo.webp',
      },
    })
  })

  it('shows the public brand with the village emblem, inside its own .bd-root', () => {
    const { container } = renderHeader()

    const brand = screen.getByRole('link', { name: /Desa Cibenda/ })
    expect(brand).toHaveAttribute('href', '/')
    expect(brand).toHaveTextContent('Kec. Parigi · Kab. Pangandaran')
    expect(brand.querySelector('img.bd-brand-mark')).not.toBeNull()
    expect(container.querySelector('.bd-root.bd-chrome > header.bd-header')).not.toBeNull()
  })

  it('lists the role menu and marks the current page', () => {
    const { desktopNav } = renderHeader()

    expect(desktopNav.getByRole('link', { name: 'Beranda' })).toHaveAttribute('href', '/admin/rt')
    expect(desktopNav.getByRole('link', { name: 'Surat Warga' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(desktopNav.getByRole('link', { name: 'Beranda' })).not.toHaveAttribute('aria-current')
  })

  it('shows the unread count and calls the notification handler', async () => {
    const user = userEvent.setup()
    const onNotificationClick = vi.fn()
    renderHeader({ unreadCount: 3, onNotificationClick })

    await user.click(screen.getByRole('button', { name: 'Notifikasi (3 belum dibaca)' }))

    expect(onNotificationClick).toHaveBeenCalledOnce()
  })

  it('opens the account menu with the profile link and logout', async () => {
    const user = userEvent.setup()
    renderHeader()

    await user.click(screen.getByRole('button', { name: 'Budi Santoso' }))
    const panel = document.getElementById(
      screen.getByRole('button', { name: 'Budi Santoso' }).getAttribute('aria-controls'),
    )
    await user.click(within(panel).getByRole('button', { name: 'Keluar' }))

    expect(within(panel).getByRole('link', { name: 'Profil Saya' })).toHaveAttribute(
      'href',
      '/admin/profil',
    )
    expect(logout.handleLogout).toHaveBeenCalledOnce()
  })

  it('puts the role menu, extra actions, profile and logout behind the mobile Menu button', async () => {
    const user = userEvent.setup()
    const onHelp = vi.fn()
    const { mobileMenu } = renderHeader({
      extraActions: [{ label: 'Pusat Bantuan', icon: () => null, onClick: onHelp }],
    })
    const button = mobileMenu.getByRole('button', { name: 'Menu' })

    await user.click(button)
    const panel = within(document.getElementById(button.getAttribute('aria-controls')))

    expect(panel.getByText('Budi Santoso')).toBeVisible()
    expect(panel.getByRole('link', { name: 'Surat Warga' })).toHaveAttribute('aria-current', 'page')
    expect(panel.getByRole('link', { name: 'Profil Saya' })).toBeVisible()
    expect(panel.getByRole('button', { name: 'Keluar' })).toBeVisible()

    await user.click(panel.getByRole('button', { name: 'Pusat Bantuan' }))
    expect(onHelp).toHaveBeenCalledOnce()
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('calls onMenuOpen only when the account or mobile menu opens, so the notification panel closes', async () => {
    const user = userEvent.setup()
    const onMenuOpen = vi.fn()
    const { mobileMenu } = renderHeader({ onMenuOpen })
    const menuButton = mobileMenu.getByRole('button', { name: 'Menu' })

    await user.click(menuButton)
    await user.click(menuButton)
    expect(onMenuOpen).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: 'Budi Santoso' }))
    expect(onMenuOpen).toHaveBeenCalledTimes(2)
  })

  it('disables logout and shows progress while logging out', async () => {
    const user = userEvent.setup()
    logout.isLoggingOut = true
    renderHeader()

    await user.click(screen.getByRole('button', { name: 'Budi Santoso' }))

    expect(screen.getAllByRole('button', { name: 'Keluar…' })[0]).toBeDisabled()
  })
})
