import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { usePublicVillageInfo } from '@/features/info-desa/usePublicVillageInfo'
import { BerandaLayout } from './BerandaLayout'

const mockedUsePublicVillageInfo = vi.mocked(usePublicVillageInfo, { partial: true, deep: true })

vi.mock('@/features/info-desa/usePublicVillageInfo', () => ({
  usePublicVillageInfo: vi.fn(),
}))

vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, isLoading: false }),
}))

const renderLayout = () =>
  render(
    <MemoryRouter>
      <BerandaLayout>
        <p>Isi beranda</p>
      </BerandaLayout>
    </MemoryRouter>,
  )

describe('BerandaLayout', () => {
  beforeEach(() => {
    mockedUsePublicVillageInfo.mockReturnValue({ village: null, stats: null, contacts: [] })
  })

  it('wraps the page in .bd-root with the new header, main and footer', () => {
    const { container } = renderLayout()

    const root = container.firstChild as HTMLElement
    expect(root).toHaveClass('bd-root')
    expect(within(screen.getByRole('main')).getByText('Isi beranda')).toBeInTheDocument()
    expect(root.querySelector('header.bd-header')).not.toBeNull()
    expect(root.querySelector('footer.bd-footer')).not.toBeNull()
  })

  it('does not render a bottom nav (K5)', () => {
    const { container } = renderLayout()

    // Bottom bar lama berupa <nav> fixed di bawah dengan link "Beranda".
    // Link Beranda sekarang hanya ada di header (desktop + menu ponsel).
    for (const link of screen.queryAllByRole('link', { name: /^beranda$/i, hidden: true })) {
      expect(link.closest('header.bd-header')).not.toBeNull()
    }
    expect(container.querySelectorAll('nav')).toHaveLength(3) // header, menu ponsel, footer
  })

  it('has no staff login link (D6)', () => {
    renderLayout()
    const footer = within(screen.getByRole('contentinfo'))

    // Petugas masuk lewat form login biasa.
    expect(footer.queryByRole('link', { name: 'Masuk petugas' })).toBeNull()
  })

  it('links the three information pages from the footer (D6)', () => {
    renderLayout()
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
  it('shows the title without domain or update date', () => {
    renderLayout()
    const footer = within(screen.getByRole('contentinfo'))

    expect(footer.getByText('Pemerintah Desa Cibenda')).toBeInTheDocument()
    expect(footer.queryByText(/desacibenda\.id/)).not.toBeInTheDocument()
    expect(footer.queryByText(/Situs resmi/)).not.toBeInTheDocument()
    expect(footer.queryByText(/Terakhir diperbarui/)).not.toBeInTheDocument()
  })

  it('shows the three partner logos left to right, lazily loaded', () => {
    renderLayout()
    const footer = within(screen.getByRole('contentinfo'))

    expect(footer.getByText('Didukung oleh')).toBeInTheDocument()
    const logos = footer.getAllByRole('img')
    expect(logos.map((img) => img.getAttribute('alt'))).toEqual([
      'Universitas Widyatama',
      'Lambang Kabupaten Pangandaran',
      'Diktisaintek Berdampak',
    ])
    for (const img of logos) expect(img).toHaveAttribute('loading', 'lazy')
  })

  it('opens the Widyatama website in a new tab from its logo only', () => {
    renderLayout()
    const partners = within(screen.getByText('Didukung oleh').parentElement)

    const links = partners.getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAccessibleName('Universitas Widyatama (tab baru)')
    expect(links[0]).toHaveAttribute('href', 'https://www.widyatama.ac.id/')
    expect(links[0]).toHaveAttribute('target', '_blank')
    expect(links[0].getAttribute('rel')).toMatch(/\bnoopener\b/)
  })

  // Bar pengumuman menempel di bawah header di semua halaman publik.
  describe('announcement bar', () => {
    const bar = () => screen.queryByRole('region', { name: 'Pengumuman desa' })
    const withAnnouncement = (announcement) =>
      mockedUsePublicVillageInfo.mockReturnValue({
        village: null,
        stats: null,
        contacts: [],
        announcement,
      })

    it('shows the active announcement inside the sticky header area', () => {
      withAnnouncement({
        title: 'Kantor desa tutup Jumat siang',
        body: null,
        link_url: null,
        expires_at: new Date(Date.now() + 3_600_000).toISOString(),
      })

      const { container } = renderLayout()

      const region = bar()
      expect(region).toHaveTextContent('Kantor desa tutup Jumat siang')
      expect(region.closest('.bd-chrome--sticky')).toBe(
        container.querySelector('.bd-chrome--sticky'),
      )
      expect(region.closest('main')).toBeNull()
    })

    it('is not rendered without an announcement or after it expires', () => {
      withAnnouncement(null)
      const { unmount } = renderLayout()
      expect(bar()).toBeNull()
      unmount()

      withAnnouncement({ title: 'Lewat', expires_at: new Date(Date.now() - 1000).toISOString() })
      renderLayout()
      expect(bar()).toBeNull()
    })
  })
})
