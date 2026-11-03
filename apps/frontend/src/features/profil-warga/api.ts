import api from '@/lib/api'
import type { IsoDateString } from '@/types'

// Foto profil akun sendiri. Hanya akun warga; akun yang menjabat ditolak
// (fotonya foto pejabat, dikelola Staf SIDUTama).

// Permintaan ganti foto terakhir: foto baru terpasang setelah disetujui
// petugas wilayah (RT, lalu RW, Kepala Dusun, atau Staf SIDUTama).
export type OwnPhotoRequest = {
  id: number
  status: 'pending' | 'approved' | 'rejected'
  decision_notes: string | null
  decided_at: IsoDateString | null
  created_at: IsoDateString | null
}

export async function getOwnPhotoRequest() {
  const response = await api.get<{ data: OwnPhotoRequest | null }>('/api/profile/photo-request')

  return response.data.data
}

// Foto dari kamera (CameraCapture), bukan galeri.
export function submitPhotoRequest(photo: Blob) {
  const form = new FormData()
  form.append('photo', photo, 'wajah.jpg')

  return api.post<{ message?: string }>('/api/profile/photo-request', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function deleteOwnPhoto() {
  return api.delete('/api/profile/photo')
}
