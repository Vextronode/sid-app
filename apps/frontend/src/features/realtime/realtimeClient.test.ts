import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RealtimeConfig } from './api'

// Echo palsu: mencatat opsi, channel yang di-subscribe/ditinggalkan, dan
// memungkinkan test memicu perubahan status koneksi.
const fakes = vi.hoisted(() => {
  type Handler = (...args: unknown[]) => void

  class FakeChannel {
    listeners = new Map<string, Handler>()
    onSubscribed: Handler | null = null
    onError: Handler | null = null

    subscribed(callback: Handler) {
      this.onSubscribed = callback
      return this
    }

    error(callback: Handler) {
      this.onError = callback
      return this
    }

    listen(event: string, callback: Handler) {
      this.listeners.set(event, callback)
      return this
    }
  }

  class FakeEcho {
    static instances: FakeEcho[] = []

    options: Record<string, unknown>
    status = 'connecting'
    channels = new Map<string, FakeChannel>()
    left: string[] = []
    private statusListener: ((status: string) => void) | null = null

    connector = {
      onConnectionChange: (callback: (status: string) => void) => {
        this.statusListener = callback
        return () => undefined
      },
    }

    constructor(options: Record<string, unknown>) {
      this.options = options
      FakeEcho.instances.push(this)
    }

    connectionStatus() {
      return this.status
    }

    privateChannels: string[] = []
    publicChannels: string[] = []

    private(name: string) {
      this.privateChannels.push(name)
      return this.track(name)
    }

    channel(name: string) {
      this.publicChannels.push(name)
      return this.track(name)
    }

    track(name: string) {
      const channel = new FakeChannel()
      this.channels.set(name, channel)
      return channel
    }

    leave(name: string) {
      this.left.push(name)
      this.channels.delete(name)
    }

    setStatus(status: string) {
      this.status = status
      this.statusListener?.(status)
    }
  }

  return { FakeEcho }
})

vi.mock('laravel-echo', () => ({ default: fakes.FakeEcho }))
vi.mock('pusher-js', () => ({ default: class FakePusher {} }))
vi.mock('./api', () => ({
  getRealtimeConfig: vi.fn(),
  authorizeChannel: vi.fn(),
}))

const USER_CHANNEL = 'App.Models.User.user-1'

const enabledConfig: RealtimeConfig = {
  enabled: true,
  key: 'public-key',
  host: '127.0.0.1',
  port: 8080,
  scheme: 'http',
}

// Modul menyimpan status di level modul; tiap test memakai salinan baru.
async function loadClient(config: RealtimeConfig | Error = enabledConfig) {
  vi.resetModules()
  const api = await import('./api')
  const client = await import('./realtimeClient')

  if (config instanceof Error) {
    vi.mocked(api.getRealtimeConfig).mockRejectedValue(config)
  } else {
    vi.mocked(api.getRealtimeConfig).mockResolvedValue(config)
  }

  return { api, client }
}

async function settle() {
  await vi.dynamicImportSettled()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

function latestEcho() {
  const echo = fakes.FakeEcho.instances.at(-1)
  if (!echo) throw new Error('Echo belum dibuat.')
  return echo
}

function userChannel() {
  const channel = latestEcho().channels.get(USER_CHANNEL)
  if (!channel) throw new Error('Channel user belum di-subscribe.')
  return channel
}

describe('realtimeClient', () => {
  beforeEach(() => {
    fakes.FakeEcho.instances = []
  })

  it('never loads Echo when realtime is disabled by the backend', async () => {
    const { client } = await loadClient({ ...enabledConfig, enabled: false })

    client.subscribeRealtime(['notifications'], { type: 'private', name: USER_CHANNEL }, {})
    await settle()

    expect(fakes.FakeEcho.instances).toHaveLength(0)
    expect(client.isRealtimeLive('notifications')).toBe(false)
  })

  it('builds Echo for Reverb from the runtime config', async () => {
    const { client } = await loadClient()

    client.subscribeRealtime(['notifications'], { type: 'private', name: USER_CHANNEL }, {})
    await settle()

    expect(latestEcho().options).toMatchObject({
      broadcaster: 'reverb',
      key: 'public-key',
      wsHost: '127.0.0.1',
      wsPort: 8080,
      wssPort: 8080,
      forceTLS: false,
      enabledTransports: ['ws', 'wss'],
      withoutInterceptors: true,
    })
  })

  it('follows the page origin when the config has no address', async () => {
    const { client } = await loadClient({ ...enabledConfig, host: null, port: null, scheme: null })

    client.subscribeRealtime(['notifications'], { type: 'private', name: USER_CHANNEL }, {})
    await settle()

    const secure = window.location.protocol === 'https:'
    expect(latestEcho().options).toMatchObject({
      wsHost: window.location.hostname,
      wsPort: Number(window.location.port) || (secure ? 443 : 80),
      forceTLS: secure,
    })
  })

  it('is live only while connected and subscribed', async () => {
    const { client } = await loadClient()

    client.subscribeRealtime(['notifications'], { type: 'private', name: USER_CHANNEL }, {})
    await settle()
    expect(client.isRealtimeLive('notifications')).toBe(false)

    latestEcho().setStatus('connected')
    expect(client.isRealtimeLive('notifications')).toBe(false)

    userChannel().onSubscribed?.()
    expect(client.isRealtimeLive('notifications')).toBe(true)

    latestEcho().setStatus('reconnecting')
    expect(client.isRealtimeLive('notifications')).toBe(false)
  })

  it('marks every scope supplied by one channel, and only those', async () => {
    const { client } = await loadClient()

    const unsubscribe = client.subscribeRealtime(
      ['notifications', 'letters'],
      { type: 'private', name: USER_CHANNEL },
      {},
    )
    await settle()
    latestEcho().setStatus('connected')
    userChannel().onSubscribed?.()

    expect(client.isRealtimeLive('notifications')).toBe(true)
    expect(client.isRealtimeLive('letters')).toBe(true)
    expect(client.isRealtimeLive('disaster-alerts')).toBe(false)

    unsubscribe()
    expect(client.isRealtimeLive('notifications')).toBe(false)
    expect(client.isRealtimeLive('letters')).toBe(false)
  })

  it('subscribes public channels without a private prefix', async () => {
    const { client } = await loadClient()

    client.subscribeRealtime(['disaster-alerts'], { type: 'public', name: 'disaster-alerts' }, {})
    await settle()

    expect(latestEcho().publicChannels).toEqual(['disaster-alerts'])
    expect(latestEcho().privateChannels).toEqual([])
  })

  it('keeps polling when the channel subscription is rejected', async () => {
    const { client } = await loadClient()

    client.subscribeRealtime(['notifications'], { type: 'private', name: USER_CHANNEL }, {})
    await settle()
    latestEcho().setStatus('connected')
    userChannel().onSubscribed?.()
    userChannel().onError?.({ status: 403 })

    expect(client.isRealtimeLive('notifications')).toBe(false)
  })

  it('forwards channel events to the handlers', async () => {
    const { client } = await loadClient()
    const onCreated = vi.fn()

    client.subscribeRealtime(
      ['notifications'],
      { type: 'private', name: USER_CHANNEL },
      { '.notification.created': onCreated },
    )
    await settle()
    userChannel().listeners.get('.notification.created')?.({ type: 'notification', id: 'n-1' })

    expect(onCreated).toHaveBeenCalledWith({ type: 'notification', id: 'n-1' })
  })

  it('leaves the channel and stops being live when unsubscribed', async () => {
    const { client } = await loadClient()

    const unsubscribe = client.subscribeRealtime(
      ['notifications'],
      { type: 'private', name: USER_CHANNEL },
      {},
    )
    await settle()
    latestEcho().setStatus('connected')
    userChannel().onSubscribed?.()

    unsubscribe()

    expect(latestEcho().left).toEqual([USER_CHANNEL])
    expect(client.isRealtimeLive('notifications')).toBe(false)
  })

  it('does not subscribe when unsubscribed before Echo is ready', async () => {
    const { client } = await loadClient()

    const unsubscribe = client.subscribeRealtime(
      ['notifications'],
      { type: 'private', name: USER_CHANNEL },
      {},
    )
    unsubscribe()
    await settle()

    expect(latestEcho().channels.size).toBe(0)
  })

  it('reuses one Echo connection for every subscription', async () => {
    const { client } = await loadClient()

    client.subscribeRealtime(['notifications'], { type: 'private', name: USER_CHANNEL }, {})
    client.subscribeRealtime(
      ['notifications'],
      { type: 'private', name: 'App.Models.User.user-2' },
      {},
    )
    await settle()

    expect(fakes.FakeEcho.instances).toHaveLength(1)
  })

  it('notifies reconnect listeners only after the connection comes back', async () => {
    const { client } = await loadClient()
    const onReconnect = vi.fn()
    client.onRealtimeReconnect(onReconnect)

    client.subscribeRealtime(['notifications'], { type: 'private', name: USER_CHANNEL }, {})
    await settle()
    latestEcho().setStatus('connected')
    expect(onReconnect).not.toHaveBeenCalled()

    latestEcho().setStatus('reconnecting')
    latestEcho().setStatus('connected')
    expect(onReconnect).toHaveBeenCalledOnce()
  })

  it('notifies status subscribers when liveness changes', async () => {
    const { client } = await loadClient()
    const onStatus = vi.fn()
    client.subscribeRealtimeStatus(onStatus)

    client.subscribeRealtime(['notifications'], { type: 'private', name: USER_CHANNEL }, {})
    await settle()
    onStatus.mockClear()
    latestEcho().setStatus('connected')
    userChannel().onSubscribed?.()

    expect(onStatus).toHaveBeenCalledTimes(2)
  })

  it('authorizes private channels through the shared API client', async () => {
    const { api, client } = await loadClient()
    vi.mocked(api.authorizeChannel).mockResolvedValueOnce({ auth: 'public-key:signature' })

    client.subscribeRealtime(['notifications'], { type: 'private', name: USER_CHANNEL }, {})
    await settle()

    const { customHandler } = latestEcho().options.channelAuthorization as {
      customHandler: (
        params: { socketId: string; channelName: string },
        callback: (error: Error | null, data: unknown) => void,
      ) => void
    }
    const callback = vi.fn()
    customHandler({ socketId: '1234.5678', channelName: `private-${USER_CHANNEL}` }, callback)
    await settle()

    expect(api.authorizeChannel).toHaveBeenCalledWith('1234.5678', `private-${USER_CHANNEL}`)
    expect(callback).toHaveBeenCalledWith(null, { auth: 'public-key:signature' })
  })

  it('reports authorization failures to pusher-js', async () => {
    const { api, client } = await loadClient()
    const failure = new Error('403')
    vi.mocked(api.authorizeChannel).mockRejectedValueOnce(failure)

    client.subscribeRealtime(['notifications'], { type: 'private', name: USER_CHANNEL }, {})
    await settle()

    const { customHandler } = latestEcho().options.channelAuthorization as {
      customHandler: (
        params: { socketId: string; channelName: string },
        callback: (error: Error | null, data: unknown) => void,
      ) => void
    }
    const callback = vi.fn()
    customHandler({ socketId: '1234.5678', channelName: `private-${USER_CHANNEL}` }, callback)
    await settle()

    expect(callback).toHaveBeenCalledWith(failure, null)
  })

  it('retries loading the config after a network failure', async () => {
    const { api, client } = await loadClient(new Error('Network Error'))

    client.subscribeRealtime(['notifications'], { type: 'private', name: USER_CHANNEL }, {})
    await settle()
    expect(fakes.FakeEcho.instances).toHaveLength(0)

    vi.mocked(api.getRealtimeConfig).mockResolvedValue(enabledConfig)
    client.subscribeRealtime(['notifications'], { type: 'private', name: USER_CHANNEL }, {})
    await settle()

    expect(fakes.FakeEcho.instances).toHaveLength(1)
  })
})
