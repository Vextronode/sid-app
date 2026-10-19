import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getCitizens, getHamlets, getRts, getRws } = vi.hoisted(() => ({
  getCitizens: vi.fn(),
  getHamlets: vi.fn(),
  getRts: vi.fn(),
  getRws: vi.fn(),
}))

vi.mock('../api', () => ({
  getCitizens,
  createCitizen: vi.fn(),
  updateCitizen: vi.fn(),
  deleteCitizen: vi.fn(),
  importCitizensExcel: vi.fn(),
}))

vi.mock('@/features/kelola-wilayah/api', () => ({
  getHamlets,
  getRts,
  getRws,
}))

import { useWargaList } from './useWargaList'

describe('useWargaList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    getCitizens.mockResolvedValue({ data: { data: [] } })
    getHamlets.mockResolvedValue({
      data: {
        data: [
          { id: 1, name: 'Krajan' },
          { id: 2, name: 'Sukamaju' },
        ],
      },
    })
    getRts.mockResolvedValue({
      data: {
        data: [
          { id: 10, number: 1, rw_id: 4 },
          { id: 11, number: 2, rw_id: 5 },
          { id: 12, number: 3, rw_id: 4 },
        ],
      },
    })
    getRws.mockResolvedValue({
      data: {
        data: [
          { id: 4, number: 1, hamlet_id: 1 },
          { id: 5, number: 3, hamlet_id: 2 },
        ],
      },
    })
  })

  it('loads all RT choices for the citizen form independently of the filters', async () => {
    const { result } = renderHook(() => useWargaList())

    await waitFor(() => expect(result.current.wilayahOptions).toHaveLength(3))

    expect(result.current.wilayahOptions[1]).toEqual({
      id: 11,
      number: 2,
      rw_id: 5,
      label: 'RT 2 / RW 3',
    })
  })

  it('narrows RW and RT choices by the chosen hamlet and RW', async () => {
    const { result } = renderHook(() => useWargaList())

    await waitFor(() => expect(result.current.rtOptions).toHaveLength(3))

    act(() => result.current.setFilter('hamletId', '1'))

    expect(result.current.rwOptions).toEqual([{ value: '4', label: 'RW 1' }])
    expect(result.current.rtOptions.map((option) => option.value)).toEqual(['10', '12'])

    act(() => result.current.setFilter('rwId', '4'))
    act(() => result.current.setFilter('rtId', '12'))

    await waitFor(() =>
      expect(getCitizens).toHaveBeenLastCalledWith(
        expect.objectContaining({ hamlet_id: '1', rw_id: '4', rt_id: '12', page: 1 }),
      ),
    )

    // Mengganti dusun mengosongkan RW dan RT.
    act(() => result.current.setFilter('hamletId', '2'))

    expect(result.current.filters).toEqual({ hamletId: '2', rwId: '', rtId: '' })
  })

  it('requests the chosen page size and goes back to the first page', async () => {
    const { result } = renderHook(() => useWargaList())

    await waitFor(() =>
      expect(getCitizens).toHaveBeenCalledWith(expect.objectContaining({ per_page: 10 })),
    )

    act(() => result.current.setCurrentPage(2))
    act(() => result.current.setPageSize(25))

    await waitFor(() =>
      expect(getCitizens).toHaveBeenLastCalledWith(
        expect.objectContaining({ per_page: 25, page: 1 }),
      ),
    )
  })
})
