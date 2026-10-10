import api from '@/lib/api'

export function getProfilDesa() {
  return api.get('/api/villages/profile')
}

export function updateProfilDesa(payload) {
  return api.patch('/api/villages/profile', payload)
}

export function getPerangkatDesa() {
  return api.get('/api/officials')
}

export function updatePerangkatDesa(id, payload) {
  return api.patch(`/api/officials/${id}`, payload)
}

export function createPerangkatDesa(payload) {
  return api.post('/api/officials', payload)
}

export function deletePerangkatDesa(id) {
  return api.delete(`/api/officials/${id}`)
}

export function promotePerangkatDesa(payload) {
  return api.post('/api/officials/promote', payload)
}

export function demotePerangkatDesa(id, payload = {}) {
  return api.post(`/api/officials/${id}/demote`, payload)
}

export function rotatePerangkatDesa(id, payload) {
  return api.post(`/api/officials/${id}/rotate`, payload)
}
