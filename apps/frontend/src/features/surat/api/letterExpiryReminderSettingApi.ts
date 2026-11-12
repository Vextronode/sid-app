import api from '@/lib/api'
import type { CollectionResponse, Id, ResourceResponse } from '@/types'

// Titik pengingat masa berlaku surat (H-30 s.d. H-1), khusus Staf SIDUTama.
export type LetterExpiryReminderSetting = {
  id: number
  days_before: number
  is_active: boolean
  activated_at: string | null
}

export const getLetterExpiryReminderSettings = async () => {
  const response = await api.get<CollectionResponse<LetterExpiryReminderSetting>>(
    '/api/letter-expiry-reminder-settings',
  )

  return response.data.data
}

export const updateLetterExpiryReminderSetting = async (id: Id, isActive: boolean) => {
  const response = await api.patch<ResourceResponse<LetterExpiryReminderSetting>>(
    `/api/letter-expiry-reminder-settings/${id}`,
    { is_active: isActive },
  )

  return response.data.data
}
