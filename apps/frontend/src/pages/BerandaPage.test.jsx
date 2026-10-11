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

describe('BerandaPage how-to steps', () => {
  const howTo = () => within(screen.getByRole('region', { name: 'Cara mengajukan surat' }))

  it('lists the four steps in an ordered list with the final copy (K10)', () => {
    renderPage()

    const list = howTo().getByRole('list')
    expect(list.tagName).toBe('OL')
    const steps = within(list).getAllByRole('listitem')
    expect(steps).toHaveLength(4)
    expect(steps[0]).toHaveTextContent('Masuk ke akun warga')
    expect(steps[0]).toHaveTextContent('Daftar sekali dengan NIK')
    expect(steps[3]).toHaveTextContent('Tunggu persetujuan')
    expect(steps[3]).toHaveClass('bd-step--accent')
    expect(howTo().getAllByRole('heading', { level: 3 })).toHaveLength(4)
  })

  it.each([
    ['guest', null, '/loginpage?redirect=%2Fjenis-surat'],
    ['warga', { role: 'warga' }, '/jenis-surat'],
  ])('links "Mulai ajukan surat" through the login flow (%s, A25)', (_, user, href) => {
    useAuth.mockReturnValue({ user, isLoading: false })

    renderPage()

    expect(howTo().getByRole('link', { name: 'Mulai ajukan surat' })).toHaveAttribute('href', href)
  })

  it('is shown in production as well', () => {
    renderPage({ isDev: false })

    expect(howTo().getAllByRole('listitem')).toHaveLength(4)
  })
})

describe('BerandaPage transparency section', () => {
  const section = () => screen.queryByRole('region', { name: /APBDes Cibenda/ })

  it('renders the dummy APBDes with id="transparansi" in development', () => {
    renderPage({ isDev: true })

    const region = section()
    expect(region).toHaveAttribute('id', 'transparansi')
    expect(within(region).getByRole('heading', { level: 2 })).toHaveTextContent(
      'APBDes Cibenda 2026',
    )
    expect(within(region).getByText('Pendapatan')).toBeInTheDocument()
    expect(within(region).getByText('Belanja')).toBeInTheDocument()
    expect(within(region).getByText('Realisasi belanja')).toBeInTheDocument()
  })

  it('opens both PDF links in a new tab with rel="noopener" and a screen-reader hint (A26, A27)', () => {
    renderPage({ isDev: true })

    const links = within(section()).getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAccessibleName('Unduh dokumen APBDes (PDF) (tab baru)')
    expect(links[1]).toHaveAccessibleName('Arsip tahun sebelumnya (PDF, tab baru)')
    for (const link of links) {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link.getAttribute('rel')).toMatch(/\bnoopener\b/)
      expect(link.getAttribute('href')).toMatch(/^https:\/\//)
    }
  })

  it('is not rendered in production (K1)', () => {
    renderPage({ isDev: false })

    expect(section()).toBeNull()
    expect(document.getElementById('transparansi')).toBeNull()
    expect(screen.queryByText('Pendapatan')).toBeNull()
  })
})

describe('BerandaPage Kepala Desa welcome', () => {
  const block = () => screen.queryByRole('region', { name: 'Sambutan Kepala Desa' })

  it('shows the dummy welcome with the real head name and no links in development (P9)', () => {
    usePublicVillageInfo.mockReturnValue({
      village: { head_name: 'Nama Kades Asli' },
      stats: null,
      contacts: [],
    })

    renderPage({ isDev: true })

    const region = within(block())
    expect(region.getByRole('heading', { level: 2 })).toHaveTextContent('Sambutan Kepala Desa')
    expect(region.getByText('Nama Kades Asli')).toBeInTheDocument()
    expect(region.getByText('Kepala Desa Cibenda')).toBeInTheDocument()
    expect(region.getByText(/Dua kalimat sambutan/)).toBeInTheDocument()
    expect(region.queryAllByRole('link')).toHaveLength(0)
  })

  it('falls back to the dummy name while village data is missing', () => {
    renderPage({ isDev: true })

    expect(within(block()).getByText('Dede Rusliana')).toBeInTheDocument()
  })

  it('is not rendered in production (K1)', () => {
    renderPage({ isDev: false })

    expect(block()).toBeNull()
    expect(screen.queryByText(/Dua kalimat sambutan/)).toBeNull()
  })
})

describe('BerandaPage contact section', () => {
  const section = () => screen.getByRole('region', { name: 'Butuh bantuan?' })
  const village = {
    phone: '0265-639 123',
    address: 'Jl. Raya Cibenda No. 1',
    head_name: 'Dede Rusliana',
  }
  const officialContacts = [{ name: 'Petugas Lama', position: 'kasi_pelayanan', wa_link: 'x' }]

  beforeEach(() => {
    usePublicVillageInfo.mockReturnValue({ village, stats: null, contacts: officialContacts })
  })

  it('renders id="kontak" with three cards and no old staff list (K14)', () => {
    renderPage()

    expect(section()).toHaveAttribute('id', 'kontak')
    expect(within(section()).getByRole('heading', { level: 2 })).toHaveTextContent('Butuh bantuan?')
    expect(within(section()).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.queryByText('Petugas Lama')).toBeNull()
    expect(screen.queryByRole('link', { name: 'WhatsApp' })).toBeNull()
  })

  it('makes the whole phone card a tel: link from village.phone (A31)', () => {
    renderPage({ isDev: false })

    const link = within(section()).getByRole('link', { name: /Telepon \/ WhatsApp/ })
    expect(link).toHaveAttribute('href', 'tel:0265639123')
    expect(link).toHaveTextContent('0265-639 123')
  })

  it('keeps the service hours card unclickable', () => {
    renderPage()

    const hours = within(section()).getByText('Senin – Jumat, 08.00 – 16.00 WIB')
    expect(hours.closest('a')).toBeNull()
  })

  it('opens the dummy map in a new tab in development (A32)', () => {
    renderPage({ isDev: true })

    const link = within(section()).getByRole('link', { name: /Kantor Desa Cibenda/ })
    expect(link).toHaveTextContent('Jl. Raya Cibenda No. 1')
    expect(link).toHaveAccessibleName(/Buka di peta \(tab baru\)$/)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toMatch(/\bnoopener\b/)
    expect(link.getAttribute('href')).toMatch(/^https:\/\//)
  })

  it('hides "Buka di peta" and keeps the office card unclickable in production (K1)', () => {
    renderPage({ isDev: false })

    const office = within(section()).getByText('Kantor Desa Cibenda')
    expect(office.closest('a')).toBeNull()
    expect(within(section()).getByText('Jl. Raya Cibenda No. 1')).toBeInTheDocument()
    expect(screen.queryByText(/Buka di peta/)).toBeNull()
    expect(within(section()).getAllByRole('link')).toHaveLength(1)
  })

  it('shows the phone card without a link while village data is missing', () => {
    usePublicVillageInfo.mockReturnValue({ village: null, stats: null, contacts: [] })

    renderPage({ isDev: false })

    expect(within(section()).getByText('Telepon / WhatsApp').closest('a')).toBeNull()
    expect(within(section()).queryAllByRole('link')).toHaveLength(0)
  })
})
