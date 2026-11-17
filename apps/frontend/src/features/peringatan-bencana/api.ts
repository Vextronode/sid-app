import api from '@/lib/api'
import { publicVillageParams } from '@/shared/lib/api/publicVillageParams'
import type { IsoDateString, Uuid } from '@/types'

// Peringatan bencana dari SIGAP. Sumber: PublicDisasterAlertResource (bar
// publik) dan DisasterAlertResource (tab Peringatan SIGAP, Staf SIDUTama).

export type DisasterAlertLevel = 'info' | 'waspada' | 'siaga' | 'awas'
export type DisasterAlertStatus = 'active' | 'dismissed' | 'ended' | 'expired'

export type PublicDisasterAlert = {
  id: Uuid
  type: string
  type_label: string
  level: DisasterAlertLevel
  level_label: string
  title: string
  message: string | null
  magnitude: number | null
  depth_km: number | null
  location: string | null
  link_url: string | null
  occurred_at: IsoDateString
  expires_at: IsoDateString
}

export type DisasterAlert = PublicDisasterAlert & {
  external_id: string
  status: DisasterAlertStatus
  // Nama client integrasi pengirim, mis. "SIGAP".
  source?: string | null
  sent_at: IsoDateString
  received_at: IsoDateString
  dismissed_at: IsoDateString | null
  dismissed_by?: { id: Uuid; name: string } | null
  dismiss_reason: string | null
}

// `displayed`: sedang tampil di beranda; `dismissed`: diturunkan staf dan
// masih bisa ditampilkan lagi.
export type DisasterAlertList = 'displayed' | 'dismissed'

type AlertActionResponse = { data: DisasterAlert; message: string }

// Halaman publik (tanpa login), dipanggil berkala.
export async function getPublicDisasterAlerts() {
  const response = await api.get<{ data: PublicDisasterAlert[] }>('/api/public/disaster-alerts', {
    params: publicVillageParams(),
  })

  return response.data?.data ?? []
}

export async function getDisasterAlerts(status: DisasterAlertList) {
  const response = await api.get<{ data: DisasterAlert[] }>('/api/disaster-alerts', {
    params: { status },
  })

  return response.data.data
}

export async function dismissDisasterAlert(id: Uuid, reason: string) {
  const response = await api.post<AlertActionResponse>(`/api/disaster-alerts/${id}/dismiss`, {
    reason,
  })

  return response.data
}

export async function restoreDisasterAlert(id: Uuid) {
  const response = await api.post<AlertActionResponse>(`/api/disaster-alerts/${id}/restore`)

  return response.data
}
