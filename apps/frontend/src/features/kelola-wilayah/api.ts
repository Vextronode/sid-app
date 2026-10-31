import api from '@/lib/api'
import type { CollectionResponse, Hamlet, Id, ResourceResponse, Rt, Rw } from '@/types'

type Payload = Record<string, unknown>

export function getHamlets() {
  return api.get<CollectionResponse<Hamlet>>('/api/hamlets')
}

export function createHamlet(payload: Payload) {
  return api.post<ResourceResponse<Hamlet>>('/api/hamlets', payload)
}

export function updateHamlet(id: Id, payload: Payload) {
  return api.patch<ResourceResponse<Hamlet>>(`/api/hamlets/${id}`, payload)
}

export function deleteHamlet(id: Id) {
  return api.delete(`/api/hamlets/${id}`)
}

export function getRws() {
  return api.get<CollectionResponse<Rw>>('/api/rws')
}

export function createRw(payload: Payload) {
  return api.post<ResourceResponse<Rw>>('/api/rws', payload)
}

export function updateRw(id: Id, payload: Payload) {
  return api.patch<ResourceResponse<Rw>>(`/api/rws/${id}`, payload)
}

export function deleteRw(id: Id) {
  return api.delete(`/api/rws/${id}`)
}

export function getRts() {
  return api.get<CollectionResponse<Rt>>('/api/rts')
}

export function createRt(payload: Payload) {
  return api.post<ResourceResponse<Rt>>('/api/rts', payload)
}

export function updateRt(id: Id, payload: Payload) {
  return api.patch<ResourceResponse<Rt>>(`/api/rts/${id}`, payload)
}

export function deleteRt(id: Id) {
  return api.delete(`/api/rts/${id}`)
}
