import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { usePublicVillageInfo } from '@/features/info-desa/usePublicVillageInfo'
import { BerandaLayout } from './BerandaLayout'

vi.mock('@/features/info-desa/usePublicVillageInfo', () => ({
  usePublicVillageInfo: vi.fn(),
}))

const renderLayout = (isDev) =>
  render(
    <MemoryRouter>
      <BerandaLayout isDev={isDev}>
        <p>Isi beranda</p>
      </BerandaLayout>
    </MemoryRouter>,
  )

describe('BerandaLayout', () => {
  beforeEach(() => {
    usePublicVillageInfo.mockReturnValue({ village: null, stats: null, contacts: [] })
  })

  it('wraps the page in .bd-root with the new header, main and footer', () => {
    const { container } = renderLayout(true)

    const root = container.firstChild
    expect(root).toHaveClass('bd-root')
    expect(within(screen.getByRole('main')).getByText('Isi beranda')).toBeInTheDocument()
    expect(root.querySelector('header.bd-header')).not.toBeNull()
    expect(root.querySelector('footer.bd-footer')).not.toBeNull()
  })

  it('does not render the MobileBottomNav (K5)', () => {
    const { container } = renderLayout(true)

    // MobileBottomNav dirender sebagai <nav> fixed di bawah dengan link "Beranda".
    expect(screen.queryByRole('link', { name: /^beranda$/i })).toBeNull()
    expect(container.querySelectorAll('nav')).toHaveLength(3) // header, menu ponsel, footer
  })

  it('links the footer staff login to the login page and hides pages that do not exist (K3)', () => {
    renderLayout(true)
    const footer = within(screen.getByRole('contentinfo'))

    expect(footer.getByRole('link', { name: 'Masuk petugas' })).toHaveAttribute(
      'href',
      '/loginpage',
    )
    expect(footer.getAllByRole('link')).toHaveLength(1)
    expect(footer.queryByText(/privasi|aksesibilitas|PPID/i)).toBeNull()
  })

  it('shows the domain and update date only in development (K1)', () => {
    renderLayout(true)
    const footer = within(screen.getByRole('contentinfo'))

    expect(footer.getByText('Pemerintah Desa Cibenda')).toBeInTheDocument()
    expect(footer.getByText(/\.desa\.id · Situs resmi/)).toBeInTheDocument()
    expect(footer.getByText(/Terakhir diperbarui/)).toBeInTheDocument()
  })

  it('hides the dummy footer items in production (K1)', () => {
    renderLayout(false)
    const footer = within(screen.getByRole('contentinfo'))

    expect(footer.getByText('Pemerintah Desa Cibenda')).toBeInTheDocument()
    expect(footer.queryByText(/desa\.id/)).toBeNull()
    expect(footer.queryByText(/Terakhir diperbarui/)).toBeNull()
  })

  it.each([true, false])(
    'shows the three partner logos left to right, lazily loaded (isDev=%s)',
    (isDev) => {
      renderLayout(isDev)
      const footer = within(screen.getByRole('contentinfo'))

      expect(footer.getByText('Didukung oleh')).toBeInTheDocument()
      const logos = footer.getAllByRole('img')
      expect(logos.map((img) => img.getAttribute('alt'))).toEqual([
        'Diktisaintek Berdampak',
        'Lambang Kabupaten Pangandaran',
        'Universitas Widyatama',
      ])
      for (const img of logos) expect(img).toHaveAttribute('loading', 'lazy')
    },
  )
})
