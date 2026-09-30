import api from '@/lib/api'

export function getCitizens() {
  return api.get('/api/citizens')
}

export function getWilayah() {
  return api.get('/api/citizens/wilayah')
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
