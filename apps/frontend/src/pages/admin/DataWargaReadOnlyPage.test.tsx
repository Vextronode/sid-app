import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({ role: 'kaur_tu_umum' }))
const api = vi.hoisted(() => ({
  getCitizens: vi.fn(),
  getFamilies: vi.fn(),
  getFamilyOptions: vi.fn(),
}))

vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u-1', role: auth.role } }),
}))
vi.mock('@/components/layout/SiteFooter', () => ({ SiteFooter: (): null => null }))
vi.mock('@/features/data-warga/api', () => ({
  ...api,
  createFamily: vi.fn(),
  deleteFamily: vi.fn(),
  updateFamily: vi.fn(),
  getFamily: vi.fn(),
  getFamilySocioeconomic: vi.fn(),
  saveFamilySocioeconomic: vi.fn(),
}))
vi.mock('@/features/kelola-wilayah/api', () => ({
  getHamlets: () => Promise.resolve({ data: { data: [{ id: 1, name: 'Krajan' }] } }),
  getRws: () => Promise.resolve({ data: { data: [{ id: 10, number: '1', hamlet_id: 1 }] } }),
  getRts: () => Promise.resolve({ data: { data: [{ id: 100, number: '2', rw_id: 10 }] } }),
}))

import DataWargaReadOnlyPage from './DataWargaReadOnlyPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <DataWargaReadOnlyPage />
    </MemoryRouter>,
  )
}

const filterNames = () =>
  screen
    .queryAllByRole('combobox', { name: /^Filter / })
    .map((select) => select.getAttribute('aria-label'))

describe('DataWargaReadOnlyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getCitizens.mockResolvedValue({
      data: { data: [{ id: 'c-1', name: 'Ani' }], meta: { total: 1 } },
    })
    api.getFamilies.mockResolvedValue({ data: { data: [], meta: { total: 0, last_page: 1 } } })
    api.getFamilyOptions.mockResolvedValue({ data: { data: [] } })
  })

  it.each([
    ['rt', []],
    ['rw', ['Filter RT']],
    ['kadus', ['Filter RW', 'Filter RT']],
    ['kepala_desa', ['Filter Dusun', 'Filter RW', 'Filter RT']],
    ['sekretaris_desa', ['Filter Dusun', 'Filter RW', 'Filter RT']],
    ['kaur_tu_umum', ['Filter Dusun', 'Filter RW', 'Filter RT']],
  ])('shows the area filters for %s', async (role, expected) => {
    auth.role = role
    renderPage()

    expect(await screen.findByText('Ani')).toBeInTheDocument()
    expect(filterNames()).toEqual(expected)
  })

  it('sends the chosen RT filter with the citizen list request', async () => {
    auth.role = 'rw'
    renderPage()

    await screen.findByRole('option', { name: 'RT 2 / RW 1' })
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter RT' }), {
      target: { value: '100' },
    })

    await waitFor(() =>
      expect(api.getCitizens).toHaveBeenLastCalledWith(expect.objectContaining({ rt_id: '100' })),
    )
  })

  it('tells area officials the data is limited to their area', async () => {
    auth.role = 'kadus'
    renderPage()

    expect(
      await screen.findByText(
        'Halaman ini hanya untuk melihat data warga dan Kartu Keluarga di wilayah Anda.',
      ),
    ).toBeInTheDocument()
  })

  it('shows the same family tab with area filters for RW', async () => {
    auth.role = 'rw'
    renderPage()

    fireEvent.click(screen.getByRole('tab', { name: 'Kartu Keluarga' }))

    expect(await screen.findByText('Daftar Kartu Keluarga (hanya lihat).')).toBeInTheDocument()
    expect(filterNames()).toEqual(['Filter RT'])
  })
})
