// ==========================================
// roleConfigkadus.js
// Kadus sekarang MONITORING SAJA, bukan approver. Bisa lihat semua
// status surat dari awal sampai akhir.
// ==========================================

export const ROLE_LABEL = 'Kadus';
export const RELEVANT_STATUSES = ['pending', 'rt_approved', 'rt_rejected', 'rw_approved', 'rw_rejected'];
export const BASE_PATH = '/admin/dashboard-surat-kadus';