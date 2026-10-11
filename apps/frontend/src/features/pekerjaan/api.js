import api from '@/lib/api'

export function getOccupations({ includeInactive = false } = {}) {
  return api.get('/api/occupations', {
    params: includeInactive ? { include_inactive: 1 } : {},
  })
}

export function createOccupation(payload) {
  return api.post('/api/occupations', payload)
}

export function updateOccupation(id, payload) {
  return api.patch(`/api/occupations/${id}`, payload)
}

export function deleteOccupation(id) {
  return api.delete(`/api/occupations/${id}`)
}
