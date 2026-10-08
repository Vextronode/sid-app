import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { usePublicNews } from '@/features/berita/usePublicNews'
import { BeritaPage } from './BeritaPage'

vi.mock('@/features/berita/usePublicNews', () => ({
  usePublicNews: vi.fn(),
}))

describe('BeritaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderPage = () =>
    render(
      <MemoryRouter>
        <BeritaPage />
      </MemoryRouter>,
    )

  it('shows a loading state while public news is being fetched', () => {
    usePublicNews.mockReturnValue({ news: [], loading: true, error: null })

    renderPage()

    expect(screen.getByRole('status')).toHaveTextContent('Memuat berita...')
  })

  it('shows the API error instead of an empty success state', () => {
    usePublicNews.mockReturnValue({
      news: [],
      loading: false,
      error: 'Gagal memuat berita.',
    })

    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent('Gagal memuat berita.')
    expect(screen.queryByText('Belum ada berita yang dipublikasikan.')).not.toBeInTheDocument()
  })

  it('shows an explicit empty state when the public API has no news', () => {
    usePublicNews.mockReturnValue({ news: [], loading: false, error: null })

    renderPage()

    expect(screen.getByRole('status')).toHaveTextContent(
      'Belum ada berita yang dipublikasikan.',
    )
  })

  it('renders news supplied by the public API hook', () => {
    usePublicNews.mockReturnValue({
      news: [
        {
          id: 1,
          title: 'Pengumuman Posyandu',
          category: null,
          date: '1 Juli 2026',
          excerpt: '',
          imageUrl: null,
          content: ['Informasi jadwal posyandu.'],
          isFeatured: false,
        },
        {
          id: 2,
          title: 'Jadwal Posyandu Bulan Ini',
          category: null,
          date: '2 Juli 2026',
          excerpt: 'Jadwal posyandu bulan ini.',
          imageUrl: null,
          content: ['Pelayanan posyandu dilaksanakan pada minggu kedua.'],
          isFeatured: false,
        },
      ],
      loading: false,
      error: null,
    })

    renderPage()

    expect(screen.getByRole('heading', { name: 'Pengumuman Posyandu' })).toBeInTheDocument()
    expect(screen.getByText('Jadwal posyandu bulan ini.')).toBeInTheDocument()
  })
})
