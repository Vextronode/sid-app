import api from '@/lib/api'

// Pengumuman beranda: satu per desa, khusus Petugas Desa.
export function getAnnouncement() {
  return api.get('/api/announcement')
}

// Menyimpan menggantikan pengumuman yang ada. Durasi (duration_value +
// duration_unit: hour|day|week) wajib saat membuat; saat mengubah boleh
// dikosongkan untuk mempertahankan waktu berakhir.
export function saveAnnouncement(payload) {
  return api.put('/api/announcement', payload)
}

export function deleteAnnouncement() {
  return api.delete('/api/announcement')
}
