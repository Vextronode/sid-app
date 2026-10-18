import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('../lib/api', () => ({ default: api }))

import { ProfilDesaPage } from './ProfilDesaPage'

const renderAt = (entry) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/profil-desa" element={<ProfilDesaPage />} />
      </Routes>
    </MemoryRouter>,
  )

const REGULATION = {
  id: 1,
  title: 'Pungutan Desa',
  regulation_number: '01/2026',
  enacted_date: '2026-01-15',
  content: 'Isi peraturan.',
}

describe('ProfilDesaPage scroll target', () => {
  let scrollTo
  let scrollIntoView

  beforeEach(() => {
    api.get.mockImplementation((url) =>
      Promise.resolve(
        url === '/api/public/regulations'
          ? { data: { data: [REGULATION] } }
          : { data: { data: { name: 'Desa Cibenda' }, officials: [], hamlets: [], positions: [] } },
      ),
    )
    scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete Element.prototype.scrollIntoView
  })

  // Dari "Lihat profil desa →" atau menu "Profil desa": mulai dari atas,
  // bukan posisi gulir halaman sebelumnya.
  it('starts at the top when opened without a section hash', async () => {
    renderAt('/profil-desa')

    expect(await screen.findByRole('heading', { name: 'Profil Desa Cibenda' })).toBeInTheDocument()
    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith(0, 0))
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  // Nama, alamat, dan telepon dari data desa; kalimatnya statis tanpa kata
  // "sejarah" (permintaan pemilik, 12 Okt 2026).
  it('builds the header from the village data', async () => {
    api.get.mockResolvedValue({
      data: {
        data: {
          name: 'Cibenda',
          address: 'Jl. Raya Cibenda',
          phone: '(0265) 2640613',
          hero_image_url: '/assets/image/beranda/hero-pemandangan.jpg',
        },
        officials: [],
        hamlets: [],
        positions: [],
      },
    })
    renderAt('/profil-desa')

    expect(await screen.findByRole('heading', { name: 'Profil Desa Cibenda' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'Halaman resmi informasi tata kelola dan capaian strategis Desa Cibenda untuk transparansi publik.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Jl. Raya Cibenda')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Telp. (0265) 2640613' })).toHaveAttribute(
      'href',
      'tel:02652640613',
    )
    expect(screen.getByRole('img', { name: 'Profil Desa Cibenda' })).toHaveAttribute(
      'src',
      '/assets/image/beranda/hero-pemandangan.jpg',
    )
    expect(screen.queryByText(/tata kelola, sejarah/)).toBeNull()
  })

  it('scrolls to the officials section for #perangkat-desa', async () => {
    renderAt('/profil-desa#perangkat-desa')

    await screen.findByRole('heading', { name: 'Profil Desa Cibenda' })
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledOnce())
    expect(scrollIntoView.mock.contexts[0]).toHaveAttribute('id', 'perangkat-desa')
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('scrolls to the regulations section for #peraturan-desa', async () => {
    renderAt('/profil-desa#peraturan-desa')

    await screen.findByRole('heading', { name: 'Profil Desa Cibenda' })
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledOnce())
    expect(scrollIntoView.mock.contexts[0]).toHaveAttribute('id', 'peraturan-desa')
  })
})

describe('ProfilDesaPage peraturan desa', () => {
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const mockApi = (regulations) =>
    api.get.mockImplementation((url) =>
      url === '/api/public/regulations'
        ? regulations()
        : Promise.resolve({
            data: { data: { name: 'Desa Cibenda' }, officials: [], hamlets: [], positions: [] },
          }),
    )

  it('lists the published regulations', async () => {
    mockApi(() => Promise.resolve({ data: { data: [REGULATION] } }))
    renderAt('/profil-desa')

    expect(await screen.findByRole('heading', { name: 'Peraturan Desa' })).toBeInTheDocument()
    expect(await screen.findByText('Pungutan Desa')).toBeInTheDocument()
  })

  it('shows the empty state when the backend has none (404)', async () => {
    mockApi(() => Promise.reject({ response: { status: 404, data: { message: 'Belum ada' } } }))
    renderAt('/profil-desa')

    expect(
      await screen.findByText('Belum ada peraturan desa yang dipublikasikan.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
