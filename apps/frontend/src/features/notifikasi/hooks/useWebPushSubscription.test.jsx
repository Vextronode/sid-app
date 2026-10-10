import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { savePushSubscription, removePushSubscription } = vi.hoisted(() => ({
  savePushSubscription: vi.fn(),
  removePushSubscription: vi.fn(),
}))

vi.mock('../api', () => ({ savePushSubscription, removePushSubscription }))

import useWebPushSubscription from './useWebPushSubscription'

const endpoint = 'https://push.example/subscription'
const serializedSubscription = {
  endpoint,
  keys: { p256dh: 'public-key', auth: 'auth-token' },
}

describe('useWebPushSubscription', () => {
  let registration
  let subscription

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
    delete navigator.serviceWorker
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
  })
})
