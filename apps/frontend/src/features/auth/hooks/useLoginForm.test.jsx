import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('@/lib/api', () => ({ default: api }))

import { useLoginForm } from './useLoginForm'

function changeField(result, name, value) {
  act(() => {
    result.current.handleChange({ target: { name, value } })
  })
}

describe('useLoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.get.mockResolvedValue({})
    api.post.mockResolvedValue({ data: { user: { id: 10, role: 'warga' } } })
  })

  it('gets the CSRF cookie, logs in, and returns the user', async () => {
    const { result } = renderHook(() => useLoginForm())
    const onSuccess = vi.fn()
    changeField(result, 'username', 'warga-10')
    changeField(result, 'password', 'correct-password')

    let user
    await act(async () => {
      user = await result.current.handleSubmit({ preventDefault: vi.fn() }, onSuccess)
    })

    expect(api.get).toHaveBeenCalledWith('/sanctum/csrf-cookie')
    expect(api.post).toHaveBeenCalledWith('/login', {
      username: 'warga-10',
      password: 'correct-password',
    })
    expect(user).toEqual({ id: 10, role: 'warga' })
    expect(onSuccess).toHaveBeenCalledWith(user)
    expect(result.current.isLoading).toBe(false)
  })

  it('shows the backend validation error for incorrect credentials', async () => {
    api.post.mockRejectedValueOnce({
      response: {
        status: 422,
        data: { message: 'Username atau password salah.' },
      },
    })
    const { result } = renderHook(() => useLoginForm())
    changeField(result, 'username', 'unknown-user')
    changeField(result, 'password', 'wrong-password')

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() })
    })

    expect(result.current.errors.general).toBe('Username atau password salah.')
    expect(result.current.isLoading).toBe(false)
  })

  it('shows the inactive-account response without treating it as a login success', async () => {
    api.post.mockRejectedValueOnce({
      response: {
        status: 403,
        data: { message: 'Akun tidak aktif, hubungi administrator.' },
      },
    })
    const { result } = renderHook(() => useLoginForm())
    changeField(result, 'username', 'inactive-user')
    changeField(result, 'password', 'correct-password')
    const onSuccess = vi.fn()

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() }, onSuccess)
    })

    expect(result.current.errors.general).toBe('Akun tidak aktif, hubungi administrator.')
    expect(onSuccess).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
  })

  it('explains the one-hour lockout when login attempts are rate limited', async () => {
    api.post.mockRejectedValueOnce({
      response: {
        status: 429,
        headers: { 'retry-after': '3600' },
        data: { message: 'Terlalu banyak percobaan login.' },
      },
    })
    const { result } = renderHook(() => useLoginForm())
    changeField(result, 'username', 'warga-10')
    changeField(result, 'password', 'wrong-password')

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() })
    })

    expect(result.current.errors.general).toContain('ditangguhkan sementara hingga 1 jam')
    expect(result.current.isLoading).toBe(false)
  })
})
