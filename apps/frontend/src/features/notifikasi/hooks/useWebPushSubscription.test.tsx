import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { savePushSubscription, removePushSubscription } = vi.hoisted(() => ({
  savePushSubscription: vi.fn(),
  removePushSubscription: vi.fn(),
}))

const { notifySuccess, notifyError } = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}))

vi.mock('../api', () => ({ savePushSubscription, removePushSubscription }))
vi.mock('@/shared/lib/toast', () => ({ notifySuccess, notifyError }))

import useWebPushSubscription, { SERVICE_WORKER_TIMEOUT_MS } from './useWebPushSubscription'
import type { Mock } from 'vitest'

const endpoint = 'https://push.example/subscription'
const serializedSubscription = {
  endpoint,
  keys: { p256dh: 'public-key', auth: 'auth-token' },
}

describe('useWebPushSubscription', () => {
  let registration: { pushManager: { getSubscription: Mock; subscribe: Mock } }
  let subscription: { endpoint: string; toJSON: Mock; unsubscribe: Mock }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'BEl2ZXJpZnlwdXNoa2V5')
    vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('granted') })
    vi.stubGlobal('PushManager', {})

    subscription = {
      endpoint,
      toJSON: vi.fn(() => serializedSubscription),
      unsubscribe: vi.fn().mockResolvedValue(true),
    }
    registration = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(null),
        subscribe: vi.fn().mockResolvedValue(subscription),
      },
    }
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { ready: Promise.resolve(registration) },
    })
    savePushSubscription.mockResolvedValue({})
    removePushSubscription.mockResolvedValue({})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    Reflect.deleteProperty(navigator, 'serviceWorker')
  })

  it('requests browser permission, subscribes with VAPID, and persists the browser payload', async () => {
    const { result } = renderHook(() => useWebPushSubscription())

    await waitFor(() => expect(registration.pushManager.getSubscription).toHaveBeenCalledOnce())
    await act(async () => {
      await result.current.enable()
    })

    expect(Notification.requestPermission).toHaveBeenCalledOnce()
    expect(registration.pushManager.subscribe).toHaveBeenCalledOnce()
    const options = registration.pushManager.subscribe.mock.calls[0][0]
    expect(options.userVisibleOnly).toBe(true)
    expect(options.applicationServerKey).toBeInstanceOf(Uint8Array)
    expect(savePushSubscription).toHaveBeenCalledWith(serializedSubscription)
    expect(result.current.subscribed).toBe(true)
  })

  it('deletes the backend subscription before unsubscribing this browser', async () => {
    registration.pushManager.getSubscription.mockResolvedValue(subscription)
    const { result } = renderHook(() => useWebPushSubscription())

    await waitFor(() => expect(result.current.subscribed).toBe(true))
    await act(async () => {
      await result.current.disable()
    })

    expect(removePushSubscription).toHaveBeenCalledWith(endpoint)
    expect(subscription.unsubscribe).toHaveBeenCalledOnce()
    expect(result.current.subscribed).toBe(false)
  })

  it('reports missing public-key configuration without requesting permission', async () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '')
    const { result } = renderHook(() => useWebPushSubscription())

    await act(async () => {
      await result.current.enable()
    })

    expect(result.current.error).toBe('Notifikasi push belum dikonfigurasi. Hubungi administrator.')
    expect(Notification.requestPermission).not.toHaveBeenCalled()
    expect(notifyError).toHaveBeenCalledWith(
      'Notifikasi push belum dikonfigurasi. Hubungi administrator.',
    )
  })

  it('shows a success toast after enabling and disabling', async () => {
    const { result } = renderHook(() => useWebPushSubscription())

    await act(async () => {
      await result.current.enable()
    })
    expect(notifySuccess).toHaveBeenLastCalledWith('Notifikasi browser diaktifkan.')

    registration.pushManager.getSubscription.mockResolvedValue(subscription)
    await act(async () => {
      await result.current.disable()
    })
    expect(notifySuccess).toHaveBeenLastCalledWith('Notifikasi browser dinonaktifkan.')
    expect(notifyError).not.toHaveBeenCalled()
  })

  it('shows the blocked-permission message instead of a generic one', async () => {
    vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('denied') })
    const { result } = renderHook(() => useWebPushSubscription())

    await act(async () => {
      await result.current.enable()
    })

    const message = 'Izin notifikasi diblokir di browser. Ubah izin situs untuk mengaktifkannya.'
    expect(result.current.error).toBe(message)
    expect(notifyError).toHaveBeenCalledWith(message)
    expect(registration.pushManager.subscribe).not.toHaveBeenCalled()
  })

  it('stops waiting when the service worker never becomes ready', async () => {
    // Tanpa service worker (mis. `npm run dev`), ready tidak pernah selesai.
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { ready: new Promise(() => {}) },
    })
    vi.useFakeTimers()

    try {
      const { result } = renderHook(() => useWebPushSubscription())

      let enabling!: Promise<boolean>
      act(() => {
        enabling = result.current.enable()
      })
      expect(result.current.loading).toBe(true)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(SERVICE_WORKER_TIMEOUT_MS)
      })

      await expect(enabling).resolves.toBe(false)
      const message = 'Layanan notifikasi browser belum siap. Muat ulang halaman lalu coba lagi.'
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(message)
      expect(notifyError).toHaveBeenCalledWith(message)
      expect(savePushSubscription).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})
