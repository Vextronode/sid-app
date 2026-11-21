// ==========================================
// realtimeClient.ts
// Satu koneksi Laravel Echo (Reverb) untuk seluruh aplikasi, beserta status
// "realtime hidup" per cakupan langganan.
//
// - Echo baru dibuat saat ada langganan pertama, dan hanya bila backend
//   mengaktifkannya (GET /api/realtime/config). Paket Echo + pusher-js
//   dimuat terpisah sehingga pengunjung tanpa realtime tidak mengunduhnya.
// - "Hidup" = WebSocket tersambung DAN channel cakupan itu berhasil
//   di-subscribe. Selain itu query tetap polling (lihat useLiveRefetchInterval).
// - Event hanya sinyal; data diambil ulang lewat REST oleh React Query.
// Rencana: docs/task/feature/realtime-reverb.md
// ==========================================

import type Echo from 'laravel-echo'
import type { ConnectionStatus } from 'laravel-echo'

import { authorizeChannel, getRealtimeConfig } from './api'
import type { ChannelAuthorization, RealtimeConfig } from './api'

// Cakupan = kelompok data yang diperbarui lewat realtime. Satu channel bisa
// memasok beberapa cakupan (channel akun warga: notifikasi + suratnya),
// tetapi tiap cakupan dipasok satu channel saja untuk satu akun, dan semua
// langganan dipasang oleh RealtimeBridge.
export type RealtimeScope = 'notifications' | 'letters' | 'disaster-alerts'

export type RealtimeChannel = {
  type: 'private' | 'public'
  name: string
}

export type RealtimeHandlers = Record<string, (payload: unknown) => void>

type ConnectionState = 'off' | 'connecting' | 'connected' | 'disconnected'

type ReverbEcho = Echo<'reverb'>

type AuthorizationCallback = (error: Error | null, data: ChannelAuthorization | null) => void

let connection: ConnectionState = 'off'
let hasConnected = false
let echoPromise: Promise<ReverbEcho | null> | null = null
const liveScopes = new Set<RealtimeScope>()
const statusListeners = new Set<() => void>()
const reconnectListeners = new Set<() => void>()

function notifyStatus() {
  statusListeners.forEach((listener) => listener())
}

function toConnectionState(status: ConnectionStatus): ConnectionState {
  switch (status) {
    case 'connected':
      return 'connected'
    case 'connecting':
    case 'reconnecting':
      return 'connecting'
    default:
      return 'disconnected'
  }
}

function setConnection(next: ConnectionState) {
  if (next === connection) return

  connection = next

  if (next === 'connected') {
    // Tersambung kembali setelah putus: event selama putus tidak dikirim
    // ulang oleh Reverb, jadi data realtime perlu diambil ulang.
    if (hasConnected) reconnectListeners.forEach((listener) => listener())
    hasConnected = true
  }

  notifyStatus()
}

function setScopesLive(scopes: readonly RealtimeScope[], live: boolean) {
  const changed = scopes.filter((scope) => liveScopes.has(scope) !== live)

  if (changed.length === 0) return

  changed.forEach((scope) => (live ? liveScopes.add(scope) : liveScopes.delete(scope)))
  notifyStatus()
}

function resolvePort(config: RealtimeConfig, secure: boolean): number {
  if (config.port) return config.port
  if (window.location.port) return Number(window.location.port)

  return secure ? 443 : 80
}

async function createEcho(): Promise<ReverbEcho | null> {
  const config = await getRealtimeConfig()

  if (!config.enabled || !config.key) return null

  const [{ default: EchoClient }, { default: Pusher }] = await Promise.all([
    import('laravel-echo'),
    import('pusher-js'),
  ])

  const secure = (config.scheme ?? window.location.protocol.replace(':', '')) === 'https'
  const port = resolvePort(config, secure)

  const echo = new EchoClient<'reverb'>({
    broadcaster: 'reverb',
    key: config.key,
    wsHost: config.host ?? window.location.hostname,
    wsPort: port,
    wssPort: port,
    forceTLS: secure,
    enabledTransports: ['ws', 'wss'],
    Pusher,
    // Tanpa interceptor axios global (header X-Socket-ID tidak dipakai).
    withoutInterceptors: true,
    channelAuthorization: {
      customHandler: (
        { socketId, channelName }: { socketId: string; channelName: string },
        callback: AuthorizationCallback,
      ) => {
        authorizeChannel(socketId, channelName)
          .then((data) => callback(null, data))
          .catch((error: unknown) =>
            callback(error instanceof Error ? error : new Error('Otorisasi channel gagal.'), null),
          )
      },
    },
  })

  setConnection(toConnectionState(echo.connectionStatus()))
  echo.connector.onConnectionChange((status) => setConnection(toConnectionState(status)))

  return echo
}

function getEcho(): Promise<ReverbEcho | null> {
  echoPromise ??= createEcho().catch(() => {
    // Gagal memuat konfigurasi (mis. jaringan putus): aplikasi tetap
    // polling, dan langganan berikutnya mencoba lagi.
    echoPromise = null
    return null
  })

  return echoPromise
}

/**
 * Berlangganan satu channel yang memasok cakupan `scopes`. Mengembalikan
 * fungsi untuk keluar dari channel (dipanggil saat logout atau akun
 * berganti). Aman dipanggil sebelum Echo siap: bila keluar lebih dulu,
 * channel tidak pernah di-subscribe.
 */
export function subscribeRealtime(
  scopes: readonly RealtimeScope[],
  channel: RealtimeChannel,
  handlers: RealtimeHandlers,
): () => void {
  let active = true
  let leave: (() => void) | null = null

  void getEcho().then((echo) => {
    if (!echo || !active) return

    const subscription =
      channel.type === 'private' ? echo.private(channel.name) : echo.channel(channel.name)

    subscription.subscribed(() => setScopesLive(scopes, true))
    subscription.error(() => setScopesLive(scopes, false))
    Object.entries(handlers).forEach(([event, handler]) => subscription.listen(event, handler))

    leave = () => {
      echo.leave(channel.name)
      setScopesLive(scopes, false)
    }
  })

  return () => {
    active = false
    leave?.()
  }
}

export function isRealtimeLive(scope: RealtimeScope): boolean {
  return connection === 'connected' && liveScopes.has(scope)
}

export function subscribeRealtimeStatus(listener: () => void): () => void {
  statusListeners.add(listener)

  return () => {
    statusListeners.delete(listener)
  }
}

// Dipanggil setiap kali WebSocket tersambung kembali setelah putus.
export function onRealtimeReconnect(listener: () => void): () => void {
  reconnectListeners.add(listener)

  return () => {
    reconnectListeners.delete(listener)
  }
}
