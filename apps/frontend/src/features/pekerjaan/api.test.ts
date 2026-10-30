import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/lib/api', () => ({ default: api }))

import { createOccupation, deleteOccupation, getOccupations, updateOccupation } from './api'

describe('occupation API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses the occupation catalogue endpoints', () => {
    getOccupations()
    getOccupations({ includeInactive: true })
    createOccupation({ name: 'Petani' })
    updateOccupation(3, { is_active: false })
    deleteOccupation(3)

    expect(api.get).toHaveBeenNthCalledWith(1, '/api/occupations', { params: {} })
    expect(api.get).toHaveBeenNthCalledWith(2, '/api/occupations', {
      params: { include_inactive: 1 },
    })
    expect(api.post).toHaveBeenCalledWith('/api/occupations', { name: 'Petani' })
    expect(api.patch).toHaveBeenCalledWith('/api/occupations/3', { is_active: false })
    expect(api.delete).toHaveBeenCalledWith('/api/occupations/3')
  })
})
