import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('@/lib/api', () => ({ default: api }))

import { AuthProvider, useAuth } from './AuthContext'

function wrapper({ children }) {
  return <AuthProvider>{children}</AuthProvider>
}

describe('AuthContext session regression', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.get.mockResolvedValue({ data: { user: { id: 10, role: 'warga' } } })
    api.post.mockResolvedValue({})
  })

  it('restores the authenticated session on initial load and refresh', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.user).toEqual({ id: 10, role: 'warga' })

    api.get.mockResolvedValueOnce({ data: { user: { id: 11, role: 'rt' } } })
    await act(async () => {
      await result.current.refreshUser()
    })

    expect(api.get).toHaveBeenLastCalledWith('/api/user')
    expect(result.current.user).toEqual({ id: 11, role: 'rt' })
  })

  it('clears the session after CSRF-protected logout', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.logout()
    })

    expect(api.get).toHaveBeenCalledWith('/sanctum/csrf-cookie')
    expect(api.post).toHaveBeenCalledWith('/logout')
    expect(result.current.user).toBeNull()
    expect(result.current.isLoggingOut).toBe(false)
  })
})
