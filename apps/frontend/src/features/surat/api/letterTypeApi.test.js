import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
}))

vi.mock('@/lib/api', () => ({ default: api }))

import { getLetterTypes, updateLetterType } from './letterTypeApi'

describe('letter type API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads types from the backend endpoint', async () => {
    const types = [{ id: 1, code: 'A04', name: 'Surat Keterangan Domisili' }]
    api.get.mockResolvedValue({ data: { data: types } })

    await expect(getLetterTypes()).resolves.toEqual(types)
    expect(api.get).toHaveBeenCalledWith('/api/letter-types', { params: {} })
  })

  it('updates a type through the backend endpoint', () => {
    const payload = { validity_days: 30, is_active: true }

    updateLetterType(12, payload)

    expect(api.put).toHaveBeenCalledWith('/api/letter-types/12', payload)
  })
})
