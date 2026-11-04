import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('@/lib/api', () => ({ default: api }))

const { alertDialog } = vi.hoisted(() => ({ alertDialog: vi.fn() }))
vi.mock('@/shared/lib/dialog', () => ({ alertDialog }))

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
    // Peringatan juga tampil sebagai kartu di tengah layar.
    expect(alertDialog).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Data belum lengkap', tone: 'warning' }),
    )
  })

  it('registers a citizen after obtaining a CSRF cookie', async () => {
    const { result } = renderHook(() => useRegisterForm())
    const fields = {
      nik: '1234567890123456',
      password: 'strong-password',
      password_confirmation: 'strong-password',
    }

    for (const [name, value] of Object.entries(fields)) {
      act(() => {
        result.current.handleChange({ target: { name, value } })
      })
    }
    act(() => {
      result.current.setPhoto(new Blob(['foto'], { type: 'image/jpeg' }))
    })

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() })
    })

    expect(api.get).toHaveBeenCalledWith('/sanctum/csrf-cookie')
    // Multipart: data akun beserta foto wajah dari kamera.
    const body = api.post.mock.calls[0][1] as FormData
    expect(api.post.mock.calls[0][0]).toBe('/register')
    for (const [name, value] of Object.entries(fields)) {
      expect(body.get(name)).toBe(value)
    }
    expect(body.get('photo')).toBeInstanceOf(Blob)
    expect(result.current.isSuccess).toBe(true)
    expect(result.current.registeredUsername).toBe('warga-baru')
  })

  it('requires a photo from the camera', async () => {
    const { result } = renderHook(() => useRegisterForm())

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() })
    })

    expect(result.current.errors.photo).toBe('Foto wajah wajib diisi.')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('shows the single server message when registration cannot be processed', async () => {
    const failed =
      'Pendaftaran tidak dapat diproses. Periksa kembali NIK Anda, atau datang ke kantor desa.'
    api.post.mockRejectedValueOnce({
      response: {
        status: 422,
        data: { message: failed, errors: { nik: [failed] } },
      },
    })
    const { result } = renderHook(() => useRegisterForm())
    const fields = {
      nik: '1234567890123456',
      password: 'strong-password',
      password_confirmation: 'strong-password',
    }

    for (const [name, value] of Object.entries(fields)) {
      act(() => {
        result.current.handleChange({ target: { name, value } })
      })
    }
    act(() => {
      result.current.setPhoto(new Blob(['foto'], { type: 'image/jpeg' }))
    })

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() })
    })

    expect(result.current.errors.nik).toBe(failed)
    expect(result.current.isSuccess).toBe(false)
  })
})
