import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { queryKeys } from '@/shared/lib/queryKeys'
import type { User } from '@/types'
import { LETTER_SIGNAL_DEBOUNCE_MS, PUBLIC_ALERT_REFRESH_JITTER_MS } from '../constants'
import { RealtimeBridge } from './RealtimeBridge'

const auth = vi.hoisted(() => ({ user: null as Partial<User> | null }))

type Subscription = {
  scopes: string[]
  channel: { type: string; name: string }
  handlers: Record<string, (payload?: unknown) => void>
  unsubscribe: ReturnType<typeof vi.fn>
}

const realtime = vi.hoisted(() => ({
  subscriptions: [] as Subscription[],
  reconnectListeners: [] as Array<() => void>,
}))

vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ user: auth.user }),
}))

vi.mock('../realtimeClient', () => ({
  subscribeRealtime: (
    scopes: string[],
    channel: Subscription['channel'],
    handlers: Subscription['handlers'],
  ) => {
    const unsubscribe = vi.fn()
    realtime.subscriptions.push({ scopes, channel, handlers, unsubscribe })
    return unsubscribe
  },
  onRealtimeReconnect: (listener: () => void) => {
    realtime.reconnectListeners.push(listener)
    return () => undefined
  },
}))

const citizen: Partial<User> = {
  id: 'user-1',
  role: 'warga',
  is_active: true,
  must_change_password: false,
}

const official: Partial<User> = { ...citizen, id: 'user-9', role: 'kepala_desa' }

const USER_CHANNEL = 'App.Models.User.user-1'

function renderBridge() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue()
  const tree = () => (
    <QueryClientProvider client={client}>
      <RealtimeBridge />
    </QueryClientProvider>
  )
  const view = render(tree())

  return { client, invalidate, rerenderBridge: () => view.rerender(tree()), unmount: view.unmount }
}

// Langganan aktif terakhir untuk channel tertentu.
function subscription(name: string) {
  const found = realtime.subscriptions.filter((item) => item.channel.name === name).at(-1)
  if (!found) throw new Error(`Channel ${name} tidak di-subscribe.`)
  return found
}

function isSubscribed(name: string) {
  return realtime.subscriptions.some(
    (item) => item.channel.name === name && item.unsubscribe.mock.calls.length === 0,
  )
}

describe('RealtimeBridge', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    auth.user = null
    realtime.subscriptions = []
    realtime.reconnectListeners = []
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('always listens to public disaster alerts, also without login', () => {
    renderBridge()

    expect(subscription('disaster-alerts')).toMatchObject({
      scopes: ['disaster-alerts'],
      channel: { type: 'public', name: 'disaster-alerts' },
    })
    expect(realtime.subscriptions).toHaveLength(1)
  })

  it('refreshes the staff lists at once and the public bar after a random delay', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const { invalidate } = renderBridge()

    subscription('disaster-alerts').handlers['.disaster-alerts.changed']({ id: 'a-1' })

    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.disasterAlerts.staffAll })
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: queryKeys.disasterAlerts.public })

    act(() => {
      vi.advanceTimersByTime(PUBLIC_ALERT_REFRESH_JITTER_MS * 0.5)
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.disasterAlerts.public })
  })

  it('subscribes a citizen to their own channel for notifications and letters', () => {
    auth.user = citizen

    renderBridge()

    expect(subscription(USER_CHANNEL)).toMatchObject({
      scopes: ['notifications', 'letters'],
      channel: { type: 'private', name: USER_CHANNEL },
    })
    expect(isSubscribed('letters.staff')).toBe(false)
  })

  it('subscribes officials to the staff letters channel as well', () => {
    auth.user = official

    renderBridge()

    expect(subscription('App.Models.User.user-9').scopes).toEqual(['notifications'])
    expect(subscription('letters.staff')).toMatchObject({
      scopes: ['letters'],
      channel: { type: 'private', name: 'letters.staff' },
    })
  })

  it('refreshes notifications when a new one is announced', () => {
    auth.user = citizen
    const { invalidate } = renderBridge()

    subscription(USER_CHANNEL).handlers['.notification.created']({ type: 'notification' })

    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.notifications.all })
  })

  it('merges letter signals that arrive together into one refresh', () => {
    auth.user = official
    const { invalidate } = renderBridge()
    const onStaffLetter = subscription('letters.staff').handlers['.letter.changed']
    const onOwnLetter = subscription('App.Models.User.user-9').handlers['.letter.changed']

    onStaffLetter({ id: 'l-1' })
    onOwnLetter({ id: 'l-1' })
    onStaffLetter({ id: 'l-2' })
    expect(invalidate).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(LETTER_SIGNAL_DEBOUNCE_MS)
    })

    expect(invalidate).toHaveBeenCalledTimes(2)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.surat.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.letterStats })
  })

  it.each([
    ['inactive account', { ...citizen, is_active: false }],
    ['account that must change its password', { ...citizen, must_change_password: true }],
  ])('only listens to public channels for an %s', (_label, user) => {
    auth.user = user

    renderBridge()

    expect(realtime.subscriptions.map((item) => item.channel.name)).toEqual(['disaster-alerts'])
  })

  it('leaves private channels on logout but keeps public alerts', () => {
    auth.user = official
    const { rerenderBridge } = renderBridge()

    auth.user = null
    rerenderBridge()

    expect(isSubscribed('App.Models.User.user-9')).toBe(false)
    expect(isSubscribed('letters.staff')).toBe(false)
    expect(isSubscribed('disaster-alerts')).toBe(true)
  })

  it('switches channels when another account signs in', () => {
    auth.user = official
    const { rerenderBridge } = renderBridge()

    auth.user = citizen
    rerenderBridge()

    expect(isSubscribed('App.Models.User.user-9')).toBe(false)
    expect(isSubscribed('letters.staff')).toBe(false)
    expect(subscription(USER_CHANNEL).scopes).toEqual(['notifications', 'letters'])
  })

  it('cancels pending refreshes when unmounted', () => {
    auth.user = citizen
    const { invalidate, unmount } = renderBridge()

    subscription(USER_CHANNEL).handlers['.letter.changed']({ id: 'l-1' })
    subscription('disaster-alerts').handlers['.disaster-alerts.changed']({ id: 'a-1' })
    invalidate.mockClear()
    unmount()

    act(() => {
      vi.advanceTimersByTime(PUBLIC_ALERT_REFRESH_JITTER_MS)
    })
    expect(invalidate).not.toHaveBeenCalled()
  })

  it('refetches only realtime queries after reconnecting', () => {
    const { client, invalidate } = renderBridge()
    const cache = client.getQueryCache()
    cache.build(client, { queryKey: ['notifications', 'list'], meta: { realtime: true } })
    cache.build(client, { queryKey: ['cms', 'news'] })
    const live = cache.find({ queryKey: ['notifications', 'list'] })
    const other = cache.find({ queryKey: ['cms', 'news'] })

    realtime.reconnectListeners.forEach((listener) => listener())

    const predicate = invalidate.mock.calls[0]?.[0]?.predicate
    expect(live && predicate?.(live)).toBe(true)
    expect(other && predicate?.(other)).toBe(false)
  })
})
