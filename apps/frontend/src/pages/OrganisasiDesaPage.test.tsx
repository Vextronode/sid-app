import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import api from '@/lib/api'
import { OrganisasiDesaPage } from './OrganisasiDesaPage'
import type { OrganisasiVariant } from './OrganisasiDesaPage'

vi.mock('@/lib/api', () => ({ default: { get: vi.fn() } }))

const mockedGet = vi.mocked(api.get, { partial: true, deep: true })
vi.mock('@/features/info-desa/usePublicVillageInfo', () => ({
  usePublicVillageInfo: () => ({
    village: { name: 'Cibenda' },
    stats: null as unknown,
    contacts: [] as unknown[],
  }),
}))

const STRUCTURES: Record<string, unknown> = {
  bpd: {
    org_type: 'bpd',
    ketua: { id: 1, name: 'Budi Santoso', photo_url: '/storage/ketua.jpg' },
    wakil_ketua: null,
    anggota: [
      { id: 3, name: 'Siti Aminah', photo_url: null },
      { id: 4, name: 'Asep Saepudin', photo_url: null },
    ],
  },
  lpm: {
    org_type: 'lpm',
    ketua: { id: 7, name: 'Rahmat Hidayat' },
    wakil_ketua: null,
    anggota: [],
  },
  pkk: { org_type: 'pkk', ketua: { id: 9, name: 'Ibu Ketua PKK' }, wakil_ketua: null, anggota: [] },
}

const LocationProbe = () => {
  const { pathname, search } = useLocation()
  return <p data-testid="location">{pathname + search}</p>
}

const renderPage = (variant: OrganisasiVariant, path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <OrganisasiDesaPage variant={variant} />
      <LocationProbe />
    </MemoryRouter>,
  )

describe('OrganisasiDesaPage', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn()
    mockedGet.mockImplementation((url) => {
      const type = url.split('/').pop()
      return Promise.resolve({ data: { data: STRUCTURES[type] } })
    })
  })

  it('shows the BPD chart: ketua, empty wakil, and members', async () => {
    renderPage('bpd', '/bpd')

    expect(screen.getByRole('heading', { level: 1, name: 'Badan Permusyawaratan Desa' }))
    expect(screen.getByText(/Desa Cibenda/)).toBeInTheDocument()
    expect(await screen.findByText('Budi Santoso')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Budi Santoso' })).toHaveAttribute(
      'src',
      '/storage/ketua.jpg',
    )
    expect(screen.getByText('Ketua BPD')).toBeInTheDocument()
    expect(screen.getByText('Wakil Ketua BPD')).toBeInTheDocument()
    expect(screen.getByText('Belum tersedia')).toBeInTheDocument()
    expect(screen.getByText('Siti Aminah')).toBeInTheDocument()
    expect(screen.getByText('Asep Saepudin')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/api/public/village-orgs/bpd', expect.any(Object))
    expect(screen.queryByRole('tablist')).toBeNull()
  })

  it('switches between LPM, Karang Taruna, and PKK with tabs kept in the URL', async () => {
    const user = userEvent.setup()
    renderPage('lembaga', '/lembaga-desa')

    const tabs = within(screen.getByRole('tablist', { name: 'Pilih lembaga desa' }))
    expect(tabs.getByRole('tab', { name: 'LPM' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByText('Rahmat Hidayat')).toBeInTheDocument()
    expect(screen.getByText('Belum ada anggota')).toBeInTheDocument()

    await user.click(tabs.getByRole('tab', { name: 'PKK' }))

    expect(tabs.getByRole('tab', { name: 'PKK' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByText('Ibu Ketua PKK')).toBeInTheDocument()
    expect(screen.queryByText('Rahmat Hidayat')).toBeNull()
    expect(screen.getByTestId('location')).toHaveTextContent('/lembaga-desa?lembaga=pkk')
  })

  it('shows BUMDesa after PKK as "Segera hadir", not as a selectable tab', async () => {
    const user = userEvent.setup()
    renderPage('lembaga', '/lembaga-desa')
    await screen.findByText('Rahmat Hidayat')

    const tabs = within(screen.getByRole('tablist', { name: 'Pilih lembaga desa' }))
    expect(tabs.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'LPM',
      'Karang Taruna',
      'PKK',
    ])

    const bumdes = screen.getByText('BUMDesa')
    expect(bumdes).toHaveTextContent('BUMDesaSegera hadir')
    expect(bumdes.closest('button, a, [tabindex], [role="tab"]')).toBeNull()
    // Urutan tampil: setelah PKK.
    expect(
      tabs.getByRole('tab', { name: 'PKK' }).compareDocumentPosition(bumdes) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    await user.click(bumdes)
    expect(tabs.getByRole('tab', { name: 'LPM' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/lembaga-desa$/)
  })

  it('ignores ?lembaga=bumdes and opens LPM', async () => {
    renderPage('lembaga', '/lembaga-desa?lembaga=bumdes')

    expect(await screen.findByText('Rahmat Hidayat')).toBeInTheDocument()
  })

  it('opens the organisation named in ?lembaga=', async () => {
    renderPage('lembaga', '/lembaga-desa?lembaga=pkk')

    expect(await screen.findByText('Ibu Ketua PKK')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pemberdayaan Kesejahteraan Keluarga' }))
  })

  it('shows the server message when loading fails', async () => {
    mockedGet.mockRejectedValueOnce({
      response: { data: { message: 'Profil desa belum tersedia.' } },
    })
    renderPage('bpd', '/bpd')

    expect(await screen.findByText('Profil desa belum tersedia.')).toBeInTheDocument()
  })
})
