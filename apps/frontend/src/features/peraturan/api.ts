import api from '@/lib/api'
import { publicVillageParams } from '@/shared/lib/api/publicVillageParams'
import type { Id } from '@/types'

// Objek isian, atau FormData bila ada berkas peraturan.
type Payload = Record<string, unknown> | FormData

export function getRegulations() {
  return api.get('/api/regulations')
}

export function createRegulation(payload: Payload) {
  return api.post('/api/regulations', payload)
}

export function updateRegulation(id: Id, payload: Payload) {
  return api.patch(`/api/regulations/${id}`, payload)
}

export function deleteRegulation(id: Id) {
  return api.delete(`/api/regulations/${id}`)
}

export function getPublicRegulations() {
  return api.get('/api/public/regulations', { params: publicVillageParams() })
}
