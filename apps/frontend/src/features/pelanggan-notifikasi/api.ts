import api from '@/lib/api'
import type { IsoDateString, PageMeta } from '@/types'

// Status kesehatan langganan (lihat App\Models\PushSubscription di backend).
export type PushDeviceStatus = 'aktif' | 'perlu_dicek' | 'belum_teruji'

// Layanan push dari host endpoint; endpoint sendiri tidak pernah dikirim.
export type PushService = 'fcm' | 'mozilla' | 'apple' | 'windows' | 'lainnya'

export type PushDevice = {
  id: number
  device_label: string | null
  push_service: PushService
  status: PushDeviceStatus
  subscribed_at: IsoDateString | null
  updated_at: IsoDateString | null
  last_success_at: IsoDateString | null
  last_failed_at: IsoDateString | null
}

// WebPushSubscriberResource: satu akun desa yang mengaktifkan Web Push.
export type WebPushSubscriber = {
  id: string
  name: string
  username: string
  role: string
  role_label: string
  is_active: boolean
  nik_masked: string | null
  wilayah: { hamlet: string | null; rw: string | null; rt: string | null } | null
  device_count: number
  status: PushDeviceStatus
  first_subscribed_at: IsoDateString | null
  last_success_at: IsoDateString | null
  devices: PushDevice[]
}

// Ringkasan satu desa, tidak terpengaruh filter tabel.
export type WebPushSummary = {
  subscribed_accounts: number
  devices: number
  active_accounts: number
  devices_by_status: Record<PushDeviceStatus, number>
}

export type WebPushSubscriberResponse = {
  message?: string
  data: WebPushSubscriber[]
  meta: PageMeta & { active_days: number; summary: WebPushSummary }
}

export type WebPushSubscriberParams = {
  search?: string
  role?: string
  hamlet_id?: string
  rw_id?: string
  rt_id?: string
  push_service?: PushService | ''
  status?: PushDeviceStatus | ''
  page?: number
  per_page?: number
}

// Hanya parameter yang terisi yang dikirim ke server.
function compact(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  )
}

// Daftar akun pelanggan Web Push satu desa - khusus Staf SIDUTama.
export async function getWebPushSubscribers(params: WebPushSubscriberParams = {}) {
  const response = await api.get<WebPushSubscriberResponse>('/api/web-push-subscribers', {
    params: compact(params),
  })

  return response.data
}
