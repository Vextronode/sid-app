import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { REALTIME_SAFETY_INTERVAL } from '../constants'
import { useLiveRefetchInterval } from './useLiveRefetchInterval'

const status = vi.hoisted(() => ({
  live: false,
  listeners: new Set<() => void>(),
}))

vi.mock('../realtimeClient', () => ({
  isRealtimeLive: () => status.live,
  subscribeRealtimeStatus: (listener: () => void) => {
    status.listeners.add(listener)
    return () => status.listeners.delete(listener)
  },
}))

function setLive(live: boolean) {
  act(() => {
    status.live = live
    status.listeners.forEach((listener) => listener())
  })
}

describe('useLiveRefetchInterval', () => {
  beforeEach(() => {
    status.live = false
    status.listeners.clear()
  })

  it('keeps the polling interval while realtime is not live', () => {
    const { result } = renderHook(() => useLiveRefetchInterval('notifications', 30_000))

    expect(result.current).toBe(30_000)
  })

  it('switches to the safety interval while realtime is live', () => {
    const { result } = renderHook(() => useLiveRefetchInterval('notifications', 30_000))

    setLive(true)
    expect(result.current).toBe(REALTIME_SAFETY_INTERVAL)

    setLive(false)
    expect(result.current).toBe(30_000)
  })

  it('never polls more often than the original interval', () => {
    status.live = true
    const slow = REALTIME_SAFETY_INTERVAL * 2

    const { result } = renderHook(() => useLiveRefetchInterval('notifications', slow))

    expect(result.current).toBe(slow)
  })
})
