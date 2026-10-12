import api from '@/lib/api'

export function getPositions(orgType) {
  return api.get('/api/village-org-positions', {
    params: orgType ? { org_type: orgType } : {},
  })
}

export function createPosition(payload) {
  return api.post('/api/village-org-positions', payload)
}

export function updatePosition(id, payload) {
  return api.patch(`/api/village-org-positions/${id}`, payload)
}

export function deletePosition(id) {
  return api.delete(`/api/village-org-positions/${id}`)
}

export function addMember(positionId, payload) {
  return api.post(`/api/village-org-positions/${positionId}/members`, payload)
}

export function updateMember(positionId, memberId, payload) {
  return api.patch(`/api/village-org-positions/${positionId}/members/${memberId}`, payload)
}

export function deleteMember(positionId, memberId) {
  return api.delete(`/api/village-org-positions/${positionId}/members/${memberId}`)
}
