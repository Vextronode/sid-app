import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('@/lib/api', () => ({ default: api }))

import { getLetterActivityLogs, getPopulationLogs } from './api'

describe('activity log API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.get.mockResolvedValue({ data: { data: [], meta: { total: 0 } } })
  })

  it('requests population logs with only filled filters', async () => {
    await expect(
      getPopulationLogs({ type: 'citizen', event: '', subject_id: 'abc', page: 2 }),
    ).resolves.toEqual({ data: [], meta: { total: 0 } })

    expect(api.get).toHaveBeenCalledWith('/api/activity-logs/population', {
      params: { type: 'citizen', subject_id: 'abc', page: 2 },
    })
  })

  it('requests letter activity logs', async () => {
    await getLetterActivityLogs({ new_status: 'rejected', from: '2026-10-01', to: '' })

    expect(api.get).toHaveBeenCalledWith('/api/activity-logs/letters', {
      params: { new_status: 'rejected', from: '2026-10-01' },
    })
  })
})
