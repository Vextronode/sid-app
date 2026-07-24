// ==========================================
// dummyUser.js
// Dataset dummy user admin (RT/RW/Kadus/Petugas Desa), dipakai
// ManajemenUserPage sampai backend siap.
// ==========================================

export const dummyUser = Array.from({ length: 9 }).map((_, i) => ({
  id: i + 1,
  nama: 'ahmadani',
  email: 'email@email.com',
  role: ['RT', 'RW', 'Kadus'][i % 3],
  wilayah: 'Cibenda',
  status: 'aktif',
}));