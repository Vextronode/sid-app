import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
}))

vi.mock('@/lib/api', () => ({ default: api }))

import { submitDecision } from './api'

describe('approval decision API', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    ['rt', '/api/rt/letters/letter-1/decision'],
    ['kepala_desa', '/api/kades/letters/letter-1/decision'],
    ['sekretaris_desa', '/api/kades/letters/letter-1/decision'],
  ])('sends %s decisions to the current role action endpoint', (role, endpoint) => {
    submitDecision(role, 'letter-1', 'approved')

    expect(api.patch).toHaveBeenCalledWith(endpoint, {
      status: 'approved',
      notes: null,
    })
  })

  it('includes rejection notes in the decision request', () => {
    submitDecision('rt', 'letter-1', 'rejected', 'Data tidak lengkap')

    expect(api.patch).toHaveBeenCalledWith('/api/rt/letters/letter-1/decision', {
      status: 'rejected',
      notes: 'Data tidak lengkap',
    })
  })
})
