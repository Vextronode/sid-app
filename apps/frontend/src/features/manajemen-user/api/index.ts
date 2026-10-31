import api from '@/lib/api'
import type { CollectionResponse, Id, ResourceResponse, User } from '@/types'

export function getUsers() {
  return api.get<CollectionResponse<User>>('/api/users')
}

export function toggleUserStatus(id: Id) {
  return api.patch(`/api/users/${id}/toggle-status`)
}

export function updateUser(id: Id, payload: Record<string, unknown>) {
  return api.patch<ResourceResponse<User>>(`/api/users/${id}`, payload)
}

// Membuat kata sandi sementara; pengguna wajib menggantinya saat masuk.
export function resetUserPassword(id: Id) {
  return api.post(`/api/users/${id}/reset-password`)
}

// Foto profil akun warga (akun yang menjabat ditolak backend; fotonya
// dikelola di halaman Pejabat Desa).
export function uploadUserPhoto(id: Id, file: File) {
  const form = new FormData()
  form.append('photo', file)

  return api.post(`/api/users/${id}/photo`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function deleteUserPhoto(id: Id) {
  return api.delete(`/api/users/${id}/photo`)
}
