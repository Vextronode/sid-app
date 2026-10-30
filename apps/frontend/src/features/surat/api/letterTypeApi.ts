import api from '@/lib/api'
import { publicVillageParams } from '@/shared/lib/api/publicVillageParams'
import type { CollectionResponse, Id, LetterType, ResourceResponse } from '@/types'

// includeInactive: daftar lengkap (Draft/Nonaktif), khusus Staf SIDUTama.
export const getLetterTypes = async ({ includeInactive = false } = {}) => {
  const params = {
    ...publicVillageParams(),
    ...(includeInactive ? { include_inactive: 1 } : {}),
  }
  const response = await api.get<CollectionResponse<LetterType>>('/api/letter-types', { params })

  return response.data.data
}

export const updateLetterType = (id: Id, payload: Partial<LetterType>) =>
  api.put<ResourceResponse<LetterType>>(`/api/letter-types/${id}`, payload)
