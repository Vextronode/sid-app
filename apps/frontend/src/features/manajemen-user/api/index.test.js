import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
}))

vi.mock('@/lib/api', () => ({ default: api }))

import { getUsers, toggleUserStatus, updateUser } from './index'

describe('user API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reads accounts and uses supported update endpoints', () => {
    getUsers()
    toggleUserStatus('user-id')
    updateUser('user-id', { name: 'Nama Baru' })

    expect(api.get).toHaveBeenCalledWith('/api/users')
    expect(api.patch).toHaveBeenNthCalledWith(1, '/api/users/user-id/toggle-status')
    expect(api.patch).toHaveBeenNthCalledWith(2, '/api/users/user-id', { name: 'Nama Baru' })
  })
})
