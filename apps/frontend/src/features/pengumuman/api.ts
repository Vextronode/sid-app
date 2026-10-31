import api from '@/lib/api'
import type { PublicAnnouncement } from '@/features/info-desa/usePublicVillageInfo'
import type { ResourceResponse } from '@/types'

export type DurationUnit = 'hour' | 'day' | 'week'

export type AnnouncementPayload = {
  title: string
  body: string | null
  link_url: string | null
  duration_value?: number
  duration_unit?: DurationUnit
}

// Pengumuman beranda: satu per desa, khusus Staf SIDUTama.
export function getAnnouncement() {
  return api.get<ResourceResponse<PublicAnnouncement | null>>('/api/announcement')
}

// Menyimpan menggantikan pengumuman yang ada. Durasi (duration_value +
// duration_unit: hour|day|week) wajib saat membuat; saat mengubah boleh
// dikosongkan untuk mempertahankan waktu berakhir.
export function saveAnnouncement(payload: AnnouncementPayload) {
  return api.put<ResourceResponse<PublicAnnouncement>>('/api/announcement', payload)
}

export function deleteAnnouncement() {
  return api.delete('/api/announcement')
}
