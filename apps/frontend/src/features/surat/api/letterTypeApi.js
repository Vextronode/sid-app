import api from '@/lib/api'
import { publicVillageParams } from '@/shared/lib/api/publicVillageParams'

export const getLetterTypes = async () => {
  const response = await api.get('/api/letter-types', { params: publicVillageParams() })

  return response.data.data
}

export const updateLetterType = (id, payload) => api.put(`/api/letter-types/${id}`, payload)
