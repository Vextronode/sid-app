import api from '@/lib/api'

export function getUsers() {
  return api.get('/api/users')
}

export function toggleUserStatus(id) {
  return api.patch(`/api/users/${id}/toggle-status`)
}

export function updateUser(id, payload) {
  return api.patch(`/api/users/${id}`, payload)
}

// Membuat kata sandi sementara; pengguna wajib menggantinya saat masuk.
export function resetUserPassword(id) {
  return api.post(`/api/users/${id}/reset-password`)
}

// Foto profil akun warga (akun yang menjabat ditolak backend; fotonya
// dikelola di halaman Pejabat Desa).
export function uploadUserPhoto(id, file) {
  const form = new FormData()
  form.append('photo', file)

  return api.post(`/api/users/${id}/photo`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function deleteUserPhoto(id) {
  return api.delete(`/api/users/${id}/photo`)
}
