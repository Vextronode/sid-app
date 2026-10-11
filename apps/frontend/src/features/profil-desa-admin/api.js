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

// Cari calon pejabat lewat NIK: akun yang terhubung ke warga ber-NIK itu.
export function findOfficialCandidate(nik) {
  return api.post('/api/officials/candidates/lookup', { nik })
}

// Stempel desa dan tanda tangan Kepala Desa disimpan privat: tidak ada URL
// publik, pratinjau diambil sebagai blob lewat sesi login.
const multipart = { headers: { 'Content-Type': 'multipart/form-data' } }

export function uploadVillageStamp(file) {
  const formData = new FormData()

  formData.append('stamp', file)

  return api.post('/api/villages/profile/stamp', formData, multipart)
}

export async function getVillageStampImage() {
  const response = await api.get('/api/villages/profile/stamp', { responseType: 'blob' })

  return response.data
}

export function uploadOfficialSignature(officialId, file) {
  const formData = new FormData()

  formData.append('signature', file)

  return api.post(`/api/officials/${officialId}/signature`, formData, multipart)
}

export async function getOfficialSignatureImage(officialId) {
  const response = await api.get(`/api/officials/${officialId}/signature`, {
    responseType: 'blob',
  })

  return response.data
}
