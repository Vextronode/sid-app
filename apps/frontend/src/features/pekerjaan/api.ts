import api from '@/lib/api'
import type { Id } from '@/types'

type Payload = Record<string, unknown>

export function getOccupations({ includeInactive = false } = {}) {
  return api.get('/api/occupations', {
    params: includeInactive ? { include_inactive: 1 } : {},
  })
}

export function createOccupation(payload: Payload) {
  return api.post('/api/occupations', payload)
}

export function updateOccupation(id: Id, payload: Payload) {
  return api.patch(`/api/occupations/${id}`, payload)
}

export function deleteOccupation(id: Id) {
  return api.delete(`/api/occupations/${id}`)
}
