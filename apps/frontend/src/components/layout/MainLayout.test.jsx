import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { usePublicVillageInfo } from '@/features/info-desa/usePublicVillageInfo'
import { MainLayout } from './MainLayout'

vi.mock('@/features/info-desa/usePublicVillageInfo', () => ({
  usePublicVillageInfo: vi.fn(),
}))

const renderLayout = () =>
  render(
    <MemoryRouter initialEntries={['/berita']}>
      <MainLayout isDev={false}>
        <p>Isi berita</p>
      </MainLayout>
    </MemoryRouter>,
  )

describe('MainLayout', () => {
  beforeEach(() => {
    usePublicVillageInfo.mockReturnValue({ village: null, stats: null, contacts: [] })
  })

  it('uses the home page header and footer, each in its own .bd-root', () => {
    const { container } = renderLayout()

    expect(within(screen.getByRole('main')).getByText('Isi berita')).toBeInTheDocument()
    expect(screen.getByRole('main').closest('.bd-root')).toBeNull()
    expect(container.querySelector('.bd-root.bd-chrome > header.bd-header')).not.toBeNull()
    // Pembungkus header yang menempel saat digulir (bukan pembungkus footer).
    expect(container.querySelector('.bd-root.bd-chrome--sticky > header.bd-header')).not.toBeNull()
    expect(container.querySelector('.bd-root.bd-chrome--sticky > footer.bd-footer')).toBeNull()
    expect(container.querySelector('.bd-root.bd-chrome > footer.bd-footer')).not.toBeNull()

    const desktopNav = within(container.querySelector('.bd-nav'))
    expect(desktopNav.getByRole('link', { name: 'Berita' })).toHaveAttribute('href', '/berita')
    expect(desktopNav.getByRole('button', { name: 'Tentang Desa' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument()
  })

  it('does not render the old bottom nav', () => {
    const { container } = renderLayout()

    expect(container.querySelector('.sid-mobile-nav')).toBeNull()
    // Satu-satunya link Beranda ada di header (desktop + menu ponsel).
    for (const link of screen.queryAllByRole('link', { name: /^beranda$/i, hidden: true })) {
      expect(link.closest('header.bd-header')).not.toBeNull()
    }
  })
})
