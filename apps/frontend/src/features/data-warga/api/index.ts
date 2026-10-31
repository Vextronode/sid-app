import api from '@/lib/api'
import type {
  Citizen,
  CitizenListResponse,
  CollectionResponse,
  Family,
  FamilyOption,
  Id,
  LaravelPaginatedResponse,
  MessageResponse,
  ResourceResponse,
} from '@/types'

type Payload = Record<string, unknown>
type ListParams = Record<string, string | number | undefined>

// params: page, per_page, search (nama), rt_id — diproses di server.
export function getCitizens(params: ListParams = {}) {
  return api.get<CitizenListResponse>('/api/citizens', { params })
}

export function createCitizen(data: Payload) {
  return api.post<MessageResponse<Citizen>>('/api/citizens', data)
}

export function updateCitizen(id: Id, data: Payload) {
  return api.patch<MessageResponse<Citizen>>(`/api/citizens/${id}`, data)
}

export function deleteCitizen(id: Id) {
  return api.delete(`/api/citizens/${id}`)
}

export function importCitizensExcel(formData: FormData) {
  return api.post('/api/citizens/import', formData)
}

export function getFamilies(params: ListParams = {}) {
  return api.get<LaravelPaginatedResponse<Family>>('/api/families', { params })
}

// Semua KK desa (tanpa halaman) untuk pilihan KK di form warga.
export function getFamilyOptions() {
  return api.get<CollectionResponse<FamilyOption>>('/api/families/options')
}

export function getFamily(id: Id) {
  return api.get<ResourceResponse<Family>>(`/api/families/${id}`)
}

export function createFamily(payload: Payload) {
  return api.post<ResourceResponse<Family>>('/api/families', payload)
}

export function updateFamily(id: Id, payload: Payload) {
  return api.patch<ResourceResponse<Family>>(`/api/families/${id}`, payload)
}

export function deleteFamily(id: Id) {
  return api.delete(`/api/families/${id}`)
}

export function getFamilySocioeconomic(id: Id) {
  return api.get(`/api/families/${id}/socioeconomic`)
}

export function saveFamilySocioeconomic(id: Id, payload: Payload) {
  return api.put(`/api/families/${id}/socioeconomic`, payload)
}
