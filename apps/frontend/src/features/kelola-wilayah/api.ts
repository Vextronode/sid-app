import api from '@/lib/api'

export function getHamlets() {
  return api.get('/api/hamlets')
}

export function createHamlet(payload) {
  return api.post('/api/hamlets', payload)
}

export function updateHamlet(id, payload) {
  return api.patch(`/api/hamlets/${id}`, payload)
}

export function deleteHamlet(id) {
  return api.delete(`/api/hamlets/${id}`)
}

export function getRws() {
  return api.get('/api/rws')
}

export function createRw(payload) {
  return api.post('/api/rws', payload)
}

export function updateRw(id, payload) {
  return api.patch(`/api/rws/${id}`, payload)
}

export function deleteRw(id) {
  return api.delete(`/api/rws/${id}`)
}

export function getRts() {
  return api.get('/api/rts')
}

export function createRt(payload) {
  return api.post('/api/rts', payload)
}

export function updateRt(id, payload) {
  return api.patch(`/api/rts/${id}`, payload)
}

export function deleteRt(id) {
  return api.delete(`/api/rts/${id}`)
}
