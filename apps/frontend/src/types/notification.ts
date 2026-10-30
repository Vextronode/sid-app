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
  // Data tujuan klik; field yang terisi bergantung pada jenis notifikasi.
  context: NotificationContext
}

export type NotificationContext = {
  // Angka dari API; string bila dibaca dari URL (klik Web Push).
  letter_id?: number | string
  letter_no?: string | null
  applicant?: string | null
  // Status surat/tanda tangan yang memicu notifikasi (mis. 'approved').
  status?: string
  // Penerima adalah pemohon surat itu sendiri.
  is_applicant?: boolean
}
