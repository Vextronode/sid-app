import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

describe('BerandaPage structure and accessibility', () => {
  it.each([
    ['without a welcome message', {}, ['Kabar desa', 'Cara mengajukan surat', 'Butuh bantuan?']],
    [
      'with a welcome message',
      { welcome_message: 'Selamat datang.' },
      ['Kabar desa', 'Cara mengajukan surat', 'Sambutan Kepala Desa', 'Butuh bantuan?'],
    ],
  ])('has one h1 and an h2 for every titled section (%s, Ak3)', (_, village, expected) => {
    usePublicVillageInfo.mockReturnValue({ village, stats: null, contacts: [] })
    renderPage()

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(expected)
  })

  it('names every region and only uses ordered lists for the steps', () => {
    const { container } = renderPage()

    for (const region of screen.getAllByRole('region')) {
      expect(region).toHaveAccessibleName()
    }
    expect([...container.querySelectorAll('ol')]).toHaveLength(1)
  })

  it('hides every icon and decorative graphic from assistive tech (Ak4)', () => {
    const { container } = renderPage()

    const svgs = [...container.querySelectorAll('svg')]
    expect(svgs.length).toBeGreaterThan(0)
    for (const svg of svgs) {
      expect(svg.closest('[aria-hidden="true"]')).not.toBeNull()
    }
  })

  it('renders only real-data sections in production (K1)', () => {
    // Pita angka hanya tampil bila API mengirim angkanya.
    usePublicVillageInfo.mockReturnValue({
      village: null,
      stats: { total_population: 6080, total_hamlets: 5 },
      contacts: [],
    })
    renderPage()

    expect(screen.queryByRole('region', { name: 'Pengumuman' })).toBeNull()
    expect(screen.queryByRole('region', { name: /APBDes/ })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Sambutan Kepala Desa' })).toBeNull()
    expect(screen.getByRole('region', { name: 'Layanan populer' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Desa dalam angka' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Kabar desa' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Cara mengajukan surat' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Butuh bantuan?' })).toBeInTheDocument()
  })
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
      categories: i === 0 ? ['Lingkungan', 'Pendidikan'] : [`Kategori ${i + 1}`],
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

  it('shows the news categories from the API', () => {
    usePublicNews.mockReturnValue({ news: newsItems(4), loading: false, error: null })

    const { container } = renderPage()

    const chips = [...container.querySelectorAll('.bd-news-category')].map((el) => el.textContent)
    expect(chips).toEqual(['Lingkungan', 'Pendidikan', 'Kategori 2', 'Kategori 3', 'Kategori 4'])
  })
})

describe('BerandaPage stats band', () => {
  const band = () => screen.queryByRole('region', { name: 'Desa dalam angka' })

  it('shows the figures from the API and links to the village profile (A19)', () => {
    usePublicVillageInfo.mockReturnValue({
      village: { name: 'Cibenda', area_ha: 759.319 },
      stats: { total_letter_types: 4, total_population: 6080, total_hamlets: 5 },
      contacts: [],
    })
    renderPage()

    const region = within(band())
    expect(region.getByText('6.080')).toBeInTheDocument()
    expect(region.getByText('jiwa penduduk')).toBeInTheDocument()
    expect(region.getByText('759,319 ha')).toBeInTheDocument()
    expect(region.getByText('luas wilayah')).toBeInTheDocument()
    expect(region.getByText('5')).toBeInTheDocument()
    expect(region.getByText('dusun')).toBeInTheDocument()
    expect(region.queryByText(/Data per/)).toBeNull()
    expect(region.getAllByRole('link')).toHaveLength(1)
    expect(region.getByRole('link', { name: 'Lihat profil desa →' })).toHaveAttribute(
      'href',
      '/profil-desa',
    )
  })

  it('leaves out figures without data and hides the band when none is available', () => {
    usePublicVillageInfo.mockReturnValue({
      village: { name: 'Cibenda', area_ha: null },
      stats: { total_letter_types: 4, total_population: 0, total_hamlets: 5 },
      contacts: [],
    })
    const { unmount } = renderPage()

    const region = within(band())
    expect(region.getByText('dusun')).toBeInTheDocument()
    expect(region.queryByText('jiwa penduduk')).toBeNull()
    expect(region.queryByText('luas wilayah')).toBeNull()

    unmount()
    usePublicVillageInfo.mockReturnValue({ village: null, stats: null, contacts: [] })
    renderPage()

    expect(band()).toBeNull()
  })
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

  it('gives both hero buttons the same lift effect as the service cards', () => {
    renderPage()

    expect(screen.getByRole('link', { name: 'Ajukan Surat' })).toHaveClass('bd-lift')
    expect(screen.getByRole('link', { name: 'Cek Status Surat' })).toHaveClass('bd-lift')
  })

  // Foto dan kreditnya dari data desa (diatur Petugas Desa).
  it('uses the hero photo and credit from the village data', () => {
    usePublicVillageInfo.mockReturnValue({
      village: { hero_image_url: '/storage/village-media/hero.jpg', hero_photo_credit: 'Warga' },
      stats: null,
      contacts: [],
    })
    const { container } = renderPage()

    const hero = container.querySelector('.bd-hero')
    expect(hero.style.getPropertyValue('--bd-hero-image')).toBe(
      'url("/storage/village-media/hero.jpg")',
    )
    expect(screen.getByText('Foto: Warga')).toBeInTheDocument()
  })

  it('falls back to the plain hero colour and hides an empty credit (K2)', () => {
    const { container } = renderPage()

    expect(container.querySelector('.bd-hero').style.getPropertyValue('--bd-hero-image')).toBe('')
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

  it('only links the WhatsApp and email rows of the complaint card (K14, D2)', () => {
    usePublicVillageInfo.mockReturnValue({
      village: { email: 'kantor@desa.test' },
      stats: null,
      contacts: [],
    })
    renderPage()

    const title = cards().getByText('Sampaikan pengaduan')
    expect(title.closest('a')).toBeNull()
    const links = within(title.closest('.bd-service-card')).getAllByRole('link')
    expect(links).toHaveLength(2)

    // D2: menu bagikan AddToAny di tab baru (permintaan pemilik, 12 Okt 2026).
    const [whatsapp, email] = links
    expect(whatsapp).toHaveAttribute(
      'href',
      'https://www.addtoany.com/add_to/whatsapp?linkurl=https%3A%2F%2Fdesacibenda.id%2Fkotak-saran%2F&linkname=HUBUNGI%20KAMI&linknote=',
    )
    expect(whatsapp).toHaveTextContent(/^Bagikan kotak saran via WhatsApp/)
    expect(whatsapp).toHaveAccessibleName('Bagikan kotak saran via WhatsApp (tab baru)')
    expect(whatsapp).toHaveAttribute('target', '_blank')
    expect(whatsapp.getAttribute('rel')).toMatch(/\bnoopener\b/)
    expect(whatsapp.getAttribute('rel')).toMatch(/\bnoreferrer\b/)
    expect(screen.queryByText('+62 812-3456-7890')).toBeNull()

    // Email dari data desa (diatur Petugas Desa).
    expect(email).toHaveAttribute('href', 'mailto:kantor@desa.test')
    expect(email).toHaveAccessibleName('Email pengaduan kantor@desa.test')
    expect(email).not.toHaveAttribute('target')
  })

  it('leaves out the email row when the village has no email', () => {
    renderPage()

    const card = cards().getByText('Sampaikan pengaduan').closest('.bd-service-card')
    expect(within(card).getAllByRole('link')).toHaveLength(1)
    expect(within(card).queryByText(/@/)).toBeNull()
  })

  it('shows all four cards in production as well', () => {
    renderPage()

    expect(cards().getAllByRole('listitem')).toHaveLength(4)
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
    renderPage()

    expect(howTo().getAllByRole('listitem')).toHaveLength(4)
  })
})

// Data APBDes belum ada: section tidak dirender; dropdown menandainya "Segera hadir".
describe('BerandaPage transparency section', () => {
  it('is not rendered', () => {
    renderPage()

    expect(screen.queryByRole('region', { name: /APBDes/ })).toBeNull()
    expect(document.getElementById('transparansi')).toBeNull()
    expect(screen.queryByText('Pendapatan')).toBeNull()
  })
})

describe('BerandaPage Kepala Desa welcome', () => {
  const block = () => screen.queryByRole('region', { name: 'Sambutan Kepala Desa' })

  it('shows the welcome message with the head name and no links (P9)', () => {
    usePublicVillageInfo.mockReturnValue({
      village: {
        name: 'Desa Cibenda',
        head_name: 'Nama Kades Asli',
        welcome_message: 'Mari bersama membangun desa.',
      },
      stats: null,
      contacts: [],
    })

    renderPage()

    const region = within(block())
    expect(region.getByRole('heading', { level: 2 })).toHaveTextContent('Sambutan Kepala Desa')
    expect(region.getByText('Nama Kades Asli')).toBeInTheDocument()
    expect(region.getByText('Kepala Desa Cibenda')).toBeInTheDocument()
    expect(region.getByText(/Mari bersama membangun desa/)).toBeInTheDocument()
    expect(region.queryAllByRole('link')).toHaveLength(0)
  })

  it.each([null, '', '   '])('is hidden when the welcome message is %j', (message) => {
    usePublicVillageInfo.mockReturnValue({
      village: { name: 'Desa Cibenda', head_name: 'Nama Kades', welcome_message: message },
      stats: null,
      contacts: [],
    })

    renderPage()

    expect(block()).toBeNull()
  })
})

describe('BerandaPage contact section', () => {
  const section = () => screen.getByRole('region', { name: 'Butuh bantuan?' })
  // Seluruh isi kartu kontak dari data desa (diatur Petugas Desa).
  const village = {
    name: 'Desa Cibenda',
    phone: '(0265) 2640613',
    email: 'kantordesacibenda@gmail.com',
    address: 'Jl. Raya Cibenda No. 1',
    head_name: 'Dede Rusliana',
    office_hours: 'Senin – Jumat, 08.00 – 16.00 WIB',
    latitude: -7.6803137,
    longitude: 108.5513816,
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

  // Nomor kantor dari data desa, tanpa WhatsApp (permintaan pemilik, 11 Okt 2026).
  // Diklik untuk disalin, bukan tel: (permintaan pemilik, 12 Okt 2026).
  it('shows only the office phone as a copy button in the phone card (A31)', async () => {
    const writeText = vi.fn().mockResolvedValue()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderPage()

    const card = within(section()).getByText('Telepon').closest('.bd-contact-card')
    expect(card.tagName).toBe('DIV')
    expect(within(card).queryByRole('link')).toBeNull()
    const button = within(card).getByRole('button', {
      name: 'Salin nomor telepon (0265) 2640613',
    })
    expect(button).toHaveTextContent('(0265) 2640613')

    fireEvent.click(button)

    expect(writeText).toHaveBeenCalledWith('(0265) 2640613')
    expect(await within(card).findByText('Nomor disalin')).toHaveAttribute('aria-live', 'polite')

    expect(within(section()).queryByText(/WhatsApp/)).toBeNull()
    delete navigator.clipboard
  })

  it('shows the village email in its own card, also copied on click', async () => {
    const writeText = vi.fn().mockResolvedValue()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderPage()

    const card = within(section()).getByText('Email').closest('.bd-contact-card')
    const button = within(card).getByRole('button', {
      name: 'Salin email kantordesacibenda@gmail.com',
    })
    expect(button).toHaveTextContent('kantordesacibenda@gmail.com')
    expect(within(card).queryByRole('link')).toBeNull()

    fireEvent.click(button)

    expect(writeText).toHaveBeenCalledWith('kantordesacibenda@gmail.com')
    expect(await within(card).findByText('Email disalin')).toBeInTheDocument()
    delete navigator.clipboard
  })

  it('marks the email card unavailable when the village has no email', () => {
    usePublicVillageInfo.mockReturnValue({
      village: { ...village, email: null },
      stats: null,
      contacts: [],
    })
    renderPage()

    const phoneCard = within(section()).getByText('Telepon').closest('.bd-contact-card')
    expect(within(phoneCard).getAllByRole('button')).toHaveLength(1)
    expect(within(phoneCard).queryByText('Belum tersedia')).toBeNull()
    const emailCard = within(section()).getByText('Email').closest('.bd-contact-card')
    expect(within(emailCard).queryByRole('button')).toBeNull()
    expect(within(emailCard).getByText('Belum tersedia')).toBeInTheDocument()
  })

  it('tells the user when the phone number could not be copied', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    })
    document.execCommand = vi.fn().mockReturnValue(false)
    renderPage()

    const card = within(section()).getByText('Telepon').closest('.bd-contact-card')
    fireEvent.click(within(card).getByRole('button', { name: /Salin nomor telepon/ }))

    expect(await within(card).findByText(/Gagal menyalin/)).toBeInTheDocument()
    delete navigator.clipboard
    delete document.execCommand
  })

  it('keeps the service hours card unclickable', () => {
    renderPage()

    const hours = within(section()).getByText('Senin – Jumat, 08.00 – 16.00 WIB')
    expect(hours.closest('a')).toBeNull()
  })

  // D1 (12 Okt 2026): link peta dari data desa, tampil di dev dan production.
  it('opens the real map in a new tab (A32, D1)', () => {
    renderPage()

    // Hanya "Buka di peta" yang menjadi link; kartu kantor (judul + alamat) tidak.
    const link = within(section()).getByRole('link', { name: 'Buka di peta (tab baru)' })
    expect(link).not.toHaveTextContent('Jl. Raya Cibenda No. 1')
    const card = within(section()).getByText('Kantor Desa Cibenda').closest('.bd-contact-card')
    expect(card.tagName).toBe('DIV')
    expect(card).toHaveTextContent('Jl. Raya Cibenda No. 1')
    expect(card).toContainElement(link)
    expect(link).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/Kantor%20Desa%20Cibenda/@-7.6803137,108.5513816,17z',
    )
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toMatch(/\bnoopener\b/)
    expect(link.getAttribute('rel')).toMatch(/\bnoreferrer\b/)
    // Hanya link peta; nomor telepon berupa tombol salin.
    expect(within(section()).getAllByRole('link')).toHaveLength(1)
  })

  // Tidak ada data desa yang ditulis di kode: tanpa data, kartu menyatakan
  // "Belum tersedia" dan kartu kantor tidak menjadi link.
  it('shows neutral placeholders while village data is missing', () => {
    usePublicVillageInfo.mockReturnValue({ village: null, stats: null, contacts: [] })

    renderPage()

    const phoneCard = within(section()).getByText('Telepon').closest('.bd-contact-card')
    expect(within(phoneCard).queryByRole('button')).toBeNull()
    expect(within(phoneCard).getByText('Belum tersedia')).toBeInTheDocument()
    const emailCard = within(section()).getByText('Email').closest('.bd-contact-card')
    expect(within(emailCard).getByText('Belum tersedia')).toBeInTheDocument()
    const hoursCard = within(section()).getByText('Jam layanan kantor').closest('.bd-contact-card')
    expect(within(hoursCard).getByText('Belum tersedia')).toBeInTheDocument()
    expect(within(section()).getByText('Kantor Desa')).toBeInTheDocument()
    expect(within(section()).queryAllByRole('link')).toHaveLength(0)
  })
})

describe('BerandaPage section hash', () => {
  afterEach(() => {
    delete Element.prototype.scrollIntoView
  })

  it('scrolls to the section named in the URL hash, e.g. Kontak from another page', () => {
    Element.prototype.scrollIntoView = vi.fn()
    render(
      <MemoryRouter initialEntries={['/#kontak']}>
        <BerandaPage />
      </MemoryRouter>,
    )

    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1)
    expect(Element.prototype.scrollIntoView.mock.contexts[0]).toBe(
      document.getElementById('kontak'),
    )
  })
})
