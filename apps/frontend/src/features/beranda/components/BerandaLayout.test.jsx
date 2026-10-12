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

  it('does not render a bottom nav (K5)', () => {
    const { container } = renderLayout(true)

    // Bottom bar lama berupa <nav> fixed di bawah dengan link "Beranda".
    // Link Beranda sekarang hanya ada di header (desktop + menu ponsel).
    for (const link of screen.queryAllByRole('link', { name: /^beranda$/i, hidden: true })) {
      expect(link.closest('header.bd-header')).not.toBeNull()
    }
    expect(container.querySelectorAll('nav')).toHaveLength(3) // header, menu ponsel, footer
  })

  it('has no staff login link and hides the draft pages in production (D6)', () => {
    renderLayout(false)
    const footer = within(screen.getByRole('contentinfo'))

    // Petugas masuk lewat form login biasa; hanya logo Widyatama yang berupa link.
    expect(footer.queryByRole('link', { name: 'Masuk petugas' })).toBeNull()
    expect(footer.getAllByRole('link')).toHaveLength(1)
    expect(footer.queryByRole('navigation', { name: 'Tautan footer' })).toBeNull()
    expect(footer.queryByText(/privasi|aksesibilitas|PPID/i)).toBeNull()
  })

  it('links the three draft information pages from the footer in development (D6)', () => {
    renderLayout(true)
    const nav = within(screen.getByRole('navigation', { name: 'Tautan footer' }))

    expect(
      nav.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual([
      ['Kebijakan privasi', '/kebijakan-privasi'],
      ['Aksesibilitas', '/aksesibilitas'],
      ['PPID', '/ppid'],
    ])
    for (const link of nav.getAllByRole('link')) {
      expect(link).toHaveClass('bd-footer-link')
      expect(link).not.toHaveAttribute('target')
    }
  })

  // Domain dan tanggal pembaruan tidak ditampilkan (permintaan pemilik, 12 Okt 2026).
  it.each([true, false])('shows the title without domain or update date (isDev=%s)', (isDev) => {
    renderLayout(isDev)
    const footer = within(screen.getByRole('contentinfo'))

    expect(footer.getByText('Pemerintah Desa Cibenda')).toBeInTheDocument()
    expect(footer.queryByText(/desacibenda\.id/)).not.toBeInTheDocument()
    expect(footer.queryByText(/Situs resmi/)).not.toBeInTheDocument()
    expect(footer.queryByText(/Terakhir diperbarui/)).not.toBeInTheDocument()
  })

  it.each([true, false])(
    'shows the three partner logos left to right, lazily loaded (isDev=%s)',
    (isDev) => {
      renderLayout(isDev)
      const footer = within(screen.getByRole('contentinfo'))

      expect(footer.getByText('Didukung oleh')).toBeInTheDocument()
      const logos = footer.getAllByRole('img')
      expect(logos.map((img) => img.getAttribute('alt'))).toEqual([
        'Universitas Widyatama',
        'Lambang Kabupaten Pangandaran',
        'Diktisaintek Berdampak',
      ])
      for (const img of logos) expect(img).toHaveAttribute('loading', 'lazy')
    },
  )

  it('opens the Widyatama website in a new tab from its logo only', () => {
    renderLayout(false)
    const partners = within(screen.getByText('Didukung oleh').parentElement)

    const links = partners.getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAccessibleName('Universitas Widyatama (tab baru)')
    expect(links[0]).toHaveAttribute('href', 'https://www.widyatama.ac.id/')
    expect(links[0]).toHaveAttribute('target', '_blank')
    expect(links[0].getAttribute('rel')).toMatch(/\bnoopener\b/)
  })
})
