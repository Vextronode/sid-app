import api from '@/lib/api'

// params: page, per_page, search (nama), rt_id — diproses di server.
export function getCitizens(params = {}) {
  return api.get('/api/citizens', { params })
}

export function createCitizen(data) {
  return api.post('/api/citizens', data)
}

export function updateCitizen(id, data) {
  return api.patch(`/api/citizens/${id}`, data)
}

export function deleteCitizen(id) {
  return api.delete(`/api/citizens/${id}`)
}

export function importCitizensExcel(formData) {
  return api.post('/api/citizens/import', formData)
}

export function getFamilies(params = {}) {
  return api.get('/api/families', { params })
}

export function getFamily(id) {
  return api.get(`/api/families/${id}`)
}

export function createFamily(payload) {
  return api.post('/api/families', payload)
}

export function updateFamily(id, payload) {
  return api.patch(`/api/families/${id}`, payload)
}

export function deleteFamily(id) {
  return api.delete(`/api/families/${id}`)
}

export function getFamilySocioeconomic(id) {
  return api.get(`/api/families/${id}/socioeconomic`)
}

export function saveFamilySocioeconomic(id, payload) {
  return api.put(`/api/families/${id}/socioeconomic`, payload)
}
