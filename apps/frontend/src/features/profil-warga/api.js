import api from '@/lib/api'

// Foto profil akun sendiri. Hanya akun warga; akun yang menjabat ditolak
// (fotonya foto pejabat, dikelola Petugas Desa).
export function uploadOwnPhoto(file) {
  const form = new FormData()
  form.append('photo', file)

  return api.post('/api/profile/photo', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function deleteOwnPhoto() {
  return api.delete('/api/profile/photo')
}
