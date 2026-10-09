import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/lib/api', () => ({ default: api }))

import {
  createFamily,
  deleteFamily,
  getFamilies,
  getFamily,
  getFamilySocioeconomic,
  saveFamilySocioeconomic,
  updateFamily,
} from './index'

describe('family API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses the families list and CRUD endpoints', () => {
    const filters = { search: '1234', rt_id: 2, page: 1 }
    const payload = { no_kk: '1234567890123456', family_address: 'Jalan Desa' }

    getFamilies(filters)
    getFamily('family-id')
    createFamily(payload)
    updateFamily('family-id', { family_address: 'Alamat baru' })
    deleteFamily('family-id')

    expect(api.get).toHaveBeenNthCalledWith(1, '/api/families', { params: filters })
    expect(api.get).toHaveBeenNthCalledWith(2, '/api/families/family-id')
    expect(api.post).toHaveBeenCalledWith('/api/families', payload)
    expect(api.patch).toHaveBeenCalledWith('/api/families/family-id', {
      family_address: 'Alamat baru',
    })
    expect(api.delete).toHaveBeenCalledWith('/api/families/family-id')
  })

  it('uses family-level socioeconomic endpoints from the backend contract', () => {
    const payload = { household_income_range: '3-5jt' }

    getFamilySocioeconomic('family-id')
    saveFamilySocioeconomic('family-id', payload)

    expect(api.get).toHaveBeenCalledWith('/api/families/family-id/socioeconomic')
    expect(api.put).toHaveBeenCalledWith('/api/families/family-id/socioeconomic', payload)
  })
})
