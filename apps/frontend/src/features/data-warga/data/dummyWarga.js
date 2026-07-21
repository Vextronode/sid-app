// ==========================================
// dummyWarga.js
// Dataset dummy data warga, dipakai DataWargaPage sampai backend siap.
// ==========================================

export const dummyWarga = Array.from({ length: 10 }).map((_, i) => ({
  id: i + 1,
  nama: 'Budi Santoso',
  nik: '****-0042',
  rt: '001',
  rw: '001',
  status: i % 3 === 1 ? 'aktif' : 'nonaktif',
}));