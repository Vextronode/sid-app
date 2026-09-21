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
