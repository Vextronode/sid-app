import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('@/lib/api', () => ({ default: api }))

import { getWebPushSubscribers } from './api'
import { formatWilayah } from './labels'

describe('pelanggan notifikasi API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.get.mockResolvedValue({ data: { data: [], meta: { total: 0 } } })
  })

  it('requests subscribers with only filled filters', async () => {
    await expect(
      getWebPushSubscribers({
        search: '',
        role: 'warga',
        status: 'aktif',
        push_service: '',
        page: 2,
      }),
    ).resolves.toEqual({ data: [], meta: { total: 0 } })

    expect(api.get).toHaveBeenCalledWith('/api/web-push-subscribers', {
      params: { role: 'warga', status: 'aktif', page: 2 },
    })
  })
})

describe('formatWilayah', () => {
  it('joins RT, RW, and dusun when available', () => {
    expect(formatWilayah({ rt: '001', rw: '002', hamlet: 'Krajan' })).toBe(
      'RT 001 / RW 002 · Krajan',
    )
    expect(formatWilayah({ rt: null, rw: null, hamlet: null })).toBe('-')
    expect(formatWilayah(null)).toBe('-')
  })
})
