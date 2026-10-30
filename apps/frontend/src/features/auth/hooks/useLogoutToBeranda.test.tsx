import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({ logout: vi.fn(), isLoggingOut: false }))

const { alertDialog } = vi.hoisted(() => ({ alertDialog: vi.fn() }))

vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => auth,
}))
vi.mock('@/shared/lib/dialog', () => ({ alertDialog }))

import { useLogoutToBeranda } from './useLogoutToBeranda'

const DASHBOARD = '/admin/rt'

const renderLogout = () =>
  renderHook(() => ({ ...useLogoutToBeranda(), location: useLocation() }), {
    wrapper: ({ children }) => <MemoryRouter initialEntries={[DASHBOARD]}>{children}</MemoryRouter>,
  })

describe('useLogoutToBeranda', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.isLoggingOut = false
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('stays on the page until the server has ended the session', async () => {
    let finishLogout
    // Seperti AuthContext: onLoggedOut dipanggil saat server sudah menghapus sesi.
    auth.logout.mockImplementation(
      ({ onLoggedOut }) =>
        new Promise((resolve) => {
          finishLogout = () => {
            onLoggedOut()
            resolve()
          }
        }),
    )
    const { result } = renderLogout()

    let pending
    act(() => {
      pending = result.current.handleLogout()
    })
    expect(result.current.location.pathname).toBe(DASHBOARD)

    await act(async () => {
      finishLogout()
      await pending
    })
    expect(auth.logout).toHaveBeenCalledOnce()
    expect(result.current.location.pathname).toBe('/')
  })

  it('stays logged in on the page and shows the error when logout fails', async () => {
    auth.logout.mockRejectedValue({ response: { data: { message: 'Server sibuk' } } })
    const { result } = renderLogout()

    await act(() => result.current.handleLogout())

    expect(alertDialog).toHaveBeenCalledWith(expect.objectContaining({ message: 'Server sibuk' }))
    expect(result.current.location.pathname).toBe(DASHBOARD)
  })

  it('ignores clicks while a logout is already running', async () => {
    auth.isLoggingOut = true
    const { result } = renderLogout()

    await act(() => result.current.handleLogout())

    expect(auth.logout).not.toHaveBeenCalled()
  })
})
