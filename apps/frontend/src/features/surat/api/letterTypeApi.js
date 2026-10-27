import api from '@/lib/api'
import { publicVillageParams } from '@/shared/lib/api/publicVillageParams'

// includeInactive: daftar lengkap (Draft/Nonaktif), khusus Staf SIDUTama.
export const getLetterTypes = async ({ includeInactive = false } = {}) => {
  const params = {
    ...publicVillageParams(),
    ...(includeInactive ? { include_inactive: 1 } : {}),
  }
  const response = await api.get('/api/letter-types', { params })

  return response.data.data
}

export const updateLetterType = (id, payload) => api.put(`/api/letter-types/${id}`, payload)
