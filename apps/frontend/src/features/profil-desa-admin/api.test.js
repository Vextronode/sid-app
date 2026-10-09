import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/lib/api', () => ({ default: api }))

import {
  createPerangkatDesa,
  deletePerangkatDesa,
  demotePerangkatDesa,
  getPerangkatDesa,
  promotePerangkatDesa,
  rotatePerangkatDesa,
  updatePerangkatDesa,
} from './api'

describe('official API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses the current officials and lifecycle endpoints', () => {
    const payload = { user_id: 'user-id', position: 'rt', started_at: '2026-10-01' }

    getPerangkatDesa()
    createPerangkatDesa({ citizen_id: 'citizen-id', position: 'kepala_desa' })
    updatePerangkatDesa(5, { phone_wa: '081234567890' })
    deletePerangkatDesa(5)
    promotePerangkatDesa(payload)
    demotePerangkatDesa(5)
    rotatePerangkatDesa(5, payload)

    expect(api.get).toHaveBeenCalledWith('/api/officials')
    expect(api.post).toHaveBeenNthCalledWith(1, '/api/officials', {
      citizen_id: 'citizen-id',
      position: 'kepala_desa',
    })
    expect(api.patch).toHaveBeenCalledWith('/api/officials/5', {
      phone_wa: '081234567890',
    })
    expect(api.delete).toHaveBeenCalledWith('/api/officials/5')
    expect(api.post).toHaveBeenNthCalledWith(2, '/api/officials/promote', payload)
    expect(api.post).toHaveBeenNthCalledWith(3, '/api/officials/5/demote', {})
    expect(api.post).toHaveBeenNthCalledWith(4, '/api/officials/5/rotate', payload)
  })
})
