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

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } }

// Penetapan dan rotasi membawa foto pejabat, jadi dikirim multipart.
function toFormData(payload) {
  const formData = new FormData()

  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') formData.append(key, value)
  })

  return formData
}

export function promotePerangkatDesa(payload) {
  return api.post('/api/officials/promote', toFormData(payload), multipart)
}

export function demotePerangkatDesa(id, payload = {}) {
  return api.post(`/api/officials/${id}/demote`, payload)
}

export function rotatePerangkatDesa(id, payload) {
  return api.post(`/api/officials/${id}/rotate`, toFormData(payload), multipart)
}

// Cari calon pejabat lewat NIK. Jabatan menentukan apakah calon harus
// sudah punya akun warga.
export function findOfficialCandidate(nik, position) {
  return api.post('/api/officials/candidates/lookup', position ? { nik, position } : { nik })
}

export function uploadOfficialPhoto(officialId, file) {
  return api.post(`/api/officials/${officialId}/photo`, toFormData({ photo: file }), multipart)
}

// Jenis jabatan desa tanpa akun (Kasi/Kaur/Staf), dikelola Petugas Desa.
export function getOfficialPositionTypes() {
  return api.get('/api/official-position-types')
}

export function createOfficialPositionType(payload) {
  return api.post('/api/official-position-types', payload)
}

export function updateOfficialPositionType(id, payload) {
  return api.patch(`/api/official-position-types/${id}`, payload)
}

export function deleteOfficialPositionType(id) {
  return api.delete(`/api/official-position-types/${id}`)
}

// Stempel desa dan tanda tangan Kepala Desa disimpan privat: tidak ada URL
// publik, pratinjau diambil sebagai blob lewat sesi login.

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
