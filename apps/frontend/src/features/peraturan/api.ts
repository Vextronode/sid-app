import api from '@/lib/api'
import { publicVillageParams } from '@/shared/lib/api/publicVillageParams'

export function getRegulations() {
  return api.get('/api/regulations')
}

export function createRegulation(payload) {
  return api.post('/api/regulations', payload)
}

export function updateRegulation(id, payload) {
  return api.patch(`/api/regulations/${id}`, payload)
}

export function deleteRegulation(id) {
  return api.delete(`/api/regulations/${id}`)
}

export function getPublicRegulations() {
  return api.get('/api/public/regulations', { params: publicVillageParams() })
}
