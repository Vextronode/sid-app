// ==========================================
// roleConfigkasi.js
// Config lokal Kasi Pelayanan. Sama seperti Kaur, tapi jenis surat
// tanggung jawabnya beda (SPTJM, Surat Pernyataan, dll — lihat catatan
// di jenisSuratConfig.js, jenis-jenis ini belum dibangun di sistem).
// ==========================================

export const ROLE_LABEL = 'Kasi Pelayanan';
export const ROLE_KEY = 'kasi';
export const PENDING_STATUS = 'kadus_approved';
export const ACTION_RESULT = { approve: 'kasi_approved', reject: 'kasi_rejected' };
export const RELEVANT_STATUSES = ['kadus_approved', 'kasi_approved', 'kasi_rejected'];
export const BASE_PATH = '/admin/dashboard-surat-kasi';