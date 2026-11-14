import api from '@/lib/api'
import type { CollectionResponse, Id, ResourceResponse } from '@/types'

// Titik pengingat masa berlaku surat (H-30 s.d. H-1), khusus Staf SIDUTama.
export type LetterExpiryReminderSetting = {
  id: number
  days_before: number
  is_active: boolean
  activated_at: string | null
}

// Isi kartu pengaturan: titik pengingat, jam kirim (HH:mm), dan pilihan jam
// yang boleh dipilih. Rentang jam ditentukan backend.
export type LetterExpiryReminderSettings = {
  points: LetterExpiryReminderSetting[]
  sendAt: string
  sendAtOptions: string[]
}

type SettingsResponse = CollectionResponse<LetterExpiryReminderSetting> & {
  meta: { send_at: string; send_at_options: string[] }
}

export const getLetterExpiryReminderSettings = async (): Promise<LetterExpiryReminderSettings> => {
  const response = await api.get<SettingsResponse>('/api/letter-expiry-reminder-settings')

  return {
    points: response.data.data,
    sendAt: response.data.meta.send_at,
    sendAtOptions: response.data.meta.send_at_options,
  }
}

export const updateLetterExpiryReminderSetting = async (id: Id, isActive: boolean) => {
  const response = await api.patch<ResourceResponse<LetterExpiryReminderSetting>>(
    `/api/letter-expiry-reminder-settings/${id}`,
    { is_active: isActive },
  )

  return response.data.data
}

// Mengembalikan jam kirim tersimpan (HH:mm).
export const updateLetterExpiryReminderSendTime = async (sendAt: string) => {
  const response = await api.patch<ResourceResponse<{ send_at: string }>>(
    '/api/letter-expiry-reminder-settings/send-at',
    { send_at: sendAt },
  )

  return response.data.data.send_at
}
