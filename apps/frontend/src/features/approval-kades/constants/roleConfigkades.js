// ==========================================
// roleConfigkades.js
// Config lokal khusus Kepala Desa (Kades). Kades bisa monitoring SEMUA
// surat dari awal (pending) sampai akhir (petugas_approved/rejected),
// supaya bisa pantau surat itu lagi nyangkut di tahap mana.
// Tetap READ-ONLY — tidak ada approve/reject/hapus.
// ==========================================

export const ROLE_LABEL = 'Kepala Desa';

// Semua status, supaya Kades bisa lihat surat sedang di tahap apa
export const RELEVANT_STATUSES = [
  'pending',
  'rt_approved',
  'rt_rejected',
  'rw_approved',
  'rw_rejected',
  'kadus_approved',
  'kadus_rejected',
  'petugas_approved',
  'petugas_rejected',
];

export const BASE_PATH = '/admin/dashboard-surat-kades';