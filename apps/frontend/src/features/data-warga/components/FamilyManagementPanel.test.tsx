import { createRef } from 'react'
import type { ComponentProps } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { partialFixture } from '@/test/fixtures'

import { getFamily } from '../api'
import FamilyManagementPanel from './FamilyManagementPanel'
import type { FamilyManagementPanelHandle } from './FamilyManagementPanel'

vi.mock('../api', () => ({
  getFamily: vi.fn(),
  getFamilySocioeconomic: vi.fn(),
  saveFamilySocioeconomic: vi.fn(),
}))

const mockedGetFamily = vi.mocked(getFamily, { partial: true, deep: true })

const familyList = partialFixture<ComponentProps<typeof FamilyManagementPanel>['familyList']>({
  families: [
    {
      id: 'family-1',
      no_kk_masked: '************0001',
      head_of_family: { name: 'Kepala Rumah' },
      members_count: 3,
      family_address: 'Dusun Budiasih',
      family_status: 'aktif',
    },
  ],
  loading: false,
  error: '',
  totalItems: 1,
  searchFamilies: vi.fn(),
  wilayahFilter: {
    filters: { hamletId: '', rwId: '', rtId: '' },
    setFilter: vi.fn(),
    hamletOptions: [{ value: '1', label: 'Krajan' }],
    rwOptions: [{ value: '10', label: 'RW 1' }],
    rtOptions: [{ value: '100', label: 'RT 1 / RW 1' }],
  },
  currentPage: 1,
  setCurrentPage: vi.fn(),
  totalPages: 1,
  pageSize: 10,
  setPageSize: vi.fn(),
  addFamily: vi.fn(),
  editFamily: vi.fn(),
  removeFamily: vi.fn(),
})

function renderPanel(props: Partial<ComponentProps<typeof FamilyManagementPanel>> = {}) {
  render(
    <MemoryRouter>
      <FamilyManagementPanel familyList={familyList} {...props} />
    </MemoryRouter>,
  )
}

describe('FamilyManagementPanel', () => {
  it('filters the list by hamlet, RW, and RT like the citizen list', () => {
    renderPanel()

    fireEvent.change(screen.getByRole('combobox', { name: 'Filter Dusun' }), {
      target: { value: '1' },
    })

    expect(familyList.wilayahFilter.setFilter).toHaveBeenCalledWith('hamletId', '1')
    expect(screen.getByRole('combobox', { name: 'Filter RW' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Filter RT' })).toBeTruthy()
  })

  it('offers management actions to managers without the activity log for Kasi', () => {
    renderPanel({ canViewHistory: false })

    expect(screen.getByRole('button', { name: 'Edit KK' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Hapus KK' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Riwayat perubahan' })).toBeNull()
  })

  it('leaves Tambah KK to the page header and opens the form through its ref', () => {
    const ref = createRef<FamilyManagementPanelHandle>()
    renderPanel({ ref })

    expect(screen.queryByRole('button', { name: /Tambah KK/ })).toBeNull()

    act(() => ref.current.openCreate())

    expect(screen.getByText('Tambah Kartu Keluarga')).toBeTruthy()
  })

  // Regresi: detail KK dulu tidak membawa members, jadi daftar ini tidak pernah tampil.
  it('lists the family members when editing a family', async () => {
    mockedGetFamily.mockResolvedValue({
      data: {
        data: {
          id: 'family-1',
          members: [
            { id: 'citizen-11', name: 'Kepala Rumah', family_role: 'kepala_keluarga' },
            { id: 'citizen-12', name: 'Asep', family_role: 'anak' },
          ],
        },
      },
    })
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Edit KK' }))

    expect(await screen.findByText('Anggota KK')).toBeTruthy()
    expect(screen.getByText(/Asep/)).toBeTruthy()
  })

  it('is read-only for Kaur TU & Umum', () => {
    renderPanel({ canEdit: false, canViewHistory: false })

    expect(screen.getByText('Kepala Rumah')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Tambah KK/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Edit KK' })).toBeNull()
    expect(screen.queryByRole('columnheader', { name: 'Aksi' })).toBeNull()
  })
})
