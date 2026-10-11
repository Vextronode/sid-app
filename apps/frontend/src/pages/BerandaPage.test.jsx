import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuth } from '@/features/auth/contexts/AuthContext'
import { usePublicNews } from '@/features/berita/usePublicNews'
import { usePublicVillageInfo } from '@/features/info-desa/usePublicVillageInfo'
import { BerandaPage } from './BerandaPage'

vi.mock('@/features/berita/usePublicNews', () => ({
  usePublicNews: vi.fn(),
}))

vi.mock('@/features/info-desa/usePublicVillageInfo', () => ({
  usePublicVillageInfo: vi.fn(),
}))

vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const renderPage = (props) =>
  render(
    <MemoryRouter>
      <BerandaPage {...props} />
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  usePublicNews.mockReturnValue({ news: [], loading: false, error: null })
  usePublicVillageInfo.mockReturnValue({ village: null, stats: null, contacts: [] })
  useAuth.mockReturnValue({ user: null, isLoading: false })
})

describe('BerandaPage news section', () => {
  it('shows loading state while fetching public news', () => {
    usePublicNews.mockReturnValue({ news: [], loading: true, error: null })

    renderPage()

    expect(screen.getByRole('status')).toHaveTextContent('Memuat berita...')
  })

  it('shows API errors explicitly', () => {
    usePublicNews.mockReturnValue({
      news: [],
      loading: false,
      error: 'Gagal memuat berita.',
    })

    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent('Gagal memuat berita.')
  })

  it('shows an empty state when there is no published news', () => {
    usePublicNews.mockReturnValue({ news: [], loading: false, error: null })

    renderPage()

    expect(screen.getByRole('status')).toHaveTextContent('Belum ada berita yang dipublikasikan.')
  })

  const newsItems = (count) =>
    Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      title: `Berita ${i + 1}`,
      date: `${i + 1} Oktober 2026`,
      excerpt: '',
      content: [`<p>Kalimat pertama berita ${i + 1}. Kalimat kedua tidak ikut.</p>`],
      imageUrl: i % 2 === 0 ? `/foto-${i + 1}.jpg` : null,
    }))

  const newsRegion = () => within(screen.getByRole('region', { name: 'Kabar desa' }))

  it('links one featured and three compact news cards, not the fifth (A21–A24)', () => {
    usePublicNews.mockReturnValue({ news: newsItems(5), loading: false, error: null })

    renderPage()

    for (const id of [1, 2, 3, 4]) {
      const title = newsRegion().getByRole('heading', { level: 3, name: `Berita ${id}` })
      expect(title.closest('a')).toHaveAttribute('href', `/berita/${id}`)
    }
    expect(screen.queryByText('Berita 5')).toBeNull()
    expect(newsRegion().getAllByRole('heading', { level: 3 })).toHaveLength(4)
    expect(newsRegion().getAllByRole('listitem')).toHaveLength(3)
  })

  it('links "Semua berita →" to the news page (A20)', () => {
    renderPage()

    expect(newsRegion().getByRole('link', { name: 'Semua berita →' })).toHaveAttribute(
      'href',
      '/berita',
    )
    expect(newsRegion().getByRole('heading', { level: 2 })).toHaveTextContent('Kabar desa')
  })

  it('shows a one-sentence plain-text summary only on the featured card', () => {
    usePublicNews.mockReturnValue({ news: newsItems(4), loading: false, error: null })

    renderPage()

    expect(newsRegion().getByText('Kalimat pertama berita 1.')).toBeInTheDocument()
    expect(screen.queryByText(/Kalimat kedua/)).toBeNull()
    expect(screen.queryByText(/Kalimat pertama berita 2/)).toBeNull()
  })

  it('lazy-loads thumbnails and shows a neutral placeholder when empty (K2)', () => {
    usePublicNews.mockReturnValue({ news: newsItems(4), loading: false, error: null })

    const { container } = renderPage()

    const images = container.querySelectorAll('.bd-news img')
    expect([...images].map((img) => img.getAttribute('src'))).toEqual([
      '/foto-1.jpg',
      '/foto-3.jpg',
    ])
    for (const img of images) {
      expect(img).toHaveAttribute('loading', 'lazy')
      expect(img).toHaveAttribute('alt', '')
    }
    const placeholders = container.querySelectorAll('.bd-news-image--empty')
    expect(placeholders).toHaveLength(2)
    for (const placeholder of placeholders) {
      expect(placeholder).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it.each([
    [true, ['Lingkungan', 'Pendidikan', 'Kabar Warga', 'Infrastruktur']],
    [false, []],
  ])('shows dummy category chips only in development (isDev=%s, K7)', (isDev, expected) => {
    usePublicNews.mockReturnValue({ news: newsItems(4), loading: false, error: null })

    const { container } = renderPage({ isDev })

    const chips = [...container.querySelectorAll('.bd-news-category')].map((el) => el.textContent)
    expect(chips).toEqual(expected)
  })
})

describe('BerandaPage stats band', () => {
  const band = () => screen.queryByRole('region', { name: 'Desa dalam angka' })

  it.each([true, false])(
    'shows the final figures and links to the village profile (isDev=%s, A19)',
    (isDev) => {
      renderPage({ isDev })

      const region = within(band())
      expect(region.getByText('6.080')).toBeInTheDocument()
      expect(region.getByText('jiwa penduduk')).toBeInTheDocument()
      expect(region.getByText('759,319 ha')).toBeInTheDocument()
      expect(region.getByText('luas wilayah')).toBeInTheDocument()
      expect(region.getByText('5')).toBeInTheDocument()
      expect(region.getByText('dusun')).toBeInTheDocument()
      expect(region.getByText('Data per Oktober 2026')).toBeInTheDocument()
      expect(region.getAllByRole('link')).toHaveLength(1)
      expect(region.getByRole('link', { name: 'Lihat profil desa →' })).toHaveAttribute(
        'href',
        '/profil-desa',
      )
    },
  )
})

describe('BerandaPage hero', () => {
  it('renders the only h1 with the final copy', () => {
    renderPage()

    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent('Urus surat dari rumah, pantau desa dari mana saja.')
    expect(screen.getByText('Wilujeng Sumping')).toBeInTheDocument()
  })

  it('sends guests to the login page with a redirect back (K4)', () => {
    renderPage()

    expect(screen.getByRole('link', { name: 'Ajukan Surat' })).toHaveAttribute(
      'href',
      '/loginpage?redirect=%2Fjenis-surat',
    )
    expect(screen.getByRole('link', { name: 'Cek Status Surat' })).toHaveAttribute(
      'href',
      '/loginpage?redirect=%2Fdaftar-surat-saya',
    )
  })

  it('links signed-in users straight to the destination', () => {
    useAuth.mockReturnValue({ user: { role: 'warga' }, isLoading: false })

    renderPage()

    expect(screen.getByRole('link', { name: 'Ajukan Surat' })).toHaveAttribute(
      'href',
      '/jenis-surat',
    )
    expect(screen.getByRole('link', { name: 'Cek Status Surat' })).toHaveAttribute(
      'href',
      '/daftar-surat-saya',
    )
  })

  it('uses the hero photo from the content config and hides an empty credit (K2)', () => {
    const { container } = renderPage()

    const hero = container.querySelector('.bd-hero')
    expect(hero.style.getPropertyValue('--bd-hero-image')).toBe(
      'url("/assets/image/beranda/hero-pemandangan.jpg")',
    )
    expect(screen.queryByText(/^Foto:/)).toBeNull()
  })
})

describe('BerandaPage service cards', () => {
  const cards = () => within(screen.getByRole('region', { name: 'Layanan populer' }))

  it.each([
    [
      'guest',
      null,
      '/loginpage?redirect=%2Fjenis-surat',
      '/loginpage?redirect=%2Fdaftar-surat-saya',
    ],
    ['warga', { role: 'warga' }, '/jenis-surat', '/daftar-surat-saya'],
  ])('makes the whole Ajukan and Status cards links (%s)', (_, user, ajukan, status) => {
    useAuth.mockReturnValue({ user, isLoading: false })

    renderPage()

    expect(cards().getByRole('link', { name: /Ajukan surat/ })).toHaveAttribute('href', ajukan)
    expect(cards().getByRole('link', { name: /Cek status permohonan/ })).toHaveAttribute(
      'href',
      status,
    )
  })

  it('shows Syarat dokumen as "Segera hadir" without a link (K3)', () => {
    renderPage()

    const syarat = cards().getByText('Syarat dokumen')
    expect(syarat.closest('a')).toBeNull()
    const card = syarat.closest('.bd-service-card')
    expect(card).not.toHaveClass('bd-lift')
    expect(card).not.toHaveAttribute('tabindex')
    expect(within(card).getByText('Segera hadir')).toBeInTheDocument()
  })

  it('only links the WhatsApp and email rows of the complaint card (K14)', () => {
    renderPage()

    const title = cards().getByText('Sampaikan pengaduan')
    expect(title.closest('a')).toBeNull()
    const links = within(title.closest('.bd-service-card')).getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0].getAttribute('href')).toMatch(/^https:\/\/wa\.me\/\d+$/)
    expect(links[0]).toHaveAccessibleName(/^WhatsApp pengaduan /)
    expect(links[1].getAttribute('href')).toMatch(/^mailto:.+@.+/)
    expect(links[1]).toHaveAccessibleName(/^Email pengaduan /)
  })

  it('shows all four cards in production as well', () => {
    renderPage({ isDev: false })

    expect(cards().getAllByRole('listitem')).toHaveLength(4)
  })
})

describe('BerandaPage announcement bar', () => {
  const bar = () => screen.queryByRole('region', { name: 'Pengumuman' })

  it('shows the dummy announcement with only a "Selengkapnya" link in development (K6)', () => {
    renderPage({ isDev: true })

    const region = within(bar())
    expect(region.getByText('PENGUMUMAN')).toBeInTheDocument()
    // "+N pengumuman lain" dibatalkan pemilik proyek (11 Okt 2026).
    expect(region.getAllByRole('link')).toHaveLength(1)
    expect(region.getByRole('link', { name: 'Selengkapnya' })).toHaveAttribute('href', '/berita/1')
    expect(screen.queryByText(/pengumuman lain/)).toBeNull()
  })

  it('is not rendered in production (K6)', () => {
    renderPage({ isDev: false })

    expect(bar()).toBeNull()
    expect(screen.queryByText('PENGUMUMAN')).toBeNull()
  })
})
