import api from '@/lib/api'
import type { ResourceResponse } from '@/types'

// Konfigurasi Laravel Echo dari backend (GET /api/realtime/config).
// host/port/scheme null = ikut origin halaman (stack Docker satu origin).
export type RealtimeConfig = {
  enabled: boolean
  key: string | null
  host: string | null
  port: number | null
  scheme: 'http' | 'https' | null
}

export type ChannelAuthorization = {
  auth: string
  channel_data?: string
}

export async function getRealtimeConfig(): Promise<RealtimeConfig> {
  const response = await api.get<ResourceResponse<RealtimeConfig>>('/api/realtime/config')

  return response.data.data
}

// Otorisasi channel private memakai instance axios bersama (cookie sesi
// Sanctum + header XSRF), bukan pengirim bawaan pusher-js.
export async function authorizeChannel(
  socketId: string,
  channelName: string,
): Promise<ChannelAuthorization> {
  const response = await api.post<ChannelAuthorization>('/api/broadcasting/auth', {
    socket_id: socketId,
    channel_name: channelName,
  })

  return response.data
}
