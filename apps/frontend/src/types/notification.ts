// Notifikasi dalam aplikasi. Sumber: NotificationResource.
import type { IsoDateString } from './api'

export type AppNotification = {
  id: string | null
  type: string | null
  title: string | null
  message: string | null
  category: string
  icon: string
  color: string
  read: boolean
  created_at: IsoDateString | null
  // Waktu relatif yang sudah diformat backend (mis. "5 menit lalu").
  time: string | null
  // Data tujuan klik (mis. letter_id); isinya bergantung pada jenis notifikasi.
  context: Record<string, unknown>
}
