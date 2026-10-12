import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getCitizens, getRts, getRws } = vi.hoisted(() => ({
  getCitizens: vi.fn(),
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
  getRts,
  getRws,
}))

import { useWargaList } from './useWargaList'

describe('useWargaList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCitizens.mockResolvedValue({ data: { data: [] } })
    getRts.mockResolvedValue({
      data: {
        data: [
          { id: 10, number: 1, rw_id: 4 },
          { id: 11, number: 2, rw_id: 5 },
        ],
      },
    })
    getRws.mockResolvedValue({
      data: {
        data: [
          { id: 4, number: 1 },
          { id: 5, number: 3 },
        ],
      },
    })
  })

  it('loads all RT choices and resolves their RW labels independently of citizens', async () => {
    const { result } = renderHook(() => useWargaList())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(getRts).toHaveBeenCalledOnce()
    expect(getRws).toHaveBeenCalledOnce()
    expect(result.current.wilayahOptions).toEqual([
      { id: 10, number: 1, rw_id: 4, label: 'RT 1 / RW 1' },
      { id: 11, number: 2, rw_id: 5, label: 'RT 2 / RW 3' },
    ])
  })
})
