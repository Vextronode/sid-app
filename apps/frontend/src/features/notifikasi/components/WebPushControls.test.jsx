import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { useWebPushSubscription } = vi.hoisted(() => ({
  useWebPushSubscription: vi.fn(),
}))

vi.mock('../hooks/useWebPushSubscription', () => ({ default: useWebPushSubscription }))

import WebPushControls from './WebPushControls'

describe('WebPushControls', () => {
  beforeEach(() => vi.clearAllMocks())

  it('offers an explicit opt-in and enables push subscriptions', () => {
    const enable = vi.fn()
    useWebPushSubscription.mockReturnValue({
      supported: true,
      subscribed: false,
      loading: false,
      error: '',
      enable,
      disable: vi.fn(),
    })

    render(<WebPushControls />)
    fireEvent.click(screen.getByRole('button', { name: 'Aktifkan push' }))

    expect(enable).toHaveBeenCalledOnce()
  })

  it('reports setup errors and hides controls for unsupported browsers', () => {
    useWebPushSubscription.mockReturnValue({
      supported: true,
      subscribed: false,
      loading: false,
      error: 'Notifikasi push belum dikonfigurasi.',
      enable: vi.fn(),
      disable: vi.fn(),
    })

    const { rerender } = render(<WebPushControls />)
    expect(screen.getByRole('alert').textContent).toBe('Notifikasi push belum dikonfigurasi.')

    useWebPushSubscription.mockReturnValue({ supported: false })
    rerender(<WebPushControls />)
    expect(screen.queryByRole('button', { name: 'Aktifkan push' })).toBeNull()
  })
})
