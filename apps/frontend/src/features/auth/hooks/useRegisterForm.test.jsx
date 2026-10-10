import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('@/lib/api', () => ({ default: api }))

import { useRegisterForm } from './useRegisterForm'

describe('useRegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.get.mockResolvedValue({})
    api.post.mockResolvedValue({ data: { user: { username: 'warga-baru' } } })
  })

  it('validates the NIK and password confirmation before sending registration', async () => {
    const { result } = renderHook(() => useRegisterForm())

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() })
    })

    expect(result.current.errors.nik).toBe('NIK wajib diisi.')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('registers a citizen after obtaining a CSRF cookie', async () => {
    const { result } = renderHook(() => useRegisterForm())
    const fields = {
      nik: '1234567890123456',
      date_of_birth: '1990-05-14',
      password: 'strong-password',
      password_confirmation: 'strong-password',
    }

    for (const [name, value] of Object.entries(fields)) {
      act(() => {
        result.current.handleChange({ target: { name, value } })
      })
    }

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() })
    })

    expect(api.get).toHaveBeenCalledWith('/sanctum/csrf-cookie')
    expect(api.post).toHaveBeenCalledWith('/register', fields)
    expect(result.current.isSuccess).toBe(true)
    expect(result.current.registeredUsername).toBe('warga-baru')
  })

  it('shows the server validation error for a date of birth that does not match the citizen record', async () => {
    api.post.mockRejectedValueOnce({
      response: {
        status: 422,
        data: {
          message: 'Tanggal lahir tidak sesuai dengan data warga.',
          errors: { date_of_birth: ['Tanggal lahir tidak sesuai dengan data warga.'] },
        },
      },
    })
    const { result } = renderHook(() => useRegisterForm())
    const fields = {
      nik: '1234567890123456',
      date_of_birth: '1990-05-15',
      password: 'strong-password',
      password_confirmation: 'strong-password',
    }

    for (const [name, value] of Object.entries(fields)) {
      act(() => {
        result.current.handleChange({ target: { name, value } })
      })
    }

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() })
    })

    expect(result.current.errors.date_of_birth).toBe(
      'Tanggal lahir tidak sesuai dengan data warga.',
    )
    expect(result.current.isSuccess).toBe(false)
  })
})
