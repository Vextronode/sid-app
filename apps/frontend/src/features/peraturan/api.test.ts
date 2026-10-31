import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/lib/api', () => ({ default: api }))

import {
  createRegulation,
  deleteRegulation,
  getPublicRegulations,
  getRegulations,
  updateRegulation,
} from './api'

describe('regulation API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses the admin and public regulation endpoints', () => {
    const payload = { regulation_number: '01/2026', title: 'Judul', content: 'Isi' }

    getRegulations()
    createRegulation(payload)
    updateRegulation(7, payload)
    deleteRegulation(7)
    getPublicRegulations()

    expect(api.get).toHaveBeenNthCalledWith(1, '/api/regulations')
    expect(api.post).toHaveBeenCalledWith('/api/regulations', payload)
    expect(api.patch).toHaveBeenCalledWith('/api/regulations/7', payload)
    expect(api.delete).toHaveBeenCalledWith('/api/regulations/7')
    expect(api.get).toHaveBeenNthCalledWith(2, '/api/public/regulations', { params: {} })
  })
})
