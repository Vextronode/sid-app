// ==========================================
// roleConfigkades.js
// Kades = monitoring only. Bisa lihat semua status dari awal (pending)
// sampai akhir (rw_approved/rejected), tapi tidak approve/reject.
// ==========================================

export const ROLE_LABEL = 'Kepala Desa';
export const ROLE_KEY = 'kepala_desa'; // sesuai value role asli di backend
export const RELEVANT_STATUSES = ['pending', 'rt_approved', 'rt_rejected', 'rw_approved', 'rw_rejected'];
export const BASE_PATH = '/admin/dashboard-surat-kades';